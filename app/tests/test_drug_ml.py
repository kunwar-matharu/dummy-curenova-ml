"""
Comprehensive Verification Test Suite for CureNova ML Drug -> Disease Repurposing Workflow.
Verifies DrugResolver, predict_drug, MLService, stress-testing, evidence enrichment,
and end-to-end Agentic Orchestration using production XGBoost (cure-nova-xgb-final).
"""

import sys
import os
import math
import asyncio
import pytest

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.models import CandidatePrediction, Drug, Disease
from app.services.drug_resolver import DrugResolver, CURATED_DRUG_MAPPINGS
from app.services.disease_resolver import DiseaseResolver
from app.services.ml_service import MLService
from app.services.agentic_orchestrator import AgenticOrchestrator
from ml.predict_v4 import predict_drug, query_disease_candidates, predict
from ml.predictor import predict_drug_and_enrich, predict_and_enrich, MODEL_VERSION


# Isolated in-memory SQLite fixture for testing
@pytest.fixture(scope="module")
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSession()

    # Seed minimal database entities
    drug1 = Drug(id=1, name="Everolimus", chembl_id="CHEMBL1908360", description="mTOR inhibitor")
    drug2 = Drug(id=2, name="Aspirin", chembl_id="CHEMBL25", description="COX inhibitor")
    dis1 = Disease(id=1, name="Pulmonary Arterial Hypertension", mesh_id="MONDO_0005149", category="Cardiovascular")
    session.add_all([drug1, drug2, dis1])
    session.commit()

    yield session
    session.close()


# ---------------------------------------------------------------------------
# 1. DrugResolver Unit Tests
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("drug_name,expected_chembl", [
    ("Everolimus", "CHEMBL1908360"),
    ("Aspirin", "CHEMBL25"),
    ("Imatinib", "CHEMBL941"),
    ("Pyrotinib", "CHEMBL3647420"),
    ("Tacrolimus", "CHEMBL3989887"),
    ("Metformin", "CHEMBL1431"),
    ("Niclosamide", "CHEMBL1448"),
])
def test_drug_resolver_supported_drugs(drug_name, expected_chembl):
    """Verifies that DrugResolver resolves all required core drugs to canonical ChEMBL IDs."""
    name, chembl_id, _ = DrugResolver.resolve_drug(drug_name)
    assert chembl_id == expected_chembl
    assert name.lower() == drug_name.lower()


def test_drug_resolver_case_insensitivity():
    """Verifies case variations resolve accurately."""
    _, id1, _ = DrugResolver.resolve_drug("everolimus")
    _, id2, _ = DrugResolver.resolve_drug("EVEROLIMUS")
    _, id3, _ = DrugResolver.resolve_drug("EvErOlImUs")
    assert id1 == id2 == id3 == "CHEMBL1908360"


def test_drug_resolver_direct_chembl_id():
    """Verifies direct ChEMBL ID queries pass through correctly."""
    name, chembl_id, _ = DrugResolver.resolve_drug("CHEMBL1908360")
    assert chembl_id == "CHEMBL1908360"


def test_drug_resolver_rejects_unsupported_drug():
    """Verifies that unknown/fake drugs return None chembl_id without hallucination."""
    name, chembl_id, _ = DrugResolver.resolve_drug("FakeRepurposingMolecule999")
    assert chembl_id is None


def test_drug_resolver_does_not_misclassify_diseases():
    """Verifies that disease names are not resolved to drugs."""
    name, chembl_id, _ = DrugResolver.resolve_drug("Pulmonary Arterial Hypertension")
    assert chembl_id is None


# ---------------------------------------------------------------------------
# 2. ML Inference (predict_drug) Tests
# ---------------------------------------------------------------------------

def test_predict_drug_returns_ranked_candidates():
    """Verifies that predict_drug returns ranked disease candidates with valid XGBoost probabilities."""
    res = predict_drug("CHEMBL1908360", top_k=5)
    assert res["drug_id"] == "CHEMBL1908360"
    assert res["candidate_count"] == 5
    assert res["model_version"] == MODEL_VERSION

    candidates = res["candidates"]
    assert len(candidates) == 5

    # Check ranking and scores
    prev_score = 1.0
    for cand in candidates:
        assert "disease_id" in cand
        assert "score" in cand
        score = cand["score"]
        assert 0.0 <= score <= 1.0
        assert not math.isnan(score)
        assert not math.isinf(score)
        assert score <= prev_score + 1e-9  # Monotonically descending
        prev_score = score


def test_predict_drug_excludes_label_1_indications():
    """Verifies that training query for predict_drug filters label = 0 (excludes established indications)."""
    df = query_disease_candidates("CHEMBL1908360")
    assert len(df) > 0
    # Every candidate in the query must strictly have label == 0
    assert (df["label"] == 0).all()


def test_different_drugs_produce_different_disease_rankings():
    """Verifies that different drugs produce distinct ranked candidate disease lists."""
    res_everolimus = predict_drug("CHEMBL1908360", top_k=5)
    res_aspirin = predict_drug("CHEMBL25", top_k=5)
    res_imatinib = predict_drug("CHEMBL941", top_k=5)

    diseases_everolimus = [c["disease_id"] for c in res_everolimus["candidates"]]
    diseases_aspirin = [c["disease_id"] for c in res_aspirin["candidates"]]
    diseases_imatinib = [c["disease_id"] for c in res_imatinib["candidates"]]

    assert diseases_everolimus != diseases_aspirin
    assert diseases_everolimus != diseases_imatinib
    assert diseases_aspirin != diseases_imatinib


# ---------------------------------------------------------------------------
# 3. Symmetry & Direction Separation Tests
# ---------------------------------------------------------------------------

def test_disease_to_drug_and_drug_to_disease_do_not_collide():
    """
    Verifies that Disease -> Drug and Drug -> Disease use the same underlying model
    while producing direction-appropriate outputs without state collision.
    """
    # Disease -> Drug (PAH)
    res_dis = predict("MONDO_0005149", top_k=3)
    assert res_dis["disease_id"] == "MONDO_0005149"
    assert "drug_id" in res_dis["candidates"][0]

    # Drug -> Disease (Everolimus)
    res_drug = predict_drug("CHEMBL1908360", top_k=3)
    assert res_drug["drug_id"] == "CHEMBL1908360"
    assert "disease_id" in res_drug["candidates"][0]

    # Verify candidate count and finite scores
    assert len(res_dis["candidates"]) == 3
    assert len(res_drug["candidates"]) == 3
    assert 0.0 <= res_dis["candidates"][0]["score"] <= 1.0
    assert 0.0 <= res_drug["candidates"][0]["score"] <= 1.0


# ---------------------------------------------------------------------------
# 4. MLService Service Layer Tests
# ---------------------------------------------------------------------------

def test_ml_service_generate_candidates_for_drug(db_session):
    """Verifies MLService wraps drug prediction into CandidatePrediction records with metadata."""
    candidates = MLService.generate_repurposing_candidates_for_drug(
        db=db_session,
        chembl_id="CHEMBL1908360",
        drug_name="Everolimus",
        top_k=5
    )
    assert candidates is not None
    assert len(candidates) == 5

    for c in candidates:
        assert isinstance(c, CandidatePrediction)
        assert c.drug_name == "Everolimus"
        assert c.chembl_id == "CHEMBL1908360"
        assert c.disease_name is not None
        assert c.model_name == "CureNova XGBoost Final"
        assert c.model_version == MODEL_VERSION
        assert 0.0 <= c.prediction_score <= 1.0
        assert c.confidence_interval_low == c.prediction_score
        assert c.confidence_interval_high == c.prediction_score
        assert "Uncalibrated ranking score" in c.calibration_status
        assert c.epistemic_uncertainty is None
        assert c.aleatoric_uncertainty is None

        # Verify dynamic attributes
        assert hasattr(c, "stress_test")
        assert hasattr(c, "stress_score")
        assert hasattr(c, "stress_interpretation")
        assert hasattr(c, "evidence_refs")
        assert hasattr(c, "chembl_evidence")
        assert c.score_type == "ranking_score"


def test_ml_service_evidence_facts_extraction(db_session):
    """Verifies that evidence facts extracted for candidates contain genuine mechanisms and pharmacology."""
    candidates = MLService.generate_repurposing_candidates_for_drug(
        db=db_session,
        chembl_id="CHEMBL1908360",
        drug_name="Everolimus",
        top_k=1
    )
    assert candidates and len(candidates) > 0
    top_cand = candidates[0]

    facts = MLService.extract_evidence_facts(top_cand)
    assert isinstance(facts, list)
    assert len(facts) > 0

    for f in facts:
        assert f.get("is_retrieved_fact") is True
        assert f.get("authors") in ("Open Targets Consortium", "EMBL-EBI ChEMBL Database")
        assert f.get("evidence_category") in ("mechanism", "pharmacology")
        # No fabricated citations or PMIDs
        assert f.get("pmid") is None
        assert f.get("doi") is None


# ---------------------------------------------------------------------------
# 5. End-to-End Orchestrator Integration Tests
# ---------------------------------------------------------------------------

def test_orchestrator_handles_drug_query_end_to_end(db_session):
    """Verifies that AgenticOrchestrator executes full investigation pipeline for a drug query."""
    res = asyncio.run(AgenticOrchestrator.run_investigation(
        db=db_session,
        query="Everolimus",
        user_role="researcher",
        demo_mode=True
    ))

    assert res["query_entity"] == "Everolimus"
    assert res["entity_type"] == "Drug"
    assert len(res["completed_steps"]) == 6
    assert len(res["candidate_hypotheses"]) == 10

    # Verify candidates format
    top = res["candidate_hypotheses"][0]
    assert top["drug_name"] == "Everolimus"
    assert top["chembl_id"] == "CHEMBL1908360"
    assert top["disease_name"] == "Tuberous Sclerosis Complex"
    assert top["model_name"] == "CureNova XGBoost Final"
    assert top["score_type"] == "ranking_score"
    assert top["stress_score"] is not None

    # Step 4 provenance check
    step4 = next(s for s in res["completed_steps"] if s["step_id"] == 4)
    assert "CureNova XGBoost Production Model" in step4["provenance"]
    assert "tool_compute_curenova_xgboost_inference" in step4["tool_called"]


def test_orchestrator_handles_disease_query_end_to_end(db_session):
    """Verifies that AgenticOrchestrator preserves working Disease -> Drug investigation."""
    res = asyncio.run(AgenticOrchestrator.run_investigation(
        db=db_session,
        query="Pulmonary Arterial Hypertension",
        user_role="researcher",
        demo_mode=True
    ))

    assert res["query_entity"] == "Pulmonary Arterial Hypertension"
    assert res["entity_type"] == "Disease"
    assert len(res["candidate_hypotheses"]) == 10

    top = res["candidate_hypotheses"][0]
    assert top["drug_name"] == "EVEROLIMUS"
    assert top["disease_name"] == "Pulmonary Arterial Hypertension"


def test_orchestrator_handles_unsupported_drug_honestly(db_session):
    """Verifies that an unsupported drug query returns 0 candidates and an honest boundary message."""
    res = asyncio.run(AgenticOrchestrator.run_investigation(
        db=db_session,
        query="NonexistentDrugXYZ",
        user_role="researcher",
        demo_mode=True
    ))

    assert res["query_entity"] == "NonexistentDrugXYZ"
    assert res["entity_type"] == "Unsupported Entity"
    assert len(res["candidate_hypotheses"]) == 0
    assert "could not be mapped" in res["completed_steps"][1]["findings_summary"]
    assert "No verified candidate hypotheses" in res["synthesis_report"]
