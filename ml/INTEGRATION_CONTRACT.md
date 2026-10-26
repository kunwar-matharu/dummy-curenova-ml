# CureNova ML — Backend Integration Contract

## Base URL

http://127.0.0.1:8000

## 1. Health Check

GET /health

Response:

{
  "status": "healthy",
  "model_version": "cure-nova-ml-v4"
}

---

## 2. Model Information

GET /model/info

Returns:

- model_version
- model_type
- feature_count
- evaluation metrics
- score_type
- clinical_use

---

## 3. Drug Prediction

POST /predict

Request:

{
  "disease_id": "MONDO_0004989",
  "top_k": 10
}

Response structure:

{
  "disease_id": "MONDO_0004989",
  "model_version": "cure-nova-ml-v4",
  "candidate_count": 10,
  "candidates": [
    {
      "drug_id": "CHEMBL3647420",
      "rank": 1,
      "score": 0.984294,
      "score_type": "ranking_score",
      "evidence_refs": {
        "drug_id": "CHEMBL3647420",
        "sources": [],
        "drug_name": "...",
        "drug_type": "...",
        "maximum_clinical_stage": "...",
        "mechanisms": []
      }
    }
  ],
  "disclaimer": "These are research hypotheses generated from biomedical data."
}

---

## 4. Stress Test

POST /stress-test

Request:

{
  "disease_id": "MONDO_0004989",
  "top_k": 10
}

The endpoint:

1. Runs the ML ranking model.
2. Retrieves biomedical evidence.
3. Checks target overlap.
4. Checks target association.
5. Checks evidence volume.
6. Checks evidence confidence.
7. Checks molecular structure.
8. Checks known-indication status.
9. Calculates a heuristic robustness score.

The stress-test score is NOT a clinical probability.

---

## 5. Batch Prediction

POST /predict/batch

Request:

{
  "disease_ids": [
    "MONDO_0004989",
    "MONDO_0005737"
  ],
  "top_k": 10
}

Maximum:

20 diseases per request.

---

## 6. Batch Stress Test

POST /stress-test/batch

Request:

{
  "disease_ids": [
    "MONDO_0004989",
    "MONDO_0005737"
  ],
  "top_k": 10
}

Maximum:

20 diseases per request.

---

# Recommended LangGraph Workflow

Disease Input
      ↓
Disease Normalization
      ↓
CureNova ML /predict
      ↓
Candidate Drug Ranking
      ↓
Evidence Retrieval
      ↓
CureNova ML /stress-test
      ↓
Evidence / Contradiction Agents
      ↓
Trust Assessment
      ↓
Research Hypothesis Report

---

# Important Integration Rule

The LangGraph system should NOT interpret:

score

as:

probability of efficacy.

Use:

ranking_score

instead.

The stress-test value should be represented as:

heuristic_robustness_score

and not as:

clinical confidence
probability of success
treatment probability

---

# Recommended Agent Responsibilities

## ML Ranking Agent

Calls:

POST /predict

Purpose:

Generate ranked drug candidates.

## Evidence Agent

Uses the evidence references returned by the ML service and retrieves supporting biomedical literature/data.

## Stress-Test Agent

Calls:

POST /stress-test

Purpose:

Challenge the candidate using independent biomedical signals.

## Contradiction Agent

Searches for contradictory or negative evidence.

## Final Trust Agent

Combines:

ML ranking
+
Biomedical evidence
+
Stress-test results
+
Contradiction evidence

and produces a research-oriented trust assessment.

---

# Safety Boundary

The ML service produces:

Research hypotheses.

It must NOT be presented by downstream agents as:

- treatment advice
- prescription
- clinical efficacy prediction
- clinical safety guarantee
- medical diagnosis

Final responses should clearly state that candidates require independent validation.

---

# Example End-to-End Flow

Input:

{
  "disease_id": "MONDO_0004989",
  "top_k": 5
}

↓

ML returns:

Drug A — rank 1
Drug B — rank 2
Drug C — rank 3
Drug D — rank 4
Drug E — rank 5

↓

Stress Test evaluates each candidate.

↓

Evidence Agent retrieves literature.

↓

Contradiction Agent searches for conflicting evidence.

↓

Final Trust Agent produces:

Candidate
ML ranking
Biomedical mechanism
Supporting evidence
Contradictory evidence
Stress-test score
Evidence quality
Research priority

---

# Error Handling

Backend should handle:

400 — Invalid request
404 — Disease/candidate not available
422 — Validation error
500 — Internal ML service error

For transient service failures, the backend may retry the request.

Do not silently convert failed ML requests into negative predictions.

---

# Service Startup

From:

A:\CureNovaML

run:

python -m uvicorn scripts.api:app --host 127.0.0.1 --port 8000

For local development.

The backend/LangGraph service should call:

http://127.0.0.1:8000

when both services run on the same machine.

For deployment, replace the base URL with the deployed ML service URL.

---

# Production Model

models/cure_nova_ml_v4.joblib

Version:

cure-nova-ml-v4

Feature count:

39

