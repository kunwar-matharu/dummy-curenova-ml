"""
CureNova 2.0 Drug Similarity & Alternative Drug Discovery Test Suite

Tests:
1. Metformin -> Drug resolved, similar-drug workflow, candidates returned, no self-match.
2. Everolimus -> Candidates are drugs (Sirolimus, Temsirolimus, etc.), NOT diseases.
3. Aspirin -> COX inhibitor candidates, explainable evidence.
4. NonexistentDrugXYZ -> Unsupported entity, 0 candidates, no hallucinated drugs.
5. Verification: Candidate != Input Drug (across multiple queries).
6. Verification: Candidate IDs are unique (no duplicate entries).
7. Verification: Similarity score is strictly within 0.0 <= score <= 1.0.
8. Verification: No fabricated evidence (provenance, real targets, real indications).
9. Robustness: Missing molecular data / SMILES does not crash pipeline.
10. Regression Check: Existing Disease -> Drug and Drug -> Disease workflows remain unchanged.
11. API Routes: POST /api/drugs/similar, GET /api/drugs/similar, and GET /api/graph/similarity-subgraph.
12. Clinical Safety Boundary: Mandatory regulatory disclaimer in responses.
"""

import sys
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.database import Base, get_db
from app.services.seed_data import seed_database
from app.main import app
from app.services.drug_similarity_service import DrugSimilarityService, drug_similarity_service
from ml.predictor import predict_and_enrich, predict_drug_and_enrich


# ---------------------------------------------------------------------------
# Test Database Isolation Setup
# ---------------------------------------------------------------------------
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

client = TestClient(app)


@pytest.fixture(autouse=True)
def isolated_test_database():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

    yield

    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides.pop(get_db, None)


def get_auth_headers(
    email: str = "dr.elena.vance@curenova-research.org",
    password: str = "CureNova2026!Secure"
) -> dict:
    login_res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert login_res.status_code == 200, f"Login failed for {email}: {login_res.text}"
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# TEST 1: Metformin -> Drug resolved, similar-drug workflow, candidates, no self-match
# ---------------------------------------------------------------------------
def test_metformin_similarity_workflow():
    db = TestingSessionLocal()
    try:
        res = drug_similarity_service.find_similar_drugs("Metformin", db, top_k=10)
        assert res["success"] is True
        assert res["workflow_type"] == "drug_to_similar_drugs"
        assert res["query_drug"] == "Metformin"
        assert res["query_chembl_id"] == "CHEMBL1431"
        assert res["total_candidates"] > 0
        assert len(res["candidates"]) > 0

        # Metformin must NOT return Metformin as candidate
        candidate_names = [c["drug_name"].upper() for c in res["candidates"]]
        assert "METFORMIN" not in candidate_names
        assert "METFORMIN HYDROCHLORIDE" not in candidate_names
        for c in res["candidates"]:
            assert c["chembl_id"] != "CHEMBL1431"
    finally:
        db.close()


# ---------------------------------------------------------------------------
# TEST 2: Everolimus -> Candidates are drugs (Sirolimus, Temsirolimus, etc.), NOT diseases
# ---------------------------------------------------------------------------
def test_everolimus_similarity_candidates():
    db = TestingSessionLocal()
    try:
        res = drug_similarity_service.find_similar_drugs("Everolimus", db, top_k=10)
        assert res["success"] is True
        assert res["workflow_type"] == "drug_to_similar_drugs"
        assert len(res["candidates"]) > 0

        # Everolimus is an mTOR inhibitor; related drugs should include rapamycin analogues or mTOR/kinase inhibitors
        for c in res["candidates"]:
            assert c["chembl_id"].startswith("CHEMBL"), f"Candidate {c['drug_name']} has non-ChEMBL ID: {c['chembl_id']}"
            assert not c["chembl_id"].startswith("MONDO_"), "Candidate returned a disease MONDO ID instead of a drug"
            assert c["alternative_status"] in ["known_alternative", "potential_alternative", "computational_similarity"]
            assert c["evidence_level"] in ["Strong", "Moderate", "Preliminary", "Insufficient"]
    finally:
        db.close()


# ---------------------------------------------------------------------------
# TEST 3: Aspirin -> COX inhibitor candidates, explainable evidence
# ---------------------------------------------------------------------------
def test_aspirin_similarity_cox_inhibitors():
    db = TestingSessionLocal()
    try:
        res = drug_similarity_service.find_similar_drugs("Aspirin", db, top_k=10)
        assert res["success"] is True
        assert len(res["candidates"]) > 0

        # Aspirin candidates should share COX/PTGS targets or NSAID indications
        found_target_or_indication_overlap = False
        for c in res["candidates"]:
            if (c["target_similarity"] and c["target_similarity"] > 0) or \
               (c["mechanism_similarity"] and c["mechanism_similarity"] > 0) or \
               (c["indication_similarity"] and c["indication_similarity"] > 0):
                found_target_or_indication_overlap = True
                break
        assert found_target_or_indication_overlap, "Aspirin candidates lacked target, mechanism, or indication overlap"
    finally:
        db.close()


# ---------------------------------------------------------------------------
# TEST 4: NonexistentDrugXYZ -> Unsupported entity, 0 candidates, no hallucinated drugs
# ---------------------------------------------------------------------------
def test_nonexistent_drug_unsupported():
    db = TestingSessionLocal()
    try:
        res = drug_similarity_service.find_similar_drugs("NonexistentDrugXYZ", db, top_k=10)
        assert res["success"] is False
        assert res["total_candidates"] == 0
        assert len(res["candidates"]) == 0
        assert res["status"] == "unsupported" or res.get("is_unsupported") is True or "not resolve" in res.get("message", "").lower()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# TEST 5: Verify candidate != input drug across multiple queries
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("query_name", ["Metformin", "Everolimus", "Aspirin", "Ibuprofen"])
def test_candidate_never_equals_input_drug(query_name):
    db = TestingSessionLocal()
    try:
        res = drug_similarity_service.find_similar_drugs(query_name, db, top_k=10)
        if res["success"]:
            resolved_chembl = res["query_chembl_id"]
            for cand in res["candidates"]:
                assert cand["chembl_id"] != resolved_chembl, f"Self-match found for {query_name}"
                assert cand["drug_name"].strip().lower() != query_name.strip().lower(), f"Exact name match found for {query_name}"
    finally:
        db.close()


# ---------------------------------------------------------------------------
# TEST 6: Verify candidate IDs are unique (no duplicates)
# ---------------------------------------------------------------------------
def test_candidate_ids_are_unique():
    db = TestingSessionLocal()
    try:
        res = drug_similarity_service.find_similar_drugs("Metformin", db, top_k=15)
        assert res["success"] is True
        chembl_ids = [c["chembl_id"] for c in res["candidates"]]
        assert len(chembl_ids) == len(set(chembl_ids)), f"Duplicate chembl_ids found: {chembl_ids}"
    finally:
        db.close()


# ---------------------------------------------------------------------------
# TEST 7: Verify similarity score is within 0.0 <= score <= 1.0
# ---------------------------------------------------------------------------
def test_similarity_score_bounded():
    db = TestingSessionLocal()
    try:
        for drug in ["Metformin", "Aspirin"]:
            res = drug_similarity_service.find_similar_drugs(drug, db, top_k=10)
            assert res["success"] is True
            for c in res["candidates"]:
                assert 0.0 <= c["similarity_score"] <= 1.0, f"Score out of bounds: {c['similarity_score']}"
                for factor in ["molecular_similarity", "target_similarity", "mechanism_similarity", "indication_similarity", "bioactivity_similarity"]:
                    val = c[factor]
                    if val is not None:
                        assert 0.0 <= val <= 1.0, f"Factor {factor} out of bounds: {val}"
    finally:
        db.close()


# ---------------------------------------------------------------------------
# TEST 8: Verify no fabricated evidence (only verified targets/indications)
# ---------------------------------------------------------------------------
def test_no_fabricated_evidence():
    db = TestingSessionLocal()
    try:
        res = drug_similarity_service.find_similar_drugs("Aspirin", db, top_k=5)
        assert res["success"] is True
        for c in res["candidates"]:
            # Shared targets must be a list of valid dictionaries or empty list
            assert isinstance(c["shared_targets"], list)
            for t in c["shared_targets"]:
                assert "target_id" in t
                assert not t["target_id"].startswith("FAKE_")
            # Shared indications must be list of strings
            assert isinstance(c["shared_indications"], list)
            # Rationale must not be empty
            assert c["scientific_rationale"] and len(c["scientific_rationale"]) > 10
    finally:
        db.close()


# ---------------------------------------------------------------------------
# TEST 9: Verify missing molecular data / SMILES does not crash pipeline
# ---------------------------------------------------------------------------
def test_missing_molecular_data_graceful():
    # Construct synthetic candidate without SMILES (missing molecular structure)
    query_profile = {
        "chembl_id": "CHEMBL99999",
        "name": "SyntheticQueryDrug",
        "smiles": None,
        "fingerprint": None,
        "target_ids": {"ENSG00000095301"},
        "target_names": {"ENSG00000095301": "PTGS1"},
        "mechanisms": {"CYCLOOXYGENASE 1 INHIBITOR"},
        "indications": {"PAIN", "FEVER"},
        "bioactivity_pchembl": {"ENSG00000095301": 7.5},
    }
    raw_candidates = {
        "CHEMBL88888": {
            "name": "SyntheticCandDrug",
            "smiles": None,  # Missing SMILES
            "targets": {"ENSG00000095301"},
            "mechs": {"CYCLOOXYGENASE 1 INHIBITOR"},
            "actions": set(),
            "indications": {"PAIN"},
            "bioactivity_pchembl": {"ENSG00000095301": 7.2},
        }
    }
    # Invoke internal ranking - must not throw exception
    ranked = DrugSimilarityService._score_and_rank_candidates(
        query_chembl_id="CHEMBL99999",
        query_name="SyntheticQueryDrug",
        query_profile=query_profile,
        candidates_raw=raw_candidates,
        top_k=5,
    )
    assert len(ranked) == 1
    cand = ranked[0]
    assert cand["molecular_similarity"] is None
    assert cand["target_similarity"] == 1.0  # Shared PTGS1
    assert 0.0 <= cand["similarity_score"] <= 1.0
    assert "molecular" not in cand["weights_used"]


# ---------------------------------------------------------------------------
# TEST 10: Regression Check: Existing Disease -> Drug and Drug -> Disease remain unchanged
# ---------------------------------------------------------------------------
def test_existing_ml_workflows_preserved():
    # Workflow 1: Disease -> Drug
    res_dis = predict_and_enrich("Pulmonary Arterial Hypertension", top_k=5)
    assert "candidates" in res_dis
    assert len(res_dis["candidates"]) > 0
    # Candidates must be drug predictions
    assert res_dis["candidates"][0].get("drug_name") is not None

    # Workflow 2: Drug -> Disease
    res_drug = predict_drug_and_enrich("Everolimus", top_k=5)
    assert "candidates" in res_drug
    assert len(res_drug["candidates"]) > 0
    # Candidates must be disease predictions
    assert res_drug["candidates"][0].get("disease_name") is not None


# ---------------------------------------------------------------------------
# TEST 11: API Routes: POST /api/drugs/similar, GET /api/drugs/similar, and GET /api/graph/similarity-subgraph
# ---------------------------------------------------------------------------
def test_api_routes_similar_drugs():
    headers = get_auth_headers()

    # 1. POST /api/drugs/similar
    post_res = client.post(
        "/api/drugs/similar",
        json={"drug_name": "Metformin", "top_k": 5},
        headers=headers,
    )
    assert post_res.status_code == 200, post_res.text
    data = post_res.json()
    assert data["success"] is True
    assert data["workflow_type"] == "drug_to_similar_drugs"
    assert len(data["candidates"]) > 0
    assert "clinical_safety_boundary" in data

    # 2. GET /api/drugs/similar
    get_res = client.get(
        "/api/drugs/similar?drug_name=Metformin&top_k=5",
        headers=headers,
    )
    assert get_res.status_code == 200, get_res.text
    get_data = get_res.json()
    assert get_data["success"] is True
    assert len(get_data["candidates"]) > 0

    # 3. GET /api/candidates/similar (alias)
    alias_res = client.post(
        "/api/candidates/similar",
        json={"drug_name": "Metformin", "top_k": 5},
        headers=headers,
    )
    assert alias_res.status_code == 200, alias_res.text

    # 4. GET /api/graph/similarity-subgraph
    cand_drug = data["candidates"][0]["drug_name"]
    graph_res = client.get(
        f"/api/graph/similarity-subgraph?drug_a=Metformin&drug_b={cand_drug}",
        headers=headers,
    )
    assert graph_res.status_code == 200, graph_res.text
    graph_data = graph_res.json()
    assert "nodes" in graph_data
    assert "edges" in graph_data
    assert len(graph_data["nodes"]) >= 2  # At least Drug A and Drug B


# ---------------------------------------------------------------------------
# TEST 12: Mandatory Clinical Safety Boundary in Response
# ---------------------------------------------------------------------------
def test_clinical_safety_boundary_enforced():
    headers = get_auth_headers()
    res = client.post(
        "/api/drugs/similar",
        json={"drug_name": "Metformin", "top_k": 5},
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    boundary = data.get("clinical_safety_boundary", "")
    assert "clinical interchangeability" in boundary.lower()
    assert "prescription substitution" in boundary.lower()
    assert "not establish" in boundary.lower()
