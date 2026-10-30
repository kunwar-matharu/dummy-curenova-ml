# CureNova 2.0 — Dual-Project Comprehensive Architecture Audit & Integration Blueprint

**Audit Execution Date:** October 30, 2026  
**Auditor:** Antigravity AI Engineering Team  
**Audit Mode:** Strictly Read-Only Architecture Audit  
**Destination Project (Target):** `A:\curenova-backend` *(Physical Directory: `A:\curenova-bakend`)*  
**Backend Source Project (Source):** `A:\curenova-backend-main`  
**Deliverable Document:** `CURENOVA_TWO_PROJECT_ARCHITECTURE_AUDIT.md`  

---

> [!IMPORTANT]
> **INTEGRATION PRINCIPLES MANDATED BY ARCHITECTURAL CONTRACT:**
> 1. **FRONTEND/UI**: Must preserve and extend the UI from `A:\curenova-backend` (including Drug Similarity, Error Boundaries, and multi-factor discovery modals) while incorporating the database-backed history, investigation persistence hydration, and multi-drug polypharmacy analysis from `A:\curenova-backend-main`.
> 2. **PRODUCTION ML / FEATURE STORE**: Must strictly preserve the working production ML model (`ml/models/cure_nova_xgb_final.joblib`), its offline 39-feature parquet store (`ml/data/training/drug_disease_features_v4.parquet`, 393 MB), its dynamic inference adapters (`ml/predictor.py`, `ml/predict_v4.py`), its ChEMBL bioactivity dataset (`ml/data/chembl/chembl_drug_evidence.json`), and its Evidence-Grounded Biomedical Ranking Engine (`ml/evidence_ranker.py`) from `A:\curenova-backend`. **The production ML system must NOT be replaced.**
> 3. **BACKEND & DATABASE INTEGRATION**: Must adopt the hardened PostgreSQL and SQLite database integration, connection pooling, database persistence models (`InvestigationRun`, `PatientMedication`, relational candidate linkage), LINCS L1000 transcriptomics (`transcriptomics_service.py`), adversarial clinical trial challenge agent (`clinical_trial_challenge.py`), multi-drug regimen safety engine (`safety_service.py`), and containerization infrastructure from `A:\curenova-backend-main`.
> 4. **ZERO DISTRUPTIVE MUTATION**: In accordance with instructions, this audit is strictly **read-only**. No source files have been overwritten, deleted, moved, or altered.

---

## Table of Contents

- [A. Current Architecture of A:\curenova-backend](#a-current-architecture-of-acurenova-backend)
- [B. Current Architecture of A:\curenova-backend-main](#b-current-architecture-of-acurenova-backend-main)
- [C. Database Comparison](#c-database-comparison)
- [D. Backend Comparison](#d-backend-comparison)
- [E. API Comparison](#e-api-comparison)
- [F. Machine Learning Comparison](#f-ml-comparison)
- [G. Frontend Comparison](#g-frontend-comparison)
- [H. File-by-File Integration Plan](#h-file-by-file-integration-plan)
- [I. Files That Must Be Preserved From Destination](#i-files-that-must-be-preserved-from-the-destination-project)
- [J. Files That Should Be Imported From Backend Source](#j-files-that-should-be-imported-from-the-backend-source)
- [K. Files Requiring Manual Merge](#k-files-requiring-manual-merge)
- [L. Dependency Conflicts](#l-dependency-conflicts)
- [M. Environment Variable Requirements](#m-environment-variable-requirements)
- [N. Database Migration Requirements](#n-database-migration-requirements)
- [O. Identified Risks & Guardrails](#o-risks)
- [P. Exact Implementation Sequence](#p-exact-implementation-sequence)
- [Q. Exact Final End-to-End Validation Plan](#q-exact-final-e2e-validation-plan)

---

## A. Current Architecture of A:\curenova-backend

### 1. Architectural Summary
`A:\curenova-backend` (on disk as `A:\curenova-bakend`) is the **scientific and ML-specialized branch** of the CureNova platform. It contains the fully functional, locally verified 39-feature XGBoost inference pipeline, the 393 MB precomputed feature store, and the Drug-to-Similar-Drugs multi-factor discovery engine with full frontend integration.

```mermaid
flowchart TD
    subgraph Frontend["React 19 Frontend (A:\\curenova-backend)"]
        UI_Repurp["ResearcherDrugRepurposing (82 KB)\nDual-Mode: Drug-Disease & Drug-Similarity"]
        UI_Modal["DrugSimilarityDetailModal.jsx"]
        UI_Err["ErrorBoundary.jsx"]
        UI_API["api.js (plainAxios unintercepted refresh, queue)"]
    end

    subgraph Backend["FastAPI Backend (A:\\curenova-backend)"]
        Main["app/main.py\n(includes drugs.router)"]
        R_Drugs["app/routers/drugs.py\n(/api/drugs/similar)"]
        R_Cand["app/routers/candidates.py\n(/api/candidates/similar, /diseases)"]
        R_Graph["app/routers/graph.py\n(/api/graph/similarity-subgraph)"]
        S_Sim["app/services/drug_similarity_service.py (31.5 KB)\nRDKit Morgan Fingerprints, Tanimoto, Jaccard"]
        S_ML["app/services/ml_service.py (908 lines)\nFull candidate conversion & evidence extraction"]
        S_DrugRes["app/services/drug_resolver.py"]
        S_DisRes["app/services/disease_resolver.py"]
    end

    subgraph ML_Subsystem["Working ML Production System (A:\\curenova-backend)"]
        Model["ml/models/cure_nova_xgb_final.joblib\n(8.99 MB, SHA-256: ef951c...)"]
        Parquet["ml/data/training/drug_disease_features_v4.parquet\n(393 MB, 6.7M Rows, 39 Features)"]
        MolCSV["ml/data/training/drug_molecular_features.csv\n(1.76 MB)"]
        ChEMBLEv["ml/data/chembl/chembl_drug_evidence.json\n(Open Targets + ChEMBL Cache)"]
        EvRanker["ml/evidence_ranker.py (28.5 KB)\nEvidence-Grounded Ranking Fallback"]
        PredAdapter["ml/predictor.py (1,488 lines)\nDynamic dual inference & enrichment"]
        PredictV4["ml/predict_v4.py (10 KB)\nDuckDB Parquet queries & feature joins"]
    end

    subgraph Database["Database (A:\\curenova-backend)"]
        SQLiteDB["curenova.db (250 KB, 16 Tables)\nLacks investigation_runs & patient_medications"]
    end

    UI_Repurp --> UI_API
    UI_API --> Main
    Main --> R_Drugs & R_Cand & R_Graph
    R_Drugs --> S_Sim
    R_Cand --> S_ML
    R_Graph --> S_Sim
    S_Sim --> Parquet & ChEMBLEv
    S_ML --> PredAdapter
    PredAdapter --> Model & PredictV4 & EvRanker
    PredictV4 --> Parquet & MolCSV
```

### 2. Core Strengths & Key Implementations
1. **Working Production ML Pipeline**:
   - Production model artifact: `ml/models/cure_nova_xgb_final.joblib` (8.99 MB).
   - Offline 39-feature training dataset: `ml/data/training/drug_disease_features_v4.parquet` (393,263,004 bytes).
   - Inference adapter: `ml/predictor.py` (1,488 lines) and `ml/predict_v4.py` (10,222 bytes) providing bidirectional inference (Disease $\rightarrow$ Drug and Drug $\rightarrow$ Disease).
   - ChEMBL bioactivity dataset: `ml/data/chembl/chembl_drug_evidence.json` (authoritative precomputed bioactivities, target affinities, pChEMBL values).
   - ChEMBL API cache: `ml/data/chembl/chembl_api_cache.json` (309,083 bytes).
2. **Evidence-Grounded Ranking Fallback**:
   - `ml/evidence_ranker.py` (28.5 KB): Implements deterministic evidence ranking for valid FDA-approved compounds outside the static 6.7M training slice (e.g. Sildenafil, Atorvastatin, Warfarin, Propranolol), preventing zero-candidate failures.
3. **Multi-Factor Drug Similarity & Alternative Drug Discovery Engine**:
   - `app/services/drug_similarity_service.py` (31,539 bytes): Combines RDKit Morgan fingerprints (radius 2, 1024-bit bitvectors, Tanimoto similarity), shared target Jaccard coefficient, mechanism of action overlap, indication alignment, and bioactivity profiles.
   - `app/routers/drugs.py`: Exposes `/api/drugs/similar` (POST & GET).
   - `app/routers/graph.py`: Exposes `/api/graph/similarity-subgraph`.
4. **Advanced Frontend Experience**:
   - `frontend/src/pages/researcher/ResearcherDrugRepurposing.jsx` (83,571 bytes, 1,375 lines): Full-featured UI supporting both Drug-to-Disease Repurposing and Drug-to-Similar Alternative Drug Discovery workflows.
   - `frontend/src/components/DrugSimilarityDetailModal.jsx`: Comprehensive comparative modal displaying multi-factor scores, target Venn overlaps, and non-interchangeability guardrails.
   - `frontend/src/components/ErrorBoundary.jsx`: Top-level and route-level React error boundary preventing white-screen crashes.
   - `frontend/src/services/api.js`: Concurrency-safe JWT refresh mechanism using `plainAxios` (unintercepted Axios instance) to prevent 401 refresh loops, publishing `curenova:token_refreshed` events.
5. **Verified Test Suite**:
   - Contains specialized test suites: `test_drug_ml.py` (14 tests), `test_drug_similarity.py` (12 tests), `test_reliability_regression.py` (12 tests), and `test_api.py` (84 tests) totaling 122 tests.

### 3. Gaps in A:\curenova-backend
- **Database Model Limitations**: Database models (`app/models/models.py`) only define 16 tables. Missing `InvestigationRun` and `PatientMedication`.
- **Candidate Persistence Gap**: `CandidatePrediction` records generated dynamically during investigations are not linked to persistent workflow runs (`investigation_id` and `workflow_id` do not exist).
- **Transient Investigation State**: If a user runs an investigation and reloads the browser, the investigation results cannot be reloaded from the database via an investigation ID or workflow ID.
- **Missing Advanced Clinical Engines**:
  - No Adversarial Clinical Trial Challenge Agent (`clinical_trial_challenge.py`).
  - No LINCS L1000 Transcriptomics Connectivity Engine (`transcriptomics_service.py`).
  - No Multi-Drug Polypharmacy / DDI Regimen Safety Engine (`safety_service.py`).
- **Missing Regimen API Endpoints**: Doctor and Patient portals lack medication regimen CRUD endpoints.
- **No PostgreSQL Support**: Database layer is hardcoded to SQLite; lacking PostgreSQL connection pooling and migration tooling.
- **No Docker Infrastructure**: Lacks `Dockerfile`, `docker-compose.yml`, and `.dockerignore`.

---

## B. Current Architecture of A:\curenova-backend-main

### 1. Architectural Summary
`A:\curenova-backend-main` is the **enterprise database, clinical intelligence, and persistence-hardened branch** of CureNova. It implements full relational database persistence for multi-agent investigation workflows, PostgreSQL compatibility with connection pooling, multi-drug polypharmacy risk analysis, adversarial clinical trial audit, LINCS L1000 transcriptomics, and containerization.

```mermaid
flowchart TD
    subgraph Enterprise_Backend["FastAPI Backend (A:\\curenova-backend-main)"]
        Main_Src["app/main.py\n(direct_investigate with search_type)"]
        R_Patient["app/routers/patient.py\n(/regimen CRUD, /regimen/safety-check)"]
        R_Doctor["app/routers/doctor.py\n(/safety/analyze-regimen, /adverse-events)"]
        R_Reports["app/routers/reports.py\n(/investigation/{wid}/markdown)"]
        R_Cand_Src["app/routers/candidates.py\n(/investigations, /investigation/{wid})"]
        
        Orch_Src["app/services/agentic_orchestrator.py (882 lines)\nFull Database Persistence to InvestigationRun & CandidatePrediction"]
        S_Safety["app/services/safety_service.py (10.8 KB)\nCombinatorial N*(N-1)/2 Polypharmacy DDI"]
        S_Trial["app/services/clinical_trial_challenge.py (19.2 KB)\nAdversarial Trial Audit & Termination Reason Analysis"]
        S_Trans["app/services/transcriptomics_service.py (19.4 KB)\nLINCS L1000 CMAP Directional Reversal (tau)"]
        
        DB_Cfg["app/database.py\n(PostgreSQL Connection Pool & SQLite Dual Support)"]
        Migrate["scripts/migrate_sqlite_to_postgres.py\n(18 Tables, Sequence Reset, Data Verification)"]
    end

    subgraph Database_18["Database Layer (18 Tables)"]
        Models_Src["app/models/models.py\n+ InvestigationRun\n+ PatientMedication\n+ CandidatePrediction Relational Linkage"]
        Postgres[(PostgreSQL / SQLite Dual Engine)]
    end

    subgraph Containerization["Deployment Infrastructure"]
        Compose["docker-compose.yml"]
        DFile["Dockerfile"]
    end

    Main_Src --> R_Patient & R_Doctor & R_Reports & R_Cand_Src
    R_Cand_Src --> Orch_Src
    Orch_Src --> S_Safety & S_Trial & S_Trans
    Orch_Src --> Models_Src
    R_Doctor --> S_Safety
    R_Patient --> S_Safety
    Models_Src --> Postgres
```

### 2. Core Strengths & Key Implementations
1. **Persistent Investigation Runs & Relational Candidates**:
   - New table `investigation_runs`: stores `workflow_id`, `query`, `entity_resolved_name`, `entity_type`, `user_id`, `user_role`, `provenance_mode`, `candidate_count`, `top_candidate_name`, `top_candidate_score`, `results_json`, `search_type`, `status`, `execution_duration_ms`, `created_at`.
   - `CandidatePrediction` expanded with 5 foreign and provenance columns:
     - `investigation_id`: foreign key to `investigation_runs.id`.
     - `workflow_id`: indexable workflow tracking string.
     - `score_type`: e.g. `"ranking_score"`.
     - `provenance`: e.g. `"precomputed_feature_store"`, `"live_inference"`.
     - `molecular_features_json`: serialized dictionary of molecular descriptors.
   - `AgenticOrchestrator` (882 lines) automatically persists completed and failed workflows to the database and links all candidate predictions to the run.
   - Endpoints `GET /api/candidates/investigations` and `GET /api/candidates/investigation/{workflow_id}` allow immediate reload and audit of past research.
2. **Patient Medication Management & Regimen Safety**:
   - New table `patient_medications`: `user_id`, `drug_name`, `dosage`, `frequency`, `time_of_day`, `taken`, `notes`.
   - Complete CRUD endpoints in `app/routers/patient.py`:
     - `GET /api/patient/regimen`: lists active medications for patient.
     - `POST /api/patient/regimen`: adds a medication.
     - `DELETE /api/patient/regimen/{med_id}`: removes a medication.
     - `POST /api/patient/regimen/{med_id}/toggle`: logs adherence dose taken.
     - `POST /api/patient/regimen/safety-check`: runs multi-drug safety check on active regimen.
3. **Multi-Drug Polypharmacy Safety Engine**:
   - `app/services/safety_service.py` (`MultiDrugSafetyService`): Computes all $N(N-1)/2$ pairwise drug combinations across a regimen, normalizes aliases, extracts verified interactions from `DrugInteraction` monographs, and explicitly flags unmonitored pairs with clinical disclaimers.
   - `POST /api/doctor/safety/analyze-regimen`: powers real-time DDI analysis in the clinician portal.
   - `GET /api/doctor/adverse-events`: queries OpenFDA Drug Adverse Events API for post-marketing safety signals via `BiomedicalAdapter.search_openfda_events`.
4. **Adversarial Clinical Trial Challenge Agent**:
   - `app/services/clinical_trial_challenge.py`: Audits proposed drug repurposing hypotheses by searching for clinical trial refutations, terminations, or negative outcomes. Distinguishes inconclusive trial stoppages (funding, slow recruitment) from true efficacy failures (`whyStopped`).
5. **LINCS L1000 Transcriptomics Connectivity Engine**:
   - `app/services/transcriptomics_service.py`: Computes Broad Institute Connectivity Map (CMAP) directional reversal metrics ($\tau$ score) across ~978 landmark genes using NIH LINCS L1000 Level 5 moderated Z-scores. Identifies transcriptional disease reversal ($\tau < -0.30$) versus disease concordance ($\tau > +0.30$).
6. **PostgreSQL Integration & Migration Engine**:
   - `app/database.py`: Production-grade connection pooling (`pool_size=10, max_overflow=20, pool_pre_ping=True, pool_recycle=3600`) and automatic `postgres://` to `postgresql://` URI normalization.
   - `scripts/migrate_sqlite_to_postgres.py`: Topological dependency migration across all 18 tables with preflight verification, read-only source locks, sequence synchronization, and row-count verification.
   - `app/tests/test_postgresql_integration.py`: 12 automated tests verifying PostgreSQL DDL generation, connection pooling, and migration safety.
7. **Containerization & Markdown Export**:
   - `Dockerfile` & `docker-compose.yml`: Production container configuration with Python 3.11 slim, OpenMP runtime (`libgomp1`), and liveness probes.
   - `GET /api/reports/investigation/{workflow_id}/markdown`: Generates clean, downloadable Markdown dossiers of complete investigation runs.
8. **Frontend State Hydration Improvements**:
   - `DoctorDashboard.jsx`: Directly integrated with `safetyService.analyze(enabledMeds)` for live backend polypharmacy evaluation.
   - `ResearcherResults.jsx` & `DoctorResults.jsx`: Hydrates state from `sessionStorage` and `localStorage` on page reload to prevent blank screens.
   - Support for bidirectional research dossier labels (`Proposed Indication` for drug-first searches vs `Candidate Drug` for disease-first searches).

### 3. Gaps in A:\curenova-backend-main
- **CRITICAL ML GAP**: Does **NOT** contain the offline 39-feature dataset `ml/data/training/drug_disease_features_v4.parquet` (393 MB).
- **CRITICAL DATA GAP**: Does **NOT** contain `ml/data/chembl/chembl_drug_evidence.json` (causing `ml/predictor.py` in this repo to reference non-existent files).
- **TRUNCATED PREDICTOR**: `ml/predictor.py` is reduced to 213 lines (lacking `enrich_disease_candidate`, `predict_drug_and_enrich`, `classify_candidate_indication`, `derive_deterministic_evidence_strength`).
- **NO DRUG SIMILARITY**: Completely lacks `app/services/drug_similarity_service.py`, `app/routers/drugs.py`, schemas `DrugSimilarityRequest/Response`, and `DrugSimilarityDetailModal.jsx`.
- **INCOMPLETE AUTH SESSION RECOVERY**: Frontend `api.js` uses standard `axios.post` for refresh (which can recurse on 401), lacks `plainAxios`, and lacks concurrency queueing.
- **NO LOCAL DATABASE**: Does not have a local `curenova.db` file present.
- **STRICT CONFIG FAIL-CLOSED**: `app/config.py` raises `FileNotFoundError` immediately if `.env` does not exist on disk, breaking developer onboarding without a `.env` file.

---

## C. Database Comparison

| Dimension | A:\curenova-backend (Target) | A:\curenova-backend-main (Source) | Verdict / Requirement for Final Project |
| :--- | :--- | :--- | :--- |
| **Active DB Files** | `curenova.db` (249,856 bytes, SQLite) | None on disk | Keep `curenova.db` from target, apply schema additions |
| **Total Table Count** | 16 Tables | 18 Models Defined | Target lacks 2 tables; source models are superior |
| **`investigation_runs` Table** | Missing | Present (`InvestigationRun`) | **Required from Source**: Enables investigation workflow persistence |
| **`patient_medications` Table** | Missing | Present (`PatientMedication`) | **Required from Source**: Enables patient regimen CRUD and adherence tracking |
| **`candidate_predictions` Columns** | 23 columns (basic fields) | 28 columns (adds `investigation_id`, `workflow_id`, `score_type`, `provenance`, `molecular_features_json`) | **Required from Source**: Relational linking between investigations and candidates |
| **Foreign Keys / Cascades** | Basic relationships | Added `cascade="all, delete-orphan"` on `investigation.candidates` | **Required from Source**: Maintains relational integrity |
| **Database Engines Supported** | SQLite only | PostgreSQL + SQLite Dual Support | **Required from Source**: Enterprise production deployment readiness |
| **Connection Pooling** | No pooling (`check_same_thread=False` only) | `pool_size=10, max_overflow=20, pool_pre_ping=True, pool_recycle=3600` | **Required from Source**: Prevents stale connections and connection exhaustion |
| **Migration Utility** | None | `scripts/migrate_sqlite_to_postgres.py` | **Required from Source**: Provides hardened migration to PostgreSQL |
| **Model Classes in `app/models/models.py`** | `User`, `RefreshToken`, `ResearchProject`, `Drug`, `Disease`, `Target`, `CandidatePrediction`, `EvidenceRecord`, `ResearchNote`, `KnowledgeNode`, `KnowledgeEdge`, `StressTestRun`, `DrugInteraction`, `ClinicalTrialRecord`, `PatientMedicineGuide`, `ResearchFeedback` | All 16 target models PLUS `InvestigationRun`, `PatientMedication` | **Source implementation is a strict superset** of target models |

### Schema Differences in Detail

#### `InvestigationRun` Model (Source Only)
```python
class InvestigationRun(Base):
  __tablename__ = "investigation_runs"
  id = Column(Integer, primary_key=True, index=True)
  workflow_id = Column(String(100), unique=True, index=True, nullable=False)
  query = Column(String(255), index=True, nullable=False)
  entity_resolved_name = Column(String(255), nullable=False)
  entity_type = Column(String(50), default="Disease")
  user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
  user_role = Column(String(50), default="researcher")
  provenance_mode = Column(String(50), default="deterministic_fallback")
  candidate_count = Column(Integer, default=0)
  top_candidate_name = Column(String(255), nullable=True)
  top_candidate_score = Column(Float, nullable=True)
  results_json = Column(Text, nullable=False)  # Full AgentWorkflowResponse payload
  search_type = Column(String(50), default="drug_to_disease")
  status = Column(String(50), default="completed", index=True)
  execution_duration_ms = Column(Integer, nullable=True)
  model_version = Column(String(50), default="cure-nova-xgb-final")
  error_message = Column(Text, nullable=True)
  created_at = Column(DateTime, default=utc_now)

  user = relationship("User")
  candidates = relationship(
      "CandidatePrediction",
      back_populates="investigation",
      cascade="all, delete-orphan",
  )
```

#### `PatientMedication` Model (Source Only)
```python
class PatientMedication(Base):
  __tablename__ = "patient_medications"
  id = Column(Integer, primary_key=True, index=True)
  user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
  drug_name = Column(String(255), nullable=False)
  dosage = Column(String(100), default="As prescribed")
  frequency = Column(String(100), default="Daily")
  time_of_day = Column(String(50), default="Morning (8:00 AM)")
  taken = Column(Boolean, default=False)
  notes = Column(Text, nullable=True)
  created_at = Column(DateTime, default=utc_now)
  updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

  user = relationship("User")
```

---

## D. Backend Comparison

| Dimension | A:\curenova-backend (Target) | A:\curenova-backend-main (Source) | Winner / Integration Decision |
| :--- | :--- | :--- | :--- |
| **FastAPI Entrypoint (`app/main.py`)** | Mounts `drugs.router`. `direct_investigate` lacks `search_type`. | Omits `drugs.router`. `direct_investigate` includes `search_type`. | **Manual Merge**: Include `drugs.router` AND preserve `search_type="drug_to_disease"` on `direct_investigate`. |
| **Database Setup (`app/database.py`)** | Basic SQLite engine | PostgreSQL pool + URI protocol normalization + SQLite fallback | **Source is Better**: Import `database.py` from source. |
| **Config Loader (`app/config.py`)** | Loads env without crashing if `.env` is absent | Strictly requires `.env` file via `PROJECT_ROOT / ".env"`; raises `FileNotFoundError` | **Manual Merge**: Keep source's enhanced env validation, but allow `.env.example` copy or graceful fallback for local development. |
| **Auth Dependencies (`app/dependencies/auth.py`)** | Validates JWT, lacks token whitespace stripping | Adds `.strip()` to credentials, enhanced structured logging | **Source is Better**: Import from source. |
| **Candidate Router (`app/routers/candidates.py`)** | Contains `/similar` and `/diseases`. Lacks `/investigations`. | Contains `/investigations` and `/investigation/{workflow_id}`. Lacks `/similar` and `/diseases`. | **Manual Merge**: Combine all endpoints (keep `/similar` & `/diseases` from target, add `/investigations` & `/investigation/{workflow_id}` from source). |
| **Doctor Router (`app/routers/doctor.py`)** | Lacks `/adverse-events` and `/safety/analyze-regimen`. | Adds `/adverse-events` (OpenFDA) and `/safety/analyze-regimen` (DDI engine). | **Source is Better**: Import `doctor.py` from source. |
| **Patient Router (`app/routers/patient.py`)** | Lacks regimen endpoints. | Adds `/regimen` GET/POST, `/regimen/{med_id}` DELETE, `/regimen/{med_id}/toggle`, `/regimen/safety-check`. | **Source is Better**: Import `patient.py` from source. |
| **Reports Router (`app/routers/reports.py`)** | Candidate markdown report only. | Adds `/investigation/{workflow_id}/markdown` investigation dossier download. | **Source is Better**: Import `reports.py` from source. |
| **Graph Router (`app/routers/graph.py`)** | Adds `/similarity-subgraph` for drug pairs. | Standard graph only. | **Target is Better**: Preserve `graph.py` from target to support frontend drug similarity graph visualization. |
| **Evidence Router (`app/routers/evidence.py`)** | Basic `study_type` filter only. | Adds `q`, `source`, `evidence_type` query filters for EvidenceExplorer. | **Source is Better**: Import from source. |
| **Agentic Orchestrator (`app/services/agentic_orchestrator.py`)** | 496 lines. Resolution $\rightarrow$ ML $\rightarrow$ Literature $\rightarrow$ Synthesizer. No persistence. | 882 lines. Adds LINCS L1000, Clinical Trial Challenge, Step Logging, and DB Persistence to `InvestigationRun` & `CandidatePrediction`. Lacks `DrugResolver`. | **Manual Merge**: Use source's 882-line orchestrator as foundation; restore `DrugResolver` integration and `resolved_entity` / `model_info` frontend compatibility payload. |
| **ML Service (`app/services/ml_service.py`)** | 908 lines. Complete candidate generation, stress test parsing, ChEMBL enrichment, fallback to evidence ranker. | 441 lines. Truncated candidate generation; missing evidence ranker fallback and deep ChEMBL enrichment. | **Target is Better**: Preserve target's `ml_service.py` to ensure full XGBoost & Evidence Ranker functionality. |
| **Drug Resolver (`app/services/drug_resolver.py`)** | Present as standalone service (10 KB). | Missing (merged into `disease_resolver.py`). | **Target is Better**: Preserve `drug_resolver.py` from target. |
| **Disease Resolver (`app/services/disease_resolver.py`)** | 13 curated disease mappings, basic regex. | Curated disease mappings, 5-char minimum matching rule, merged drug resolver. | **Manual Merge**: Combine rich disease aliases from target with source's length $\ge 5$ false-positive guardrail. |
| **Biomedical Adapters (`app/services/biomedical_adapters.py`)** | PubMed, ChEMBL, ClinicalTrials.gov. | Adds OpenFDA Adverse Events API adapter (`search_openfda_events`). | **Source is Better**: Import from source. |
| **New Specialized Services (Source Only)** | None | `safety_service.py`, `clinical_trial_challenge.py`, `transcriptomics_service.py` | **Required from Source**: Add all three services to destination. |

---

## E. API Comparison

### Complete Inventory of Endpoints Across Both Projects

| Method | Endpoint Path | A:\curenova-backend | A:\curenova-backend-main | Role Required | Final Integration Action |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `GET` | `/` | Yes | Yes | Public | Preserve |
| `GET` | `/health` | Yes | Yes | Public | Preserve |
| `GET` | `/ready` | Yes | Yes | Public | Preserve |
| `GET` | `/api/system/health` | Yes | Yes | Public | Preserve |
| `GET` | `/api/system/ready` | Yes | Yes | Public | Preserve |
| `GET` | `/api/system/status` | Yes | Yes | Public | Preserve |
| `POST` | `/api/system/mode/toggle` | Yes | Yes | Admin | Preserve |
| `POST` | `/api/auth/signup` | Yes | Yes | Public | Preserve |
| `POST` | `/api/auth/login` | Yes | Yes | Public | Preserve |
| `POST` | `/api/auth/refresh` | Yes | Yes | Public | Preserve |
| `POST` | `/api/auth/logout` | Yes | Yes | Authenticated | Preserve |
| `GET` | `/api/auth/me` | Yes | Yes | Authenticated | Preserve |
| `GET` | `/api/auth/users` | Yes | Yes | Admin | Preserve |
| `POST` | `/api/auth/users/{user_id}/approve` | Yes | Yes | Admin | Preserve |
| `GET` | `/api/candidates` | Yes | Yes | Researcher/Admin | Preserve |
| `GET` | `/api/candidates/{candidate_id}` | Yes | Yes | Researcher/Admin | Preserve |
| `POST` | `/api/candidates/investigate` | Yes | Yes | Researcher/Admin | Manual Merge (add `search_type`) |
| `GET` | `/api/candidates/investigate` | Yes | Yes | Researcher/Admin | Manual Merge (add `search_type`) |
| `GET` | `/api/investigate` (direct alias) | Yes | Yes | Researcher/Admin | Manual Merge (add `search_type`) |
| `GET` | `/api/candidates/similar` | **Yes** | No | Researcher/Admin | **Preserve from Target** |
| `POST` | `/api/candidates/similar` | **Yes** | No | Researcher/Admin | **Preserve from Target** |
| `GET` | `/api/candidates/diseases` | **Yes** | No | Researcher/Admin | **Preserve from Target** |
| `GET` | `/api/candidates/investigations` | No | **Yes** | Researcher/Admin | **Import from Source** |
| `GET` | `/api/candidates/investigation/{workflow_id}` | No | **Yes** | Researcher/Admin | **Import from Source** |
| `GET` | `/api/candidates/compare/pair` | Yes | Yes | Researcher/Admin | Preserve |
| `POST` | `/api/candidates/{candidate_id}/bookmark`| Yes | Yes | Researcher/Admin | Preserve |
| `POST` | `/api/candidates/{candidate_id}/notes` | Yes | Yes | Researcher/Admin | Preserve |
| `DELETE`| `/api/candidates/notes/{note_id}` | Yes | Yes | Researcher/Admin | Preserve |
| `POST` | `/api/drugs/similar` | **Yes** | No | Researcher/Admin | **Preserve from Target** |
| `GET` | `/api/drugs/similar` | **Yes** | No | Researcher/Admin | **Preserve from Target** |
| `GET` | `/api/graph` | Yes | Yes | Researcher/Admin | Preserve |
| `GET` | `/api/graph/neighbors/{node_id}` | Yes | Yes | Researcher/Admin | Preserve |
| `GET` | `/api/graph/similarity-subgraph` | **Yes** | No | Researcher/Admin | **Preserve from Target** |
| `GET` | `/api/evidence` | Yes | Yes | Authenticated | Import from Source (adds `q`, `source`) |
| `POST` | `/api/evidence/synthesize` | Yes | Yes | Researcher/Admin | Preserve |
| `GET` | `/api/experiments/projects` | Yes | Yes | Researcher/Admin | Preserve |
| `POST` | `/api/experiments/projects` | Yes | Yes | Researcher/Admin | Preserve |
| `DELETE`| `/api/experiments/projects/{project_id}` | Yes | Yes | Researcher/Admin | Preserve |
| `GET` | `/api/experiments/workbench-status` | Yes | Yes | Researcher/Admin | Preserve |
| `GET` | `/api/doctor/overview` | Yes | Yes | Doctor/Admin | Preserve |
| `GET` | `/api/doctor/interactions` | Yes | Yes | Doctor/Admin | Preserve |
| `GET` | `/api/doctor/clinical-trials` | Yes | Yes | Doctor/Admin | Preserve |
| `GET` | `/api/doctor/clinical-trials/live` | Yes | Yes | Doctor/Admin | Preserve |
| `GET` | `/api/doctor/adverse-events` | No | **Yes** | Doctor/Admin | **Import from Source** |
| `POST` | `/api/doctor/safety/analyze-regimen` | No | **Yes** | Doctor/Admin | **Import from Source** |
| `GET` | `/api/patient/overview` | Yes | Yes | Patient/Admin | Preserve |
| `GET` | `/api/patient/medicines` | Yes | Yes | Patient/Admin | Preserve |
| `GET` | `/api/patient/medicines/{drug_name}` | Yes | Yes | Patient/Admin | Preserve |
| `POST` | `/api/patient/explain-research` | Yes | Yes | Patient/Admin | Preserve |
| `GET` | `/api/patient/regimen` | No | **Yes** | Patient/Admin | **Import from Source** |
| `POST` | `/api/patient/regimen` | No | **Yes** | Patient/Admin | **Import from Source** |
| `DELETE`| `/api/patient/regimen/{med_id}` | No | **Yes** | Patient/Admin | **Import from Source** |
| `POST` | `/api/patient/regimen/{med_id}/toggle` | No | **Yes** | Patient/Admin | **Import from Source** |
| `POST` | `/api/patient/regimen/safety-check` | No | **Yes** | Patient/Admin | **Import from Source** |
| `GET` | `/api/reports/candidate/{id}/markdown` | Yes | Yes | Researcher/Doctor/Admin | Preserve |
| `GET` | `/api/reports/investigation/{wid}/markdown`| No | **Yes** | Researcher/Doctor/Admin | **Import from Source** |
| `POST` | `/api/stress-tests/run` | Yes | Yes | Researcher/Admin | Preserve |
| `GET` | `/api/stress-tests` | Yes | Yes | Researcher/Admin | Preserve |
| `GET` | `/api/stress-tests/{run_id}` | Yes | Yes | Researcher/Admin | Preserve |
| `GET` | `/api/stress-tests/{run_id}/export` | Yes | Yes | Researcher/Admin | Preserve |
| `GET` | `/api/feedback` | Yes | Yes | Researcher/Admin | Preserve |
| `POST` | `/api/feedback` | Yes | Yes | Researcher/Admin | Preserve |
| `POST` | `/api/feedback/evaluate` | Yes | Yes | Researcher/Admin | Preserve |

---

## F. Machine Learning Comparison

```mermaid
graph TD
    subgraph Target_ML["A:\\curenova-backend (KEEP IN ENTIRETY)"]
        T_Model["ml/models/cure_nova_xgb_final.joblib (8.99 MB)\nExact Model SHA-256: ef951c..."]
        T_Parquet["ml/data/training/drug_disease_features_v4.parquet\n(393,263,004 bytes - 6.7M Rows, 39 Features)\n[CRITICAL ASSET - NOT IN SOURCE]"]
        T_ChEMBL["ml/data/chembl/chembl_drug_evidence.json\n(Precomputed pharmacological profiles)"]
        T_Cache["ml/data/open_targets/evidence_ranker_cache.json"]
        T_Ranker["ml/evidence_ranker.py (28.5 KB)\n(Evidence-grounded fallback for non-indexed drugs)"]
        T_Predictor["ml/predictor.py (1,488 lines)\n(Dual-direction enrichment, pChEMBL extraction)"]
        T_PredictV4["ml/predict_v4.py (10 KB)\n(DuckDB parquet inference queries)"]
    end

    subgraph Source_ML["A:\\curenova-backend-main (DEFICIENT / TRUNCATED)"]
        S_Model["ml/models/cure_nova_xgb_final.joblib\n(Identical binary hash)"]
        S_Parquet["Parquet Feature Store: MISSING!\n(Causes live inference to fail!)"]
        S_ChEMBL["chembl_drug_evidence.json: MISSING!\n(Causes FileNotFoundError)"]
        S_Gen["ml/feature_generator.py (15 KB)\n(Dynamic 39-feature synthesizer)"]
        S_Predictor["ml/predictor.py (213 lines - Truncated)"]
    end

    T_Parquet -.->|Never Replace| T_PredictV4
    T_Model -.->|Never Replace| T_Predictor
```

### Detailed ML Audit Findings
1. **Model Joblib Files**:
   - Both repositories contain `ml/models/cure_nova_xgb_final.joblib` with identical SHA-256 hash: `ef951cc22a2e3ca855fea570331b0f5b413905d44ceb11faa52e764391296349` (8,998,399 bytes).
   - Both contain identical `ml/models/cure_nova_xgb_final.json` and `cure_nova_ml_v4_metadata.json`.
2. **Feature Store Parquet**:
   - `ml/data/training/drug_disease_features_v4.parquet` (393,263,004 bytes) exists **ONLY** in `A:\curenova-backend`.
   - In `A:\curenova-backend-main`, this file is completely absent! As documented in `CURENOVA_IMPLEMENTATION_STATUS.md`, live XGBoost inference in `A:\curenova-backend-main` was completely disabled and falling back to static database mocks due to the missing parquet file.
3. **ChEMBL Evidence Dataset**:
   - `ml/data/chembl/chembl_drug_evidence.json` exists **ONLY** in `A:\curenova-backend`.
   - `ml/data/open_targets/evidence_ranker_cache.json` exists **ONLY** in `A:\curenova-backend`.
4. **Predictor Implementation**:
   - In `A:\curenova-backend`, `ml/predictor.py` is 1,488 lines and contains:
     - `CureNovaMLPredictor`
     - `predict_and_enrich`, `predict_drug_and_enrich`
     - `predict_candidates`, `predict_disease_candidates`
     - `enrich_candidate`, `enrich_disease_candidate`
     - `classify_candidate_indication`, `derive_deterministic_evidence_strength`
     - `get_disease_display_name`
   - In `A:\curenova-backend-main`, `ml/predictor.py` is reduced to 213 lines and imports `CHEMBL_FILE = ML_DIR / "data" / "chembl" / "chembl_drug_evidence.json"` which does not exist in that repo.
5. **Dynamic Feature Generator in Source**:
   - `A:\curenova-backend-main` has `ml/feature_generator.py` (15 KB), which dynamically constructs 39-feature vectors for unindexed drug-disease pairs using RDKit molecular descriptors, Open Targets MoA, and target association scores across 9 canonical indications.
   - **Integration Strategy**: Keep the entire `ml/` system from `A:\curenova-backend`, but import `ml/feature_generator.py` and `ml/data/open_targets/clinical_indication/00000000.parquet` from `A:\curenova-backend-main` as an additive capability.

---

## G. Frontend Comparison

### Architecture & Technology Stack
Both frontends share the identical baseline:
- React 19.2.8 (`react`, `react-dom`)
- React Router DOM 7.18.4
- Tailwind CSS 4.3.3 (`tailwindcss`, `@tailwindcss/vite`)
- Vite 8.3.0
- Framer Motion 14.6.0
- Axios 1.20.0
- Recharts 3.10.1
- Lucide React 1.52.0

### Key Differences in Pages & Components

```mermaid
graph LR
    subgraph Target_FE["A:\\curenova-backend Frontend"]
        F_DrugSimModal["DrugSimilarityDetailModal.jsx (17 KB)"]
        F_ErrBoundary["ErrorBoundary.jsx (3.3 KB)"]
        F_DrugRepurp["ResearcherDrugRepurposing.jsx (82 KB)\n[Supports Drug-to-Similar Alternative Drugs Workflow]"]
        F_AuthCtx["AuthContext.jsx (unintercepted refresh listener)"]
        F_Api["api.js (plainAxios instance, queue, findSimilar)"]
    end

    subgraph Source_FE["A:\\curenova-backend-main Frontend"]
        F_DocDash["DoctorDashboard.jsx\n[Live safetyService.analyze DDI integration]"]
        F_ResResults["ResearcherResults.jsx\n[sessionStorage / localStorage hydration]"]
        F_DocResults["DoctorResults.jsx\n[localStorage history hydration]"]
        F_Api_Src["api.js\n[Patient regimen, DDI, investigation endpoints]"]
    end

    subgraph Merged_FE["Final Integrated Frontend"]
        M_All["Best-of-Both Features:\n1. Drug Similarity & Modals (Target)\n2. ErrorBoundary (Target)\n3. plainAxios Refresh Queue (Target)\n4. Live DDI Doctor Dashboard (Source)\n5. Session Hydration on Reload (Source)\n6. Regimen & Investigation APIs (Source)"]
    end

    Target_FE --> Merged_FE
    Source_FE --> Merged_FE
```

1. **`ResearcherDrugRepurposing.jsx`**:
   - Target (`A:\curenova-backend`): 83,571 bytes (1,375 lines). Includes dual workflow tabs:
     - `drug_to_disease`: Small Molecule Drug Repurposing.
     - `drug_to_similar`: Alternative Drug Discovery & Similarity Engine.
     - Imports `DrugSimilarityDetailModal`, `drugSimilarityService`.
   - Source (`A:\curenova-backend-main`): 44,602 bytes (882 lines). Contains `searchMode` toggle (`drug_to_disease` vs `disease_to_drug`), and URL query parameter loader for past investigations (`?workflow_id=...`).
   - **Verdict**: The target implementation is the primary UI that must be preserved. We must graft the URL param loader (`repurposingService.getInvestigation(wid)`) and `backendSearchType` propagation into the target's `handleRunAnalysis`.
2. **`DoctorDashboard.jsx`**:
   - Target: Uses client-side hardcoded vitals calculation.
   - Source: Uses real-time backend API call `safetyService.analyze(enabledMeds)` to calculate DDI alerts, unmonitored pairs, and contraindications.
   - **Verdict**: Adopt Source's live backend DDI integration into the target UI.
3. **`ResearcherResults.jsx` & `DoctorResults.jsx`**:
   - Target: Reads state solely from `location.state`. Refreshing the page empties the state.
   - Source: Implements state hydration fallback using `sessionStorage.getItem('curenova_active_candidate')` and `localStorage.getItem('curenova_research_history')`. Also supports bidirectional labeling (`candidate_label === 'Proposed Indication'`).
   - **Verdict**: Adopt Source's state hydration into the target UI.
4. **`KnowledgeGraph.jsx`**:
   - Target: Supports `location.state?.similarityContext` to fetch `getSimilaritySubgraph(drugA, drugB)`.
   - Source: Has improved node color categorization (`paper`, `publication`, `trial`, `safetysignal`) and lowercase type handling.
   - **Verdict**: Merge both: preserve `similarityContext` while adding the expanded node type styling.
5. **`services/api.js`**:
   - Target: 500 lines. Has `plainAxios` dedicated instance for refresh, preventing 401 recursive loops. Contains `findSimilar` and `getSimilaritySubgraph`.
   - Source: 376 lines. Contains all endpoints for patient regimen management (`getRegimen`, `addMedication`, `removeMedication`, `toggleDose`), doctor safety analysis (`analyze`), investigation dossier downloads (`downloadInvestigationReport`), and investigation retrieval (`getInvestigation`, `listInvestigations`).
   - **Verdict**: Merge: keep target's `plainAxios` interceptor architecture, and add all missing source endpoint methods.
6. **`components/ErrorBoundary.jsx` & `components/DrugSimilarityDetailModal.jsx`**:
   - Exist **ONLY** in `A:\curenova-backend`. Must be strictly preserved.

---

## H. File-by-File Integration Plan

| File Relative Path | Primary Action | Source of Truth | Justification / Technical Details |
| :--- | :--- | :--- | :--- |
| `requirements.txt` | Merge | Source + Target | Add `psycopg2-binary>=2.9.10` from source; keep all existing dependencies. |
| `.env.example` | Merge | Source | Document both SQLite and PostgreSQL `DATABASE_URL` configurations. |
| `docker-compose.yml` | Import | Source | New container orchestration file. |
| `Dockerfile` | Import | Source | Container build definition with Python 3.11 slim and OpenMP. |
| `.dockerignore` | Import | Source | Docker ignore file. |
| `app/config.py` | Manual Merge | Source + Target | Keep source's PostgreSQL & CORS validation, but soften strict `.env` file-not-found crash for dev environments. |
| `app/database.py` | Import | Source | Adds PostgreSQL connection pooling, URI rewrite, and SQLite fallback. |
| `app/dependencies/auth.py` | Import | Source | Adds whitespace stripping on bearer tokens and structured logging. |
| `app/models/models.py` | Import | Source | Adds `InvestigationRun`, `PatientMedication`, and 5 columns on `CandidatePrediction`. Strict superset of target. |
| `app/schemas/schemas.py` | Manual Merge | Source + Target | Add `DrugSimilarityRequest/Response` from target; add `RegimenAnalysis*`, `InvestigationRunOut`, and `EvidenceExplorer` compatibility from source. |
| `app/main.py` | Manual Merge | Source + Target | Mount `drugs.router` from target; preserve `search_type` on `direct_investigate` from source. |
| `app/routers/auth.py` | Preserve | Target (Identical) | Files are identical (0 diff lines). |
| `app/routers/candidates.py` | Manual Merge | Source + Target | Keep `/similar` and `/diseases` from target; add `/investigations` and `/investigation/{workflow_id}` from source. |
| `app/routers/drugs.py` | Preserve | Target | Drug similarity router exists only in target. |
| `app/routers/doctor.py` | Import | Source | Adds `/adverse-events` and `/safety/analyze-regimen`. |
| `app/routers/patient.py` | Import | Source | Adds full patient medication regimen CRUD and safety check endpoints. |
| `app/routers/reports.py` | Import | Source | Adds `/investigation/{workflow_id}/markdown` investigation dossier download. |
| `app/routers/graph.py` | Preserve | Target | Contains `/similarity-subgraph` required by frontend drug similarity modal. |
| `app/routers/evidence.py` | Import | Source | Adds query filters `q`, `source`, `evidence_type` for EvidenceExplorer. |
| `app/routers/experiments.py`| Preserve | Target (Identical) | Files are identical. |
| `app/routers/feedback.py` | Preserve | Target (Identical) | Files are identical. |
| `app/routers/stress_tests.py`| Preserve | Target (Identical) | Files are identical. |
| `app/routers/system.py` | Preserve | Target (Identical) | Files are identical. |
| `app/services/agentic_orchestrator.py` | Manual Merge | Source + Target | Base on source's 882-line persistent orchestrator; re-integrate `DrugResolver` and target's frontend response payload attributes. |
| `app/services/ml_service.py` | Preserve | Target | 908 lines with complete candidate conversion, held-out validation, and fallback to evidence ranker. |
| `app/services/safety_service.py` | Import | Source | New multi-drug polypharmacy DDI engine. |
| `app/services/clinical_trial_challenge.py` | Import | Source | New adversarial clinical trial challenge agent. |
| `app/services/transcriptomics_service.py` | Import | Source | New LINCS L1000 transcriptomics connectivity engine. |
| `app/services/drug_similarity_service.py` | Preserve | Target | Multi-factor drug similarity engine (RDKit Morgan fingerprints, Tanimoto). |
| `app/services/drug_resolver.py` | Preserve | Target | Dedicated drug entity resolver with ChEMBL & synonym lookup. |
| `app/services/disease_resolver.py` | Manual Merge | Source + Target | Combine target's rich disease dictionary with source's length $\ge 5$ matching guardrail. |
| `app/services/biomedical_adapters.py` | Import | Source | Adds OpenFDA Adverse Events API integration (`search_openfda_events`). |
| `app/services/biomedical_agents.py` | Manual Merge | Source + Target | Keep 2-hop graph edge discovery while incorporating source's formatting. |
| `app/services/auth_service.py` | Preserve | Target (Identical) | Files are identical. |
| `app/services/feedback_service.py` | Preserve | Target (Identical) | Files are identical. |
| `app/services/llm_service.py` | Preserve | Target (Identical) | Files are identical. |
| `app/services/stress_test_engine.py` | Preserve | Target (Identical) | Files are identical. |
| `app/services/seed_data.py` | Preserve | Target (Identical) | Files are identical. |
| `scripts/migrate_sqlite_to_postgres.py` | Import | Source | New migration utility for PostgreSQL. |
| `scripts/build_candidate_features.py` | Preserve | Target | Target version preserves pandas/DuckDB pipelines. |
| `scripts/bootstrap_admin.py`| Preserve | Target (Identical) | Files are identical. |
| `scripts/migrate_m2_auth.py` | Preserve | Target (Identical) | Files are identical. |
| `app/tests/test_api.py` | Manual Merge | Source + Target | Merge 72 new tests from source with 5 auth session tests and candidate tests from target. |
| `app/tests/test_postgresql_integration.py` | Import | Source | New PostgreSQL integration test suite (12 tests). |
| `app/tests/test_drug_ml.py` | Preserve | Target | Specialized ML resolver and candidate tests (14 tests). |
| `app/tests/test_drug_similarity.py` | Preserve | Target | Specialized drug similarity tests (12 tests). |
| `app/tests/test_reliability_regression.py` | Preserve | Target | Regression tests for caching, ChEMBL timeouts, and zero evidence (12 tests). |
| `ml/models/cure_nova_xgb_final.joblib` | Preserve | Target | **CRITICAL**: The working production model must not be touched. |
| `ml/models/cure_nova_xgb_final.json` | Preserve | Target | Metadata file (identical in both). |
| `ml/models/cure_nova_ml_v4_metadata.json` | Preserve | Target | Metadata file (identical in both). |
| `ml/data/training/drug_disease_features_v4.parquet` | Preserve | Target | **CRITICAL**: 393 MB feature store exists only in target! |
| `ml/data/training/drug_molecular_features.csv` | Preserve | Target | Molecular features dataset (present in both). |
| `ml/data/chembl/chembl_drug_evidence.json` | Preserve | Target | **CRITICAL**: ChEMBL pharmacological evidence exists only in target. |
| `ml/data/chembl/chembl_api_cache.json` | Preserve | Target | 309 KB ChEMBL cache in target (vs 114 KB in source). |
| `ml/data/open_targets/evidence_ranker_cache.json` | Preserve | Target | Cache for evidence ranker exists only in target. |
| `ml/data/open_targets/drug_mechanism_of_action/00000000.parquet` | Preserve | Target | MoA parquet file (present in both). |
| `ml/data/open_targets/drug_molecule/00000000.parquet` | Preserve | Target | Drug molecule parquet file (present in both). |
| `ml/data/open_targets/clinical_indication/00000000.parquet` | Import | Source | Clinical indication parquet file exists only in source. |
| `ml/evidence_ranker.py` | Preserve | Target | 28.5 KB evidence ranking engine exists only in target. |
| `ml/predictor.py` | Preserve | Target | 1,488 lines production predictor adapter exists in target. |
| `ml/predict_v4.py` | Preserve | Target | Production feature query pipeline in target. |
| `ml/feature_generator.py` | Import | Source | Dynamic 39-feature generator from source. |
| `ml/stress_test.py` | Preserve | Target (Identical) | Identical in both. |
| `ml/evidence_utils.py` | Preserve | Target | Keeps memory caches and timeout handling. |
| `ml/api.py` | Preserve | Target (Identical) | Identical in both. |
| `frontend/src/pages/researcher/ResearcherDrugRepurposing.jsx` | Manual Merge | Target + Source | Preserve target's full UI (82 KB, drug similarity tab, modal) while adding source's URL param investigation loader. |
| `frontend/src/pages/doctor/DoctorDashboard.jsx` | Manual Merge | Source + Target | Graft source's live backend `safetyService.analyze(enabledMeds)` into target UI. |
| `frontend/src/pages/doctor/DoctorResults.jsx` | Manual Merge | Source + Target | Add source's `localStorage` safety history hydration. |
| `frontend/src/pages/researcher/ResearcherResults.jsx` | Manual Merge | Source + Target | Add source's `sessionStorage` and `localStorage` hydration and dual-direction labeling. |
| `frontend/src/pages/patient/PatientDashboard.jsx` | Import | Source | Uses `Array.isArray(res)` defensive check for catalog. |
| `frontend/src/pages/patient/PatientResults.jsx` | Preserve | Target | Target has clean interaction presentation and no-interaction card. |
| `frontend/src/pages/KnowledgeGraph.jsx` | Manual Merge | Target + Source | Keep target's `similarityContext` while adding source's expanded node colors. |
| `frontend/src/components/DrugSimilarityDetailModal.jsx` | Preserve | Target | Exists only in target. |
| `frontend/src/components/ErrorBoundary.jsx` | Preserve | Target | Exists only in target. |
| `frontend/src/services/api.js` | Manual Merge | Target + Source | Keep target's `plainAxios` refresh interceptor; add all missing source endpoint methods. |
| `frontend/src/context/AuthContext.jsx` | Manual Merge | Target + Source | Keep target's `curenova:token_refreshed` event listener; adopt source's live token verification fallback without mock tokens. |
| `frontend/src/App.jsx` | Preserve | Target | Keeps `<ErrorBoundary>` wrapping routes. |
| `curenova.db` | Preserve & Migrate | Target | Keep target database; execute SQL migration to add 2 tables and 5 columns. |

---

## I. Files That Must Be Preserved from the Destination Project

The following files represent working, tested, production functionality unique to `A:\curenova-backend` that **MUST NOT** be overwritten or discarded:

```text
[CRITICAL PRODUCTION MACHINE LEARNING SYSTEM]
1.  ml/models/cure_nova_xgb_final.joblib                    (8.99 MB trained XGBoost production model)
2.  ml/data/training/drug_disease_features_v4.parquet       (393 MB, 6.7M row offline feature store)
3.  ml/data/chembl/chembl_drug_evidence.json                (Precomputed ChEMBL bioactivity dataset)
4.  ml/data/open_targets/evidence_ranker_cache.json         (Cache for non-indexed entity ranking)
5.  ml/evidence_ranker.py                                   (Evidence-Grounded Biomedical Ranking Engine)
6.  ml/predictor.py                                         (1,488 lines - dynamic dual-direction inference)
7.  ml/predict_v4.py                                        (10 KB - DuckDB parquet queries & feature joins)
8.  app/services/ml_service.py                              (908 lines - ML orchestration bridge)

[DRUG SIMILARITY & ALTERNATIVE DRUG DISCOVERY SYSTEM]
9.  app/services/drug_similarity_service.py                 (31.5 KB - RDKit Morgan fingerprints, Tanimoto)
10. app/services/drug_resolver.py                           (10 KB - standalone drug resolution service)
11. app/routers/drugs.py                                    (/api/drugs/similar router)
12. app/routers/graph.py                                    (/api/graph/similarity-subgraph)

[FRONTEND COMPONENTS & SAFETY GUARDS]
13. frontend/src/components/DrugSimilarityDetailModal.jsx   (17 KB - multi-factor comparison modal)
14. frontend/src/components/ErrorBoundary.jsx               (3.3 KB - React application error boundary)

[TEST SUITES & LOCAL DATABASE]
15. app/tests/test_drug_ml.py                               (14 automated ML resolver tests)
16. app/tests/test_drug_similarity.py                       (12 automated drug similarity tests)
17. app/tests/test_reliability_regression.py                (12 automated reliability regression tests)
18. curenova.db                                             (Active SQLite database with seeded data)
```

---

## J. Files That Should Be Imported from the Backend Source

The following files represent modular, enterprise-grade capabilities developed in `A:\curenova-backend-main` that can be imported directly into the destination project:

```text
[NEW CLINICAL & SPECIALIZED SERVICES]
1.  app/services/safety_service.py                          (10.8 KB - Multi-drug polypharmacy DDI engine)
2.  app/services/clinical_trial_challenge.py                (19.2 KB - Adversarial clinical trial challenge agent)
3.  app/services/transcriptomics_service.py                 (19.4 KB - LINCS L1000 CMAP transcriptomics engine)

[DATABASE INFRASTRUCTURE & MIGRATION]
4.  app/database.py                                         (PostgreSQL connection pooling + SQLite dual support)
5.  app/dependencies/auth.py                                (Token whitespace stripping + enhanced logging)
6.  scripts/migrate_sqlite_to_postgres.py                   (18-table SQLite to PostgreSQL migration script)
7.  app/tests/test_postgresql_integration.py                (12 automated PostgreSQL DDL & pooling tests)

[ROUTERS WITH ADVANCED CAPABILITIES]
8.  app/routers/doctor.py                                   (Adds /adverse-events & /safety/analyze-regimen)
9.  app/routers/patient.py                                  (Adds 5 regimen CRUD & safety check endpoints)
10. app/routers/reports.py                                  (Adds /investigation/{workflow_id}/markdown)
11. app/routers/evidence.py                                 (Adds q, source, evidence_type query filters)

[BIOMEDICAL ADAPTERS & ML EXTENSIONS]
12. app/services/biomedical_adapters.py                     (Adds OpenFDA search_openfda_events)
13. ml/feature_generator.py                                 (Dynamic 39-feature vector synthesizer)
14. ml/data/open_targets/clinical_indication/00000000.parquet (Clinical indication parquet dataset)

[CONTAINERIZATION]
15. docker-compose.yml                                      (Full docker-compose orchestration definition)
16. Dockerfile                                              (Production containerfile with libgomp1)
17. .dockerignore                                           (Docker build exclusion patterns)
```

---

## K. Files Requiring Manual Merge

The following files contain crucial code in **both** repositories that must be merged manually:

### 1. `app/models/models.py`
- **Action**: Adopt source's `models.py` (which includes `InvestigationRun`, `PatientMedication`, and the 5 new columns on `CandidatePrediction`), ensuring all foreign keys and cascades are intact.

### 2. `app/schemas/schemas.py`
- **From Target**: Retain `DrugSimilarityRequest`, `DrugSimilarityCandidateOut`, and `DrugSimilarityResponse`.
- **From Source**: Add `RegimenAnalysisRequest`, `PairwiseInteractionOut`, `RegimenAnalysisOut`, `InvestigationRunOut`, and the `@model_validator` compatibility decorators on `CandidateSummaryOut` and `EvidenceRecordOut`.

### 3. `app/main.py`
- **From Target**: Include `drugs.router` under `settings.API_PREFIX` (`/api/drugs`).
- **From Source**: Retain `search_type: str = "drug_to_disease"` query parameter on `@app.get("/api/investigate")` and pass it to `candidates.investigate_query`.

### 4. `app/routers/candidates.py`
- **From Target**: Retain `@router.get("/similar")`, `@router.post("/similar")`, and `@router.get("/diseases")`.
- **From Source**: Retain `@router.get("/investigations")`, `@router.get("/investigation/{workflow_id}")`, and the `search_type` parameter validation in `investigate_query`.

### 5. `app/services/agentic_orchestrator.py`
- **Base**: Source's 882-line orchestrator with database persistence to `InvestigationRun` and `CandidatePrediction`, LINCS L1000 transcriptomics, and clinical trial challenge audits.
- **Incorporate from Target**:
  - Re-integrate `DrugResolver.resolve_drug(query, db=db)` from `app.services.drug_resolver`.
  - Ensure the final response payload contains `resolved_entity` and `model_info` objects expected by the frontend results dossier.

### 6. `app/services/disease_resolver.py`
- **Incorporate from Target**: The comprehensive dictionary of curated disease mappings (including `epilepsy`, `ckd`, `copd`, `schizophrenia`, `atherosclerosis`).
- **Incorporate from Source**: The `len(key) >= 5` minimum length guardrail to prevent short-substring false positives, and the fallback to `DrugResolver`.

### 7. `app/config.py`
- **Incorporate from Source**: PostgreSQL connection URL parsing and strict CORS validation.
- **Modify from Source**: In `PROJECT_ROOT / ".env"`, if `.env` does not exist, attempt to load `.env.example` or proceed with default development SQLite configuration with a clear console warning, rather than raising `FileNotFoundError` during development onboarding.

### 8. `frontend/src/services/api.js`
- **Base Architecture from Target**: Retain `plainAxios` unintercepted refresh instance, token refresh concurrency queueing, and `curenova:token_refreshed` custom event dispatching.
- **Methods from Target**: Retain `findSimilar(drugName, topK)` and `getSimilaritySubgraph(drugA, drugB)`.
- **Methods from Source**: Add:
  - `safetyService.analyze(medications, patientContext, roleView)`
  - `patientService.getRegimen()`, `addMedication(data)`, `removeMedication(id)`, `toggleDose(id)`
  - `reportsService.downloadInvestigationReport(workflowId)`
  - `repurposingService.getInvestigation(workflowId)`, `listInvestigations(limit)`
  - `doctorService.getAdverseEvents(drug, limit)`

### 9. `frontend/src/pages/researcher/ResearcherDrugRepurposing.jsx`
- **Base from Target**: Retain full 82 KB UI with tabs for Drug Repurposing and Alternative Drug Similarity, `DrugSimilarityDetailModal`, and metric badge visualizations.
- **Incorporate from Source**:
  - Propagate `backendSearchType` (`drug_to_disease` or `disease_to_drug`) into `repurposingService.analyze`.
  - Add the URL parameter listener: when `?workflow_id=...` is present in URL, call `repurposingService.getInvestigation(wid)` and hydrate the UI.

### 10. `frontend/src/pages/doctor/DoctorDashboard.jsx`
- **Incorporate from Source**: Add the `useEffect` hook that triggers `safetyService.analyze(enabledMeds)` whenever 2 or more medications are selected, displaying real backend pairwise interactions, severity badges, and unmonitored warnings.

### 11. `frontend/src/pages/researcher/ResearcherResults.jsx` & `DoctorResults.jsx`
- **Incorporate from Source**: Add the `sessionStorage` and `localStorage` hydration logic in `useState` initialization, preventing blank pages on browser refresh. Add support for bidirectional candidate labels (`data.candidate_label === 'Proposed Indication'`).

### 12. `frontend/src/context/AuthContext.jsx`
- **From Target**: Retain listener for `curenova:token_refreshed` and synchronize token state.
- **From Source**: In initial load, if `authService.getMe()` fails, attempt `authService.refreshToken(savedRefresh)` before clearing state. Eliminate mock token fallbacks from `quickLogin` so authentication is always authentic.

### 13. `app/tests/test_api.py`
- **Merge**: Combine the 84 tests in target (including the 5 dedicated token expiration and rotation regression tests) with the 72 new tests from source (covering investigation persistence, LINCS L1000, clinical trial challenge, polypharmacy safety, and disease-first workflows), creating a unified test suite of over 156 tests.

---

## L. Dependency Conflicts

### Python Dependencies (`requirements.txt`)

Comparison of dependencies between both projects:

| Package | A:\curenova-backend | A:\curenova-backend-main | Final Specification | Conflict Status |
| :--- | :--- | :--- | :--- | :--- |
| `fastapi` | `fastapi>=0.115.0` | `fastapi>=0.115.0` | `fastapi>=0.115.0` | Compatible |
| `uvicorn` | `uvicorn>=0.32.0` | `uvicorn>=0.32.0` | `uvicorn>=0.32.0` | Compatible |
| `pydantic` | `pydantic>=2.10.0` | `pydantic>=2.10.0` | `pydantic>=2.10.0` | Compatible |
| `sqlalchemy` | `sqlalchemy>=2.0.36` | `sqlalchemy>=2.0.36` | `sqlalchemy>=2.0.36` | Compatible |
| `pyjwt` | `pyjwt[crypto]>=2.10.0`| `pyjwt[crypto]>=2.10.0`| `pyjwt[crypto]>=2.10.0`| Compatible |
| `passlib` | `passlib[bcrypt]>=1.7.4`| `passlib[bcrypt]>=1.7.4`| `passlib[bcrypt]>=1.7.4`| Compatible |
| `python-dotenv` | `python-dotenv>=1.0.1` | `python-dotenv>=1.0.1` | `python-dotenv>=1.0.1` | Compatible |
| `httpx` | `httpx>=0.28.0` | `httpx>=0.28.0` | `httpx>=0.28.0` | Compatible |
| `duckdb` | `duckdb>=1.1.0` | `duckdb>=1.1.0` | `duckdb>=1.1.0` | Compatible |
| `xgboost` | `xgboost>=2.1.0` | `xgboost>=2.1.0` | `xgboost>=2.1.0` | Compatible |
| `joblib` | `joblib>=1.4.0` | `joblib>=1.4.0` | `joblib>=1.4.0` | Compatible |
| `numpy` | `numpy>=1.26.0` | `numpy>=1.26.0` | `numpy>=1.26.0` | Compatible |
| `pandas` | `pandas>=2.2.0` | `pandas>=2.2.0` | `pandas>=2.2.0` | Compatible |
| `scikit-learn` | `scikit-learn>=1.5.0` | `scikit-learn>=1.5.0` | `scikit-learn>=1.5.0` | Compatible |
| `rdkit` | `rdkit>=2024.3.0` | `rdkit>=2024.3.0` | `rdkit>=2024.3.0` | Compatible |
| `psycopg2-binary`| Not present | `psycopg2-binary>=2.9.10`| `psycopg2-binary>=2.9.10`| **Additive** (Import from source) |

> [!NOTE]
> There are **zero version conflicts** in Python dependencies. `psycopg2-binary>=2.9.10` from source simply needs to be appended to the target's `requirements.txt`.

### Node / Frontend Dependencies (`frontend/package.json`)
The `package.json` files in both projects are **100% byte-for-byte identical**. No npm conflicts exist.
- React: `^19.2.8`
- Vite: `^8.3.0`
- Tailwind CSS: `^4.3.3`
- Axios: `^1.20.0`
- Framer Motion: `^14.6.0`
- Lucide React: `^1.52.0`

---

## M. Environment Variable Requirements

The integrated application requires the following environment variables:

| Environment Variable | Required in Dev | Required in Prod | Default Value | Description |
| :--- | :---: | :---: | :--- | :--- |
| `ENVIRONMENT` | No | Yes | `development` | Deployment environment: `development`, `staging`, `production`. |
| `DATABASE_URL` | No | Yes | `sqlite:///./curenova.db` | Database connection string. For PostgreSQL: `postgresql+psycopg2://user:pass@host:5432/curenova`. |
| `CURENOVA_SECRET_KEY` | No | Yes | `dev-insecure-app-secret-key-min-32-chars` | General cryptographic secret key (min 32 chars in production). |
| `CURENOVA_JWT_SECRET` | No | Yes | `dev-insecure-jwt-signing-secret-key-min-32-chars` | High-entropy JWT signing key (min 32 chars, cannot equal `SECRET_KEY`). |
| `ENABLE_DEMO_SEEDING` | No | No | `true` in dev, `false` in prod | Explicit development-only flag to seed demo data on startup. Strictly forbidden in production. |
| `CORS_ALLOWED_ORIGINS`| No | Yes | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated list of strict origins (`scheme://host[:port]`). Wildcard forbidden with credentials. |
| `OPENFDA_API_KEY` | No | No | `""` | Optional API key for higher rate limits on OpenFDA adverse event queries. |
| `NCBI_API_KEY` | No | No | `""` | Optional API key for PubMed E-Utilities literature searches. |
| `LLM_BACKEND_ENABLED` | No | No | `false` | Enables external LLM synthesis if configured. |
| `LLM_PROVIDER` | No | No | `openai` | LLM provider: `openai`, `gemini`, `anthropic`, `local`. |
| `LLM_BASE_URL` | No | No | `https://generativelanguage.googleapis.com/v1beta/openai/` | LLM endpoint URL. |
| `LLM_MODEL` | No | No | `gemini-2.5-flash` | LLM model identifier. |
| `LLM_API_KEY` | No | No | `""` | API key for LLM queries. When absent, orchestrator uses deterministic synthesis fallback. |

---

## N. Database Migration Requirements

### SQLite Schema Migration (`curenova.db`)
The active database `curenova.db` in `A:\curenova-backend` has 16 tables. It lacks the two new tables and the five new columns on `candidate_predictions`.

Because SQLAlchemy's `Base.metadata.create_all(bind=engine)` creates missing tables but **does not alter existing tables** to add new columns, running the application directly on the existing `curenova.db` without migration would result in an `OperationalError: no such column: candidate_predictions.investigation_id`.

To resolve this safely and non-destructively:
1. **Create Missing Tables**:
   - `investigation_runs`
   - `patient_medications`
2. **Alter `candidate_predictions` Table**:
   ```sql
   ALTER TABLE candidate_predictions ADD COLUMN investigation_id INTEGER REFERENCES investigation_runs(id);
   ALTER TABLE candidate_predictions ADD COLUMN workflow_id VARCHAR(100);
   ALTER TABLE candidate_predictions ADD COLUMN score_type VARCHAR(50) DEFAULT 'ranking_score';
   ALTER TABLE candidate_predictions ADD COLUMN provenance VARCHAR(100) DEFAULT 'precomputed_feature_store';
   ALTER TABLE candidate_predictions ADD COLUMN molecular_features_json TEXT;
   CREATE INDEX IF NOT EXISTS ix_candidate_predictions_investigation_id ON candidate_predictions (investigation_id);
   CREATE INDEX IF NOT EXISTS ix_candidate_predictions_workflow_id ON candidate_predictions (workflow_id);
   ```
3. **Automated Migration Script**:
   Create a dedicated migration script `scripts/migrate_v2_persistence.py` that executes these idempotent DDL statements safely against `curenova.db` before server startup.

### PostgreSQL Production Migration
When deploying with PostgreSQL:
- Execute `scripts/migrate_sqlite_to_postgres.py` with the environment variable `TARGET_DATABASE_URL=postgresql+psycopg2://...`.
- The script migrates all 18 tables in topological dependency order:
  1. `users`
  2. `refresh_tokens`
  3. `research_projects`
  4. `drugs`
  5. `diseases`
  6. `targets`
  7. `investigation_runs`
  8. `candidate_predictions`
  9. `evidence_records`
  10. `research_notes`
  11. `knowledge_nodes`
  12. `knowledge_edges`
  13. `stress_test_runs`
  14. `drug_interactions`
  15. `clinical_trial_records`
  16. `patient_medicine_guides`
  17. `patient_medications`
  18. `research_feedback`
- Resets all PostgreSQL sequences via `pg_get_serial_sequence` and validates row counts.

---

## O. Risks

| Risk Category | Specific Risk | Severity | Mitigation Strategy |
| :--- | :--- | :---: | :--- |
| **ML System Integrity** | Overwriting `ml/models/cure_nova_xgb_final.joblib`, `ml/predictor.py`, or deleting `drug_disease_features_v4.parquet` (393 MB). | **CRITICAL** | **Never copy `ml/` from source over destination.** Destination's `ml/` files are preserved as the definitive ground truth. Only additive files (`feature_generator.py`, `clinical_indication parquet`) are imported. |
| **Database Corruption** | Missing column errors on `candidate_predictions` during SQLite execution. | **HIGH** | Run idempotent `ALTER TABLE` statements in `scripts/migrate_v2_persistence.py` prior to launching the server. |
| **Startup Crash** | Source's `app/config.py` raising `FileNotFoundError` if `.env` does not exist. | **HIGH** | Soften the strict `.env` file check in `config.py` to allow default development settings or automatic copying of `.env.example` if `.env` is absent. |
| **Token Refresh Loop** | Losing target's `plainAxios` unintercepted refresh client in `api.js`, causing 401 recursive loops. | **HIGH** | Preserve target's `plainAxios` architecture in `frontend/src/services/api.js`. |
| **UI Feature Loss** | Overwriting `ResearcherDrugRepurposing.jsx` (82 KB) with source's truncated 44 KB version, losing the Drug Similarity workflow. | **HIGH** | Retain target's 82 KB `ResearcherDrugRepurposing.jsx` and `DrugSimilarityDetailModal.jsx`. Only patch in URL investigation loading and `search_type`. |
| **Test Suite Regressions** | Losing target's specialized drug resolver, drug similarity, or auth expiration tests when merging `test_api.py`. | **MEDIUM** | Preserve `test_drug_ml.py`, `test_drug_similarity.py`, and `test_reliability_regression.py`. Append source's new API tests into `test_api.py`. |

---

## P. Exact Implementation Sequence

Once the audit is accepted and implementation is authorized, the integration must proceed strictly in this order:

```text
Step 1: Configuration & Environment Setup
├── 1.1 Update requirements.txt to include psycopg2-binary>=2.9.10
├── 1.2 Update .env.example to document PostgreSQL DATABASE_URL
└── 1.3 Update app/config.py to soften missing .env check for dev environments

Step 2: Database Layer Integration
├── 2.1 Update app/database.py with PostgreSQL connection pooling and URL rewrite
├── 2.2 Update app/models/models.py to add InvestigationRun, PatientMedication, and CandidatePrediction columns
├── 2.3 Execute scripts/migrate_v2_persistence.py to apply ALTER TABLE and create new tables on curenova.db
└── 2.4 Import scripts/migrate_sqlite_to_postgres.py and app/tests/test_postgresql_integration.py

Step 3: Clinical & Specialized Services Import
├── 3.1 Copy app/services/safety_service.py from source
├── 3.2 Copy app/services/clinical_trial_challenge.py from source
├── 3.3 Copy app/services/transcriptomics_service.py from source
├── 3.4 Copy ml/feature_generator.py and ml/data/open_targets/clinical_indication/00000000.parquet
└── 3.5 Update app/services/biomedical_adapters.py with search_openfda_events

Step 4: Schemas & Routers Integration
├── 4.1 Update app/schemas/schemas.py with RegimenAnalysis*, InvestigationRunOut, and DrugSimilarity*
├── 4.2 Copy app/routers/doctor.py, patient.py, reports.py, evidence.py from source
├── 4.3 Update app/routers/candidates.py (merge /similar & /diseases with /investigations)
├── 4.4 Update app/main.py (mount drugs.router and preserve search_type on direct_investigate)
└── 4.5 Merge app/services/agentic_orchestrator.py (retain DrugResolver + DB persistence + clinical agents)

Step 5: Frontend Integration
├── 5.1 Update frontend/src/services/api.js (keep plainAxios, add regimen, DDI, and investigation APIs)
├── 5.2 Update frontend/src/context/AuthContext.jsx (merge token_refreshed event + live getMe refresh)
├── 5.3 Update frontend/src/pages/doctor/DoctorDashboard.jsx (graft live safetyService.analyze check)
├── 5.4 Update frontend/src/pages/doctor/DoctorResults.jsx (add localStorage history hydration)
├── 5.5 Update frontend/src/pages/researcher/ResearcherResults.jsx (add sessionStorage/localStorage hydration)
├── 5.6 Update frontend/src/pages/researcher/ResearcherDrugRepurposing.jsx (add URL param wid loader)
├── 5.7 Update frontend/src/pages/KnowledgeGraph.jsx (merge similarityContext with expanded node colors)
└── 5.8 Rebuild frontend using `npm run build`

Step 6: Containerization & Documentation
├── 6.1 Copy Dockerfile, docker-compose.yml, .dockerignore from source
└── 6.2 Verify clean linting and formatting across codebase
```

---

## Q. Exact Final E2E Validation Plan

To verify that the integrated system functions without flaws, execute this validation protocol:

### Phase 1: Machine Learning & Feature Store Verification
1. **Model Loading & Information Check**:
   - Verify `MLService.is_available() == True`.
   - Query `GET /api/system/health` and verify ML status is `operational`.
   - Check `ml/models/cure_nova_xgb_final.joblib` hash matches `ef951cc22a2e...`.
2. **Live XGBoost Inference (Disease $\rightarrow$ Drug)**:
   - Run investigation query for `"Pulmonary Arterial Hypertension"`.
   - Verify that 10 candidate hypotheses are generated using the 39-feature XGBoost model from `drug_disease_features_v4.parquet`.
   - Confirm Fasudil / Treprostinil are identified with prediction scores and held-out calibration benchmarks.
3. **Live XGBoost Inference (Drug $\rightarrow$ Disease)**:
   - Run investigation query for `"Everolimus"` with `search_type="drug_to_disease"`.
   - Verify candidates are returned with biological mechanisms and ChEMBL affinities.
4. **Evidence-Grounded Fallback (Non-Indexed Entity)**:
   - Run investigation query for `"Sildenafil"`.
   - Confirm `ml/evidence_ranker.py` handles the non-indexed entity, generating evidence-backed hypotheses without raising zero-candidate errors.

### Phase 2: Drug Similarity & Alternative Drug Discovery Verification
1. **Multi-Factor Similarity Calculation**:
   - Send `POST /api/drugs/similar` with `{"drug": "Metformin", "top_k": 5}`.
   - Verify 5 similar drugs are returned with RDKit Tanimoto scores, target Jaccard scores, and scientific rationales.
2. **Similarity Knowledge Graph Subgraph**:
   - Send `GET /api/graph/similarity-subgraph?drug_a=Metformin&drug_b=Phenformin`.
   - Verify nodes and edges connecting the two drugs via AMPK targets are returned.

### Phase 3: Enterprise Database Persistence Verification
1. **Investigation Workflow Persistence**:
   - Execute an investigation for `"Breast Carcinoma"`.
   - Note the generated `workflow_id` (e.g. `WF-CURENOVA-...`).
   - Query `GET /api/candidates/investigations` as an authenticated researcher.
   - Confirm the newly generated investigation run appears in the list.
   - Query `GET /api/candidates/investigation/{workflow_id}` and verify the complete `AgentWorkflowResponse` is returned from `investigation_runs.results_json`.
   - Verify that rows in `candidate_predictions` table have their `investigation_id` and `workflow_id` populated.
2. **Investigation Markdown Dossier**:
   - Send `GET /api/reports/investigation/{workflow_id}/markdown`.
   - Verify response has `Content-Type: text/markdown` and contains the complete scientific investigation report.

### Phase 4: Polypharmacy & Regimen Safety Verification
1. **Doctor Portal Regimen Analysis**:
   - Send `POST /api/doctor/safety/analyze-regimen` with `{"medications": ["Warfarin", "Aspirin", "Metformin"]}`.
   - Verify major bleeding contraindication between Warfarin and Aspirin is surfaced.
   - Verify unmonitored pair disclaimer is surfaced for pairs without monographs.
2. **Patient Portal Regimen CRUD & Adherence**:
   - Send `POST /api/patient/regimen` to add `"Metformin 500mg"`.
   - Send `GET /api/patient/regimen` and confirm drug is listed.
   - Send `POST /api/patient/regimen/{med_id}/toggle` and verify dose taken status updates.
   - Send `POST /api/patient/regimen/safety-check` and verify safety report is generated.
   - Send `DELETE /api/patient/regimen/{med_id}` and confirm removal.

### Phase 5: Authentication & Session Lifecycle Verification
1. **Token Refresh with `plainAxios`**:
   - Obtain access token and refresh token via `POST /api/auth/login`.
   - Wait or mock access token expiry.
   - Send authenticated request to `/api/auth/me`.
   - Verify frontend interceptor seamlessly calls `/api/auth/refresh` without recursive loops, receives rotated token, and retries original request.
2. **Refresh Token Family Invalidation**:
   - Attempt to replay an already-used refresh token.
   - Confirm backend revokes token family and responds with HTTP 401.

### Phase 6: Automated Test Suite Execution
Run the full unified pytest suite:
```powershell
pytest app/tests/ -v
```
**Expected Target**: All tests passing (100% pass rate across `test_api.py`, `test_postgresql_integration.py`, `test_drug_ml.py`, `test_drug_similarity.py`, and `test_reliability_regression.py`).

### Phase 7: Frontend Production Build Verification
In `frontend/`:
```powershell
npm run build
```
**Expected Target**: Zero TypeScript/JSX syntax errors, successful Vite production bundling in `< 3.0s`.

---
*End of Architecture Audit Document.*

