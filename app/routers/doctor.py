from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models.models import DrugInteraction, ClinicalTrialRecord, Drug
from ..schemas.schemas import DDIAlert, ClinicalTrialOut
from ..services.biomedical_adapters import BiomedicalAdapter

router = APIRouter(prefix="/doctor", tags=["Doctor Portal — Clinical Evidence & Safety"])

@router.get("/interactions", response_model=List[DDIAlert])
def check_interactions(
    drug_names: Optional[str] = Query(None, description="Comma-separated list of drug names to check"),
    severity: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(DrugInteraction)
    if severity:
        query = query.filter(DrugInteraction.severity == severity)
        
    if drug_names:
        names = [n.strip().lower() for n in drug_names.split(",") if n.strip()]
        if names:
            # Match where any of the provided drugs is drug_a or drug_b
            results = []
            all_ddis = query.all()
            for d in all_ddis:
                if any(n in d.drug_a_name.lower() or n in d.drug_b_name.lower() for n in names):
                    results.append(d)
            return [
                DDIAlert(
                    id=d.id,
                    drug_a=d.drug_a_name,
                    drug_b=d.drug_b_name,
                    severity=d.severity,
                    mechanism=d.mechanism,
                    recommendation=d.recommendation,
                    verified_source=d.verified_source,
                    source_url=d.source_url
                ) for d in results
            ]
            
    all_ddis = query.all()
    return [
        DDIAlert(
            id=d.id,
            drug_a=d.drug_a_name,
            drug_b=d.drug_b_name,
            severity=d.severity,
            mechanism=d.mechanism,
            recommendation=d.recommendation,
            verified_source=d.verified_source,
            source_url=d.source_url
        ) for d in all_ddis
    ]

@router.get("/clinical-trials", response_model=List[ClinicalTrialOut])
def get_clinical_trials(
    condition: Optional[str] = None,
    phase: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ClinicalTrialRecord)
    if condition:
        query = query.filter(ClinicalTrialRecord.condition.ilike(f"%{condition}%"))
    if phase:
        query = query.filter(ClinicalTrialRecord.phase.ilike(f"%{phase}%"))
    if status:
        query = query.filter(ClinicalTrialRecord.status.ilike(f"%{status}%"))
    return query.all()

@router.get("/clinical-trials/live")
async def fetch_live_clinical_trials(
    condition: str = Query(..., description="Condition or disease name"),
    drug: Optional[str] = None
):
    """Fetches live human clinical trial records from ClinicalTrials.gov REST API v2."""
    trials = await BiomedicalAdapter.search_clinical_trials(condition=condition, drug=drug, max_results=5)
    return {
        "condition": condition,
        "drug": drug,
        "count": len(trials),
        "results": trials
    }

@router.get("/overview")
def get_clinical_overview(db: Session = Depends(get_db)):
    trial_count = db.query(ClinicalTrialRecord).count()
    ddi_count = db.query(DrugInteraction).count()
    drugs_count = db.query(Drug).count()
    
    return {
        "verified_medications": drugs_count,
        "monitored_ddi_signals": ddi_count,
        "registered_human_trials": trial_count,
        "last_monograph_update": "2026-10-22",
        "regulatory_boundary_notice": (
            "CLINICAL SAFETY NOTICE: The Doctor Portal provides curated pharmacovigilance data, verified monographs, "
            "and human clinical trial endpoints. Experimental computational repurposing hypotheses are strictly segregated "
            "and must NOT be utilized as autonomous prescribing directives."
        )
    }
