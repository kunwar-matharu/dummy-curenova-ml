# CureNova 2.0 — Production Feature Contract & Dynamic Construction Specification

**Model Version:** `cure_nova_xgb_final` (XGBClassifier)  
**Schema Definition:** 39 strictly ordered input features  
**Primary Source:** `ml/models/cure_nova_ml_v4_metadata.json` & `drug_disease_features_v4.parquet`  
**Purpose:** Define the exact semantic and computational requirements for every production feature, evaluating feasibility for dynamic reconstruction vs. evidence-grounded fallback.

---

## 1. Feature Specification Matrix

| Index | Feature Identifier | Semantic Meaning | Primary Data Source | Exact Mathematical / Computational Formulation | Missing Value Behavior | Feasible for Dynamic Drug? | Feasible for Dynamic Disease? | Feasible for Dynamic Pair? |
|---|---|---|---|---|---|---|---|---|
| 1 | `shared_targets` | Number of common targets | Open Targets MoA / Associations | $\|T_{\text{drug}} \cap T_{\text{disease}}\|$ | 0 | YES | YES | YES |
| 2 | `drug_target_count` | Drug target set size | Open Targets / ChEMBL | $\|T_{\text{drug}}\|$ | 0 | YES | N/A (Drug property) | YES |
| 3 | `disease_target_count` | Disease target set size | Open Targets Platform | $\|T_{\text{disease}}\|$ | 0 | N/A (Disease property) | YES | YES |
| 4 | `target_jaccard` | Jaccard target overlap | Target sets intersection/union | $\frac{\|T_{\text{drug}} \cap T_{\text{disease}}\|}{\|T_{\text{drug}} \cup T_{\text{disease}}\|}$ | 0.0 | YES | YES | YES |
| 5 | `avg_target_association` | Mean target-disease score | Open Targets association score | $\frac{1}{\|S\|} \sum_{t \in S} A(t, d)$ where $S = T_{\text{drug}} \cap T_{\text{disease}}$ | 0.0 | YES | YES | YES |
| 6 | `max_target_association` | Peak target association | Open Targets association score | $\max_{t \in S} A(t, d)$ | 0.0 | YES | YES | YES |
| 7 | `sum_target_association` | Cumulative target score | Open Targets association score | $\sum_{t \in S} A(t, d)$ | 0.0 | YES | YES | YES |
| 8 | `total_target_evidence` | Total evidence submissions | Open Targets evidence count | $\sum_{t \in S} E(t, d)$ | 0 | PARTIAL (Requires OT full evidence graph) | PARTIAL | PARTIAL |
| 9 | `max_target_evidence` | Maximum evidence count | Open Targets evidence count | $\max_{t \in S} E(t, d)$ | 0 | PARTIAL | PARTIAL | PARTIAL |
| 10 | `avg_target_evidence` | Mean evidence count | Open Targets evidence count | $\frac{1}{\|S\|} \sum_{t \in S} E(t, d)$ | 0.0 | PARTIAL | PARTIAL | PARTIAL |
| 11 | `high_confidence_targets` | Targets with score $\ge 0.5$ | Open Targets association score | $\|\{t \in S \mid A(t, d) \ge 0.5\}\|$ | 0 | YES | YES | YES |
| 12 | `high_evidence_targets` | Targets with evidence $\ge 10$| Open Targets evidence count | $\|\{t \in S \mid E(t, d) \ge 10\}\|$ | 0 | PARTIAL | PARTIAL | PARTIAL |
| 13 | `evidence_weighted_association` | Evidence-weighted association | OT scores & evidence | $\sum_{t \in S} (A(t, d) \cdot \ln(1 + E(t, d)))$ | 0.0 | PARTIAL | PARTIAL | PARTIAL |
| 14 | `squared_association` | Sum of squared scores | Open Targets association score | $\sum_{t \in S} (A(t, d))^2$ | 0.0 | YES | YES | YES |
| 15 | `association_std` | Association score variance | Open Targets association score | $\text{std}(\{A(t, d) \mid t \in S\})$ | 0.0 | YES | YES | YES |
| 16 | `drug_target_coverage` | Drug target capture ratio | Drug targets set | $\frac{\|T_{\text{drug}} \cap T_{\text{disease}}\|}{\|T_{\text{drug}}\|}$ | 0.0 | YES | YES | YES |
| 17 | `disease_target_coverage` | Disease target capture ratio| Disease targets set | $\frac{\|T_{\text{drug}} \cap T_{\text{disease}}\|}{\|T_{\text{disease}}\|}$ | 0.0 | YES | YES | YES |
| 18 | `association_per_shared_target` | Association efficiency | OT scores | $\frac{\text{sum\_target\_association}}{\max(1, \text{shared\_targets})}$ | 0.0 | YES | YES | YES |
| 19 | `evidence_per_shared_target` | Evidence efficiency | OT evidence count | $\frac{\text{total\_target\_evidence}}{\max(1, \text{shared\_targets})}$ | 0.0 | PARTIAL | PARTIAL | PARTIAL |
| 20 | `log_evidence` | Log total evidence | OT evidence count | $\ln(1 + \text{total\_target\_evidence})$ | 0.0 | PARTIAL | PARTIAL | PARTIAL |
| 21 | `log_sum_association` | Log cumulative association | OT scores | $\ln(1 + \text{sum\_target\_association})$ | 0.0 | YES | YES | YES |
| 22 | `log_drug_targets` | Log drug targets | Open Targets / ChEMBL | $\ln(1 + \text{drug\_target\_count})$ | 0.0 | YES | N/A | YES |
| 23 | `log_disease_targets` | Log disease targets | Open Targets Platform | $\ln(1 + \text{disease\_target\_count})$ | 0.0 | N/A | YES | YES |
| 24 | `overlap_association` | Interaction overlap score | Combined metrics | $\text{target\_jaccard} \cdot \text{avg\_target\_association}$ | 0.0 | YES | YES | YES |
| 25 | `overlap_max_association` | Interaction peak score | Combined metrics | $\text{target\_jaccard} \cdot \text{max\_target\_association}$ | 0.0 | YES | YES | YES |
| 26 | `coverage_balance` | Target balance ratio | Target coverages | $\frac{\min(C_{\text{drug}}, C_{\text{disease}})}{\max(C_{\text{drug}}, C_{\text{disease}}) + 10^{-6}}$ | 0.0 | YES | YES | YES |
| 27 | `molecular_weight` | Molecular weight ($g/\text{mol}$) | Canonical SMILES / RDKit | `Descriptors.MolWt(mol)` | Median (~380.0) | YES | N/A | YES |
| 28 | `molecular_logp` | Calculated octanol/water LogP | Canonical SMILES / RDKit | `Descriptors.MolLogP(mol)` | Median (~2.8) | YES | N/A | YES |
| 29 | `molecular_tpsa` | Topological polar surface area | Canonical SMILES / RDKit | `Descriptors.TPSA(mol)` | Median (~75.0) | YES | N/A | YES |
| 30 | `molecular_hbd` | Hydrogen bond donor count | Canonical SMILES / RDKit | `Lipinski.NumHDonors(mol)` | Median (~1) | YES | N/A | YES |
| 31 | `molecular_hba` | Hydrogen bond acceptor count | Canonical SMILES / RDKit | `Lipinski.NumHAcceptors(mol)`| Median (~5) | YES | N/A | YES |
| 32 | `molecular_rotatable_bonds` | Rotatable bond count | Canonical SMILES / RDKit | `Lipinski.NumRotatableBonds(mol)`| Median (~5) | YES | N/A | YES |
| 33 | `molecular_rings` | Total ring count | Canonical SMILES / RDKit | `Lipinski.RingCount(mol)` | Median (~3) | YES | N/A | YES |
| 34 | `molecular_aromatic_rings` | Aromatic ring count | Canonical SMILES / RDKit | `Lipinski.NumAromaticRings(mol)`| Median (~2) | YES | N/A | YES |
| 35 | `molecular_heavy_atoms` | Non-hydrogen atom count | Canonical SMILES / RDKit | `mol.GetNumHeavyAtoms()` | Median (~26) | YES | N/A | YES |
| 36 | `molecular_fraction_csp3` | Ratio of $sp^3$ carbons | Canonical SMILES / RDKit | `Lipinski.FractionCSP3(mol)` | Median (~0.32) | YES | N/A | YES |
| 37 | `molecular_formal_charge` | Net formal charge | Canonical SMILES / RDKit | `Chem.GetFormalCharge(mol)` | 0 | YES | N/A | YES |
| 38 | `molecular_num_atoms` | Total atom count (incl. H) | Canonical SMILES / RDKit | `Chem.AddHs(mol).GetNumAtoms()` | Median (~45) | YES | N/A | YES |
| 39 | `has_molecular_structure` | Binary structure indicator | Canonical SMILES presence | $1 \text{ if valid SMILES else } 0$ | 0 | YES | N/A | YES |

---

## 2. Dynamic Feature Reconstruction Rules

### A. When Dynamic Feature Construction IS Allowed (`DYNAMIC_XGBOOST`):
- A drug or disease possesses validated Open Targets Ensembl targets AND canonical SMILES.
- All 13 molecular features (27–39) can be calculated exactly with RDKit from `canonicalSmiles`.
- All association metrics (1–7, 11, 14–18, 21–26) can be calculated from Open Targets target association scores $A(t, d)$.
- If evidence item counts $E(t, d)$ are available via Open Targets GraphQL or local cache, the full 39-feature vector matches training semantics and can be passed to `cure_nova_xgb_final.joblib`.

### B. When Dynamic Feature Construction IS NOT Allowed (`EVIDENCE_GROUNDED_RANKING`):
- If the drug or disease lacks target evidence or if evidence count metrics (8, 9, 10, 12, 13, 19, 20) cannot be computed with mathematical fidelity, **no fabricated dummy values may be substituted**.
- Under these circumstances, XGBoost inference is bypassed, and the candidate is evaluated under **Evidence-Grounded Biomedical Ranking** based on:
  1. Open Targets overall target-disease association scores ($A(t, d)$)
  2. Quantitative ChEMBL bioactivity ($p\text{ChEMBL}$, $K_i$, $IC_{50}$)
  3. Mechanism of action convergence
  4. Clinical trial stage verification

---

## 3. Four-Tier Engine Routing Policy

```
[ Incoming Query: Drug or Disease ]
               │
               ▼
   Is entity in 6.7M feature store?
         ├── YES ──► Mode 1: PRODUCTION_XGBOOST
         │            * Uncalibrated ML Ranking Score
         │            * Full feature contract pre-verified
         │
         └── NO ──► Can all 39 features be dynamically calculated with 100% semantic fidelity?
                      ├── YES ──► Mode 2: DYNAMIC_XGBOOST
                      │            * Production XGBoost — Dynamically Constructed Features
                      │
                      └── NO ──► Does valid biomedical evidence exist (targets, MoA, bioactivity, indications)?
                                   ├── YES ──► Mode 3: EVIDENCE_GROUNDED_RANKING
                                   │            * Evidence-Grounded Biomedical Ranking
                                   │            * Real OT scores + ChEMBL bioactivity + trial phase
                                   │
                                   └── NO ──► Mode 4: INSUFFICIENT_DATA
                                                * Explicit, transparent reason for missing evidence
```

