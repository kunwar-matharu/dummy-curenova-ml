# CureNova ML — Complete ML & Drug Repurposing Audit Report

**Repository Audited:** `https://github.com/kunwar-matharu/dummy-curenova-ml` (`A:\curenova-backend`)  
**Companion Training Repository:** `A:\CureNovaML`  
**Production Model:** `cure_nova_xgb_final.joblib` (`cure-nova-xgb-final`)  
**Audit Date:** October 29, 2026  
**Auditor:** Senior Biomedical ML Engineer & System Architect  
**Scope:** Strict ML, Biomedical Data, Feature Engineering, Evidence Retrieval, Agent Orchestration, and Prediction Backend. Frontend UI is completely excluded.

---

## 1. Executive Summary

This audit provides an exhaustive, code-level inspection of the machine learning, biomedical feature engineering, inference pipelines, and agent orchestration within the CureNova project.

### Core Audit Verdict:
1. **Disease-to-Drug Repurposing Pipeline is COMPLETE and GENUINELY OPERATIONAL**:
   - The production model `cure_nova_xgb_final.joblib` is an **XGBoostClassifier** trained with 39 multimodal biological and molecular features across 190,108 training rows.
   - It operates against a full feature store (`drug_disease_features_v4.parquet`) containing **6,696,672 rows** (4,484 drugs, 19,380 diseases).
   - For any resolved disease (e.g. *Pulmonary Arterial Hypertension*, *Colorectal Cancer*, *Alzheimer's Disease*), it queries unindicated candidate drug pairs (`label = 0`), scores them via `predict_proba`, enriches them with authentic Open Targets mechanism data and ChEMBL pharmacological bioactivity assays, and evaluates them with an independent heuristic stress-test engine.
   - Evaluation metrics on held-out entities are verified: **Unseen Disease AP: 0.9047, ROC-AUC: 0.9735**; **Unseen Drug AP: 0.8652, ROC-AUC: 0.9580**.

2. **Drug-to-Disease Workflow is BROKEN / INCOMPLETE in the Backend Orchestration**:
   - The ML inference engine (`predict_v4.py`) was only written with `predict(disease_id)` (`WHERE disease_id = ... AND label = 0`). It lacks a corresponding `predict_drug(drug_id)` query.
   - In `app/services/agentic_orchestrator.py`, dynamic ML is **only** invoked for disease entities.
   - For drug queries, the system attempts a lookup against the SQLite table `CandidatePrediction`, which only contains **7 static pre-seeded rows** from `seed_data.py`.
   - Crucially, the system lacks a `DrugResolver`. If a user enters any drug outside the 8 seeded in SQLite (e.g. `Everolimus`, `Aspirin`, `Pyrotinib`), the orchestrator fails to recognize it as a drug and erroneously routes it into `DiseaseResolver.resolve_disease()`. Open Targets GraphQL searches for `entityNames: ["disease"]` matching the string, misclassifying the drug as a disease (e.g. `Everolimus` resolves to `glioma`; `Aspirin` resolves to `aspirin hydrolysis measurement`), subsequently running the Disease-to-Drug ML model on that disease!

3. **Repurposing vs Retrieval**:
   - For **Diseases**, the system performs genuine **candidate hypothesis ranking** on non-approved drug pairs (`label = 0`).
   - For **Drugs**, the system merely performs **static database retrieval** from 7 seeded rows.

---

## 2. Architecture & Data Flow Map

```
BIOMEDICAL DATA SOURCES
├── Open Targets Platform 26.09 (Mechanisms of Action, Target-Disease Direct Associations, Indications, Molecules)
└── ChEMBL 33/37 (Live REST API & Local Bioactivity Snapshot chembl_drug_evidence.json)
                                  ↓
FEATURE ENGINEERING (A:\CureNovaML\scripts\build_features_v3.py & build_features_v4.py)
├── Biological Interaction Overlap (Target Jaccard, Shared Targets, Evidence Counts, Association Scores)
└── Molecular Descriptors via RDKit (MW, LogP, TPSA, HBD, HBA, Rotatable Bonds, Rings, Fraction CSP3)
                                  ↓
FEATURE STORE & TRAINING DATA
├── drug_disease_features_v4.parquet (6,696,672 rows, 4,484 drugs, 19,380 diseases, 42 columns)
├── drug_molecular_features.csv (15,465 small molecules with 13 RDKit descriptors)
└── ml_training_sample_v4.csv (190,108 rows: 47,527 positive clinical indications + 142,581 unlabeled candidates)
                                  ↓
MODEL TRAINING (A:\CureNovaML\scripts\train_xgb_final_production.py)
├── XGBoostClassifier (1800 estimators, lr=0.025, max_depth=7, scale_pos_weight=3.0, hist tree method)
└── Saved Artifact: ml/models/cure_nova_xgb_final.joblib (8.99 MB)
                                  ↓
INFERENCE & PREDICTION (ml/predict_v4.py & ml/predictor.py)
├── query_candidates(disease_id) -> DuckDB scan WHERE disease_id = ... AND label = 0
├── Feature vector formatting (39 features in exact training order)
└── XGBoost inference: model.predict_proba(X)[:, 1] -> Ranking scores
                                  ↓
EVIDENCE & STRESS TESTING (ml/evidence_utils.py & ml/stress_test.py)
├── Open Targets: Target mechanisms, clinical stage, drug type
├── ChEMBL: Target binding potency, max pChEMBL, assay counts, strong targets
└── Heuristic Stress Test: 8-component stability score & penalty flags
                                  ↓
BACKEND ORCHESTRATION (app/services/agentic_orchestrator.py)
├── Role 1: Query Validation
├── Role 2: Entity Resolution (DiseaseResolver vs SQLite Drug match)
├── Role 3/4: Candidate Generation (MLService for diseases; DB lookup for drugs)
├── Role 5: LiteratureScout (Evidence retrieval)
├── Role 6: TargetMechanist (Knowledge graph & pathway synthesis)
├── Role 7: SafetyAssessor (Drug interaction & contraindication check)
└── Role 8: Synthesizer (Citation guardrails, structured synthesis)
```

---

## 3. Model Audit

| Attribute | Specification | Verified in Code |
| :--- | :--- | :--- |
| **Model Type** | `xgboost.sklearn.XGBClassifier` | `train_xgb_final_production.py:24` |
| **Model Artifact** | `ml/models/cure_nova_xgb_final.joblib` | File size: 8,998,399 bytes |
| **Artifact Format** | Python `joblib` bundle dictionary | Keys: `['model', 'features', 'model_version', 'training_rows', 'positive_rows', ...]` |
| **Target Variable** | `label` (Binary: `1` = approved/clinical indication, `0` = unindicated candidate pair) | Verified in `build_features_v3.py:165` |
| **Feature Count** | Exactly 39 features | Verified in `cure_nova_xgb_final.json` |
| **Objective** | `binary:logistic` | `train_xgb_final_production.py:34` |
| **Evaluation Metric** | `aucpr` (Area under PR curve) | `train_xgb_final_production.py:35` |
| **Imbalance Handling**| `scale_pos_weight = 3.0` (142,581 / 47,527) | `train_xgb_final_production.py:22` |
| **Tree Method** | `hist` | `train_xgb_final_production.py:37` |
| **Hyperparameters** | `n_estimators=1800`, `learning_rate=0.025`, `max_depth=7`, `min_child_weight=4`, `subsample=0.90`, `colsample_bytree=0.90`, `gamma=0.02`, `reg_alpha=0.10`, `reg_lambda=2.5` | Verified in training script |
| **Loadability** | Loads instantly via `joblib.load()` | Tested in Python 3.14 runtime |
| **Backend Integration** | Actively loaded by `ml/predictor.py` and wrapped by `app/services/ml_service.py` | Active in production path |

---

## 4. Training Data Audit

- **Primary Source Parquet:** `ml/data/training/drug_disease_features_v4.parquet` (and `A:\CureNovaML\data\training\drug_disease_features_v4.parquet`)
- **Total Rows:** `6,696,672`
- **Total Columns:** `42` (`drug_id`, `disease_id`, 39 feature columns, `label`)
- **Unique Drugs:** `4,484`
- **Unique Diseases:** `19,380`
- **Positive Examples (`label = 1`):** `47,527` (genuine clinical indications extracted from Open Targets `clinical_indication/00000000.parquet`)
- **Unlabeled Candidate Pairs (`label = 0`):** `6,649,145` (pairs sharing at least 1 target from Open Targets `drug_mechanism_of_action` and `association_overall_direct`)
- **Sampled Training Set (`ml_training_sample_v4.csv`):**
  - **Rows:** `190,108`
  - **Positives:** `47,527` (100% of all available indications)
  - **Unlabeled Negatives:** `142,581` (exact 1:3 ratio sample)
  - **Unique Drugs in Training:** `4,481`
  - **Unique Diseases in Training:** `14,090`
- **Directionality:**
  - The training data represents **$DRUG + DISEASE \to ASSOCIATION\_SCORE$**.
  - A row exists if and only if the drug and disease share $\ge 1$ biological target.
  - The label indicates whether that target-sharing pair is an established indication (`1`) or an unindicated repurposing hypothesis (`0`).
- **Data Leakage Safeguards:**
  - Disease-holdout evaluation partitioned diseases into strictly disjoint train/test sets (no disease in test was seen during training).
  - Drug-holdout evaluation partitioned drugs into strictly disjoint train/test sets (no drug in test was seen during training).

---

## 5. Feature Engineering Audit

The feature vector consists of **39 features** combining biological interaction topology, evidence density, and small-molecule physicochemical properties.

### Complete Feature Specification Table:

| Index | Feature Name | Biological / Chemical Meaning | Source | Type | Level |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `shared_targets` | Number of common biological targets | Open Targets MoA & Direct Assoc | Integer | Pair interaction |
| 2 | `drug_target_count` | Total known targets of the drug | Open Targets MoA | Integer | Drug-specific |
| 3 | `disease_target_count` | Total associated targets of the disease | Open Targets Direct Assoc | Integer | Disease-specific |
| 4 | `target_jaccard` | Jaccard similarity coefficient of target sets | Computed | Float | Pair interaction |
| 5 | `avg_target_association` | Mean Open Targets association score across shared targets | Open Targets Direct Assoc | Float | Pair interaction |
| 6 | `max_target_association` | Peak Open Targets association score across shared targets | Open Targets Direct Assoc | Float | Pair interaction |
| 7 | `sum_target_association` | Cumulative association score of shared targets | Open Targets Direct Assoc | Float | Pair interaction |
| 8 | `total_target_evidence` | Total publication / study evidence count across shared targets | Open Targets Direct Assoc | Float | Pair interaction |
| 9 | `max_target_evidence` | Max evidence count across any single shared target | Open Targets Direct Assoc | Integer | Pair interaction |
| 10 | `avg_target_evidence` | Average evidence count per shared target | Open Targets Direct Assoc | Float | Pair interaction |
| 11 | `high_confidence_targets` | Number of shared targets with association score $\ge 0.5$ | Open Targets Direct Assoc | Float | Pair interaction |
| 12 | `high_evidence_targets` | Number of shared targets with evidence count $\ge 100$ | Open Targets Direct Assoc | Float | Pair interaction |
| 13 | `evidence_weighted_association` | $\sum (\text{assoc} \times \log_{10}(\text{evidence} + 1))$ | Computed | Float | Pair interaction |
| 14 | `squared_association` | Sum of squared association scores | Computed | Float | Pair interaction |
| 15 | `association_std` | Population standard deviation of target associations | Computed | Float | Pair interaction |
| 16 | `drug_target_coverage` | `shared_targets / drug_target_count` | Computed | Float | Pair interaction |
| 17 | `disease_target_coverage` | `shared_targets / disease_target_count` | Computed | Float | Pair interaction |
| 18 | `association_per_shared_target`| `avg_target_association / shared_targets` | Computed | Float | Pair interaction |
| 19 | `evidence_per_shared_target` | `total_target_evidence / shared_targets` | Computed | Float | Pair interaction |
| 20 | `log_evidence` | $\log_{10}(\text{total\_target\_evidence} + 1)$ | Computed | Float | Pair interaction |
| 21 | `log_sum_association` | $\log_{10}(\text{sum\_target\_association} + 1)$ | Computed | Float | Pair interaction |
| 22 | `log_drug_targets` | $\log_{10}(\text{drug\_target\_count} + 1)$ | Computed | Float | Drug-specific |
| 23 | `log_disease_targets` | $\log_{10}(\text{disease\_target\_count} + 1)$ | Computed | Float | Disease-specific |
| 24 | `overlap_association` | `avg_target_association * shared_targets` | Computed | Float | Pair interaction |
| 25 | `overlap_max_association` | `max_target_association * shared_targets` | Computed | Float | Pair interaction |
| 26 | `coverage_balance` | `drug_target_coverage * disease_target_coverage` | Computed | Float | Pair interaction |
| 27 | `molecular_weight` | Molecular weight in Daltons | RDKit from SMILES | Float | Drug-specific |
| 28 | `molecular_logp` | Calculated octanol-water partition coefficient (Wildman-Crippen) | RDKit from SMILES | Float | Drug-specific |
| 29 | `molecular_tpsa` | Topological Polar Surface Area ($\text{Å}^2$) | RDKit from SMILES | Float | Drug-specific |
| 30 | `molecular_hbd` | Number of hydrogen bond donors | RDKit from SMILES | Integer | Drug-specific |
| 31 | `molecular_hba` | Number of hydrogen bond acceptors | RDKit from SMILES | Integer | Drug-specific |
| 32 | `molecular_rotatable_bonds`| Number of rotatable bonds | RDKit from SMILES | Integer | Drug-specific |
| 33 | `molecular_rings` | Number of rings | RDKit from SMILES | Integer | Drug-specific |
| 34 | `molecular_aromatic_rings` | Number of aromatic rings | RDKit from SMILES | Integer | Drug-specific |
| 35 | `molecular_heavy_atoms` | Heavy atom count | RDKit from SMILES | Integer | Drug-specific |
| 36 | `molecular_fraction_csp3` | Ratio of sp3 carbons to total carbons | RDKit from SMILES | Float | Drug-specific |
| 37 | `molecular_formal_charge` | Net formal charge | RDKit from SMILES | Integer | Drug-specific |
| 38 | `molecular_num_atoms` | Total atom count | RDKit from SMILES | Integer | Drug-specific |
| 39 | `has_molecular_structure` | Binary indicator (1 if small-molecule SMILES resolved, 0 if biologic/missing) | Precomputed | Integer | Drug-specific |

### Preprocessing & Normalization:
- Training missing value handling: `df[features].astype(np.float32)`.
- Inference missing value handling: `X = candidates[FEATURES].replace([np.inf, -np.inf], np.nan).fillna(0)`.
- Preprocessing and feature ordering in inference (`predict_v4.py:75-105`) match the training bundle (`train_xgb_final_production.py:14-16`) identically.

---

## 6. Drug → Disease Workflow Audit

**Expected Pipeline:**
`User Drug -> Drug Resolver -> ChEMBL ID -> Target Profile -> Candidate Diseases -> Feature Generation -> XGBoost -> Disease Ranking -> Evidence -> Results`

**Current Actual Pipeline Status: 🔴 BROKEN / INCOMPLETE**

### Execution Trace & Evidence:
1. **No Drug Entity Resolver**: `app/services/agentic_orchestrator.py` lines 61–85 checks:
   ```python
   matched_drug = db.query(Drug).filter(Drug.name.ilike(f"%{query}%")).first()
   ```
   The SQLite `drugs` table contains only **8 records** (`Metformin`, `Baricitinib`, `Imatinib`, `Ketamine`, `Sildenafil`, `Sirolimus`, `Niclosamide`, `Losartan`).
2. **Unsupported Drug Fallthrough**:
   If a user enters a drug not in the 8 database rows (such as `Everolimus` or `Aspirin`), `matched_drug` evaluates to `None`. The orchestrator executes `DiseaseResolver.resolve_disease(query)`!
3. **Severe Cross-Ontology Misclassification**:
   `DiseaseResolver._query_opentargets_api` queries Open Targets GraphQL for `entityNames: ["disease"]`. Because diseases often mention drugs in clinical context:
   - Input `"Everolimus"` resolves to `"glioma"` (`MONDO_0005070`)!
   - Input `"Aspirin"` resolves to `"aspirin hydrolysis measurement"` (`EFO_0004386`)!
   The system then executes the Disease-to-Drug ML pipeline on those diseases, presenting candidate drugs for glioma or aspirin hydrolysis!
4. **Seeded Drug Static Lookup**:
   For the 8 recognized drugs (e.g. `Imatinib`), lines 139–144 of `agentic_orchestrator.py` execute:
   ```python
   candidates = db.query(CandidatePrediction).filter(
       (CandidatePrediction.drug_name.ilike(f"%{entity_resolved_name}%")) |
       (CandidatePrediction.chembl_id == chembl_id)
   ).order_by(CandidatePrediction.rank).all()
   ```
   No dynamic ML prediction occurs. It retrieves 1 static pre-seeded database row (`Imatinib for PAH`, `prediction_score: 0.884`, `model_version: 2.4.0`).
5. **No ML Inference Implementation for Drugs**:
   `ml/predict_v4.py` and `ml/predictor.py` do not expose any `predict_drug()` or `query_candidates_by_drug()` function, despite the fact that `drug_disease_features_v4.parquet` contains thousands of candidate diseases for each drug (e.g. 1,202 for Everolimus; 1,093 for Imatinib; 2,635 for Aspirin).

---

## 7. Disease → Drug Workflow Audit

**Expected Pipeline:**
`User Disease -> Disease Resolver -> MONDO ID -> Candidate Drugs -> Feature Generation -> XGBoost -> Drug Ranking -> Evidence -> Stress Test -> Results`

**Current Actual Pipeline Status: ✅ COMPLETE & VERIFIED**

### Execution Trace & Evidence:
1. **Disease Entity Resolution**:
   - `DiseaseResolver.resolve_disease()` maps common terms to canonical Open Targets ontology identifiers (e.g. `Pulmonary arterial hypertension` -> `MONDO_0005149`, `Colorectal cancer` -> `MONDO_0005575`, `Alzheimer's` -> `MONDO_0004975`).
   - If not in the curated dictionary of 11 core diseases, it queries Open Targets GraphQL API dynamically.
2. **Candidate Generation & DuckDB Scan**:
   - In `predict_v4.py:query_candidates()`, DuckDB executes:
     ```sql
     SELECT * FROM read_parquet('ml/data/training/drug_disease_features_v4.parquet')
     WHERE disease_id = 'MONDO_0005149' AND label = 0
     ```
   - Scans 6.69M rows in ~800ms. For PAH, returns 2,899 candidate drugs that share targets with PAH but are not approved indications.
3. **Feature Formatting & Molecular Fusion**:
   - Left-joins candidate drugs with `drug_molecular_features.csv` on `drug_id` to attach 13 RDKit descriptors.
   - Formats the 39 features in exact order.
4. **XGBoost Inference**:
   - Executes `model.predict_proba(X)[:, 1]` using `cure_nova_xgb_final.joblib`.
   - Sorts candidates descending by score and takes `top_k`.
5. **Biological Evidence Enrichment**:
   - Open Targets: pulls mechanisms of action and clinical stage via `ml/evidence_utils.py:get_drug_evidence()`.
   - ChEMBL: pulls binding potency, max pChEMBL, and strong targets via `get_chembl_live_evidence()`.
6. **Stress Testing**:
   - Calculates 8-factor heuristic robustness score via `ml/stress_test.py:run_stress_test()`.
7. **Empirical Validation Output (Pulmonary Arterial Hypertension)**:
   - Rank 1: **Everolimus** (`CHEMBL1908360`) — Score: `0.9928`, Max pChEMBL: `10.3`, Robustness: `29.91`
   - Rank 2: **Tacrolimus** (`CHEMBL3989887`) — Score: `0.9863`, Robustness: `27.07`
   - Rank 3: **Isosorbide Mononitrate** (`CHEMBL1311`) — Score: `0.9845`, Robustness: `23.29`
   - Rank 4: **Gisadenafil** (`CHEMBL1928262`) — Score: `0.9840`
   - Rank 5: **Telmisartan** (`CHEMBL1017`) — Score: `0.9826`

---

## 8. Drug Repurposing Logic

### What CureNova actually does:
- **For Diseases**: **Hybrid ML + Biomedical Target Overlap + Evidence Enrichment (Option G)**.
  - Candidate generation: All approved small molecules/biologics in Open Targets sharing $\ge 1$ target with the disease where `label = 0` (unindicated).
  - Prioritization: XGBoost scoring learned from target association strength, evidence volume, Jaccard similarity, and molecular descriptors.
  - Validation: Independent ChEMBL bioactivity assay verification and stress testing.
- **For Drugs**: **Static Database Indication Retrieval (Option A)**.
  - Queries `CandidatePrediction` table in SQLite for 1 of 7 hardcoded seed records.

### Answer to Core Repurposing Question:
> *"Does CureNova actually discover/rank potential new drug-disease relationships, or does it mainly retrieve known relationships?"*

**CureNova genuinely discovers and ranks potential new drug-disease relationships for DISEASES.** The model explicitly filters out known indications (`label = 0`) and ranks unapproved drugs based on target mechanism overlap. However, for **DRUGS**, the system does not rank new diseases; it retrieves static database rows.

---

## 9. Candidate Generation Audit

| Entity Direction | Candidate Source | Filtering Logic | Fallback |
| :--- | :--- | :--- | :--- |
| **Disease $\to$ Drug** | `drug_disease_features_v4.parquet` | `WHERE disease_id = ... AND label = 0` | Scoped DB lookup `CandidatePrediction.disease_name.ilike(...)` |
| **Drug $\to$ Disease** | SQLite `CandidatePrediction` table | `WHERE drug_name = ... OR chembl_id = ...` | Empty candidate list `[]` |

- **No Static Fake Fallback**: The previously observed issue where unsupported entities defaulted to PAH has been removed. Unsupported entities return `[]` with an honest message.

---

## 10. ML Score vs Evidence Score Audit

| Score | Engine / Formula | Type | Interpretation | Calibrated? |
| :--- | :--- | :--- | :--- | :--- |
| **Prediction Score** | `model.predict_proba(X)[:, 1]` | `ranking_score` | Relative priority ranking among candidates sharing targets. | **NO**. Uncalibrated. Influenced by `scale_pos_weight = 3.0`. NOT a clinical efficacy probability. |
| **Stress-Test Robustness** | Weighted sum of 8 evidence signals minus penalties | `heuristic_robustness_score` (0–100) | Algorithmic and pharmacological stability of the hypothesis. | **NO**. Heuristic rule-based metric. |
| **Target Association** | Open Targets direct association score (0–1) | `evidence_score` | Genetic/genomic target-to-disease association strength. | Calibrated by Open Targets pipeline. |
| **ChEMBL Potency** | $-\log_{10}(\text{IC}_{50} / \text{EC}_{50} / K_i)$ | `pharmacological_potency` | In vitro binding affinity (pChEMBL $\ge 7$ is sub-100nM). | Verified experimental assay measurement. |

---

## 11. Biomedical Data Audit

1. **Open Targets Platform 26.09**:
   - `drug_mechanism_of_action`: 322 KB parquet (target Ensembl IDs, ChEMBL IDs, action types).
   - `drug_molecule`: 6.8 MB parquet (15,465 molecules, SMILES, clinical stage).
   - `clinical_indication`: used during training for positive labels (`label = 1`).
   - `association_overall_direct`: used during training for target-disease association scores and evidence counts.
2. **ChEMBL 33/37**:
   - `chembl_drug_evidence.json`: 64 MB local precomputed bioactivity snapshot.
   - `chembl_api_cache.json`: local cache for 49 compounds with live fallback to `https://www.ebi.ac.uk/chembl/api/data`.
3. **Distinction between Known Indications and Repurposing Hypotheses**:
   - Fully implemented in `predict_v4.py` (`label = 0` enforcement) and `stress_test.py` (`flags: ["KNOWN_INDICATION"]` vs `["POTENTIAL_REPURPOSING_HYPOTHESIS"]`).

---

## 12. Agent & Orchestrator Audit

The backend agentic pipeline is orchestrated by `app/services/agentic_orchestrator.py` across 11 discrete roles:

| Role # | Role Name | Implementation | Actual Work Performed | Status |
| :---: | :--- | :--- | :--- | :---: |
| 1 | Query Validation | Regex & string sanitization | Blocks prompt injection & empty queries | ✅ VERIFIED |
| 2 | Entity Resolution | `DiseaseResolver` & SQLite query | Maps to MONDO ontology or drug identity | 🟡 PARTIAL (Drugs lacking resolver) |
| 3/4 | Candidate Prioritization | `MLService` (XGBoost) | Runs 39-feature inference for diseases | 🟡 PARTIAL (Disease only) |
| 5 | LiteratureScout | `LiteratureScout.run()` | Retrieves SQLite evidence & live PubMed | ✅ VERIFIED |
| 6 | TargetMechanist | `TargetMechanist.run()` | Knowledge graph traversal & pathway analysis | ✅ VERIFIED |
| 7 | SafetyAssessor | `SafetyAssessor.run()` | Audits DDI table & contradictory evidence | ✅ VERIFIED |
| 8 | Stress Testing | `stress_test_engine.py` | 8-component perturbation analysis | ✅ VERIFIED |
| 9 | Synthesizer | `Synthesizer.run()` | Enforces strict citation validation | ✅ VERIFIED |
| 10 | Boundary Enforcement | Guardrail filters | Injects research disclaimers | ✅ VERIFIED |
| 11 | Dossier Assembly | JSON aggregator | Formats response structure | ✅ VERIFIED |

---

## 13. Model Evaluation Audit

The production model `cure-nova-xgb-final` was evaluated using independent entity-level holdouts to prevent biological data leakage:

### Unseen-Disease Holdout (80/20 Entity Split):
- **Train Diseases:** 11,272 | **Test Diseases:** 2,818 (strictly disjoint)
- **Average Precision (PR-AUC):** **0.9047**
- **ROC-AUC:** **0.9735**
- **Methodology:** Validated in `evaluate_xgb_disease_holdout.py`. Prevents the model from memorizing disease-specific target topologies.

### Unseen-Drug Holdout (80/20 Entity Split):
- **Train Drugs:** 3,584 | **Test Drugs:** 897 (strictly disjoint)
- **Average Precision (PR-AUC):** **0.8652**
- **ROC-AUC:** **0.9580**
- **Methodology:** Validated in `evaluate_xgb_drug_holdout.py`. Prevents the model from memorizing drug-specific promiscuity.

---

## 14. Empirical Inference Test Results

Live tests executed against the runtime backend:

| Test # | Query | Resolved Entity | Entity Type | Candidates | Model Used | Top Candidate / Score |
| :---: | :--- | :--- | :--- | :---: | :--- | :--- |
| 1 | `Pulmonary arterial hypertension` | Pulmonary Arterial Hypertension | Disease | 10 | `cure-nova-xgb-final` | Everolimus (0.9928) |
| 2 | `Colorectal Cancer` | Colorectal Cancer | Disease | 10 | `cure-nova-xgb-final` | Hydroxyurea (0.9968) |
| 3 | `Alzheimer's Disease` | Alzheimer's Disease & Neurodegeneration | Disease | 10 | `cure-nova-xgb-final` | Telmisartan (0.9882) |
| 4 | `Imatinib` | Imatinib | Drug | 1 | `2.4.0` (Static DB) | Imatinib for PAH (0.8840) |
| 5 | `Everolimus` | glioma | Disease (Misclassified) | 10 | `cure-nova-xgb-final` | X-82 (0.9942) |
| 6 | `Aspirin` | aspirin hydrolysis measurement | Disease (Misclassified) | 3 | `cure-nova-xgb-final` | Tacrolimus (0.8812) |
| 7 | `NonexistentDrugXYZ` | NonexistentDrugXYZ | Unsupported Entity | 0 | None | None (`[]` returned) |
| 8 | `NonexistentDiseaseXYZ`| NonexistentDiseaseXYZ | Unsupported Entity | 0 | None | None (`[]` returned) |

---

## 15. Feature Store & Database Statistics

### Feature Store (`drug_disease_features_v4.parquet`):
- **Location:** `ml/data/training/drug_disease_features_v4.parquet`
- **File Size:** `393,263,004 bytes` (~375 MB)
- **Row Count:** `6,696,672`
- **Unique Drugs:** `4,484`
- **Unique Diseases:** `19,380`
- **Coverage:** Complete pairwise cross-product of all target-sharing drug-disease pairs in Open Targets.
- **Top Disease Candidate Densities:**
  - Breast Carcinoma: 4,343 candidate drugs
  - Alzheimer's Disease: 4,188 candidate drugs
  - Glioblastoma Multiforme: 4,044 candidate drugs
  - Parkinson's Disease: 4,039 candidate drugs
  - Type 2 Diabetes: 4,027 candidate drugs
  - Colorectal Cancer: 3,905 candidate drugs
  - Pulmonary Arterial Hypertension: 2,899 candidate drugs

### Curated Benchmark vs Full Store:
- `scripts/build_candidate_features.py` defines a prototype **30 benchmark drugs** across 6 diseases.
- The production feature store contains **4,484 drugs**, covering all FDA-approved and clinical-stage compounds annotated in Open Targets.

---

## 16. What is Actually Complete?

| ML Capability | Status | Evidence | Files | Explanation |
| :--- | :---: | :--- | :--- | :--- |
| **Model Training** | ✅ COMPLETE | Script trains XGBoost on 190K rows with scale_pos_weight=3 | `A:\CureNovaML\scripts\train_xgb_final_production.py` | Fully functional training script. |
| **Model Evaluation** | ✅ COMPLETE | 80/20 entity-level holdouts on unseen diseases and drugs | `evaluate_xgb_disease_holdout.py`, `evaluate_xgb_drug_holdout.py` | AP: 0.9047 (disease), 0.8652 (drug). |
| **Model Artifact** | ✅ COMPLETE | Bundled XGBoost model with feature metadata | `ml/models/cure_nova_xgb_final.joblib` | 8.99 MB bundle verified. |
| **Feature Engineering** | ✅ COMPLETE | 39 multimodal biological + molecular features | `build_features_v3.py`, `build_features_v4.py` | Full DuckDB feature generation pipeline. |
| **Feature Store** | ✅ COMPLETE | 6.7M row Parquet covering 4.4K drugs and 19.3K diseases | `ml/data/training/drug_disease_features_v4.parquet` | Verified in place. |
| **Disease Resolution** | ✅ COMPLETE | Curated MONDO mappings + live Open Targets GraphQL | `app/services/disease_resolver.py` | Resolves diseases accurately. |
| **Drug Resolution** | 🔴 BROKEN | No resolver; only checks 8 SQLite rows; falls back to disease | `app/services/agentic_orchestrator.py:62` | Unseeded drugs misclassified as diseases. |
| **Disease $\to$ Drug** | ✅ COMPLETE | Dynamic XGBoost inference on 2.8K–4.3K candidates | `ml/predict_v4.py`, `app/services/ml_service.py` | Fully working and verified. |
| **Drug $\to$ Disease** | 🔴 BROKEN | No ML inference implemented; static 7-row DB lookup | `app/services/agentic_orchestrator.py:139` | Does not run XGBoost for drugs. |
| **Drug Repurposing Logic** | 🟡 PARTIAL | Repurposing ranking for diseases; static lookup for drugs | `ml/predict_v4.py:27` | Filter `label = 0` works for diseases only. |
| **Candidate Generation**| 🟡 PARTIAL | Complete for diseases (DuckDB); static for drugs | `ml/predict_v4.py:query_candidates` | 6.65M candidate pairs for diseases. |
| **Evidence Retrieval** | ✅ COMPLETE | Open Targets mechanisms + ChEMBL bioassays | `ml/evidence_utils.py` | Real data, no fabricated citations. |
| **Stress Testing** | ✅ COMPLETE | 8-component perturbation robustness engine | `ml/stress_test.py` | Output distinguished from ML score. |
| **Agent Orchestration**| ✅ COMPLETE | 11-step pipeline with citation validation | `app/services/agentic_orchestrator.py` | Executes all agent roles. |
| **Dynamic Features** | ⚪ NOT IMPL | Online feature extraction for brand new SMILES/targets | N/A | Batch DuckDB scripts only. |
| **New-Drug Inference** | ⚪ NOT IMPL | Unseen drugs cannot be scored dynamically | N/A | Limited to 4,484 drugs in parquet. |
| **New-Disease Inference**| 🟡 PARTIAL | Works if disease is in Open Targets parquet; not if novel | `ml/predict_v4.py` | Covers 19,380 diseases in parquet. |
| **End-to-End Pipeline**| 🟡 PARTIAL | 100% complete for Disease $\to$ Drug; broken for Drug $\to$ Disease | Full repository | Directional asymmetry in backend. |

---

## 17. What is Left? (Prioritized Technical Roadmap)

| Priority | Remaining Work | Why Needed | Dependencies | Difficulty |
| :---: | :--- | :--- | :--- | :---: |
| **P0** | **Implement `DrugResolver`** | Prevent drugs like Everolimus, Aspirin, Pyrotinib from being misclassified as diseases by Open Targets GraphQL. | ChEMBL REST API / local mapping | Low |
| **P0** | **Implement `predict_drug(drug_id)` in `predict_v4.py`** | Enable genuine ML prediction of candidate diseases for a given drug (`SELECT * WHERE drug_id = ... AND label = 0`). | `drug_disease_features_v4.parquet` | Low |
| **P0** | **Wire Drug ML Pipeline in `agentic_orchestrator.py`** | Replace static 7-row SQLite fallback with live XGBoost disease ranking when `entity_type == "Drug"`. | `predict_drug` | Low |
| **P1** | **Expose Drug-to-Disease in `MLService`** | Provide unified `generate_repurposing_candidates_for_drug()` method. | `predict_drug` | Low |
| **P1** | **Add DuckDB index on `drug_id`** | Accelerate `WHERE drug_id = ...` queries across the 6.7M row parquet file. | DuckDB | Low |
| **P2** | **Dynamic Online Molecular Feature Generator** | Compute the 13 RDKit descriptors on-the-fly for any user-submitted SMILES string. | RDKit | Medium |
| **P3** | **Dynamic Target Interaction Generator** | Accept novel target lists and compute the 26 biological overlap features in real time without precomputed parquet. | Open Targets API | High |

---

## 18. Explicit Answers to Core Questions (Q1–Q12)

### Q1: Can CureNova currently take a drug and genuinely predict potential diseases using the trained ML model?
**NO.**
The inference adapter `ml/predict_v4.py` only implements `predict(disease_id)` with `WHERE disease_id = ... AND label = 0`. In `agentic_orchestrator.py`, drug queries bypass ML and perform a static database query on SQLite's `CandidatePrediction` table (which has only 7 seeded rows). Furthermore, drugs not in SQLite are misclassified as diseases.

### Q2: Can CureNova currently take a disease and genuinely predict potential drugs using the trained ML model?
**YES.**
For any disease ontology ID (e.g. `MONDO_0005149`, `MONDO_0005575`), `MLService` scans `drug_disease_features_v4.parquet` for unapproved pairs (`label = 0`), applies `cure_nova_xgb_final.joblib`, computes 39 features, ranks candidates descending by score, and enriches them with Open Targets and ChEMBL evidence.

### Q3: Is drug-to-disease the same ML task as disease-to-drug in the current implementation, or are they different workflows?
**THEY ARE COMPLETELY DIFFERENT WORKFLOWS IN THE CURRENT IMPLEMENTATION.**
Biologically, the model evaluates pair compatibility ($DRUG + DISEASE \to SCORE$). But in implementation, Disease $\to$ Drug is a live XGBoost inference engine scanning millions of parquet rows, while Drug $\to$ Disease is a static SQLite database retrieval from 7 rows.

### Q4: Does the system actually perform drug repurposing, or mainly retrieve existing drug-disease associations?
**IT ACTUALLY PERFORMS DRUG REPURPOSING FOR DISEASES.**
The SQL query strictly requires `WHERE label = 0`, ensuring that known approved indications are filtered out, and only novel candidate hypotheses are ranked. For drugs, however, it merely retrieves static existing records.

### Q5: Can a completely new drug receive a genuine ML prediction?
**NO.**
The system relies on precomputed rows in `drug_disease_features_v4.parquet` (covering 4,484 drugs). There is no runtime pipeline to calculate the 26 biological target overlap features for an arbitrary new chemical entity on-the-fly.

### Q6: Can a completely new disease receive a genuine ML prediction?
**PARTIALLY.**
If the disease is annotated in Open Targets and present among the 19,380 diseases in the parquet feature store, YES. If the disease is novel (no precomputed target associations), NO.

### Q7: What exactly are the 30 benchmark/feature-store drugs?
They are a hardcoded list of 30 representative compounds defined in `scripts/build_candidate_features.py` (e.g. Candesartan, Everolimus, Imatinib, Pyrotinib, Tacrolimus) used during initial benchmarking and prototype validation. They are distinct from the full feature store which contains 4,484 drugs.

### Q8: How many drug-disease pairs can the current model actually score?
**6,696,672 pairs** in `drug_disease_features_v4.parquet` (6,649,145 candidate repurposing pairs and 47,527 known indication pairs) across 4,484 drugs and 19,380 diseases.

### Q9: What prevents scoring more drugs/diseases?
The lack of an online, real-time feature extraction pipeline that computes target overlap and association metrics dynamically from raw input (such as custom target lists or novel gene expression profiles).

### Q10: What is the SINGLE biggest remaining ML blocker?
**The lack of a Drug-to-Disease ML inference pipeline and Drug Entity Resolver in the backend orchestrator.**

### Q11: What is the minimum work required to make the ML portion project-complete?
1. Add `predict_drug(drug_id)` to `ml/predict_v4.py` using `SELECT * WHERE drug_id = ... AND label = 0`.
2. Add a `DrugResolver` service to normalize drug names to ChEMBL IDs.
3. Wire the drug branch in `agentic_orchestrator.py` to call `MLService` dynamically.

### Q12: Which existing components should NOT be changed because they are already working?
1. `ml/models/cure_nova_xgb_final.joblib` (Production XGBoost model artifact).
2. The 39 feature definitions and order.
3. `ml/data/training/drug_disease_features_v4.parquet` (6.69M rows).
4. `ml/data/training/drug_molecular_features.csv` (15,465 molecules).
5. `ml/evidence_utils.py` (Open Targets & ChEMBL evidence fetchers).
6. `ml/stress_test.py` (Stress-test engine).
7. `app/services/disease_resolver.py` (Disease ontology mapping).
8. `app/services/biomedical_agents.py` (Scout, Mechanist, Assessor, Synthesizer).

---

## 19. Exact Reproduction Commands

All findings in this report can be reproduced using the following commands:

```powershell
# 1. Inspect Production Model Metadata
python -c "import json; print(json.dumps(json.load(open('ml/models/cure_nova_xgb_final.json', encoding='utf-8-sig')), indent=2))"

# 2. Inspect Parquet Feature Store Dimensions & Class Balance
python -c "import duckdb; con = duckdb.connect(); print(con.execute(\"SELECT count(*), count(DISTINCT drug_id), count(DISTINCT disease_id), sum(CASE WHEN label=1 THEN 1 ELSE 0 END), sum(CASE WHEN label=0 THEN 1 ELSE 0 END) FROM read_parquet('ml/data/training/drug_disease_features_v4.parquet')\").fetchall())"

# 3. Test Disease-to-Drug Live ML Inference (Pulmonary Arterial Hypertension)
python ml/predict_v4.py MONDO_0005149 5

# 4. Test Disease-to-Drug Enriched Inference (with ChEMBL bioassays & Stress Test)
python ml/predictor.py MONDO_0005149 3

# 5. Run Full Backend Pytest Suite
pytest app/tests/ -v
```

