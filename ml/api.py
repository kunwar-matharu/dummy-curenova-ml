from pathlib import Path
import sys
import json

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

_LOCAL_BASE = Path(__file__).resolve().parent
BASE = _LOCAL_BASE if (_LOCAL_BASE / "models" / "cure_nova_xgb_final.joblib").exists() else Path(r"A:\CureNovaML")
SCRIPTS = BASE if (_LOCAL_BASE / "models" / "cure_nova_xgb_final.joblib").exists() else BASE / "scripts"

sys.path.insert(0, str(SCRIPTS))

from predict_v4 import predict
from stress_test import run_stress_test
from evidence_utils import get_drug_evidence, get_chembl_live_evidence


MODEL_VERSION = "cure-nova-xgb-final"

CHEMBL_FILE = BASE / "data" / "chembl" / "chembl_drug_evidence.json"

with open(CHEMBL_FILE, encoding="utf-8") as f:
    CHEMBL_EVIDENCE = json.load(f)


app = FastAPI(
    title="CureNova ML API",
    description=(
        "Drug repurposing candidate-ranking, evidence retrieval, "
        "and independent stress-testing service for CureNova."
    ),
    version="3.0.0"
)


class PredictionRequest(BaseModel):
    disease_id: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="Normalized disease identifier"
    )

    top_k: int = Field(
        default=10,
        ge=1,
        le=100,
        description="Number of candidate drugs"
    )


def enrich_candidate(candidate):
    drug_id = candidate["drug_id"]

    # Open Targets evidence
    candidate["evidence_refs"] = get_drug_evidence(drug_id)

    # Live ChEMBL pharmacology evidence
    chembl = get_chembl_live_evidence(drug_id)

    candidate["chembl_evidence"] = {
        "available": chembl.get("available", False),
        "source": chembl.get("source", "ChEMBL"),
        "source_release": chembl.get("source_release"),
        "drug_name": chembl.get("drug_name"),
        "activity_record_count": chembl.get(
            "activity_record_count", 0
        ),
        "usable_activity_count": chembl.get(
            "usable_activity_count", 0
        ),
        "target_count": chembl.get(
            "target_count", 0
        ),
        "strong_target_count": chembl.get(
            "strong_target_count", 0
        ),
        "max_pchembl": chembl.get("max_pchembl"),
        "targets": chembl.get("targets", [])[:10],
        "note": chembl.get("note")
    }

    # Independent stress test
    stress = run_stress_test(candidate)

    candidate["stress_test"] = stress
    candidate["stress_score"] = stress["overall_score"]
    candidate["stress_interpretation"] = stress["interpretation"]

    return candidate


@app.get("/")
def root():
    return {
        "service": "CureNova ML",
        "status": "running",
        "model_version": MODEL_VERSION,
        "capabilities": [
            "drug_ranking",
            "open_targets_evidence",
            "chembl_activity_evidence",
            "molecular_evidence",
            "stress_testing"
        ]
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_version": MODEL_VERSION,
        "chembl_evidence_loaded": True,
        "chembl_drugs": len(CHEMBL_EVIDENCE)
    }


@app.get("/model/info")
def model_info():
    return {
        "model_version": MODEL_VERSION,
        "model_type": "XGBoost",
        "feature_count": 39,

        "unseen_disease_holdout": {
            "average_precision": 0.9047,
            "roc_auc": 0.9735
        },

        "unseen_drug_holdout": {
            "average_precision": 0.8652,
            "roc_auc": 0.9580
        },

        "score_type": "ranking_score",
        "clinical_use": False,
        "chembl_evidence_drugs": len(CHEMBL_EVIDENCE),

        "evaluation_note": (
            "Metrics are Average Precision and ROC-AUC, not accuracy. "
            "Unseen-drug and unseen-disease evaluations measure "
            "generalization to entities not used during training."
        )
    }


@app.post("/predict")
def prediction(request: PredictionRequest):
    try:
        result = predict(
            disease_id=request.disease_id,
            top_k=request.top_k
        )

        for candidate in result.get("candidates", []):
            enrich_candidate(candidate)

        return result

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(exc)}"
        )


@app.post("/stress-test")
def stress_test_endpoint(request: PredictionRequest):
    try:
        result = predict(
            disease_id=request.disease_id,
            top_k=request.top_k
        )

        for candidate in result.get("candidates", []):
            enrich_candidate(candidate)

        return result

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Stress test failed: {str(exc)}"
        )


@app.post("/predict/batch")
def batch_prediction(diseases: list[PredictionRequest]):

    if len(diseases) > 20:
        raise HTTPException(
            status_code=400,
            detail="Maximum 20 diseases per batch request."
        )

    results = []

    for request in diseases:
        try:
            result = predict(
                disease_id=request.disease_id,
                top_k=request.top_k
            )

            for candidate in result.get("candidates", []):
                enrich_candidate(candidate)

            results.append(result)

        except Exception as exc:
            results.append({
                "disease_id": request.disease_id,
                "error": str(exc)
            })

    return {
        "model_version": MODEL_VERSION,
        "count": len(results),
        "results": results
    }


@app.post("/stress-test/batch")
def batch_stress_test(diseases: list[PredictionRequest]):

    if len(diseases) > 20:
        raise HTTPException(
            status_code=400,
            detail="Maximum 20 diseases per batch request."
        )

    results = []

    for request in diseases:
        try:
            result = predict(
                disease_id=request.disease_id,
                top_k=request.top_k
            )

            for candidate in result.get("candidates", []):
                enrich_candidate(candidate)

            results.append(result)

        except Exception as exc:
            results.append({
                "disease_id": request.disease_id,
                "error": str(exc)
            })

    return {
        "model_version": MODEL_VERSION,
        "count": len(results),
        "results": results
    }