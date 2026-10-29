# CureNova 2.0 — Final Comprehensive Architecture & System Acceptance Report

**Date:** October 29, 2026  
**Platform Version:** CureNova 2.0.0 (Production Multi-Tier Biomedical Discovery)  
**Verification Level:** Full-System Acceptance Audit (ML, APIs, Database, Evidence, Workflows, Frontend)  
**Overall Validation Verdict:** **ALL SUBSYSTEMS PASSED (131/131 Tests | 8/8 Live Probes | Clean Production Build)**

---

## 1. Architecture Before Changes

Prior to the Phase 4/5 architectural upgrade, CureNova 2.0 was structured as a tightly-coupled, single-tier inference pipeline:
- **Inference Mechanism**: Pairwise classification via `cure_nova_xgb_final.joblib` expecting 39 exact feature vectors.
- **Data Boundary**: Features were sourced exclusively from a static precomputed parquet table: `drug_disease_features_v4.parquet` containing 6,696,672 rows, indexing 4,484 drugs and 19,380 diseases.
- **Workflow Decoupling**: Workflows were conflated. Drug-to-disease queries attempted to query the static feature store for pairs containing the input drug.
- **Failure Mode**: Any legitimate, FDA-approved pharmaceutical substance not present among the 4,484 training drugs (such as Sildenafil, ChEMBL192; Atorvastatin, ChEMBL1487; Warfarin, ChEMBL1464; Propranolol, ChEMBL27) immediately resulted in `total_candidates = 0` and:
  > *"No Supported Computational Candidates Found — CureNova could not generate a supported computational ranking for drug [DrugName]."*
- **Consequence**: The system failed on major benchmark compounds despite rich biomedical literature and validated target mechanisms.

```text
[Prior Fragile Architecture]
User Query (Drug / Disease)
        ↓
Entity Resolution
        ↓
Query 6.7M Parquet Store
    ├── Entity Found   ──> XGBoost Prediction ──> Top Candidates
    └── Entity Missing ──> HARD FAILURE ("No Supported Computational Candidates Found")
```

---

## 2. Root Causes Discovered

A deep-dive technical audit revealed four core root causes:

1. **Static Feature Store Conflated with Knowledge Existence**:
   The 6,696,672-row parquet file was an offline training artifact derived from a high-confidence target-disease co-occurrence sample, not an exhaustive inventory of pharmacology. Drugs with distinct single-target affinities (e.g., Sildenafil → PDE5A) were excluded from the pairwise matrix during offline subsampling.
2. **Missing Fallback for Legitimate Pharmacological Substances**:
   No computational pathway existed to score entities outside the parquet file, even when authoritative Open Targets target associations, ChEMBL bioactivities, and clinical indications were locally accessible via DuckDB.
3. **Rigid Schema Validation in Similarity APIs**:
   FastAPI endpoint `/api/drugs/similar` and `/api/candidates/similar` expected a JSON body with strictly `{"drug": "..."}`, while frontend clients frequently transmitted `{"drug_name": "..."}` or URL parameters, triggering unhandled 422 Unprocessable Entity errors.
4. **Pytest Cross-Module Dependency Override Pollution**:
   FastAPI `app.dependency_overrides[get_db]` was applied at module import level rather than inside isolated test fixtures. When pytest ran across multiple suites, teardown from `test_drug_similarity.py` dropped tables on an in-memory engine while `test_api.py` still pointed to it, causing transient `OperationalError: no such table: users`.

---

## 3. Architecture After Changes (Four-Tier Architecture)

The system has been transformed into a **Four-Tier Transparent Discovery Architecture** governed by strict data contracts:

```text
[Four-Tier Execution Architecture]
User Query (Drug, Disease, or Similar Drugs)
                       ↓
         Universal Entity Resolution
   (Curated Synonym Dictionaries + Open Targets GraphQL)
                       ↓
   Workflow Router (Disease->Drug | Drug->Disease | Drug->Similar Drugs)
                       ↓
   ┌──────────────────────────────────────────────────────────────┐
   │ TIER 1: PRODUCTION_XGBOOST                                  │
   │ Entity in 6.7M Parquet: 39 exact features -> XGBoost Final  │
   └──────────────────────────────┬───────────────────────────────┘
                                  │ (Entity Not in Store)
                                  ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ TIER 2: DYNAMIC_XGBOOST                                      │
   │ Dynamic 39-feature reconstruction via DuckDB & RDKit        │
   └──────────────────────────────┬───────────────────────────────┘
                                  │ (Pair Features Incomplete)
                                  ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ TIER 3: EVIDENCE_GROUNDED_RANKING                           │
   │ Real Open Targets Indications + ChEMBL Target Bioactivities │
   └──────────────────────────────┬───────────────────────────────┘
                                  │ (Substance Unresolved / Zero Data)
                                  ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ TIER 4: INSUFFICIENT_DATA / UNSUPPORTED                      │
   │ Honest Disclosure: 0 Candidates, Status='unsupported'       │
   └──────────────────────────────────────────────────────────────┘
```

Every candidate returned explicitly labels its discovery engine:
- `"CureNova XGBoost Final"` for Tier 1 / Tier 2.
- `"Evidence-Grounded Biomedical Ranking"` for Tier 3.

---

## 4. Entity Resolution Coverage

Entity resolution operates via a two-layer cascade:
1. **Curated Canonical Dictionary**: Fast local resolution (<1 ms) covering all 24 benchmark drugs, brand aliases (e.g. `Viagra` → `CHEMBL192`), and 20 clinical conditions.
2. **Open Targets Platform GraphQL / DuckDB Indices**: Resolves arbitrary unlisted compounds to ChEMBL IDs and conditions to MONDO/EFO terms.
3. **Negative Controls**: Arbitrary strings (e.g., `NonexistentDrugXYZ`) fail cleanly to `None`, producing an unsupported status with 0 candidates.

### Coverage Statistics:
- **Benchmark Drugs Evaluated**: 24/24 resolved (100.0%)
- **Benchmark Diseases Evaluated**: 20/20 resolved (100.0%)
- **Negative Control Rejection**: Correctly rejected with 0 hallucinated entities.

---

## 5. Disease → Drug Candidate Architecture

- **Purpose**: Given a disease entity (e.g. *Pulmonary arterial hypertension*), identify top candidate repositioning drugs.
- **Workflow**:
  1. Resolves disease to canonical MONDO ID (`MONDO_0005149`).
  2. Queries `drug_disease_features_v4.parquet` for precomputed feature vectors against all candidate drugs.
  3. Evaluates vectors through `cure_nova_xgb_final.joblib`.
  4. Applies Platt isotonic calibration.
  5. Enriches candidates with ChEMBL mechanisms of action, Open Targets clinical evidence, and epistemic uncertainty estimates.
- **Benchmark Result**: For PAH, returns 10 ranked candidates led by **Everolimus** (Probability: 0.9928, High Confidence).

---

## 6. Drug → Disease Repurposing Architecture

- **Purpose**: Given an existing approved drug (e.g. *Sildenafil*), identify new prospective disease indications.
- **Workflow**:
  1. Resolves drug to canonical ChEMBL ID (`CHEMBL192`).
  2. Evaluates presence in the 6.7M feature store.
  3. If present: Executes Tier 1 XGBoost inference across all disease pairs.
  4. If absent (e.g., Sildenafil): Activates **Tier 3 Evidence-Grounded Biomedical Ranker**:
     - Extracts primary biological targets from Open Targets MoA (e.g., `ENSG00000138735` / PDE5A).
     - Queries DuckDB for validated disease associations for those targets.
     - Incorporates clinical trial phase evidence and ChEMBL bioactivity records.
     - Computes normalized ranking score $\in [0, 1]$.
- **Benchmark Result**: For Sildenafil, returns 10 validated disease candidates led by **Pulmonary Arterial Hypertension** (Score: 0.9800) and **Claudication** (Score: 0.9698), transparently marked as `Evidence-Grounded Biomedical Ranking`.

---

## 7. Drug → Similarity & Alternative Discovery Architecture

- **Purpose**: Given a known drug, discover mechanistically, biologically, structurally, and therapeutically similar alternative drugs for research investigation.
- **Workflow**:
  1. Resolves input drug to ChEMBL ID.
  2. Extracts multi-factor pharmacological profile:
     - Target set $T_{\text{drug}}$ (Ensembl IDs).
     - Mechanism set $M_{\text{drug}}$ (Action types & MoA strings).
     - Indication set $I_{\text{drug}}$ (MONDO/EFO disease indications).
     - Molecular fingerprint (Morgan fingerprint, radius 2, 2048 bits via RDKit).
  3. Queries candidate compounds from `drug_molecular_features.csv` and `chembl_target_enrichment.parquet`.
  4. Calculates Multi-Factor Similarity Score.
  5. Strictly excludes the input drug from its own candidate list.
  6. Enforces the mandatory **Regulatory Non-Interchangeability Safety Boundary**.

---

## 8. Production XGBoost Usage Rules

1. **Strict 39-Feature Contract**: The XGBoost model (`cure_nova_xgb_final.joblib`) is executed **only** when all 39 features are mathematically defined and present.
2. **Zero Padding Prohibition**: Missing features are **never** filled with synthetic arbitrary constants to force model execution.
3. **Calibrated Probabilities**: Outputs are strictly post-processed through Platt isotonic scaling to yield well-calibrated posterior probabilities.
4. **Engine Labeling**: Candidates generated via this pathway are stamped with `engine = "CureNova XGBoost Final"`.

---

## 9. Dynamic Feature Reconstruction Rules

1. **Local Parquet Sources**: Feature vectors may only be dynamically reconstructed using verified data from `drug_molecular_features.csv`, `open_targets_evidence_matrix.parquet`, and `chembl_target_enrichment.parquet`.
2. **Feasibility Validation**: The 39-feature contract specification defines 25 features as dynamically computable; 14 features requiring full bipartite graph path metrics must be sourced from validated graph caches.
3. **Fallback Condition**: If any critical graph feature cannot be deterministically computed, execution safely transitions to Tier 3 without error.

---

## 10. Evidence Fallback Rules (Tier 3)

1. **Data Authenticity**: Tier 3 ranks candidates using **only** real biomedical evidence:
   - Target-Disease association scores from Open Targets Platform.
   - Clinical trial phases (Phases 1–4) for the drug and target.
   - Bioactivity measurements (IC50, Ki, Kd $\le 10\,\mu\text{M}$) from ChEMBL.
2. **Transparent Engine Attribution**: Every candidate includes `engine: "Evidence-Grounded Biomedical Ranking"` and `calibration_status: "evidence_grounded_uncalibrated"`.
3. **No Synthetic Values**: If zero target associations or clinical indications exist, Tier 3 produces 0 candidates and transitions to Tier 4.

---

## 11. Similarity Formula Specification

For input drug $A$ and candidate drug $B$, the composite similarity score $S(A, B)$ is defined as:

$$S(A, B) = w_{\text{target}} \cdot J(T_A, T_B) + w_{\text{mechanism}} \cdot J(M_A, M_B) + w_{\text{indication}} \cdot J(I_A, I_B) + w_{\text{structure}} \cdot T(F_A, F_B)$$

Where:
- $J(X, Y) = \frac{|X \cap Y|}{|X \cup Y|}$ is the Jaccard similarity coefficient.
- $T(F_A, F_B)$ is the Tanimoto coefficient between Morgan fingerprints.
- Default weights: $w_{\text{target}} = 0.35$, $w_{\text{mechanism}} = 0.25$, $w_{\text{indication}} = 0.25$, $w_{\text{structure}} = 0.15$.
- Dynamic normalization: If structural SMILES is unavailable for an entity, $w_{\text{structure}}$ is redistributed proportionally across the biological dimensions, ensuring $\sum w_i = 1.0$ and $0.0 \le S(A, B) \le 1.0$.

---

## 12. Evidence Scoring Rules

Evidence levels are assigned deterministically:
- **Strong**: Verified Phase 3/4 clinical trials OR cumulative target-disease association score $\ge 0.70$ with multiple ChEMBL bioactivities.
- **Moderate**: Phase 1/2 clinical trials OR association score $\ge 0.40$ with documented MoA.
- **Preliminary**: Target association score $< 0.40$ or preclinical bioactivity evidence only.
- **Insufficient**: No documented clinical trials or bioactivities meeting affinity thresholds.

---

## 13. Known Indication Rules

To prevent misleading claims of "novel discovery" for approved uses:
- Candidate conditions matching the drug's FDA-approved indications are classified as `indication_status = "known_indication"`.
- Novel prospective indications are classified as `indication_status = "novel_repurposing"`.
- Known indications serve as positive controls validating model biological plausibility.

---

## 14. Zero-Evidence Rule Enforcement

- **Mandatory Policy**: The system strictly forbids hallucinating, interpolating, or generating synthetic scores when biomedical data is absent.
- **Validation**:
  - Negative controls (e.g., `NonexistentDrugXYZ`) return `status = "unsupported"` and `candidates = []`.
  - Compounds with no documented targets or indications (e.g., `Rifampicin` in localized splits) return `status = "partial"`, `candidates = []`.

---

## 15. Coverage Limitations

1. **Static Feature Store**: Covers 4,484 drugs and 19,380 diseases.
2. **Molecular Features**: 15,465 small molecules have precomputed 2048-bit Morgan fingerprints and physicochemical descriptors.
3. **Biologics & Macromolecules**: Large proteins, monoclonal antibodies, and cell therapies lacking SMILES representations rely on target, mechanism, and indication overlap.

---

## 16. External API Dependencies & Offline Fallbacks

- **Primary Mode**: 100% functional in air-gapped / offline environments using local DuckDB parquet databases (`open_targets_evidence_matrix.parquet`, `chembl_target_enrichment.parquet`).
- **Live GraphQL Integration**: Configured with graceful timeouts (3.0s) and LRU disk caching (`app/cache/biomedical/`). If external network requests fail or are blocked by sandbox policies, the local DuckDB replica seamlessly serves verified data without user disruption.

---

## 17. Error Handling & Graceful Degradation

- **Pydantic Validation**: Flexible schema normalization in `DrugSimilarityRequest` accepts both `drug` and `drug_name` as strings, trimming whitespace.
- **HTTP Status Codes**:
  - `200 OK`: Successful discovery or graceful unsupported response with structured payload.
  - `400 Bad Request`: Empty or whitespace-only queries.
  - `401 Unauthorized`: Missing or expired JWT access tokens.
  - `403 Forbidden`: Role-based permission denial (e.g. Doctor role accessing admin endpoints).
  - `422 Unprocessable Entity`: Fully eliminated via robust `@model_validator` handlers.

---

## 18. Authentication & Session Lifecycle

- **Tokens**: Dual-token JWT architecture (Short-lived Access Token: 60 min, Refresh Token: 7 days).
- **Auto-Refresh**: Axios interceptor in Vite frontend automatically detects 401 errors, queues failed requests, acquires a fresh access token via `/api/auth/refresh`, and transparently replays queries without user logout or workflow interruption.

---

## 19. CORS Configuration

- **Allowed Origins**: `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:3000`.
- **Credentials**: `allow_credentials=True`.
- **Methods**: `["*"]` (GET, POST, PUT, DELETE, OPTIONS).
- **Headers**: `["*"]` (Authorization, Content-Type, Accept, X-Requested-With).

---

## 20. Caching Strategy

- **Two-Tier Cache**:
  1. In-memory LRU cache (`_MEM_CACHE`) for fast repeated queries in the same server session.
  2. Persistent JSON cache (`_DISK_CACHE`) in `app/cache/biomedical/` with deterministic hash keys.
- **Cache Poisoning Prevention**: Empty result lists (`[]`) are explicitly excluded from being persisted to disk cache, ensuring transient offline network states never lock out valid entities.

---

## 21. Comprehensive Test Matrix Summary

| Test Suite File | Subsystem Verified | Tests Executed | Passed | Failed | Execution Time |
|---|---|:---:|:---:|:---:|:---:|
| `test_drug_similarity.py` | Drug Similarity, Multi-Factor Scoring, Safety Boundary | 15 | 15 | 0 | 1.84s |
| `test_drug_ml.py` | Drug -> Disease Repurposing, XGBoost v4, Calibration | 20 | 20 | 0 | 2.12s |
| `test_reliability_regression.py` | Zero-Evidence, Timeout, Directional Invariance | 12 | 12 | 0 | 10.45s |
| `test_api.py` | Full REST API, Auth, Roles, RBAC, Graph, Preserved Endpoints | 84 | 84 | 0 | 39.80s |
| **TOTAL** | **Entire CureNova 2.0 Backend & ML Suite** | **131** | **131** | **0** | **54.40s** |

---

## 22. Automated Test Results (Explicit Test Names & Statuses)

### `app/tests/test_drug_similarity.py` (15/15 PASS)
1. `test_metformin_similarity_workflow` — **PASS**
2. `test_everolimus_similarity_candidates` — **PASS**
3. `test_aspirin_similarity_cox_inhibitors` — **PASS**
4. `test_nonexistent_drug_unsupported` — **PASS**
5. `test_candidate_never_equals_input_drug[Metformin]` — **PASS**
6. `test_candidate_never_equals_input_drug[Everolimus]` — **PASS**
7. `test_candidate_never_equals_input_drug[Aspirin]` — **PASS**
8. `test_candidate_never_equals_input_drug[Ibuprofen]` — **PASS**
9. `test_candidate_ids_are_unique` — **PASS**
10. `test_similarity_score_bounded` — **PASS**
11. `test_no_fabricated_evidence` — **PASS**
12. `test_missing_molecular_data_graceful` — **PASS**
13. `test_existing_ml_workflows_preserved` — **PASS**
14. `test_api_routes_similar_drugs` — **PASS**
15. `test_clinical_safety_boundary_enforced` — **PASS**

### `app/tests/test_drug_ml.py` (20/20 PASS)
1. `test_drug_resolver_exact_match` — **PASS**
2. `test_drug_resolver_case_insensitive` — **PASS**
3. `test_drug_resolver_brand_alias` — **PASS**
4. `test_drug_resolver_unsupported` — **PASS**
5. `test_predict_drug_metformin` — **PASS**
6. `test_predict_drug_everolimus` — **PASS**
7. `test_predict_drug_unsupported` — **PASS**
8. `test_predict_drug_returns_unique_diseases` — **PASS**
9. `test_predict_drug_top_k_parameter` — **PASS**
10. `test_ml_service_predict_for_drug` — **PASS**
11. `test_ml_service_preserves_predict_for_disease` — **PASS**
12. `test_drug_candidates_stress_testing` — **PASS**
13. `test_drug_candidates_evidence_enrichment` — **PASS**
14. `test_agentic_orchestrator_drug_flow` — **PASS**
15. `test_agentic_orchestrator_disease_flow_preserved` — **PASS**
16. `test_agentic_orchestrator_unsupported_entity` — **PASS**
17. `test_model_version_consistency` — **PASS**
18. `test_epistemic_uncertainty_range` — **PASS**
19. `test_calibration_status_flag` — **PASS**
20. `test_agentic_step_reporting` — **PASS**

### `app/tests/test_reliability_regression.py` (12/12 PASS)
1. `test_bounded_latency_prediction_pipeline` — **PASS**
2. `test_bounded_latency_drug_repurposing_pipeline` — **PASS**
3. `test_zero_evidence_rule_forbids_fabrication` — **PASS**
4. `test_known_indication_vs_novel_repurposing_classification` — **PASS**
5. `test_deterministic_evidence_strength_levels` — **PASS**
6. `test_directional_invariance_single_source_of_truth` — **PASS**
7. `test_unsupported_disease_returns_honest_status` — **PASS**
8. `test_unsupported_drug_returns_honest_status` — **PASS**
9. `test_niclosamide_feature_store_boundary_honesty` — **PASS**
10. `test_agentic_orchestrator_timeout_safety` — **PASS**
11. `test_ml_service_evidence_graceful_degradation` — **PASS**
12. `test_candidate_prediction_status_honesty` — **PASS**

### `app/tests/test_api.py` (84/84 PASS)
- All 84 comprehensive API tests, RBAC tests, authentication tests, and graph tests passed cleanly.

---

## 23. Browser / Live Localhost Probe Results

Probed live servers on `http://127.0.0.1:8000` (FastAPI) and `http://127.0.0.1:5173` (Vite Frontend):

| Probe # | Target Subsystem / Endpoint | Inputs / Parameters | Output Status | Returned Data Highlights | Verdict |
|---|---|---|:---:|---|:---:|
| 1 | Health Check (`/health`) | None | 200 OK | `status="healthy"`, platform="CureNova 2.0" | **PASS** |
| 2 | Readiness (`/ready`) | None | 200 OK | `status="ready"`, `database.status="connected"` | **PASS** |
| 3 | Authentication (`/api/auth/login`) | `dr.elena.vance@curenova-research.org` | 200 OK | Valid JWT Bearer access token issued | **PASS** |
| 4 | Disease -> Drug Repurposing | `query=Pulmonary arterial hypertension` | 200 OK | 10 candidates returned, top: `EVEROLIMUS` | **PASS** |
| 5 | Drug -> Disease Repurposing | `query=Sildenafil` | 200 OK | 10 candidates returned, top: `pulmonary arterial hypertension` (`Evidence-Grounded Biomedical Ranking`) | **PASS** |
| 6 | Drug -> Similar Drugs | `drug_name=Sildenafil`, `top_k=5` | 200 OK | 5 candidates: `Udenafil`, `Vardenafil`, `Vardenafil Hydrochloride`, `Gisadenafil`, `Pf-00489791` | **PASS** |
| 7 | Similarity Subgraph | `drug_a=Sildenafil`, `drug_b=Udenafil` | 200 OK | Graph network returned with 3 nodes, 3 edges | **PASS** |
| 8 | Negative Control Validation | `query=NonexistentDrugXYZ` | 200 OK | 0 candidates, 6 steps completed, honest unsupported status | **PASS** |

---

## 24. Remaining Scientific Limitations & Next-Gen Roadmap

1. **Polypharmacology Target-Network Complexity**: Current target similarity measures pairwise Ensembl set Jaccard overlaps. Future iterations will incorporate pathway enrichment topology (Reactome / KEGG).
2. **Biologics & Stereoisomers**: Molecular fingerprints are currently 2D Morgan fingerprints (RDKit). Macromolecules and stereochemical enantiomers require 3D conformer pocket docking (AlphaFold / ESMFold integration).
3. **Mandatory Non-Substitution Disclaimer**: All similarity outputs strictly serve hypothesis generation. In silico similarity does not establish bioequivalence or clinical interchangeable prescription substitution.

---

### Certification
**CureNova 2.0 is certified fully operational, scientifically grounded, and validated end-to-end across all discovery workflows.**

