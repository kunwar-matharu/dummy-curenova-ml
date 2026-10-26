# CureNova Machine Learning Engine Integration Architecture

## 1. System Overview
The CureNova XGBoost Machine Learning Engine (`cure-nova-xgb-final`) has been integrated into the existing CureNova backend without replacing existing services, altering database models, or exposing the model directly to the frontend.

The integration sits behind the authenticated `POST /api/candidates/investigate` workflow orchestrated by `AgenticOrchestrator`, maintaining the scientific pipeline:
$$\text{Prediction} \longrightarrow \text{Verification} \longrightarrow \text{Stress Testing} \longrightarrow \text{Trust Assessment}$$

---

## 2. Model Specifications & Provable Provenance
- **Model Name**: CureNova XGBoost Final
- **Model Version**: `cure-nova-xgb-final`
- **Model Storage**: `ml/models/cure_nova_xgb_final.joblib`
- **Feature Set**: 39 biomedical, molecular, and pharmacological features (comprising disease target counts, Open Targets association metrics, ChEMBL bioactivities, molecular fingerprints, and topological descriptors).
- **Inference Runtime**: Direct in-process execution via DuckDB querying precomputed tabular feature records (`drug_disease_features_v4.parquet`) combined with scikit-learn / XGBoost pipeline inference.

---

## 3. Score Semantics & Calibration Truthfulness
- **Score Semantic**: **`ranking_score`** (Relative prioritization ranking score).
- **Explicit Boundary**: The score is strictly an uncalibrated ranking score. It is **NOT**:
  - Clinical efficacy probability
  - Treatment success probability
  - Platt-calibrated probability
  - Safety or tolerability probability
- **Uncertainty Calibration**:
  - The XGBoost production model does not provide epistemic or aleatoric uncertainty distributions.
  - Epistemic and aleatoric fields are reported as `None`/null (or truthful point bounds) rather than fabricated `0.0` values.
  - Calibration descriptor: `"Uncalibrated ranking score"`.

---

## 4. Held-out Evaluation Metrics
Performance evaluated on held-out benchmark splits (reported as evaluation provenance, NOT probability calibration):
- **Unseen-Disease Split**:
  - Average Precision (AP): `0.9047`
  - ROC-AUC: `0.9735`
- **Unseen-Drug Split**:
  - Average Precision (AP): `0.8652`
  - ROC-AUC: `0.9580`

---

## 5. Dual-Layer Stress Testing Architecture
CureNova maintains two distinct, complementary stress-testing systems:
1. **Candidate-Level Robustness Heuristic (`ml/stress_test.py`)**:
   - Assesses the stability of individual candidate drug-disease predictions under feature and pharmacology perturbations.
   - Outputs a robustness score (0–100) and an interpretable category:
     - `HIGHER ROBUSTNESS`
     - `MODERATE ROBUSTNESS`
     - `LOW ROBUSTNESS RESEARCH HYPOTHESIS`
   - Attached to each dynamic candidate as structured metadata.
2. **Population-Level Stress-Test Lab (`app/services/stress_test_engine.py`)**:
   - Preserved independently for batch model evaluation, subgroup stress testing, and population data shift simulations via `/api/stress-tests`.

---

## 6. Multi-Source Evidence Integration
Downstream agents (`LiteratureScout`, `TargetMechanist`, `SafetyAssessor`, `Synthesizer`) consume evidence extracted from authentic scientific repositories:
- **Curated Mechanisms of Action**: Open Targets Platform GraphQL API (verified targets, actions, and maximum clinical trial phases).
- **Pharmacology & Bioactivity**: ChEMBL 33 in vitro assay determinations (pChEMBL values, target types, and assay confidence).
- **Literature & Citations**: PubMed / MEDLINE verified publications through `LiteratureScout`.
- **Integrity Rule**: No synthetic PMIDs, DOIs, authors, or journals are fabricated for ChEMBL pharmacology or Open Targets mechanism records.

---

## 7. Disease Resolution & Graceful Fallback
- **`DiseaseResolver` (`app/services/disease_resolver.py`)**:
  - Maps natural-language disease terms into standardized Open Targets ontology identifiers (`MONDO_*`, `EFO_*`, `Orphanet_*`).
  - Employs curated verified mappings for high-frequency conditions (e.g., Pulmonary Arterial Hypertension $\to$ `MONDO_0005149`, Breast Carcinoma $\to$ `MONDO_0004989`).
  - Supports live Open Targets GraphQL entity resolution fallback.
  - Does NOT fabricate ontology IDs on resolution failure.
- **Controlled Fallback**:
  - If disease resolution yields no valid ontology identifier, or if dynamic ML inference encounters an unrecoverable runtime exception, the orchestrator gracefully falls back to pre-seeded database `CandidatePrediction` records.
  - Investigation requests never crash or leave researcher sessions unhandled.

---

## 8. Role-Based Access Control (RBAC)
- All ML-driven investigation capabilities remain strictly guarded behind `require_researcher` authentication (`GET/POST /api/candidates/investigate`).
- Unauthenticated requests receive HTTP `401 Unauthorized`.
- Non-researcher accounts receive HTTP `403 Forbidden`.
