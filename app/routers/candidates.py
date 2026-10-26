from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models.models import CandidatePrediction, ResearchNote, EvidenceRecord, User
from ..schemas.schemas import (
    CandidateSummaryOut, CandidateDetailOut, ResearchNoteCreate, ResearchNoteOut,
    AgentWorkflowResponse
)
from ..services.agentic_orchestrator import AgenticOrchestrator
from ..config import settings
from ..dependencies.auth import get_current_active_user, require_role, require_researcher

router = APIRouter(prefix="/candidates", tags=["Candidate Hypotheses"])


@router.get("", response_model=List[CandidateSummaryOut])
def get_candidates(
    disease: Optional[str] = None,
    drug: Optional[str] = None,
    status: Optional[str] = None,
    min_score: Optional[float] = None,
    bookmarked_only: Optional[bool] = False,
    sort_by: Optional[str] = "rank",  # rank, score, evidence, uncertainty
    db: Session = Depends(get_db)
):
    query = db.query(CandidatePrediction)
    if disease:
        query = query.filter(CandidatePrediction.disease_name.ilike(f"%{disease}%"))
    if drug:
        query = query.filter(CandidatePrediction.drug_name.ilike(f"%{drug}%"))
    if status:
        query = query.filter(CandidatePrediction.status == status)
    if min_score is not None:
        query = query.filter(CandidatePrediction.prediction_score >= min_score)
    if bookmarked_only:
        query = query.filter(CandidatePrediction.is_bookmarked == True)
        
    if sort_by == "score":
        query = query.order_by(CandidatePrediction.prediction_score.desc())
    elif sort_by == "evidence":
        query = query.order_by(CandidatePrediction.evidence_count.desc())
    elif sort_by == "uncertainty":
        query = query.order_by(CandidatePrediction.epistemic_uncertainty.asc())
    else:
        query = query.order_by(CandidatePrediction.rank.asc())

    return query.all()

@router.post("/investigate", response_model=AgentWorkflowResponse)
@router.get("/investigate", response_model=AgentWorkflowResponse)
async def investigate_query(
    query: str = Query(..., min_length=2, max_length=150, description="Disease or Drug to investigate"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_researcher)
):
    """
    Executes the Agentic Orchestrator multi-step research workflow.
    Restricted strictly to approved researchers and administrators.
    Derives principal role from verified authenticated user identity.
    """
    clean_query = query.strip()
    if not clean_query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Investigation query cannot be blank or whitespace-only."
        )

    result = await AgenticOrchestrator.run_investigation(
        db=db,
        query=clean_query,
        user_role=current_user.role,
        demo_mode=settings.DEMO_MODE
    )
    return result


@router.get("/{candidate_id}", response_model=CandidateDetailOut)
def get_candidate_detail(candidate_id: int, db: Session = Depends(get_db)):
    candidate = db.query(CandidatePrediction).filter(CandidatePrediction.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate

@router.post("/{candidate_id}/bookmark", response_model=CandidateSummaryOut)
def toggle_bookmark(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Toggles bookmark on a drug candidate for the authenticated user."""
    candidate = db.query(CandidatePrediction).filter(CandidatePrediction.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    candidate.is_bookmarked = not candidate.is_bookmarked
    db.commit()
    db.refresh(candidate)
    return candidate

@router.post("/{candidate_id}/notes", response_model=ResearchNoteOut)
def add_candidate_note(
    candidate_id: int,
    note_in: ResearchNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("researcher", "doctor", "admin"))
):
    """
    Adds a verified research note attributing author strictly to the authenticated principal.
    Removes hardcoded user_id=1.
    """
    candidate = db.query(CandidatePrediction).filter(CandidatePrediction.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    note = ResearchNote(
        candidate_id=candidate_id,
        user_id=current_user.id,
        content=note_in.content
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note

@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_candidate_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Enforces resource ownership: only the author or an administrator may delete notes."""
    note = db.query(ResearchNote).filter(ResearchNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to delete this note"
        )
    db.delete(note)
    db.commit()


@router.get("/compare/pair", response_model=List[CandidateDetailOut])
def compare_candidates(id1: int, id2: int, db: Session = Depends(get_db)):
    c1 = db.query(CandidatePrediction).filter(CandidatePrediction.id == id1).first()
    c2 = db.query(CandidatePrediction).filter(CandidatePrediction.id == id2).first()
    if not c1 or not c2:
        raise HTTPException(status_code=404, detail="One or both candidates not found")
    return [c1, c2]
