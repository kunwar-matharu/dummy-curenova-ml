from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.models import ResearchProject, StressTestRun, User
from ..schemas.schemas import ProjectCreate, ProjectOut
from ..dependencies.auth import require_researcher, get_current_active_user

router = APIRouter(prefix="/experiments", tags=["Experiment Workbench & Projects"])

@router.get("/projects", response_model=List[ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    return db.query(ResearchProject).order_by(ResearchProject.updated_at.desc()).all()

@router.post("/projects", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_researcher)
):
    """Creates a research project attributing ownership strictly to the authenticated researcher."""
    proj = ResearchProject(
        title=project_in.title,
        disease_focus=project_in.disease_focus,
        description=project_in.description,
        status="active",
        user_id=current_user.id
    )
    db.add(proj)
    db.commit()
    db.refresh(proj)
    return proj

@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Enforces resource ownership: only project owner or administrator can delete a project."""
    proj = db.query(ResearchProject).filter(ResearchProject.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    if proj.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to delete this project"
        )
    db.delete(proj)
    db.commit()


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
