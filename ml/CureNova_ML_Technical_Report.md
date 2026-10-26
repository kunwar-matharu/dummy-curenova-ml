# CureNova 2.0 — Machine Learning Module
## Technical & Integration Report

**Project:** CureNova 2.0  
**Module:** Drug Repurposing ML + Evidence Enrichment + Stress Testing  
**Production model:** `cure_nova_xgb_final.joblib`  
**Model version:** `cure-nova-xgb-final`  
**Status:** Production-ready ML module; integration with the main CureNova application is the next step.

---

## 1. Executive Summary

The CureNova ML module is designed to **rank existing drugs as research hypotheses for alternative disease indications** using real biomedical data.

The system does **not** claim that a drug is clinically effective or safe for a disease. The ML model generates ranked candidates; independent evidence enrichment and a stress-test layer then challenge the candidate.

### Core workflow

**Prediction → Evidence Verification → Stress Testing → Trust Assessment**

The system combines:

- Open Targets drug–disease indication data
- Open Targets drug–target mechanisms
- Open Targets disease–target associations
- Open Targets molecular information
- ChEMBL pharmacology/activity evidence
- Molecular descriptors calculated from canonical SMILES
- XGBoost ranking/classification model
- Unseen-drug and unseen-disease evaluation
- Evidence-aware stress testing
- FastAPI integration layer

The final ML score is a **ranking score**, not a calibrated clinical probability.

---

# 2. Scientific Scope

## What the model does

Given a normalized disease identifier, the ML system:

1. Builds candidate drug–disease pairs.
2. Extracts drug–target and disease–target relationships.
3. Calculates target-overlap and association-based features.
4. Incorporates molecular descriptors where available.
5. Uses the trained XGBoost model to score candidate pairs.
6. Returns the highest-ranked candidates.
7. Enriches candidates with Open Targets and ChEMBL evidence.
8. Runs the CureNova Stress-Test Engine.
9. Reports supporting evidence, missing evidence, contradictions/weaknesses, and robustness flags.

## What the model does NOT do

The model does not:

- prove clinical efficacy;
- prove safety;
- recommend medication to patients;
- replace clinical trials;
- provide a treatment decision;
- interpret an ML score as a probability of clinical success.

The output is a **research hypothesis / candidate ranking**.

---

# 3. Data Sources

## 3.1 Open Targets

**Platform release:** 26.09  
**Release root:** `s3://open-targets-public-data-releases/platform/26.09/output/`

Official documentation:

- https://platform-docs.opentargets.org/
- https://platform-docs.opentargets.org/data-access/datasets
- https://platform-docs.opentargets.org/data-access/platform-datasets-on-aws
- https://platform-docs.opentargets.org/data-access/graphql-api

### Drug mechanism of action

File:

`drug_mechanism_of_action/00000000.parquet`

Local path:

`data/open_targets/drug_mechanism_of_action/00000000.parquet`

Observed:

- 6,092 rows
- 4,484 unique drugs
- 1,044 unique targets
- 5,726 unique drug–target links

The source stores aligned arrays for ChEMBL IDs and target IDs. The ML pipeline pairs these arrays by index rather than treating the arrays as independent sets.

### Clinical indications

File:

`clinical_indication/00000000.parquet`

Observed:

- 86,451 rows
- 11,378 unique drugs
- 3,631 unique diseases
- 86,451 unique drug–disease pairs

These known drug–disease indications form the positive indication source used in feature construction.

### Disease–target associations

Directory:

`association_overall_direct/`

Observed:

- 14 Parquet files
- approximately 830 MB compressed
- 7,225,847 rows
- 26,200 unique diseases
- 31,599 unique targets

Important fields include:

- `diseaseId`
- `targetId`
- `associationScore`
- `evidenceCount`
- `aggregationType`
- `aggregationValue`
- `timeseries`
- `currentNovelty`

### Open Targets molecular data

File:

`drug_molecule/00000000.parquet`

Observed:

- 19,170 rows

Important fields:

- drug ID
- canonical SMILES
- InChIKey
- drug type
- clinical stage
- name
- parent ID
- cross references
- ChEMBL IDs

---

# 4. ChEMBL Evidence Layer

## ChEMBL release

**ChEMBL release:** ChEMBL_37  
**Release date:** 2026-05-01

Official status endpoint:

https://www.ebi.ac.uk/chembl/api/data/status

Reported release statistics:

- Activities: 24,527,044
- Compound records: 3,824,604
- Distinct compounds: 2,921,148
- Targets: 18,552

## Local ChEMBL snapshot

A 500,000-row activity slice was downloaded locally because the complete ChEMBL database is substantially larger.

Local raw activity file:

`data/chembl/chembl_human_activities.csv`

After cleaning:

- 316,929 clean activity rows
- 159,568 unique molecules
- 1,779 unique targets
- 263,227 unique drug–target edges
- 176,210 strong-activity edges
- 118,527 drugs with strong activity evidence

Target mapping:

- 1,779 / 1,779 targets mapped
- 1,272 with UniProt IDs
- 507 without UniProt IDs
- 1,776 Homo sapiens-ish targets
- 1,260 unique UniProt IDs

The pipeline deliberately did **not** invent UniProt → Open Targets mappings when the attempted Ensembl mapping produced no valid mapping.

## ChEMBL evidence used by the API

The evidence layer checks activity types including:

- IC50
- Ki
- Kd
- EC50
- AC50

It uses pChEMBL values where available and summarizes target-level pharmacology evidence.

For some predicted drugs not present in the local 500k snapshot, the system can query the official ChEMBL API live.

Examples independently verified through the official API:

- CHEMBL1079742 — Erlotinib hydrochloride — 91 activities
- CHEMBL1489 — Azacitidine — 738 activities
- CHEMBL3647420 — Pyrotinib — 34 activities

---

# 5. Feature Engineering

The final model uses **39 numerical features**.

The feature family includes:

### Target overlap

- shared targets
- drug target count
- disease target count
- target Jaccard similarity

### Target association strength

- average target association
- maximum target association
- sum of target association
- association standard deviation
- overlap association
- overlap maximum association
- evidence-weighted association
- squared association

### Evidence quantity

- total target evidence
- maximum target evidence
- average target evidence
- high-confidence target count
- high-evidence target count
- evidence per shared target
- log evidence
- log sum association

### Coverage

- drug target coverage
- disease target coverage
- coverage balance
- association per shared target

### Molecular descriptors

Where molecular structure is available:

- molecular weight
- logP
- TPSA
- H-bond donors
- H-bond acceptors
- rotatable bonds
- ring count
- aromatic ring count
- heavy atoms
- fraction Csp3
- formal charge
- atom count
- drug type / clinical-stage related information

The molecular descriptor layer was generated from Open Targets molecular information using RDKit.

---

# 6. Training Dataset

## Final full dataset

File:

`data/training/final_drug_disease_dataset.parquet`

Observed:

- 6,696,672 total rows
- 6,649,145 unlabeled candidate rows
- 47,527 known-indication rows
- 4,484 drugs among candidates
- 19,375 diseases among candidates
- 3,976 drugs among known positives
- 3,014 diseases among known positives

### Critical label interpretation

The `label = 0` rows are **NOT scientifically confirmed negative drug–disease pairs**.

They represent **unlabeled candidate pairs** generated from available biological relationships.

This distinction is important and is explicitly preserved in the ML documentation.

---

# 7. Training Sample

For practical model training, a balanced/controlled training sample was created.

File:

`data/training/ml_training_sample_v4.parquet`

and CSV representation:

`data/training/ml_training_sample_v4.csv`

Training sample:

- 190,108 total rows
- 47,527 known positive indications
- 142,581 unlabeled candidates

Class ratio:

- Positive: 25%
- Unlabeled: 75%

The unlabeled class is used as a learning signal for ranking/classification, but it is not described as proven negative evidence.

---

# 8. Model Development

Several model versions were evaluated.

## HistGradientBoosting

Earlier experiments produced:

- Random held-out AP: 0.8547
- Random held-out ROC-AUC: 0.9554

Later versions reached approximately:

- Random AP: 0.8597
- Random ROC-AUC: 0.9575
- V3 random AP: 0.8580
- V3 random ROC-AUC: 0.9589

A molecular-feature version reached:

- Random AP: **0.9248**
- Random ROC-AUC: **0.9764**

However, random splitting is not sufficient evidence of generalization to unseen drugs or diseases.

---

# 9. Final Model: XGBoost

The production model is an XGBoost model trained using the v4 feature set.

Model:

`models/cure_nova_xgb_final.joblib`

Model version:

`cure-nova-xgb-final`

Training configuration used for the production model:

- XGBoost
- 1,800 estimators
- learning rate: 0.025
- max depth: 7
- min child weight: 4
- subsample: 0.90
- column subsampling: 0.90
- gamma: 0.02
- L1 regularization (`reg_alpha`): 0.10
- L2 regularization (`reg_lambda`): 2.5
- histogram tree method
- AUC-PR evaluation objective
- class weighting using the unlabeled/positive ratio
- random state: 42
- parallel training

Total model input features:

**39**

---

# 10. Final Scientific Evaluation

## Unseen-disease holdout

The model was evaluated on diseases not used during training.

Observed:

- Total diseases in split: 14,090
- Training diseases: 11,272
- Test diseases: 2,818
- Training rows: 152,870
- Test rows: 37,238

### Results

**Average Precision: 0.9047**

**ROC-AUC: 0.9735**

Top-k precision:

- Precision@100: **1.000**
- Precision@500: **0.982**
- Precision@1000: **0.980**

This measures the ability to generalize to diseases not represented in training.

---

# 11. Unseen-drug Holdout

The model was also evaluated on drugs not used during training.

Observed benchmark:

- Total drugs: 4,481
- Training drugs: 3,584
- Test drugs: 897
- Training rows: 153,002
- Test rows: 37,106

### Results

**Average Precision: 0.8652**

**ROC-AUC: 0.9580**

This is the more challenging generalization test for drug-level novelty.

---

# 12. Important Interpretation of the Metrics

These numbers are **NOT accuracy percentages**.

For example:

> AP = 0.8652 does NOT mean the model is "86.52% accurate."

Average Precision evaluates ranking quality over the precision-recall curve.

ROC-AUC measures the model's ability to rank positive examples above negative/unlabeled examples across thresholds.

Because the candidate space contains many unlabeled pairs, **AP is more informative than simply reporting accuracy**.

The system therefore reports:

- Average Precision
- ROC-AUC
- Precision@K
- Recall@K where appropriate

rather than presenting a misleading "accuracy" number.

---

# 13. Additional XGBoost Experiment

A separate hyperparameter experiment was performed to determine whether unseen-drug AP could be improved.

Results on that experiment's independently generated split:

| Model | AP | ROC-AUC |
|---|---:|---:|
| Experiment baseline | 0.851678 | 0.956645 |
| Experiment improved | 0.850744 | 0.956753 |
| Existing benchmark | **0.8652** | **0.9580** |

The experiment did not outperform the existing benchmark.

### Decision

The production model was **not replaced**.

This is intentional scientific practice: the system does not change the production model merely to obtain a larger number.

---

# 14. Candidate Ranking

The prediction interface accepts:

- normalized disease ID
- `top_k`

Example:

```json
{
  "disease_id": "MONDO_0004989",
  "top_k": 5
}
```

Example output structure:

```json
{
  "model_version": "cure-nova-xgb-final",
  "candidate_count": 5,
  "candidates": [
    {
      "drug_id": "CHEMBL1489",
      "rank": 1,
      "score": 0.996309,
      "score_type": "ranking_score"
    }
  ]
}
```

The score is a **ranking score**, not a calibrated probability of efficacy.

---

# 15. Evidence Enrichment

Each candidate can be enriched with:

## Open Targets

- drug identity
- mechanism of action
- targets
- target associations
- indication information
- molecular information

## ChEMBL

- pharmacology/activity evidence
- pChEMBL information
- activity counts
- target-level activity summaries
- strong activity indicators

## Molecular layer

- canonical SMILES availability
- InChIKey availability
- RDKit-derived molecular descriptors

This creates an independent evidence layer around the ML prediction.

---

# 16. Stress-Test Engine

The Stress-Test Engine is the main verification layer after ML ranking.

It calculates a heuristic robustness score from multiple independent components:

| Component | Weight |
|---|---:|
| ML ranking strength | 0.24 |
| Target support | 0.16 |
| Association support | 0.13 |
| Evidence support | 0.10 |
| Confidence support | 0.08 |
| ChEMBL pharmacology support | 0.20 |
| Molecular structure support | 0.04 |
| Repurposing novelty | 0.05 |

The resulting score is a **heuristic robustness score**, not a clinical probability.

## Example stress-test flags

The system can identify conditions such as:

- `NO_TARGET_OVERLAP`
- `NO_TARGET_ASSOCIATION`
- `NO_TARGET_EVIDENCE`
- `NO_CHEMBL_ACTIVITY_EVIDENCE`
- `NO_MOLECULAR_STRUCTURE`
- `STRONG_CHEMBL_ACTIVITY`
- `ML_HIGH_BUT_INDEPENDENT_SUPPORT_WEAK`
- `POTENTIAL_REPURPOSING_HYPOTHESIS`

This allows CureNova to challenge a high ML score instead of blindly accepting it.

---

# 17. Example End-to-End Result

For a tested disease (`MONDO_0004989`), the production model returned candidates with ranking scores around:

- CHEMBL1489 — 0.996309
- CHEMBL3545110 — 0.996137
- CHEMBL1201129 — 0.996042
- CHEMBL1946170 — 0.995895
- CHEMBL4594515 — 0.995473

The subsequent stress-test layer demonstrated why the raw ML ranking should not be treated as clinical evidence.

For example, some candidates had:

- strong ChEMBL activity evidence,
- molecular structure support,
- but no direct target overlap/association in the available Open Targets evidence.

The system therefore assigned low robustness interpretations rather than presenting the ML prediction as a treatment recommendation.

---

# 18. API / Backend Integration

FastAPI is implemented as the integration layer.

### Main capabilities

- drug ranking
- Open Targets evidence
- ChEMBL activity evidence
- molecular evidence
- stress testing

### Health endpoint

Reports:

- service health
- model version
- ChEMBL evidence availability
- ChEMBL evidence drug count

Current validated state:

```text
status: healthy
model_version: cure-nova-xgb-final
chembl_evidence_loaded: true
chembl_drugs: 159568
```

### Model information

The API reports:

```text
model_type: XGBoost
feature_count: 39
unseen_disease_AP: 0.9047
unseen_disease_ROC-AUC: 0.9735
unseen_drug_AP: 0.8652
unseen_drug_ROC-AUC: 0.9580
score_type: ranking_score
clinical_use: false
```

---

# 19. Reproducibility

The project contains:

- data acquisition scripts
- data cleaning scripts
- feature-generation scripts
- molecular feature generation
- ChEMBL evidence construction
- model training scripts
- prediction code
- stress-test engine
- API code
- validation script
- model artifacts
- dataset manifest

Important local directories:

```text
A:\CureNovaML\
├── data\
│   ├── open_targets\
│   ├── chembl\
│   └── training\
├── models\
├── scripts\
├── reports\
└── manifest.json
```

The production artifact is:

```text
models\cure_nova_xgb_final.joblib
```

---

# 20. Final Validation

The final pipeline validation returned:

```text
FINAL PIPELINE VALIDATION: PASS
```

The validation confirmed:

- API health
- production model loading
- model version
- prediction
- candidate ranking
- evidence enrichment
- ChEMBL evidence loading
- molecular support
- stress-test execution

---

# 21. Current ML Status

## COMPLETE

The ML side currently includes:

- [x] Real biomedical data
- [x] Open Targets integration
- [x] ChEMBL evidence
- [x] Molecular features
- [x] Drug–disease feature engineering
- [x] XGBoost production model
- [x] 39 model features
- [x] Unseen-disease evaluation
- [x] Unseen-drug evaluation
- [x] Candidate ranking
- [x] Evidence enrichment
- [x] Molecular evidence
- [x] Stress testing
- [x] FastAPI integration
- [x] Model serialization
- [x] Validation
- [x] Scientific limitations documented

## NEXT STEP

The remaining work is primarily **system integration**:

```text
CureNova Frontend
        ↓
CureNova Backend
        ↓
ML API
        ↓
Drug Ranking
        ↓
Evidence Layer
        ↓
Stress-Test Engine
        ↓
Agents / LangGraph
        ↓
Final Evidence-Grounded UI
```

---

# 22. Scientific Limitations

1. The Open Targets and ChEMBL datasets are not complete representations of all biomedical knowledge.
2. The local ChEMBL activity snapshot is a 500,000-row slice, supplemented by live API lookup for some drugs.
3. Unobserved drug–disease pairs are not automatically true negatives.
4. Random held-out performance is not treated as proof of generalization.
5. Unseen-drug and unseen-disease evaluation are therefore emphasized.
6. The ML score is not a clinical probability.
7. Stress-test scores are heuristic robustness indicators.
8. Evidence absence is not proof of biological absence.
9. The system is a research hypothesis generator, not a clinical decision system.
10. Laboratory, preclinical, clinical, and regulatory validation remain necessary before any therapeutic claim.

---

# 23. Key Technical Takeaway

CureNova's ML contribution is not simply:

> "Train a model and output the drug with the highest score."

It is:

> **Use ML to generate candidate drug–disease hypotheses, independently enrich those candidates with biomedical evidence, and stress-test the reasons supporting the prediction before presenting it as a research hypothesis.**

This separation between **prediction and verification** is central to the CureNova architecture.

---

## Production Model Summary

| Item | Value |
|---|---|
| Model | XGBoost |
| Version | `cure-nova-xgb-final` |
| Features | 39 |
| Training sample | 190,108 |
| Known positives | 47,527 |
| Unlabeled candidates | 142,581 |
| Unseen-disease AP | **0.9047** |
| Unseen-disease ROC-AUC | **0.9735** |
| Unseen-drug AP | **0.8652** |
| Unseen-drug ROC-AUC | **0.9580** |
| Score type | Ranking score |
| Clinical use | No |
| Pipeline validation | **PASS** |

---

**CureNova 2.0 — ML Module**  
*Research hypothesis generation, evidence enrichment, and robustness stress testing.*
