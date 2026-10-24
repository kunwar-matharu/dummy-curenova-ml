# CureNova 2.0 - Backend API

Autonomous Agentic AI Drug-Repurposing Intelligence Platform backend built with **FastAPI**, **SQLAlchemy**, and **Pydantic**.

---

## Features
- **Candidate Hypothesis & Dossier Endpoints**: Platt & Isotonic calibrated predictions with confidence intervals, epistemic vs. aleatoric uncertainty scores, and full biological evidence.
- **Stress-Test Simulation Engine**: Generalization benchmarks across held-out kinase/receptor families, temporal leakage barriers, and graph edge perturbation.
- **Biomedical Knowledge Graph**: Multi-relational interactive graph data connecting drugs, targets, pathways, and clinical trial evidence.
- **Clinical & Pharmacovigilance Tools**: Multi-drug interaction screening (DDI) with severity classifications and FDA monograph citations.
- **Multi-Agent Orchestrator Pipeline**: Modular agents for entity resolution, knowledge graph exploration, and literature synthesis.

---

## Getting Started

### 1. Prerequisites
- Python 3.10+ (Python 3.12/3.13/3.14 compatible)
- `pip` package manager

### 2. Setup Virtual Environment
```bash
# Create virtual environment
python -m venv venv

# Activate on Windows (PowerShell)
.\venv\Scripts\Activate.ps1

# Activate on Windows (Command Prompt)
.\venv\Scripts\activate.bat

# Activate on macOS/Linux
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 5. Run the Server
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 6. Interactive API Documentation
- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## Running Automated Tests
```bash
pytest app/tests/ -v
```
