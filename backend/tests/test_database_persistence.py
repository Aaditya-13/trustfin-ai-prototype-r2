"""
Module Test Suite: Database Evaluation Persistence & Audit Retrieval
Verifies that evaluations are properly stored in the database (PostgreSQL with SQLite fallback)
with institutional dossier tracking IDs and can be retrieved or deleted via the API.
"""

import pytest

def test_evaluation_persistence_and_retrieval(api_client, prime_applicant):
    # 1. Run prediction
    res = api_client.post("/api/v1/loan/predict", json=prime_applicant)
    assert res.status_code == 200
    data = res.json()
    
    assert "evaluationId" in data and data["evaluationId"] is not None
    assert "dossierId" in data and data["dossierId"] is not None
    assert data["dossierId"].startswith("TF-")
    eval_id = data["evaluationId"]
    dossier_id = data["dossierId"]
    
    # 2. List evaluations
    list_res = api_client.get("/api/v1/loan/evaluations")
    assert list_res.status_code == 200
    eval_list = list_res.json()
    assert len(eval_list) > 0
    
    matched = [item for item in eval_list if item["id"] == eval_id]
    assert len(matched) == 1
    assert matched[0]["dossierId"] == dossier_id
    assert matched[0]["prediction"] == "Approved"
    
    # 3. Retrieve detailed evaluation
    detail_res = api_client.get(f"/api/v1/loan/evaluations/{eval_id}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["id"] == eval_id
    assert detail_data["dossierId"] == dossier_id
    assert detail_data["applicantData"]["Applicant_Income"] == prime_applicant["Applicant_Income"]
    assert detail_data["predictionResult"]["prediction"] == "Approved"
    
    # 4. Clean up test record
    del_res = api_client.delete(f"/api/v1/loan/evaluations/{eval_id}")
    assert del_res.status_code == 200
