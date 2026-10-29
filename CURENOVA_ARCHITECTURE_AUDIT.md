# CureNova 2.0 — Comprehensive Architecture & Discovery Workflow Audit

**Date:** October 29, 2026  
**Auditor:** CureNova Senior AI Systems & Biomedical Architecture Team  
**Scope:** Complete ML, Biomedical Data, Entity Resolution, Prediction Engines, Evidence Infrastructure, and Three Independent Discovery Workflows.

---

## 1. Executive Summary

CureNova 2.0 is an agentic AI drug-repurposing, drug-similarity, and polypharmacy research platform.

### Core Architecture Findings:
1. **Three Distinct Workflows**:
   - `disease_to_drug`: User enters disease $\to$ identifies candidate repositioning compounds.
   - `drug_to_disease`: User enters drug $\to$ identifies prospective clinical disease indications.
   - `drug_to_drug_similarity`: User enters drug $\to$ discovers structurally, mechanistically, biologically, and therapeutically similar alternative drugs for research investigation.
2. **Current Critical Bottleneck**:
   - The production XGBoost model (`cure_nova_xgb_final.joblib`) was trained on a 6,696,672-row feature store (`drug_disease_features_v4.parquet`) covering 4,484 drugs and 19,380 diseases.
   - Previous logic treated the feature store as the **sole definition of existence**: if a legitimate, FDA-approved pharmaceutical entity (e.g., **Sildenafil**, ChEMBL192) was not among the 4,484 pre-computed drugs in that table, the system failed with:
     > *"No Supported Computational Candidates Found — CureNova could not generate a supported computational ranking for drug Sildenafil."*
   - This failure mode is scientifically ungrounded: Sildenafil has canonical SMILES, validated MoA (Phosphodiesterase 5A inhibitor), Ensembl target `ENSG00000138735`, 91 clinical trial indications in Open Targets, and 10+ high-affinity bioactivity records in ChEMBL.
3. **Architectural Solution**:
   - Implementation of a **Multi-Tier Execution Architecture**:
     - `PRODUCTION_XGBOOST`: For entity pairs present in the validated 6.7M feature store.
     - `DYNAMIC_XGBOOST`: When the validated 39-feature contract can be dynamically calculated from authoritative local parquets without fabrication.
     - `EVIDENCE_GROUNDED_RANKING`: For legitimate drugs/diseases outside the static 6.7M store using authoritative Open Targets GraphQL/parquet evidence, ChEMBL bioactivity, and target-disease associations.
     - `INSUFFICIENT_DATA`: Explicit, transparent communication when true biomedical coverage is sparse.
   - Strict adherence to the **Zero-Evidence Rule** and **Non-Interchangeability Boundary**.

---

## 2. Inventory of Current Data Sources & Repositories

| Data Resource | Path / Source | Format & Size | Entities & Coverage | Role in System |
|---|---|---|---|---|
| **Production XGBoost** | `ml/models/cure_nova_xgb_final.joblib` | XGBClassifier (v4) | 39 Features, calibrated ranking | Primary pairwise classification engine |
| **Model Metadata** | `ml/models/cure_nova_ml_v4_metadata.json` | JSON | Feature names, parameters, metrics | Model schema source of truth |
| **Pair Feature Store** | `ml/data/training/drug_disease_features_v4.parquet` | Parquet (6,696,672 rows, 42 cols) | 4,484 drugs, 19,380 diseases | Pre-computed training & inference feature matrix |
| **Molecular Descriptors** | `ml/data/training/drug_molecular_features.csv` | CSV (15,465 rows, 14 cols) | 15,465 small molecules | 13 RDKit-derived physicochemical descriptors |
| **OT Drug Molecules** | `ml/data/open_targets/drug_molecule/00000000.parquet` | Parquet (19,170 molecules) | ChEMBL IDs, SMILES, names, trade names, synonyms | Universal drug resolution & SMILES lookup |
| **OT Mechanism of Action** | `ml/data/open_targets/drug_mechanism_of_action/00000000.parquet` | Parquet (6,092 rows) | ChEMBL IDs, MoA descriptions, Ensembl target IDs | Biochemical targets & mechanism convergence |
| **ChEMBL Evidence** | `ml/data/chembl/chembl_drug_evidence.json` | JSON (159,568 drugs) | Targets, max/median pChEMBL, assay counts | Quantitative bioactivity profiles |
| **ChEMBL API Cache** | `ml/data/chembl/chembl_api_cache.json` | JSON (bounded disk cache) | Live HTTP response payloads | Rate-limited external ChEMBL lookup cache |
| **Open Targets Platform API** | `https://api.platform.opentargets.org/api/v4/graphql` | HTTPS GraphQL | Global target-disease and drug-indication graph | Dynamic evidence retrieval & ontology fallback |
| **SQLite Application DB** | `curenova.db` | SQLite 3 | Users, tokens, audit logs, seed entities | Session state, auth, and research history |

---

## 3. Current ML Models & 39-Feature Schema

The production model `cure_nova_xgb_final.joblib` expects exactly 39 features in deterministic order:

### A. Graph & Target Association Features (1–26):
1. `shared_targets`: Integer count of shared target genes between drug and disease.
2. `drug_target_count`: Total validated target proteins of the drug.
3. `disease_target_count`: Total genetic/biochemical targets associated with the disease.
4. `target_jaccard`: Jaccard similarity index across drug and disease target sets.
5. `avg_target_association`: Mean Open Targets overall association score across shared targets.
6. `max_target_association`: Peak target-disease association score among shared targets.
7. `sum_target_association`: Cumulative association score of all shared targets.
8. `total_target_evidence`: Total evidence count (data submissions) supporting shared targets.
9. `max_target_evidence`: Maximum evidence item count for any shared target.
10. `avg_target_evidence`: Mean evidence count across shared targets.
11. `high_confidence_targets`: Count of shared targets with association score $\ge 0.5$.
12. `high_evidence_targets`: Count of shared targets with evidence count $\ge 10$.
13. `evidence_weighted_association`: Association score weighted by empirical evidence depth.
14. `squared_association`: Sum of squared target association scores.
15. `association_std`: Standard deviation of association scores across shared targets.
16. `drug_target_coverage`: Ratio of shared targets to drug's total targets.
17. `disease_target_coverage`: Ratio of shared targets to disease's total targets.
18. `association_per_shared_target`: Normalized association per shared target node.
19. `evidence_per_shared_target`: Normalized evidence count per shared target node.
20. `log_evidence`: $\ln(1 + \text{total\_target\_evidence})$.
21. `log_sum_association`: $\ln(1 + \text{sum\_target\_association})$.
22. `log_drug_targets`: $\ln(1 + \text{drug\_target\_count})$.
23. `log_disease_targets`: $\ln(1 + \text{disease\_target\_count})$.
24. `overlap_association`: Product of `target_jaccard` and `avg_target_association`.
25. `overlap_max_association`: Product of `target_jaccard` and `max_target_association`.
26. `coverage_balance`: Harmonic ratio between drug and disease target coverages.

### B. Physicochemical & Structural Descriptors (27–39):
27. `molecular_weight`: Exact molecular mass ($g/\text{mol}$).
28. `molecular_logp`: Octanol-water partition coefficient ($\text{cLogP}$).
29. `molecular_tpsa`: Topological polar surface area ($\text{\AA}^2$).
30. `molecular_hbd`: Hydrogen bond donor count.
31. `molecular_hba`: Hydrogen bond acceptor count.
32. `molecular_rotatable_bonds`: Rotatable bond count.
33. `molecular_rings`: Total ring count.
34. `molecular_aromatic_rings`: Aromatic ring count.
35. `molecular_heavy_atoms`: Non-hydrogen atom count.
36. `molecular_fraction_csp3`: Fraction of $sp^3$ hybridized carbon atoms.
37. `molecular_formal_charge`: Net formal charge at neutral pH.
38. `molecular_num_atoms`: Total atom count.
39. `has_molecular_structure`: Binary flag (1 if SMILES resolved, 0 otherwise).

---

## 4. Entity Resolution Architecture

### Drug Resolution Pipeline (`DrugResolver`)
1. **Curated Exact Mappings**: Fast-path for benchmark and commonly queried drugs, synonyms, and trade names (e.g., `Viagra` $\to$ Sildenafil, `Gleevec` $\to$ Imatinib, `Glucophage` $\to$ Metformin, `Afinitor` $\to$ Everolimus).
2. **Local Molecule Parquet Search (`00000000.parquet`)**: Over 19,170 small molecules with canonical names, trade names, and synonym arrays.
3. **ChEMBL Identifier Matching**: Validates raw ChEMBL IDs (`CHEMBL192`, `CHEMBL25`).
4. **SQLite Database Matching**: Lookup against `drugs` table.
5. **Open Targets Platform GraphQL Search**: Remote fallback for newer or rarer compounds.

### Disease Resolution Pipeline (`DiseaseResolver`)
1. **Curated Mappings**: Standardized mappings for benchmark conditions and abbreviations (e.g., `PAH` $\to$ Pulmonary Arterial Hypertension, `AD` $\to$ Alzheimer's Disease, `T2D` $\to$ Type 2 Diabetes, `CRC` $\to$ Colorectal Cancer).
2. **Ontology Prefix Recognition**: Direct resolution for `MONDO_*`, `EFO_*`, `Orphanet_*`, `HP_*`, `OBA_*`.
3. **SQLite Database Matching**: Lookup against `diseases` table.
4. **Open Targets Platform GraphQL Query**: Dynamic ontology name and identifier resolution.

---

## 5. Three Independent Discovery Workflows

```
                        ┌──────────────────────────────────────────────┐
                        │              USER SEARCH QUERY               │
                        └──────────────────────┬───────────────────────┘
                                               │
                                 Universal Entity Resolution
                                               │
                        ┌──────────────────────┴──────────────────────┐
                        ▼                                             ▼
                 [ DRUG ENTITY ]                              [ DISEASE ENTITY ]
                        │                                             │
         ┌──────────────┴──────────────┐                              │
         ▼                             ▼                              ▼
   WORKFLOW B                    WORKFLOW C                     WORKFLOW A
   Drug → Disease Repurposing    Drug → Similar Drugs           Disease → Drug Candidates
   - Candidate disease pool      - Molecular (Tanimoto)         - Candidate compound pool
   - Multi-tier prediction:      - Target Jaccard overlap       - Multi-tier prediction:
     * Production XGBoost        - Mechanism convergence          * Production XGBoost
     * Evidence-Grounded         - Indication similarity          * Evidence-Grounded
   - Known indication filter     - ChEMBL bioactivity           - Known indication filter
   - Deterministic evidence      - Multi-factor score [0, 1]    - Deterministic evidence
   - Stress test ranking         - NON-SUBSTITUTION boundary    - Stress test ranking
         │                             │                              │
         ▼                             ▼                              ▼
   [ Disease Hypotheses ]        [ Similar Drugs ]              [ Drug Candidates ]
```

---

## 6. Root Cause Analysis: The Sildenafil Failure

### Why did Sildenafil fail?
1. `DrugResolver` correctly resolved `Sildenafil` to canonical name `"Sildenafil"` and ChEMBL ID `"CHEMBL192"`.
2. Execution routed to `ml/predict_v4.py::predict_drug("CHEMBL192")`.
3. `query_disease_candidates` executed:
   ```sql
   SELECT * FROM read_parquet('ml/data/training/drug_disease_features_v4.parquet')
   WHERE drug_id = 'CHEMBL192' AND label = 0
   ```
4. Sildenafil (`CHEMBL192`) was not part of the negative training split in that specific 6.7M table; hence, DuckDB returned 0 rows.
5. The pipeline treated empty feature store rows as total absence of scientific reality, immediately terminating with:
   `"No unlabeled candidate pairs were found for this drug in the current candidate dataset."`
6. `AgenticOrchestrator` received `candidate_count: 0` and defaulted to `"No Supported Computational Candidates Found"`.

### The Correct Biomedical Reality for Sildenafil:
- Target: `ENSG00000138735` (PDE5A).
- Associated diseases in Open Targets: 710 diseases, including `Pulmonary Arterial Hypertension` (Revatio, approved), `Erectile Dysfunction` (Viagra, approved), `Benign Prostatic Hyperplasia`, `Heart Failure`, `Chronic Kidney Disease`, `Fetal Growth Restriction`, `Raynaud's Phenomenon`.
- By introducing `EVIDENCE_GROUNDED_RANKING`, Sildenafil yields top-ranked disease hypotheses with real evidence provenance, without fabricating XGBoost scores.

---

## 7. Security, Reliability & API Contracts

- **Authentication**: JWT access tokens (15-min expiry) + refresh tokens with rotation and revocation protection in `curenova.db`.
- **CORS**: Strict development whitelist (`http://127.0.0.1:5173`, `http://localhost:5173`).
- **Resilience**: Bounded timeouts on external calls (3.0s ChEMBL, 1.5s Open Targets) with disk-backed cache to prevent hangs.
- **Single Source of Truth**: All endpoints return unified schemas with explicit `workflow`, `direction`, `engine`, `coverage_status`, and `clinical_safety_boundary`.

