from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models.models import User
from ..schemas.schemas import FeedbackCreate, FeedbackOut, FeedbackEvaluationSummary
from ..services.feedback_service import FeedbackService
from ..dependencies.auth import get_current_active_user, require_role

router = APIRouter(prefix="/feedback", tags=["Research Feedback & Policy Evaluation"])


@router.post("", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
def submit_research_feedback(
    feedback_in: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Submits structured feedback on candidate investigations or synthesis reports.
    Restricted to verified doctors, researchers, and administrators.
    Guarantees duplicate prevention and de-identification of comments.
    """
    record = FeedbackService.submit_feedback(db=db, user=current_user, feedback_in=feedback_in)
    return FeedbackOut(
        id=record.id,
        workflow_id=record.workflow_id,
        candidate_id=record.candidate_id,
        user_id=record.user_id,
        user_email=current_user.email,
        user_role=record.user_role,
        rating=record.rating,
        feedback_category=record.feedback_category,
        comment=record.comment,
        prompt_version=record.prompt_version,
        model_name=record.model_name,
        provenance_mode=record.provenance_mode,
        created_at=record.created_at
    )


@router.get("", response_model=List[FeedbackOut])
def list_research_feedback(
    workflow_id: Optional[str] = Query(None, max_length=100),
    candidate_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Lists research feedback records.
    Enforces ownership scoping: standard users see their own feedback; administrators view all.
    """
    records = FeedbackService.list_feedback(
        db=db,
        user=current_user,
        workflow_id=workflow_id,
        candidate_id=candidate_id,
        skip=skip,
        limit=limit
    )
    return [
        FeedbackOut(
            id=r.id,
            workflow_id=r.workflow_id,
            candidate_id=r.candidate_id,
            user_id=r.user_id,
            user_email=r.user.email if r.user else "user@curenova.local",
            user_role=r.user_role,
            rating=r.rating,
            feedback_category=r.feedback_category,
            comment=r.comment,
            prompt_version=r.prompt_version,
            model_name=r.model_name,
            provenance_mode=r.provenance_mode,
            created_at=r.created_at
        )
        for r in records
    ]


@router.post("/evaluate", response_model=FeedbackEvaluationSummary)
def evaluate_feedback_policy(
    target_version: Optional[str] = Query(None, max_length=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("researcher", "admin"))
):
    """
    Executes offline human-in-the-loop policy evaluation.
    Aggregates feedback ratings, failure patterns, and compares versioned prompts.
    Restricted strictly to researchers and administrators.
    """
    return FeedbackService.evaluate_offline_policy(db=db, target_version=target_version)
