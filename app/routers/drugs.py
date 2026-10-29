"""
CureNova 2.0 Drug Similarity & Alternative Drug Discovery API Router
Endpoints for Drug -> Similar / Alternative Drugs workflow.
Strictly separated from the Drug-Disease ML model.
"""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..models.models import User
from ..schemas.schemas import DrugSimilarityRequest, DrugSimilarityResponse
from ..services.drug_similarity_service import DrugSimilarityService
from ..dependencies.auth import require_researcher

router = APIRouter(prefix="/drugs", tags=["Drug Similarity & Alternatives"])


@router.post("/similar", response_model=DrugSimilarityResponse)
def post_similar_drugs(
    payload: DrugSimilarityRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_researcher)
):
    """
    Executes the multi-factor Drug Similarity & Alternative Drug Discovery engine.
    Analyzes molecular structure (RDKit Tanimoto), shared targets (Jaccard),
    functional mechanism of action, therapeutic indications, and ChEMBL bioactivity.
    Requires verified researcher authorization.
    """
    return DrugSimilarityService.find_similar_drugs(
        query=payload.drug,
        db=db,
        top_k=payload.top_k or 10
    )


@router.get("/similar", response_model=DrugSimilarityResponse)
def get_similar_drugs(
    drug: Optional[str] = Query(None, min_length=2, max_length=150, description="Drug name or compound to find alternatives for"),
    drug_name: Optional[str] = Query(None, min_length=2, max_length=150, description="Drug name alias"),
    top_k: Optional[int] = Query(10, ge=1, le=50, description="Maximum number of similar candidates to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_researcher)
):
    """
    GET convenience endpoint for drug similarity discovery.
    Requires verified researcher authorization.
    """
    target_drug = drug or drug_name
    if not target_drug:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Parameter 'drug' or 'drug_name' is required")
    return DrugSimilarityService.find_similar_drugs(
        query=target_drug,
        db=db,
        top_k=top_k
    )

