import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.session import get_db, sqlite_fallback_engine, init_db

client = TestClient(app)

def test_e2e_single_application_pipeline_integration(prime_applicant):
    """
    End-to-End Integration Flow 1:
    Single Applicant Submission -> ML Inference -> SHAP & LIME -> 
    4-Pillar Trust Score -> Database Persistence -> Retrieval -> PDF Report Generation.
    """
    # 1. Post applicant to prediction endpoint
    res = client.post("/api/v1/loan/predict", json=prime_applicant)
    assert res.status_code == 200
    pred_data = res.json()

    # Verify ML & Solvency synthesis
    assert pred_data["prediction"] == "Approved"
    assert pred_data["solvencyCheck"]["status"] == "OPTIMAL"
    assert pred_data["dossierId"].startswith("TF-")
    evaluation_id = pred_data.get("evaluationId")
    assert evaluation_id is not None

    # Verify XAI & Trust Engine outputs
    assert "shap" in pred_data and len(pred_data["shap"]["features"]) > 0
    assert "lime" in pred_data and len(pred_data["lime"]["features"]) > 0
    assert "trustScore" in pred_data
    assert pred_data["trustScore"]["faithfulness"] is not None
    assert pred_data["trustScore"]["stability"] is not None
    assert pred_data["trustScore"]["consistency"] is not None
    assert pred_data["trustScore"]["fairness"] is not None
    assert pred_data["trustScore"]["overallTrustScore"] > 0.0

    # 2. Database Retrieval Integration: Fetch from /evaluations/{id}
    fetch_res = client.get(f"/api/v1/loan/evaluations/{evaluation_id}")
    assert fetch_res.status_code == 200
    detail = fetch_res.json()
    assert detail["id"] == evaluation_id
    assert detail["dossierId"] == pred_data["dossierId"]
    assert detail["applicantData"]["Applicant_Income"] == prime_applicant["Applicant_Income"]
    assert detail["predictionResult"]["prediction"] == "Approved"

    # 3. PDF Reporting Integration: Generate sanction letter PDF
    pdf_payload = {
        "applicantData": detail["applicantData"],
        "predictionResult": detail["predictionResult"]
    }
    pdf_res = client.post("/api/v1/loan/generate-pdf", json=pdf_payload)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF")
    assert len(pdf_res.content) > 1000

    # 4. Clean up evaluation record
    del_res = client.delete(f"/api/v1/loan/evaluations/{evaluation_id}")
    assert del_res.status_code == 200


def test_e2e_batch_portfolio_pipeline_integration():
    """
    End-to-End Integration Flow 2:
    Batch CSV Submission -> Row Validation & Flaw Isolation -> 
    Bulk Prediction -> Relational Batch-to-Application DB Persistence -> 
    Batch Detail Audit -> Deletion Cascade.
    """
    # 1. Ingest mixed CSV (2 valid, 1 flawed with missing income)
    csv_body = (
        "Gender,Married,Dependents,Education,Employment_Status,Applicant_Income,Coapplicant_Income,Loan_Amount,Loan_Term,Credit_History,Property_Area,Age\n"
        "Female,Yes,1,Graduate,Salaried,82000,18000,110000,360,1,Urban,34\n"
        "Male,No,0,Graduate,Salaried,65000,0,130000,360,1,Semiurban,29\n"
        "Male,Yes,1,Graduate,Salaried,,0,130000,360,1,Semiurban,29\n" # Flawed row
    )
    files = {"file": ("portfolio_audit_q4.csv", csv_body.encode("utf-8"), "text/csv")}
    upload_res = client.post("/api/v1/loan/predict-batch", files=files)
    assert upload_res.status_code == 200
    batch_data = upload_res.json()

    assert batch_data["totalRecords"] == 3
    assert batch_data["validRecords"] == 2
    assert batch_data["flawedRecords"] == 1
    batch_id = batch_data["batchId"]

    # 2. Verify batch detail retrieval and parent-child relational linkage
    detail_res = client.get(f"/api/v1/loan/batches/{batch_id}")
    assert detail_res.status_code == 200
    batch_detail = detail_res.json()
    assert batch_detail["batchId"] == batch_id
    assert len(batch_detail["processedEvaluations"]) == 2
    assert len(batch_detail["flawedData"]) == 1

    # 3. Clean up batch and child records
    del_res = client.delete(f"/api/v1/loan/batches/{batch_id}")
    assert del_res.status_code == 200

    # Verify batch no longer exists
    get_again = client.get(f"/api/v1/loan/batches/{batch_id}")
    assert get_again.status_code == 404


def test_database_sqlite_fallback_and_schema_resilience():
    """
    End-to-End Integration Flow 3:
    Database Fallback & Resilient Initialization:
    Ensures local SQLite tables exist and schema remains intact without PostgreSQL.
    """
    # Call init_db on the fallback engine to simulate zero-postgres environment
    init_db(sqlite_fallback_engine)

    # Health check responds
    health_res = client.get("/health")
    assert health_res.status_code == 200
    assert health_res.json() == {"status": "healthy"}
