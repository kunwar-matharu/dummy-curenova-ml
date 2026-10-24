import sys
import os
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from app.main import app

client = TestClient(app)

def test_root_and_system_status():
    res = client.get("/")
    assert res.status_code == 200
    assert "CureNova" in res.json()["platform"]

    status_res = client.get("/api/system/status")
    assert status_res.status_code == 200
    data = status_res.json()
    assert data["counts"]["candidates"] > 0
    assert data["counts"]["drugs"] > 0

def test_candidates_list_and_filter():
    res = client.get("/api/candidates")
    assert res.status_code == 200
    candidates = res.json()
    assert len(candidates) >= 4
    
    # Test sorting and filtering
    filtered = client.get("/api/candidates?disease=Pulmonary")
    assert filtered.status_code == 200
    assert len(filtered.json()) >= 1
    assert "Pulmonary" in filtered.json()[0]["disease_name"]

def test_candidate_detail_and_notes():
    res = client.get("/api/candidates/1")
    assert res.status_code == 200
    candidate = res.json()
    assert candidate["drug_name"] == "Imatinib"
    assert len(candidate["evidence_records"]) > 0
    
    # Add a research note
    note_res = client.post("/api/candidates/1/notes", json={"content": "Automated test note verifying API persistence."})
    assert note_res.status_code == 200
    assert "Automated test note" in note_res.json()["content"]

def test_knowledge_graph_endpoint():
    res = client.get("/api/graph")
    assert res.status_code == 200
    graph = res.json()
    assert len(graph["nodes"]) > 0
    assert len(graph["edges"]) > 0
    assert any(e["relationship_type"] == "inhibits" for e in graph["edges"])

def test_stress_test_execution():
    res = client.get("/api/stress-tests")
    assert res.status_code == 200
    existing_runs = res.json()
    assert len(existing_runs) >= 1
    
    # Run a new stress test
    run_payload = {
        "title": "Automated CI Evaluation - Perturbation 30%",
        "model_name": "CureNova GraphEnsemble v2.4",
        "dataset_version": "CureNova-BioKG v2.1",
        "split_type": "Data-Perturbation",
        "perturbation_rate": 0.30
    }
    run_res = client.post("/api/stress-tests/run", json=run_payload)
    assert run_res.status_code == 200
    new_run = run_res.json()
    assert new_run["status"] == "completed"
    assert "auroc" in new_run["metrics"]
    assert new_run["metrics"]["auroc"] > 0.5

def test_doctor_portal_interactions():
    res = client.get("/api/doctor/interactions?drug_names=Sildenafil,Nitroglycerin")
    assert res.status_code == 200
    alerts = res.json()
    assert len(alerts) >= 1
    assert alerts[0]["severity"] == "contraindicated"

def test_patient_portal_medicines():
    res = client.get("/api/patient/medicines")
    assert res.status_code == 200
    guides = res.json()
    assert len(guides) >= 1
    assert "Metformin" in [g["drug_name"] for g in guides]

def test_agentic_workflow_investigate():
    res = client.post("/api/candidates/investigate?query=Colorectal+Cancer&user_role=researcher")
    assert res.status_code == 200
    trace = res.json()
    assert len(trace["completed_steps"]) >= 5
    assert len(trace["candidate_hypotheses"]) > 0
    assert "LEGAL & SCIENTIFIC RESEARCH BOUNDARY" in trace["limitations_and_boundary_warning"]
