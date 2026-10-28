# CureNova 2.0 — Full-Stack Drug-Repurposing Intelligence Platform

Integrated autonomous agentic AI drug-repurposing intelligence platform comprising a **FastAPI backend** and a modern **React + Vite frontend**.

---

## Architecture Overview

```
CureNova/
├── app/                  # FastAPI 0.115 backend service
│   ├── routers/          # API endpoints (auth, candidates, stress_tests, doctor, patient, system)
│   ├── services/         # Agentic pipeline, biomedical APIs, LLM integration, seed data
│   ├── models/           # SQLAlchemy ORM models
│   ├── schemas/          # Pydantic validation schemas
│   └── tests/            # Comprehensive test suite (79/79 passing)
├── frontend/             # React 18 + Vite frontend client
│   ├── src/pages/        # Role-based views: Researcher, Doctor, Patient, Landing, Login
│   ├── src/services/api.js # Client integration contract communicating with backend
│   ├── src/context/      # AuthContext & ThemeContext
│   └── src/components/   # Clinical highlight boxes, knowledge graph, command palette
├── docs/                 # Frontend integration contract & API reference
└── scripts/              # Database initialization & administrative migration tools
```

---

## Features

- **Candidate Hypothesis & Dossier Endpoints**: Platt & Isotonic calibrated predictions with confidence intervals, epistemic vs. aleatoric uncertainty scores, and full biological evidence.
- **Stress-Test Simulation Engine**: Generalization benchmarks across held-out kinase/receptor families, temporal leakage barriers, and graph edge perturbation.
- **Biomedical Knowledge Graph**: Multi-relational interactive graph data connecting drugs, targets, pathways, and clinical trial evidence.
- **Clinical & Pharmacovigilance Tools**: Multi-drug interaction screening (DDI) with severity classifications and FDA monograph citations.
- **Multi-Agent Orchestrator Pipeline**: Modular agents for entity resolution, knowledge graph exploration, and literature synthesis.
- **Role-Based Access Control**: Granular roles (`researcher`, `doctor`, `patient`, `admin`) with pending verification safeguards.

---

## Getting Started

### 1. Backend Service (FastAPI)

```bash
# Install backend dependencies
pip install -r requirements.txt

# Configure environment variables (optional, defaults provided)
cp .env.example .env

# Run FastAPI backend server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- **Backend API**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Liveness Probe**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
- **Readiness Probe**: [http://127.0.0.1:8000/ready](http://127.0.0.1:8000/ready)

### 2. Frontend Application (React + Vite)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run Vite development server
npm run dev
```

- **Frontend Application**: [http://localhost:5173](http://localhost:5173)

---

## Seed Accounts & Demo Credentials

| Role | Email | Password | Access Level |
|---|---|---|---|
| **Researcher** | `dr.elena.vance@curenova-research.org` | `CureNova2026!Secure` | Approved privileged research |
| **Doctor** | `marcus.chen.md@metropolitan-health.org` | `CureNova2026!Secure` | Pharmacovigilance & DDI |
| **Patient** | `sarah.jenkins@patient-portal.org` | `CureNova2026!Secure` | Plain-language medicine guides |
| **Admin** | `admin@curenova.ai` | `CureNova2026!Secure` | System & user approvals |

---

## Running Automated Tests

```bash
pytest app/tests/ -v
```
