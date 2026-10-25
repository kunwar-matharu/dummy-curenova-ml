import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from ..models.models import ResearchFeedback, User, CandidatePrediction, utc_now
from ..schemas.schemas import FeedbackCreate, FeedbackEvaluationSummary
from .llm_service import sanitize_and_deidentify
from ..config import settings

logger = logging.getLogger("curenova.feedback")


class FeedbackService:
    """
    Service for recording verified clinical/research feedback and executing
    safe offline policy evaluations.

    SAFEGUARDS & REINFORCEMENT LEARNING ARCHITECTURE:
    1. Online Immediate Retraining Prohibition:
       Clinical feedback cannot modify live model weights or system prompts automatically.
       Unreviewed feedback must pass through offline human-in-the-loop validation.
    2. De-identification:
       All feedback comments are stripped of potential PHI prior to persistence.
    3. Reinforcement Learning from Human Feedback (RLHF) / DPO Specification:
       - State Space: Candidate drug, target disease, retrieved literature passages, knowledge graph triples.
       - Action Space: Generated mechanistic rationales and citation selections.
       - Reward Function: R = w1 * Accuracy + w2 * CitationVerification - w3 * SafetyOmissionPenalty - w4 * HallucinationPenalty.
       - Offline Status: True RL weight adaptation is intentionally held in offline evaluation mode
         to prevent catastrophic model drift in medical contexts.
    """

    @staticmethod
    def submit_feedback(db: Session, user: User, feedback_in: FeedbackCreate) -> ResearchFeedback:
        # Role gate
        if user.role not in ("doctor", "researcher", "admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only verified doctors, researchers, or administrators can submit research feedback."
            )

        if not user.is_active or user.approval_status != "approved":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Inactive or unapproved accounts cannot submit research feedback."
            )

        # Duplicate prevention: Check for identical feedback within the last 5 minutes
        five_mins_ago = datetime.now(timezone.utc) - timedelta(minutes=5)
        recent_duplicate = db.query(ResearchFeedback).filter(
            ResearchFeedback.user_id == user.id,
            ResearchFeedback.workflow_id == feedback_in.workflow_id,
            ResearchFeedback.candidate_id == feedback_in.candidate_id,
            ResearchFeedback.feedback_category == feedback_in.feedback_category,
            ResearchFeedback.created_at >= five_mins_ago
        ).first()

        if recent_duplicate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Duplicate feedback submission detected. Please wait before submitting identical feedback."
            )

        # De-identify comment to prevent PHI retention
        clean_comment = sanitize_and_deidentify(feedback_in.comment or "") if feedback_in.comment else None

        # Verify candidate_id if provided
        if feedback_in.candidate_id:
            cand = db.query(CandidatePrediction).filter(CandidatePrediction.id == feedback_in.candidate_id).first()
            if not cand:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Candidate with ID {feedback_in.candidate_id} not found."
                )

        feedback_record = ResearchFeedback(
            workflow_id=feedback_in.workflow_id,
            candidate_id=feedback_in.candidate_id,
            user_id=user.id,
            user_role=user.role,
            rating=feedback_in.rating,
            feedback_category=feedback_in.feedback_category,
            comment=clean_comment,
            prompt_version=feedback_in.prompt_version or settings.PROMPT_VERSION,
            model_name=feedback_in.model_name or settings.LLM_MODEL,
            provenance_mode="llm" if settings.LLM_BACKEND_ENABLED else "deterministic_fallback"
        )
        db.add(feedback_record)
        db.commit()
        db.refresh(feedback_record)
        return feedback_record

    @staticmethod
    def list_feedback(
        db: Session,
        user: User,
        workflow_id: Optional[str] = None,
        candidate_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[ResearchFeedback]:
        query = db.query(ResearchFeedback)

        # Ownership scoping: Admins see all feedback; doctors/researchers see their own
        if user.role != "admin":
            query = query.filter(ResearchFeedback.user_id == user.id)

        if workflow_id:
            query = query.filter(ResearchFeedback.workflow_id == workflow_id)
        if candidate_id:
            query = query.filter(ResearchFeedback.candidate_id == candidate_id)

        return query.order_by(ResearchFeedback.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def evaluate_offline_policy(
        db: Session,
        target_version: Optional[str] = None
    ) -> FeedbackEvaluationSummary:
        """
        Summarizes human feedback across categories and detects recurring failure patterns.
        Compares candidate prompt/policy versions for offline quality assurance.
        """
        all_feedback = db.query(ResearchFeedback).all()
        total_count = len(all_feedback)

        if total_count == 0:
            return FeedbackEvaluationSummary(
                total_feedback_count=0,
                average_rating=0.0,
                category_counts={},
                hallucination_report_frequency=0.0,
                safety_discrepancy_frequency=0.0,
                prompt_version_breakdown={},
                recurring_failure_patterns=[],
                policy_evaluation_status="Insufficient evaluation data (0 records)."
            )

        total_rating = sum(f.rating for f in all_feedback)
        avg_rating = round(total_rating / total_count, 2)

        # Category counts
        category_counts: Dict[str, int] = {}
        for f in all_feedback:
            cat = f.feedback_category
            category_counts[cat] = category_counts.get(cat, 0) + 1

        hallucination_count = category_counts.get("hallucination", 0)
        safety_count = category_counts.get("safety_omission", 0)

        hallucination_freq = round(hallucination_count / total_count, 3)
        safety_freq = round(safety_count / total_count, 3)

        # Version breakdown
        version_ratings: Dict[str, List[int]] = {}
        for f in all_feedback:
            v = f.prompt_version or "unknown"
            if v not in version_ratings:
                version_ratings[v] = []
            version_ratings[v].append(f.rating)

        version_breakdown = {
            v: {
                "count": len(ratings),
                "average_rating": round(sum(ratings) / len(ratings), 2),
                "pass_rate": round(sum(1 for r in ratings if r >= 4) / len(ratings), 2)
            }
            for v, ratings in version_ratings.items()
        }

        # Detect recurring failure patterns from comments
        recurring_patterns = []
        comments = [f.comment.lower() for f in all_feedback if f.comment]
        for term, pattern_name in [
            ("dose", "Dosage & Pharmacokinetic Uncertainty"),
            ("subdural", "Adverse Hemorrhagic Event Warning"),
            ("hallucin", "Extrapolated Mechanistic Claim"),
            ("trial", "Missing Phase 3 Trial Context"),
            ("pmid", "Invalid or Missing Literature Citation")
        ]:
            occurrences = sum(1 for c in comments if term in c)
            if occurrences > 0:
                recurring_patterns.append({
                    "pattern": pattern_name,
                    "occurrences": occurrences,
                    "frequency": round(occurrences / total_count, 3)
                })

        # Determine release policy status
        if hallucination_freq > 0.15 or safety_freq > 0.15:
            policy_status = "CRITICAL: Elevated hallucination or safety omission frequency exceeds tolerance (>15%). Model policy promotion blocked."
        elif avg_rating >= 3.8:
            policy_status = "STABLE: Prompt and agent policy meets clinical accuracy thresholds (>=3.8 avg rating)."
        else:
            policy_status = "IN-REVIEW: Policy requires additional evidence grounding and prompt tuning before release."

        return FeedbackEvaluationSummary(
            total_feedback_count=total_count,
            average_rating=avg_rating,
            category_counts=category_counts,
            hallucination_report_frequency=hallucination_freq,
            safety_discrepancy_frequency=safety_freq,
            prompt_version_breakdown=version_breakdown,
            recurring_failure_patterns=recurring_patterns,
            policy_evaluation_status=policy_status
        )
