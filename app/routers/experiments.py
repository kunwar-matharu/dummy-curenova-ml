from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.models import ResearchProject, StressTestRun
from ..schemas.schemas import ProjectCreate, ProjectOut

router = APIRouter(prefix="/experiments", tags=["Experiment Workbench & Projects"])

@router.get("/projects", response_model=List[ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    return db.query(ResearchProject).order_by(ResearchProject.updated_at.desc()).all()

@router.post("/projects", response_model=ProjectOut)
def create_project(project_in: ProjectCreate, db: Session = Depends(get_db)):
    proj = ResearchProject(
        title=project_in.title,
        disease_focus=project_in.disease_focus,
        description=project_in.description,
        status="active",
        user_id=1
    )
    db.add(proj)
    db.commit()
    db.refresh(proj)
    return proj

@router.get("/workbench-status")
def get_workbench_status(db: Session = Depends(get_db)):
    projects_count = db.query(ResearchProject).count()
    runs_count = db.query(StressTestRun).count()
    latest_run = db.query(StressTestRun).order_by(StressTestRun.id.desc()).first()
    
    return {
        "active_projects": projects_count,
        "completed_stress_tests": runs_count,
        "latest_experiment": latest_run.title if latest_run else "No experiments run yet",
        "supported_models": [
            {"name": "CureNova GraphEnsemble v2.4", "type": "Multi-Relational GNN + Platt Scaling", "status": "Production"},
            {"name": "BioLink-TransE Baseline", "type": "Knowledge Graph Embedding", "status": "Baseline"},
            {"name": "SciBERT-PubMed Co-Occurrence", "type": "Literature Matrix Factorization", "status": "Reference"}
        ],
        "dataset_versions": [
            {"id": "CureNova-BioKG v2.1", "triples_count": "1,420 curated triples", "last_updated": "2026-10-15"},
            {"id": "CureNova-BioKG v2.1-Temporal", "triples_count": "Historical Pre-2020 Partition", "last_updated": "2026-10-18"}
        ]
    }
