from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..config import settings
from ..models.models import Drug, Disease, CandidatePrediction, StressTestRun, ClinicalTrialRecord, EvidenceRecord, User
from ..dependencies.auth import require_admin

router = APIRouter(prefix="/system", tags=["System & Mode Configuration"])

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
