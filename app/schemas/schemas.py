from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# User & Auth
class UserBase(BaseModel):
    email: str
    full_name: str
    role: str = "researcher"

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserOut(UserBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

# Evidence & Candidates
class EvidenceRecordOut(BaseModel):
    id: int
    candidate_id: int
    title: str
    pmid: Optional[str] = None
    doi: Optional[str] = None
    authors: Optional[str] = None
    journal: Optional[str] = None
    year: Optional[int] = None
    study_type: str
    evidence_direction: str  # supporting, contradictory, inconclusive
    excerpt: str
    sample_size: Optional[str] = None
    provenance_url: Optional[str] = None
    class Config:
        from_attributes = True

class ResearchNoteCreate(BaseModel):
    content: str

class ResearchNoteOut(BaseModel):
    id: int
    candidate_id: int
    content: str
    created_at: datetime
    class Config:
        from_attributes = True

class CandidateSummaryOut(BaseModel):
    id: int
    drug_name: str
    chembl_id: Optional[str] = None
    disease_name: str
    model_name: str
    model_version: str
    prediction_score: float
    confidence_interval_low: float
    confidence_interval_high: float
    calibration_status: str
    epistemic_uncertainty: float
    aleatoric_uncertainty: float
    rank: int
    rationale: Optional[str] = None
    status: str
    approval_status: str
    evidence_count: int
    is_bookmarked: bool
    last_updated: datetime
    class Config:
        from_attributes = True

class CandidateDetailOut(CandidateSummaryOut):
    biological_mechanism: Optional[str] = None
    evidence_records: List[EvidenceRecordOut] = []
    notes: List[ResearchNoteOut] = []
    class Config:
        from_attributes = True

# Stress Testing
class StressTestConfig(BaseModel):
    title: str
    model_name: str = "CureNova GraphEnsemble v2.4"
    dataset_version: str = "CureNova-BioKG v2.1"
    split_type: str = "Target-Held-Out (5-Fold)"  # Target-Held-Out, Temporal-Cutoff, Data-Perturbation
    temporal_cutoff_year: Optional[int] = 2020
    perturbation_rate: float = 0.20  # 20% link removal
    candidate_ids: Optional[List[int]] = None

class StressTestResultOut(BaseModel):
    id: int
    title: str
    model_name: str
    dataset_version: str
    split_type: str
    temporal_cutoff_year: Optional[int]
    perturbation_rate: float
    status: str
    metrics: Dict[str, Any]
    failure_analysis: List[Dict[str, Any]]
    rank_stability: Dict[str, Any]
    logs: List[Dict[str, Any]]
    created_at: datetime
    class Config:
        from_attributes = True

# Knowledge Graph
class GraphNode(BaseModel):
    id: str
    label: str
    type: str  # drug, disease, gene, protein, pathway, publication, trial
    metadata: Dict[str, Any] = {}

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    relationship_type: str
    is_inferred: bool = False
    confidence: float = 1.0
    source_provenance: str
    pmid: Optional[str] = None

class KnowledgeGraphData(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]

# Doctor Portal
class DDIQuery(BaseModel):
    drug_names: List[str]

class DDIAlert(BaseModel):
    id: int
    drug_a: str
    drug_b: str
    severity: str  # contraindicated, major, moderate, minor
    mechanism: str
    recommendation: str
    verified_source: str
    source_url: Optional[str] = None

class ClinicalTrialOut(BaseModel):
    id: int
    nct_id: str
    title: str
    phase: str
    status: str
    condition: str
    interventions: str
    primary_endpoints: Optional[str] = None
    source_url: Optional[str] = None
    class Config:
        from_attributes = True

# Patient Portal
class MedicineGuideOut(BaseModel):
    id: int
    drug_name: str
    common_uses_plain: str
    safety_warnings_plain: str
    food_interactions: Optional[str] = None
    what_to_ask_doctor: str
    synthetic_disclaimer: str
    class Config:
        from_attributes = True

class LaymanStudyExplanationRequest(BaseModel):
    study_title: str
    abstract_text: str

class LaymanStudyExplanationOut(BaseModel):
    investigated: str
    findings: str
    study_model: str  # Laboratory, Animal, Human Trial
    limitations: str
    unresolved_questions: str
    disclaimer: str

# Research Project
class ProjectCreate(BaseModel):
    title: str
    disease_focus: str
    description: Optional[str] = None

class ProjectOut(ProjectCreate):
    id: int
    status: str
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

# Agent Workflow Trace
class AgentWorkflowStep(BaseModel):
    step_id: int
    name: str
    agent_role: str
    status: str  # completed, in_progress, flagged
    tool_called: str
    execution_time_ms: int
    provenance: str
    findings_summary: str
    uncertainties_detected: List[str] = []

class AgentWorkflowResponse(BaseModel):
    workflow_id: str
    query_entity: str
    entity_type: str
    completed_steps: List[AgentWorkflowStep]
    candidate_hypotheses: List[CandidateSummaryOut]
    synthesis_report: str
    limitations_and_boundary_warning: str
