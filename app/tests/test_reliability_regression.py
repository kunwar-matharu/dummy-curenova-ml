"""
CureNova 2.0 System Reliability & Scientific Correctness Regression Test Suite
Covers:
1. Timeout Resilience & Bounded Lookups
2. Zero-Evidence Rule Enforcement
3. Known Indication vs Novel Repurposing Classification
4. Deterministic Evidence Strength Levels
5. Directional Invariance & Single Source of Truth
6. Honest Boundary Controls & Unsupported Entities
"""

import sys
import os
import asyncio
import pytest
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.models import Drug, Disease, KnowledgeEdge, CandidatePrediction
from app.services.drug_resolver import DrugResolver
from app.services.disease_resolver import DiseaseResolver
from app.services.ml_service import MLService
from app.services.agentic_orchestrator import AgenticOrchestrator
from app.services.biomedical_agents import TargetMechanist, Synthesizer
from ml.predictor import (
    classify_candidate_indication,
    derive_deterministic_evidence_strength,
    predict_drug_and_enrich,
    predict_and_enrich,
)
from ml.evidence_utils import get_chembl_live_evidence, get_drug_evidence


@pytest.fixture(scope="module")
def regression_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(autocommit=False, autoflush=False, bind=engine)()

    # Seed test entities
    drug1 = Drug(id=1, name="Everolimus", chembl_id="CHEMBL1908360", description="mTOR inhibitor")
    drug2 = Drug(id=2, name="Aspirin", chembl_id="CHEMBL25", description="COX inhibitor")
    drug3 = Drug(id=3, name="Lenvatinib", chembl_id="CHEMBL2103837", description="Kinase inhibitor")
    dis1 = Disease(id=1, name="Pulmonary Arterial Hypertension", mesh_id="MONDO_0005149", category="Cardiovascular")
    dis2 = Disease(id=2, name="Tuberous Sclerosis Complex", mesh_id="MONDO_0011382", category="Genetic")

    # Seed knowledge edge for Aspirin -> PTGS1 -> Rheumatoid Arthritis
    edge1 = KnowledgeEdge(
        id=1,
        source_id="Aspirin",
        target_id="PTGS1",
        relationship_type="targets",
        source_provenance="DrugBank"
    )
    edge2 = KnowledgeEdge(
        id=2,
        source_id="PTGS1",
        target_id="Rheumatoid Arthritis",
        relationship_type="associated_with",
        source_provenance="DisGeNET"
    )

    session.add_all([drug1, drug2, drug3, dis1, dis2, edge1, edge2])
    session.commit()

    yield session
    session.close()


# ---------------------------------------------------------------------------
# 1. Timeout Resilience & Bounded Lookups
# ---------------------------------------------------------------------------

def test_chembl_graceful_timeout_handling():
    """Verifies that an external ChEMBL lookup failure or timeout does not crash evidence retrieval."""
    with patch("ml.evidence_utils._chembl_request", return_value=None):
        evidence = get_chembl_live_evidence("CHEMBL99999999_MOCK")
        assert evidence["available"] is False
        assert evidence["source"] == "ChEMBL"
        assert "molecule_lookup_failed" in evidence["reason"]


def test_drug_evidence_duckdb_caching():
    """Verifies that repeat calls to get_drug_evidence return cached results fast."""
    ev1 = get_drug_evidence("CHEMBL1908360")
    assert ev1["drug_id"] == "CHEMBL1908360"
    ev2 = get_drug_evidence("CHEMBL1908360")
    assert ev1 is ev2  # Memory cache hit


# ---------------------------------------------------------------------------
# 2. Zero-Evidence Rule Enforcement
# ---------------------------------------------------------------------------

def test_zero_evidence_rule_when_connected_edges_zero(regression_db):
    """
    Verifies Part 14 & 16: If knowledge graph connected biological edges = 0,
    the system explicitly states the evidence limitation and does not claim
    confirmed biological mechanisms.
    """
    # Lenvatinib and Idiopathic Pulmonary Fibrosis have 0 connected edges in regression_db
    res = asyncio.run(TargetMechanist.run(
        db=regression_db,
        drug_name="Lenvatinib",
        disease_name="Idiopathic Pulmonary Fibrosis",
        evidence_facts=[],
        llm_client=None
    ))

    assert res["biological_edges_count"] == 0
    assert res["is_established"] is False
    assert "Evidence limitation: No connected biological interaction edges were identified" in res["target_pathway"]
    assert "ML interpretation" in res["target_pathway"]


def test_zero_evidence_rule_in_synthesizer():
    """Verifies that Synthesizer marks evidence strength as Insufficient when connected edges = 0."""
    mech_data = {
        "target_pathway": "Evidence limitation: No connected biological interaction edges were identified in the available knowledge graph.",
        "biological_edges_count": 0,
        "is_established": False,
        "supporting_evidence_ids": [],
        "conflicting_evidence_ids": []
    }
    safety_data = {
        "contradictory_evidence_ids": [],
        "safety_concerns": [],
        "missing_safety_data": []
    }

    synth = asyncio.run(Synthesizer.run(
        drug_name="Lenvatinib",
        disease_name="Idiopathic Pulmonary Fibrosis",
        evidence_facts=[],
        mechanistic_data=mech_data,
        safety_data=safety_data,
        llm_client=None
    ))

    assert "Insufficient" in synth.evidence_strength
    assert "Evidence limitation" in synth.proposed_mechanism


# ---------------------------------------------------------------------------
# 3. Known Indication vs Novel Repurposing Classification
# ---------------------------------------------------------------------------

def test_everolimus_tsc_classified_as_known_indication():
    """
    Verifies Part 18: Everolimus -> Tuberous Sclerosis Complex must be classified
    as a known indication, not a novel repurposing hypothesis.
    """
    classification = classify_candidate_indication(
        chembl_id="CHEMBL1908360",
        disease_id="MONDO_0011382",
        disease_name="Tuberous Sclerosis Complex"
    )
    assert classification["indication_status"] == "known_indication"
    assert classification["is_known_indication"] is True
    assert "Known indication" in classification["indication_label"]
    assert "not a novel repurposing hypothesis" in classification["indication_label"]


def test_aspirin_rheumatoid_arthritis_classified_as_known_indication():
    """Verifies Aspirin -> Rheumatoid Arthritis classified as known indication."""
    classification = classify_candidate_indication(
        chembl_id="CHEMBL25",
        disease_id="MONDO_0008383",
        disease_name="Rheumatoid Arthritis"
    )
    assert classification["indication_status"] == "known_indication"
    assert classification["is_known_indication"] is True


def test_novel_candidate_classified_as_potential_repurposing():
    """Verifies an investigational candidate with bioactivity is classified as potential repurposing."""
    classification = classify_candidate_indication(
        chembl_id="CHEMBL9999",
        disease_id="MONDO_999999",
        disease_name="Novel Target Disease",
        mechanisms=[{"mechanism": "Kinase inhibition", "action_type": "inhibitor", "target_name": "Kinase X"}],
        chembl_evidence={"strong_target_count": 1, "usable_activity_count": 5}
    )
    assert classification["indication_status"] == "potential_repurposing"
    assert classification["is_known_indication"] is False
    assert "Potential repurposing candidate" in classification["indication_label"]


# ---------------------------------------------------------------------------
# 4. Deterministic Evidence Strength Levels
# ---------------------------------------------------------------------------

def test_deterministic_evidence_strength_levels():
    """Verifies Part 20: Deterministic derivation of evidence levels."""
    # Level 4: Known indication
    s4 = derive_deterministic_evidence_strength(is_known=True)
    assert "Strong" in s4

    # Level 3: Direct target + high pChEMBL (>= 7.0)
    s3 = derive_deterministic_evidence_strength(
        is_known=False,
        mechanisms=[{"mechanism": "Target X"}],
        chembl_evidence={"max_pchembl": 7.5, "strong_target_count": 1}
    )
    assert "Moderate" in s3

    # Level 2: Preliminary preclinical
    s2 = derive_deterministic_evidence_strength(
        is_known=False,
        mechanisms=[],
        chembl_evidence={"max_pchembl": 6.2, "strong_target_count": 0}
    )
    assert "Preliminary Preclinical" in s2

    # Level 1: Insufficient (0 edges, 0 targets, 0 bioactivity)
    s1 = derive_deterministic_evidence_strength(
        is_known=False,
        mechanisms=[],
        chembl_evidence={"max_pchembl": None, "strong_target_count": 0},
        biological_edges_count=0
    )
    assert "Insufficient" in s1


# ---------------------------------------------------------------------------
# 5. Directional Invariance & Single Source of Truth
# ---------------------------------------------------------------------------

def test_directional_invariance_drug_to_disease(regression_db):
    """Verifies that querying a drug sets analysis_direction to drug_to_disease."""
    res = asyncio.run(AgenticOrchestrator.run_investigation(
        db=regression_db,
        query="Everolimus",
        user_role="researcher",
        demo_mode=True
    ))

    assert res["status"] == "completed"
    assert res["entity_type"] == "Drug"
    assert res["analysis_direction"] == "drug_to_disease"
    assert res["direction"] == "drug_to_disease"
    assert res["resolved_entity"]["resolved"] is True
    assert res["resolved_entity"]["entity_type"] == "drug"
    assert res["resolved_entity"]["canonical_name"] == "Everolimus"
    assert res["resolved_entity"]["analysis_direction"] == "drug_to_disease"

    # Candidates must be diseases
    top = res["candidate_hypotheses"][0]
    assert top["drug_name"] == "Everolimus"
    assert top["disease_name"] == "Tuberous Sclerosis Complex"
    assert top["indication_status"] == "known_indication"


def test_directional_invariance_disease_to_drug(regression_db):
    """Verifies that querying a disease sets analysis_direction to disease_to_drug."""
    res = asyncio.run(AgenticOrchestrator.run_investigation(
        db=regression_db,
        query="Pulmonary Arterial Hypertension",
        user_role="researcher",
        demo_mode=True
    ))

    assert res["status"] == "completed"
    assert res["entity_type"] == "Disease"
    assert res["analysis_direction"] == "disease_to_drug"
    assert res["direction"] == "disease_to_drug"
    assert res["resolved_entity"]["resolved"] is True
    assert res["resolved_entity"]["entity_type"] == "disease"
    assert res["resolved_entity"]["analysis_direction"] == "disease_to_drug"

    # Candidates must be drugs
    top = res["candidate_hypotheses"][0]
    assert top["disease_name"] == "Pulmonary Arterial Hypertension"
    assert top["chembl_id"].startswith("CHEMBL")


# ---------------------------------------------------------------------------
# 6. Honest Boundary Controls & Unsupported Entities
# ---------------------------------------------------------------------------

def test_unsupported_entity_returns_unsupported_status(regression_db):
    """Verifies that nonexistent entities return status='unsupported' with 0 candidates."""
    res = asyncio.run(AgenticOrchestrator.run_investigation(
        db=regression_db,
        query="NonexistentDrugXYZ",
        user_role="researcher",
        demo_mode=True
    ))

    assert res["status"] == "unsupported"
    assert res["entity_type"] == "Unsupported Entity"
    assert res["resolved_entity"]["resolved"] is False
    assert len(res["candidate_hypotheses"]) == 0
    assert "could not resolve" in res["synthesis_report"].lower()


def test_niclosamide_feature_store_boundary_honesty(regression_db):
    """
    Verifies that a valid drug outside static feature store coverage (Niclosamide)
    is handled honestly by the Four-Tier Engine without fabricated predictions:
    Grounding candidates in verified Open Targets & ChEMBL evidence.
    """
    res = asyncio.run(AgenticOrchestrator.run_investigation(
        db=regression_db,
        query="Niclosamide",
        user_role="researcher",
        demo_mode=True
    ))

    assert res["entity_type"] == "Drug"
    assert res["status"] in ("completed", "partial")
    if res["status"] == "completed":
        assert len(res["candidate_hypotheses"]) > 0
        for cand in res["candidate_hypotheses"]:
            assert cand["model_name"] in ("CureNova XGBoost Final", "Evidence-Grounded Biomedical Ranking")
    else:
        assert len(res["candidate_hypotheses"]) == 0

