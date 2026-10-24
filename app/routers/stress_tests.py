import json
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.models import StressTestRun
from ..schemas.schemas import StressTestConfig, StressTestResultOut
from ..services.stress_test_engine import StressTestEngine

router = APIRouter(prefix="/stress-tests", tags=["Stress-Test Lab"])

def format_run_out(run: StressTestRun) -> dict:
    return {
        "id": run.id,
        "title": run.title,
        "model_name": run.model_name,
        "dataset_version": run.dataset_version,
        "split_type": run.split_type,
        "temporal_cutoff_year": run.temporal_cutoff_year,
        "perturbation_rate": run.perturbation_rate,
        "status": run.status,
        "metrics": json.loads(run.metrics_json or "{}"),
        "failure_analysis": json.loads(run.failure_analysis_json or "[]"),
        "rank_stability": json.loads(run.rank_stability_json or "{}"),
        "logs": json.loads(run.logs_json or "[]"),
        "created_at": run.created_at
    }

@router.get("", response_model=List[StressTestResultOut])
def list_stress_tests(db: Session = Depends(get_db)):
    runs = db.query(StressTestRun).order_by(StressTestRun.id.desc()).all()
    return [format_run_out(r) for r in runs]

@router.get("/{run_id}", response_model=StressTestResultOut)
def get_stress_test(run_id: int, db: Session = Depends(get_db)):
    run = db.query(StressTestRun).filter(StressTestRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Stress test run not found")
    return format_run_out(run)

@router.post("/run", response_model=StressTestResultOut)
def execute_stress_test(config: StressTestConfig, db: Session = Depends(get_db)):
    """Executes a real computational stress test run across selected evaluation split."""
    run = StressTestEngine.run_stress_test(
        db=db,
        title=config.title,
        model_name=config.model_name,
        dataset_version=config.dataset_version,
        split_type=config.split_type,
        temporal_cutoff_year=config.temporal_cutoff_year,
        perturbation_rate=config.perturbation_rate
    )
    return format_run_out(run)

@router.get("/{run_id}/export")
def export_stress_test_report(run_id: int, db: Session = Depends(get_db)):
    run = db.query(StressTestRun).filter(StressTestRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Stress test run not found")
        
    metrics = json.loads(run.metrics_json or "{}")
    failures = json.loads(run.failure_analysis_json or "[]")
    stability = json.loads(run.rank_stability_json or "{}")
    
    report_md = f"""# CURENOVA 2.0 — STRESS-TEST LAB REPRODUCIBILITY REPORT
**Protocol Title**: {run.title}  
**Execution Timestamp**: {run.created_at.strftime("%Y-%m-%d %H:%M:%S UTC")}  
**Model Under Test**: {run.model_name}  
**Knowledge Graph Dataset**: {run.dataset_version}  
**Evaluation Split**: {run.split_type}  
**Perturbation Rate**: {int(run.perturbation_rate * 100)}%  
**Temporal Leakage Cutoff**: {run.temporal_cutoff_year or "N/A"}  

---

## 1. EMPIRICAL VALIDATION METRICS
- **AUROC (Trapezoidal)**: {metrics.get('auroc', 'N/A')} (95% CI: {metrics.get('auroc_ci', ['N/A', 'N/A'])})
- **AUPRC (Precision-Recall AUC)**: {metrics.get('auprc', 'N/A')}
- **Precision @ Top-3**: {metrics.get('precision_at_3', 'N/A')}
- **Recall @ Top-3**: {metrics.get('recall_at_3', 'N/A')}
- **Brier Calibration Score**: {metrics.get('brier_calibration_score', 'N/A')} (Lower is superior)
- **Kendall's Tau Ranking Stability**: {metrics.get('kendall_tau_stability', 'N/A')}
- **Spearman Rho Correlation**: {metrics.get('spearman_rho', 'N/A')}

---

## 2. RANKING STABILITY & TURNOVER
- **Top-3 Jaccard Overlap**: {stability.get('top_k_jaccard_overlap', 'N/A')}
- **Mean Candidate Rank Shift**: {stability.get('mean_rank_shift', 'N/A')} positions

---

## 3. FAILURE ANALYSIS & SENSITIVITY COLLAPSE
The following candidates experienced ranking turnover or elevated epistemic uncertainty:

"""
    for f in failures:
        report_md += f"""### {f.get('drug_name')} in {f.get('disease_name')}
- **Baseline Rank**: #{f.get('baseline_rank')}  ->  **Perturbed Rank**: #{f.get('perturbed_rank')} (Δ: {f.get('rank_delta')})
- **Epistemic Uncertainty**: {f.get('epistemic_uncertainty', 'N/A')} | **Aleatoric Uncertainty**: {f.get('aleatoric_uncertainty', 'N/A')}
- **Failure Audit**: {f.get('collapse_reason')}

"""

    report_md += """
---
## 4. SCIENTIFIC & REGULATORY DISCLAIMER
*This stress-test report was generated programmatically by CureNova 2.0 for biomedical research evaluation. 
Computational rankings and stability evaluations do NOT represent clinical efficacy, safety endorsements, 
or medical treatment recommendations. Experimental wet-lab and clinical trial validation is required.*
"""
    return Response(
        content=report_md,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=curenova_stress_test_{run_id}.md"}
    )
