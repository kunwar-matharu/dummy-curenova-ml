from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.models import CandidatePrediction, EvidenceRecord, StressTestRun, User
from ..dependencies.auth import get_current_active_user

router = APIRouter(prefix="/reports", tags=["Research Dossier Reports"])

@router.get("/candidate/{candidate_id}/markdown")
def download_candidate_report_markdown(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    candidate = db.query(CandidatePrediction).filter(CandidatePrediction.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    evidence_records = db.query(EvidenceRecord).filter(EvidenceRecord.candidate_id == candidate_id).all()
    
    md_content = f"""# CURENOVA 2.0 — DRUG REPURPOSING RESEARCH DOSSIER
**Date**: {candidate.last_updated.strftime("%Y-%m-%d %H:%M:%S UTC")}  
**Document Classification**: Preclinical Computational Research Hypothesis  
**System**: CureNova 2.0 Intelligence Platform  

---

## 1. EXECUTIVE SUMMARY & TARGET CANDIDATE
- **Drug Candidate**: {candidate.drug_name} ({candidate.chembl_id or "ChEMBL Pending"})
- **Target Disease**: {candidate.disease_name}
- **Current Regulatory Status**: {candidate.approval_status}
- **Computational Rank**: #{candidate.rank}
- **Calibrated Prediction Likelihood**: {candidate.prediction_score:.3f} (95% CI: [{candidate.confidence_interval_low:.3f}, {candidate.confidence_interval_high:.3f}])
- **Calibration Method**: {candidate.calibration_status}
- **Epistemic Uncertainty (Data Gaps)**: {candidate.epistemic_uncertainty:.2f}
- **Aleatoric Uncertainty (Biological Variance)**: {candidate.aleatoric_uncertainty:.2f}

---

## 2. BIOLOGICAL MECHANISM OF ACTION
{candidate.biological_mechanism or "Detailed mechanistic pathway under curation."}

### Rationale
{candidate.rationale}

---

## 3. EVIDENCE RECORD AUDIT ({len(evidence_records)} Retrieved Records)
"""
    supporting = [e for e in evidence_records if e.evidence_direction == "supporting"]
    contradictory = [e for e in evidence_records if e.evidence_direction == "contradictory"]
    inconclusive = [e for e in evidence_records if e.evidence_direction == "inconclusive"]

    md_content += f"\n### A. Supporting Findings ({len(supporting)})\n"
    for s in supporting:
        md_content += f"- **{s.title}** ({s.journal}, {s.year}) [{s.study_type}]\n  *Excerpt*: \"{s.excerpt}\"\n  *PMID*: {s.pmid or 'N/A'} | *Sample*: {s.sample_size or 'N/A'}\n\n"

    md_content += f"\n### B. Contradictory & Adverse Signals ({len(contradictory)})\n"
    for c in contradictory:
        md_content += f"- **{c.title}** ({c.journal}, {c.year}) [{c.study_type}]\n  *Excerpt*: \"{c.excerpt}\"\n  *PMID*: {c.pmid or 'N/A'} | *Sample*: {c.sample_size or 'N/A'}\n\n"

    md_content += f"\n### C. Inconclusive or Equivocal Data ({len(inconclusive)})\n"
    for i in inconclusive:
        md_content += f"- **{i.title}** ({i.journal}, {i.year}) [{i.study_type}]\n  *Excerpt*: \"{i.excerpt}\"\n  *PMID*: {i.pmid or 'N/A'}\n\n"

    md_content += """
---

## 4. COMPUTATIONAL REPRODUCIBILITY & STRESS-TEST SUMMARY
Computational predictions from the CureNova GraphEnsemble model must be audited across the Stress-Test Lab:
- Generalization splits ensure findings are not artifacts of high node degrees in publication networks.
- Perturbation dropout measures whether candidate ranking survives biological link degradation.
- Temporal cutoff prevents retrospective leakage of post-study trial registries.

---

## 5. MANDATORY SCIENTIFIC DISCLAIMER
*This dossier is an automated scientific intelligence synthesis produced by CureNova 2.0. 
Computational prediction scores represent likelihood of biomedical association and DO NOT establish clinical efficacy, 
safety, tolerability, or prescribing suitability. Independent laboratory validation and formal clinical trials are required.*
"""
    return Response(
        content=md_content,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=curenova_dossier_{candidate.drug_name.lower()}_{candidate_id}.md"}
    )
