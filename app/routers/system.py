from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..database import get_db
from ..config import settings
from ..models.models import Drug, Disease, CandidatePrediction, StressTestRun, ClinicalTrialRecord, EvidenceRecord, User
from ..dependencies.auth import require_admin
from ..services.llm_service import PLACEHOLDER_KEYS

router = APIRouter(prefix="/system", tags=["System & Mode Configuration"])

@router.get("/health")
def get_system_health():
    """
    Deterministic, lightweight liveness probe.
    Returns immediately without external network dependencies.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "platform": settings.APP_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

@router.get("/ready")
def get_system_readiness(db: Session = Depends(get_db)):
    """
    Comprehensive readiness probe verifying database connectivity, configuration health,
    and external service states. Accurately reports LLM status without falsely reporting external live status.
    """
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service unavailable: Database connection failed: {str(e)}"
        )

    # Check LLM key status safely without exposing keys
    api_key = (settings.LLM_API_KEY or "").strip()
    key_configured = bool(api_key and api_key not in PLACEHOLDER_KEYS)

    if not settings.LLM_BACKEND_ENABLED:
        llm_operational_status = "disabled_deterministic_fallback"
    elif not key_configured:
        llm_operational_status = "enabled_but_no_valid_key_deterministic_fallback"
    else:
        llm_operational_status = "configured"

    return {
        "status": "ready",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "platform": settings.APP_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": {
            "status": db_status
        },
        "llm_service": {
            "enabled": settings.LLM_BACKEND_ENABLED,
            "provider": settings.LLM_PROVIDER,
            "model": settings.LLM_MODEL,
            "api_key_configured": key_configured,
            "operational_status": llm_operational_status,
            "live_inference_tested": False
        },
        "biomedical_apis": {
            "mode": "demo_cache" if settings.DEMO_MODE else "live_external"
        }
    }


@router.get("/status")
def get_system_status(db: Session = Depends(get_db)):
    return {
        "app_name": settings.APP_NAME,
        "version": settings.VERSION,
        "demo_mode": settings.DEMO_MODE,
        "mode_label": "DEMO MODE (Curated Sample Dataset)" if settings.DEMO_MODE else "REAL MODE (Live Biomedical APIs Connected)",
        "counts": {
            "drugs": db.query(Drug).count(),
            "diseases": db.query(Disease).count(),
            "candidates": db.query(CandidatePrediction).count(),
            "evidence_records": db.query(EvidenceRecord).count(),
            "stress_tests": db.query(StressTestRun).count(),
            "clinical_trials": db.query(ClinicalTrialRecord).count()
        },
        "live_integrations": {
            "ncbi_pubmed": "Enabled (E-utilities)" if not settings.DEMO_MODE else "Curated Local Cache (Demo Mode)",
            "clinical_trials_gov": "Enabled (API v2)" if not settings.DEMO_MODE else "Curated Local Cache (Demo Mode)",
            "chembl": "Enabled (EBI REST)" if not settings.DEMO_MODE else "Curated Local Cache (Demo Mode)",
            "openfda": "Enabled (OpenFDA Drug API)" if not settings.DEMO_MODE else "Curated Local Cache (Demo Mode)"
        }
    }

@router.post("/mode/toggle")
def toggle_system_mode(current_admin: User = Depends(require_admin)):
    """Toggles system demo/live mode. Restricted strictly to verified administrators."""
    settings.DEMO_MODE = not settings.DEMO_MODE
    return {
        "demo_mode": settings.DEMO_MODE,
        "mode_label": "DEMO MODE (Curated Sample Dataset)" if settings.DEMO_MODE else "REAL MODE (Live Biomedical APIs Connected)",
        "message": f"Switched to {'Demo Mode' if settings.DEMO_MODE else 'Real Mode'} successfully."
    }
