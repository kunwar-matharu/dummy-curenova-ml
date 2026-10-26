# CureNova 2.0 — Frontend Integration Contract & API Reference

**Document Version**: 2.0.0  
**Backend Framework**: FastAPI + SQLAlchemy  
**Target Consumer**: CureNova Frontend Application  
**Authentication Standard**: OAuth2 HTTPBearer (JWT Access Token + Rotating Refresh Token)

---

## 1. Network Configuration & CORS

### Base URL
- **Local Development**: `http://127.0.0.1:8000` (or `http://localhost:8000`)
- **API Prefix**: All business endpoints are mounted under `/api`
- **Swagger Documentation**: `/docs` (interactive OpenAPI UI with JWT Authorize button)
- **ReDoc Documentation**: `/redoc`
- **Root Liveness Probe**: `/health`
- **Root Readiness Probe**: `/ready`

### CORS Allowed Origins
The backend allows cross-origin requests from configured frontend origins via `CORS_ALLOWED_ORIGINS`:
- **Default Development Origins**:
  - `http://localhost:5173` (Vite)
  - `http://127.0.0.1:5173`
  - `http://localhost:3000` (Next.js / CRA)
  - `http://127.0.0.1:3000`
- **Custom Origin Configuration**: Set `CORS_ALLOWED_ORIGINS` in `.env` as a comma-separated list:
  ```env
  CORS_ALLOWED_ORIGINS=http://localhost:5173,https://your-frontend-domain.com
  ```
- **Credentials Support**: `allow_credentials=True`. Requests must specify `credentials: "include"` (fetch/axios) when passing Authorization headers.
- **Allowed Methods**: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`.

---

## 2. Authentication Flow & Role-Based Access Control (RBAC)

### Supported User Roles
1. **`researcher`**: Drug repurposing research, candidate investigation, stress-testing, literature synthesis, and projects. (*Requires `approval_status == 'approved'` to execute privileged research*).
2. **`doctor`**: Pharmacovigilance, drug-drug interactions (DDI), and human clinical trial monitoring. (*Requires `approval_status == 'approved'`*).
3. **`patient`**: Plain-language medicine guides and educational research abstract translation. (*Self-service, auto-approved*).
4. **`admin`**: System configuration, mode switching, user directory, and researcher/doctor approval.

### Researcher Approval Workflow
1. When a researcher signs up (`POST /api/auth/signup`), the account is created with `approval_status: "pending"` and `is_verified: false`.
2. The researcher can log in and obtain a JWT access token, view `/api/auth/me`, and access public endpoints.
3. Access to privileged research endpoints (`POST /api/candidates/investigate`, `POST /api/stress-tests/run`, `POST /api/experiments/projects`) returns **HTTP 403 Forbidden** with `detail: "Forbidden: Account status is 'pending'. Approval required for researcher role."`
4. An administrator approves or rejects the account via `POST /api/auth/users/{user_id}/approve` with payload `{"approval_status": "approved"}`.
5. Once approved, the researcher immediately gains access to all researcher-scoped endpoints.

---

## 3. Endpoints Reference

### A. Authentication & Session Management

#### 1. Register Account
- **Method & Path**: `POST /api/auth/signup`
- **Auth**: None (Public)
- **Request Body**:
  ```json
  {
    "email": "researcher.jane@biotech.org",
    "password": "SecurePassword2026!#",
    "full_name": "Dr. Jane Doe",
    "role": "researcher"
  }
  ```
  *Note*: Allowed roles on signup: `"researcher"`, `"doctor"`, `"patient"`. (`"admin"` is prohibited on self-registration).
- **Response (201 Created)**:
  ```json
  {
    "id": 6,
    "email": "researcher.jane@biotech.org",
    "full_name": "Dr. Jane Doe",
    "role": "researcher",
    "is_active": true,
    "is_verified": false,
    "approval_status": "pending",
    "created_at": "2026-10-25T10:00:00Z"
  }
  ```
- **Error Statuses**:
  - `400 Bad Request`: Cannot self-register as admin.
  - `409 Conflict`: An account with this email already exists.
  - `422 Unprocessable Entity`: Password too short (< 8 chars) or invalid email format.

#### 2. User Login
- **Method & Path**: `POST /api/auth/login`
- **Auth**: None (Public)
- **Request Body**:
  ```json
  {
    "email": "researcher.jane@biotech.org",
    "password": "SecurePassword2026!#"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 1800,
    "user": {
      "id": 6,
      "email": "researcher.jane@biotech.org",
      "full_name": "Dr. Jane Doe",
      "role": "researcher",
      "is_active": true,
      "is_verified": false,
      "approval_status": "pending",
      "created_at": "2026-10-25T10:00:00Z"
    }
  }
  ```
- **Error Statuses**:
  - `401 Unauthorized`: Invalid email or password.
  - `403 Forbidden`: Account is deactivated.
  - `429 Too Many Requests`: Login rate limit exceeded (> 5 attempts per 60 seconds).

#### 3. Refresh Access Token
- **Method & Path**: `POST /api/auth/refresh`
- **Auth**: None (Valid refresh token in body)
- **Request Body**:
  ```json
  {
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 1800
  }
  ```
- **Error Statuses**:
  - `401 Unauthorized`: Expired token, invalid token, or token reuse detected (triggers token family invalidation).

#### 4. Current User Profile
- **Method & Path**: `GET /api/auth/me`
- **Auth**: Bearer Token
- **Headers**: `Authorization: Bearer <access_token>`
- **Response (200 OK)**: Returns the authenticated `UserOut` schema matching login response.

#### 5. Logout / Session Termination
- **Method & Path**: `POST /api/auth/logout`
- **Auth**: Bearer Token or `refresh_token` in body
- **Request Body**: `{"refresh_token": "..."}` (optional if Bearer header present)
- **Response (200 OK)**: `{"message": "Session terminated successfully"}`

#### 6. Admin User Directory
- **Method & Path**: `GET /api/auth/users`
- **Auth**: Bearer Token (Role: `admin`)
- **Response (200 OK)**: `List[UserOut]`

#### 7. Admin Approve/Reject User
- **Method & Path**: `POST /api/auth/users/{user_id}/approve`
- **Auth**: Bearer Token (Role: `admin`)
- **Request Body**:
  ```json
  {
    "approval_status": "approved"
  }
  ```
  *(Allowed values: `"approved"`, `"rejected"`, `"pending"`)*
- **Response (200 OK)**: Updated `UserOut` record.

---

### B. Candidate Hypotheses & Multi-Agent Investigation

#### 1. List Candidates
- **Method & Path**: `GET /api/candidates`
- **Auth**: None (Public)
- **Query Parameters**:
  - `disease`: filter by disease name (e.g., `Pulmonary Arterial Hypertension`)
  - `drug`: filter by drug name (e.g., `Imatinib`)
  - `status`: filter by status (e.g., `Hypothesis`, `Validated`)
  - `min_score`: float minimum prediction score (0.0 to 1.0)
  - `bookmarked_only`: boolean (true/false)
  - `sort_by`: `"rank"` (default), `"score"`, `"evidence"`, or `"uncertainty"`
- **Response (200 OK)**: `List[CandidateSummaryOut]`

#### 2. Execute Multi-Agent Research Investigation
- **Method & Path**: `POST /api/candidates/investigate?query={disease_or_drug}`
- **Auth**: Bearer Token (Role: `researcher` or `admin`, with `approval_status: "approved"`)
- **Query Parameter**: `query` (string, min 2, max 150 chars)
- **Response (200 OK)**:
  ```json
  {
    "workflow_id": "WF-CURENOVA-1729854000",
    "query_entity": "Pulmonary Arterial Hypertension",
    "entity_type": "Disease",
    "completed_steps": [
      {
        "step_id": 1,
        "name": "Research Protocol Initialization",
        "agent_role": "Research Planning Agent",
        "status": "completed",
        "tool_called": "tool_plan_investigation_graph",
        "execution_time_ms": 38,
        "provenance": "CureNova Agentic Workflow Engine (deterministic_fallback)",
        "findings_summary": "Formulated 6-stage investigation protocol...",
        "uncertainties_detected": []
      },
      {
        "step_id": 2,
        "name": "Ontological Entity Resolution",
        "agent_role": "Biomedical Entity Resolution Agent",
        "status": "completed",
        "tool_called": "tool_resolve_mesh_chembl_identifiers",
        "execution_time_ms": 42,
        "provenance": "MeSH Ontology / ChEMBL 33 Dictionary",
        "findings_summary": "Resolved query to Disease: 'Pulmonary Arterial Hypertension' [ID: D006976].",
        "uncertainties_detected": []
      },
      {
        "step_id": 3,
        "name": "Biological Mechanistic Retrieval",
        "agent_role": "TargetMechanist Agent",
        "status": "completed",
        "tool_called": "tool_query_biomedical_knowledge_graph",
        "execution_time_ms": 68,
        "provenance": "CureNova Knowledge Graph & TargetMechanist (deterministic_fallback)",
        "findings_summary": "Modulation of kinase/target signaling cascades...",
        "uncertainties_detected": []
      },
      {
        "step_id": 4,
        "name": "Computational Candidate Scoring",
        "agent_role": "Candidate Prediction Agent",
        "status": "completed",
        "tool_called": "tool_compute_calibrated_graph_ensemble",
        "execution_time_ms": 98,
        "provenance": "CureNova GraphEnsemble v2.4 (Platt-calibrated)",
        "findings_summary": "Ranked candidates...",
        "uncertainties_detected": []
      },
      {
        "step_id": 5,
        "name": "Literature & Trial Evidence Retrieval",
        "agent_role": "LiteratureScout Agent",
        "status": "completed",
        "tool_called": "tool_fetch_pubmed_and_clinicaltrials",
        "execution_time_ms": 77,
        "provenance": "NCBI PubMed E-Utilities & LiteratureScout",
        "findings_summary": "LiteratureScout retrieved verified evidence records...",
        "uncertainties_detected": []
      },
      {
        "step_id": 6,
        "name": "Evidence Boundary & Contradiction Audit",
        "agent_role": "Synthesizer & SafetyAssessor Agent",
        "status": "completed",
        "tool_called": "tool_audit_contradictory_evidence",
        "execution_time_ms": 89,
        "provenance": "CureNova Synthesizer (deterministic_fallback)",
        "findings_summary": "Synthesized research report. Audited citations...",
        "uncertainties_detected": []
      }
    ],
    "candidate_hypotheses": [...],
    "synthesis_report": "Investigation for 'Pulmonary Arterial Hypertension' completed...",
    "limitations_and_boundary_warning": "LEGAL & SCIENTIFIC RESEARCH BOUNDARY: All computational predictions...",
    "provenance_mode": "deterministic_fallback",
    "llm_provider": "none",
    "model_version": "2.0.0",
    "structured_synthesis": {
      "candidate_drug": "Imatinib",
      "target_disease": "Pulmonary Arterial Hypertension",
      "research_rationale": "Evaluated repurposing potential...",
      "proposed_mechanism": "PDGF-receptor and c-Kit tyrosine kinase inhibition...",
      "supporting_evidence_ids": [1, 2],
      "conflicting_evidence_ids": [3],
      "safety_concerns": ["DDI (major): Imatinib + Warfarin...", "Adverse subdural hematoma warning..."],
      "missing_information": [],
      "evidence_strength": "Moderate (Phase 2/Clinical)",
      "epistemic_uncertainty": 0.18,
      "validated_citations": [
        {
          "id": 1,
          "pmid": "23065917",
          "title": "Imatinib in pulmonary arterial hypertension: a randomized trial",
          "direction": "supporting",
          "provenance_url": "https://pubmed.ncbi.nlm.nih.gov/23065917/"
        }
      ],
      "rejected_unsupported_ids": [],
      "research_limitations": "Analysis bounded by available retrospective preclinical records...",
      "non_clinical_disclaimer": "LEGAL & SCIENTIFIC RESEARCH BOUNDARY..."
    }
  }
  ```

#### 3. Candidate Details
- **Method & Path**: `GET /api/candidates/{candidate_id}`
- **Auth**: None (Public)
- **Response (200 OK)**: `CandidateDetailOut` including evidence records, calibration status, CI bounds, and notes.

#### 4. Toggle Bookmark
- **Method & Path**: `POST /api/candidates/{candidate_id}/bookmark`
- **Auth**: Bearer Token (Any active authenticated user)
- **Response (200 OK)**: Updated `CandidateSummaryOut` with flipped `is_bookmarked`.

#### 5. Add / Delete Candidate Research Notes
- **Add Note**: `POST /api/candidates/{candidate_id}/notes`
  - **Auth**: Bearer Token (Role: `researcher`, `doctor`, or `admin`)
  - **Request Body**: `{"content": "Verified PDGF receptor phosphorylation inhibition in vitro."}`
  - **Response (200 OK)**: `ResearchNoteOut` with author `user_id`.
- **Delete Note**: `DELETE /api/candidates/notes/{note_id}`
  - **Auth**: Bearer Token (Note author or `admin`)
  - **Response (204 No Content)**

---

### C. Clinical & Doctor Portal (Pharmacovigilance & DDIs)

#### 1. Drug Interaction Check (DDI)
- **Method & Path**: `GET /api/doctor/interactions`
- **Auth**: Bearer Token (Role: `doctor` or `admin`, with `approval_status: "approved"`)
- **Query Parameters**:
  - `drug_names`: comma-separated names, e.g. `Imatinib,Warfarin`
  - `severity`: optional filter, e.g. `major`, `moderate`, `contraindicated`
- **Response (200 OK)**: `List[DDIAlert]`
  ```json
  [
    {
      "id": 1,
      "drug_a": "Imatinib",
      "drug_b": "Warfarin",
      "severity": "major",
      "mechanism": "CYP2C9 competitive inhibition alters anticoagulant metabolism, increasing INR.",
      "recommendation": "Monitor INR closely; consider alternative anticoagulant or dose adjustment.",
      "verified_source": "OpenFDA & DrugBank Monograph",
      "source_url": "https://www.accessdata.fda.gov/drugsatfda_docs/label/2020/021588s059lbl.pdf"
    }
  ]
  ```

#### 2. Clinical Trials Registry
- **Method & Path**: `GET /api/doctor/clinical-trials`
- **Auth**: Bearer Token (Role: `doctor` or `admin`, with `approval_status: "approved"`)
- **Query Parameters**: `condition`, `phase`, `status`
- **Response (200 OK)**: `List[ClinicalTrialOut]`

#### 3. Live Clinical Trials Search (ClinicalTrials.gov API v2)
- **Method & Path**: `GET /api/doctor/clinical-trials/live`
- **Auth**: Bearer Token (Role: `doctor` or `admin`)
- **Query Parameters**: `condition` (required), `drug` (optional)
- **Response (200 OK)**: `{ "condition": "...", "drug": "...", "count": 5, "results": [...] }`

#### 4. Clinical Overview
- **Method & Path**: `GET /api/doctor/overview`
- **Auth**: None (Public)
- **Response (200 OK)**: Summary counts of medications, DDIs, trials, and clinical boundary notices.

---

### D. Patient Health Literacy Portal

#### 1. Patient Medicine Guides
- **Method & Path**: `GET /api/patient/medicines`
- **Auth**: None (Public)
- **Query Parameters**: `search` (optional)
- **Response (200 OK)**: `List[MedicineGuideOut]`

#### 2. Single Medicine Guide
- **Method & Path**: `GET /api/patient/medicines/{drug_name}`
- **Auth**: None (Public)
- **Response (200 OK)**: `MedicineGuideOut` (plain-language uses, warnings, food interactions, doctor discussion questions).

#### 3. Plain Language Study Explanation
- **Method & Path**: `POST /api/patient/explain-research`
- **Auth**: None (Public; rate-limited by IP)
- **Request Body**:
  ```json
  {
    "study_title": "Phase 2 Evaluation of Kinase Inhibitor in Refractory Vasculopathy",
    "abstract_text": "Randomized cohort of 32 patients showed hemodynamic improvement..."
  }
  ```
- **Response (200 OK)**: `LaymanStudyExplanationOut` (study model, findings, limitations, unresolved questions, explicit disclaimer).

---

### E. Research Feedback & Evaluation Pipeline

#### 1. Submit Research Feedback
- **Method & Path**: `POST /api/feedback`
- **Auth**: Bearer Token (Role: `doctor`, `researcher`, or `admin`, with `approval_status: "approved"`)
- **Request Body**:
  ```json
  {
    "workflow_id": "WF-CURENOVA-1729854000",
    "candidate_id": 1,
    "rating": 5,
    "feedback_category": "mechanism_accuracy",
    "comment": "Accurately captured PDGF phosphorylation pathway and cited PMID:23065917.",
    "prompt_version": "v2.5.0",
    "model_name": "gemini-2.5-flash"
  }
  ```
  *(Categories: `"hallucination"`, `"mechanism_accuracy"`, `"safety_omission"`, `"citation_validity"`, `"general"`)*
- **Response (201 Created)**: `FeedbackOut`
- **Error Statuses**:
  - `403 Forbidden`: Unapproved or inactive user account.
  - `409 Conflict`: Duplicate feedback submission within 5-minute cooldown.

#### 2. List Feedback
- **Method & Path**: `GET /api/feedback`
- **Auth**: Bearer Token (Role: `doctor`, `researcher`, or `admin`)
- **Scoping**: Standard users see only their own submitted feedback; administrators see all records.
- **Response (200 OK)**: `List[FeedbackOut]`

#### 3. Evaluate Offline Policy
- **Method & Path**: `POST /api/feedback/evaluate`
- **Auth**: Bearer Token (Role: `researcher` or `admin`)
- **Response (200 OK)**: `FeedbackEvaluationSummary` (breakdown by version, category counts, recurring failure patterns, and policy promotion status).

---

### F. Knowledge Graph & Stress-Test Lab

#### 1. Knowledge Graph Visualization Data
- **Method & Path**: `GET /api/graph`
- **Auth**: None (Public)
- **Query Parameters**: `node_type`, `inferred_only`, `query`
- **Response (200 OK)**: `KnowledgeGraphData` with `nodes` and `edges` for Cytoscape.js / D3.js.

#### 2. Graph Node Neighbors
- **Method & Path**: `GET /api/graph/neighbors/{node_id}`
- **Auth**: None (Public)
- **Response (200 OK)**: `KnowledgeGraphData` connected to target node.

#### 3. Stress-Test Lab Execution
- **Method & Path**: `POST /api/stress-tests/run`
- **Auth**: Bearer Token (Role: `researcher` or `admin`, with `approval_status: "approved"`)
- **Request Body**:
  ```json
  {
    "title": "Target-Held-Out TKI Robustness Benchmark",
    "model_name": "CureNova GraphEnsemble v2.4",
    "dataset_version": "CureNova-BioKG v2.1",
    "split_type": "Target-Held-Out (5-Fold)",
    "temporal_cutoff_year": 2020,
    "perturbation_rate": 0.20
  }
  ```
- **Response (200 OK)**: `StressTestResultOut` (AUROC, AUPRC, Kendall Tau, failure analysis, ranking turnover).

#### 4. Export Stress-Test Report (Markdown)
- **Method & Path**: `GET /api/stress-tests/{run_id}/export`
- **Auth**: Bearer Token (Any authenticated user)
- **Response (200 OK)**: Downloadable Markdown document.

---

### G. System Health & Probes

#### 1. Liveness Probes
- **Endpoints**: `GET /health` or `GET /api/system/health`
- **Auth**: None
- **Response (200 OK)**:
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-10-25T10:15:00.000000Z",
    "platform": "CureNova 2.0",
    "version": "2.0.0",
    "environment": "development"
  }
  ```

#### 2. Readiness Probes
- **Endpoints**: `GET /ready` or `GET /api/system/ready`
- **Auth**: None
- **Response (200 OK)**:
  ```json
  {
    "status": "ready",
    "timestamp": "2026-10-25T10:15:00.000000Z",
    "platform": "CureNova 2.0",
    "version": "2.0.0",
    "environment": "development",
    "database": {
      "status": "connected"
    },
    "llm_service": {
      "enabled": false,
      "provider": "openai",
      "model": "gemini-2.5-flash",
      "api_key_configured": false,
      "operational_status": "disabled_deterministic_fallback",
      "live_inference_tested": false
    },
    "biomedical_apis": {
      "mode": "demo_cache"
    }
  }
  ```
- **Error Response (503 Service Unavailable)**: Returned if the database connection fails.

---

## 4. Frontend Error Handling Guidelines

All errors returned by CureNova follow standard FastAPI RFC-7807 compatible JSON structure:
```json
{
  "detail": "Descriptive human-readable error explanation."
}
```

### Distinguishing Error Conditions in Frontend Client:
| HTTP Status | Condition | Recommended Frontend Action |
|---|---|---|
| **401 Unauthorized** | Missing, expired, or invalid Bearer token. | Clear local token, redirect user to `/login`. If refresh token is present, attempt `POST /api/auth/refresh`. |
| **403 Forbidden** | Role requirement unmet OR researcher/doctor account is `pending` approval. | Display approval banner: *"Account status is pending administrator approval. Please contact your lab administrator."* |
| **404 Not Found** | Candidate, drug, or note ID does not exist. | Display not found notification or redirect to list view. |
| **409 Conflict** | Email already registered OR duplicate feedback submitted within cooldown. | Display field validation conflict warning. |
| **422 Unprocessable Entity** | Pydantic schema validation error (missing required field, invalid type). | Display form validation errors under corresponding fields. |
| **429 Too Many Requests** | Rate limit triggered (auth or outbound API call). | Display cooldown message: *"Too many requests. Please wait before retrying."* |
| **500 Internal Error** | Unexpected unhandled server exception. | Display generic error modal with correlation ID. |
| **503 Service Unavailable** | Database unreachable or readiness check failed. | Display platform maintenance banner. |
