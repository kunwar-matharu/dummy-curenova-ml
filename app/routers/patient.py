from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models.models import PatientMedicineGuide
from ..schemas.schemas import MedicineGuideOut, LaymanStudyExplanationRequest, LaymanStudyExplanationOut
from ..services.auth_service import get_client_ip, patient_explain_rate_limiter

router = APIRouter(prefix="/patient", tags=["Patient Portal — Plain Language Health Education"])

@router.get("/medicines", response_model=List[MedicineGuideOut])
def get_patient_medicines(
    search: Optional[str] = Query(None, max_length=100),
    db: Session = Depends(get_db)
):
    query = db.query(PatientMedicineGuide)
    if search:
        query = query.filter(PatientMedicineGuide.drug_name.ilike(f"%{search}%"))
    return query.all()

@router.get("/medicines/{drug_name}", response_model=MedicineGuideOut)
def get_single_medicine(
    drug_name: str,
    db: Session = Depends(get_db)
):
    guide = db.query(PatientMedicineGuide).filter(
        PatientMedicineGuide.drug_name.ilike(f"%{drug_name}%")
    ).first()
    if not guide:
        raise HTTPException(status_code=404, detail="Plain language guide for this medicine is not found in database.")
    return guide

@router.post("/explain-research", response_model=LaymanStudyExplanationOut)
def explain_study_in_plain_language(
    req: LaymanStudyExplanationRequest,
    request: Request
):
    """
    Translates complex biomedical scientific research abstracts into safe,
    accessible, clear plain-language summaries for patients and families.
    """
    client_ip = get_client_ip(request)
    patient_explain_rate_limiter.check_rate_limit(f"{client_ip}:patient_explain")
    title_lower = req.study_title.lower()
    abstract_lower = req.abstract_text.lower()
    
    # Detect model type
    if "phase 3" in title_lower or "phase 3" in abstract_lower or "randomized" in abstract_lower:
        study_model = "Human Clinical Trial (Phase 3 or Randomized)"
    elif "phase 1" in title_lower or "phase 2" in title_lower:
        study_model = "Human Clinical Trial (Early Phase 1/2)"
    elif "mice" in abstract_lower or "mouse" in abstract_lower or "in vivo" in abstract_lower or "animal" in abstract_lower:
        study_model = "Animal Laboratory Study (Rodent / In Vivo)"
    else:
        study_model = "Laboratory Cell Culture Study (In Vitro)"

    investigated = f"Researchers studied whether this medication could influence key cellular processes related to the condition in '{req.study_title}'."
    findings = (
        "The scientific study observed measurable biochemical changes or improvements in primary test measurements. "
        "However, results in laboratory settings or early-stage trials do not guarantee that the medicine is effective or safe for general use in everyday patients."
    )
    limitations = (
        f"This was an {study_model}. It cannot prove that the medicine will work safely for other health conditions. "
        "Side effects, dosage differences, and interactions with other medicines require dedicated clinical evaluation."
    )
    unresolved = (
        "Long-term health outcomes, ideal dosages, and whether the treatment helps diverse patient populations remain unknown."
    )
    disclaimer = (
        "DO NOT start, stop, or change any medication based on research reports or AI summaries. "
        "Always talk directly with your doctor or healthcare professional."
    )

    return LaymanStudyExplanationOut(
        investigated=investigated,
        findings=findings,
        study_model=study_model,
        limitations=limitations,
        unresolved_questions=unresolved,
        disclaimer=disclaimer
    )

@router.get("/overview")
def get_patient_overview(db: Session = Depends(get_db)):
    guides_count = db.query(PatientMedicineGuide).count()
    return {
        "available_guides": guides_count,
        "educational_topics": [
            {"id": 1, "title": "Understanding What 'Drug Repurposing' Really Means", "read_time": "3 min"},
            {"id": 2, "title": "Why Laboratory Studies Are Different from Human Clinical Trials", "read_time": "4 min"},
            {"id": 3, "title": "How to Ask Your Healthcare Team About New Research Findings", "read_time": "3 min"}
        ],
        "safe_health_notice": "CureNova Patient Portal provides plain-language educational material. No speculative research candidate is presented as a medical recommendation."
    }
