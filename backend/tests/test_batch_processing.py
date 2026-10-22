import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.api.routes.prediction import validate_batch_record

client = TestClient(app)

def test_validate_batch_record_valid():
    valid_row = {
        "Gender": "Male",
        "Married": "Yes",
        "Dependents": 1,
        "Education": "Graduate",
        "Employment_Status": "Salaried",
        "Applicant_Income": 55000,
        "Coapplicant_Income": 15000,
        "Loan_Amount": 150000,
        "Loan_Term": 360,
        "Credit_History": 1,
        "Property_Area": "Urban",
        "Age": 32
    }
    is_valid, cleaned, err = validate_batch_record(valid_row, 1)
    assert is_valid is True
    assert err is None
    assert cleaned["Applicant_Income"] == 55000.0
    assert cleaned["Credit_History"] == 1.0


def test_validate_batch_record_missing_income():
    flawed_row = {
        "Gender": "Male",
        "Married": "Yes",
        "Dependents": 1,
        "Education": "Graduate",
        "Employment_Status": "Salaried",
        "Applicant_Income": "", # Empty
        "Coapplicant_Income": 0,
        "Loan_Amount": 150000,
        "Loan_Term": 360,
        "Credit_History": 1,
        "Property_Area": "Urban",
        "Age": 32
    }
    is_valid, cleaned, err = validate_batch_record(flawed_row, 2)
    assert is_valid is False
    assert cleaned is None
    assert "Applicant_Income is required" in err


def test_validate_batch_record_missing_credit_history():
    flawed_row = {
        "Gender": "Female",
        "Married": "No",
        "Dependents": 0,
        "Education": "Graduate",
        "Employment_Status": "Salaried",
        "Applicant_Income": 60000,
        "Coapplicant_Income": 0,
        "Loan_Amount": 120000,
        "Loan_Term": 360,
        "Credit_History": None, # None
        "Property_Area": "Urban",
        "Age": 28
    }
    is_valid, cleaned, err = validate_batch_record(flawed_row, 3)
    assert is_valid is False
    assert "Credit_History is required" in err


def test_get_batch_sample_csv():
    response = client.get("/api/v1/loan/batch-sample-csv")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    lines = response.text.strip().split("\n")
    # 1 header line + 20 data rows = 21 lines
    assert len(lines) == 21


def test_get_batch_presets():
    response = client.get("/api/v1/loan/batch-presets/batch_1")
    assert response.status_code == 200
    data = response.json()
    assert len(data["rows"]) == 10

    response30 = client.get("/api/v1/loan/batch-presets/batch_2")
    assert response30.status_code == 200
    assert len(response30.json()["rows"]) == 30


def test_predict_batch_json_and_persistence():
    # Fetch Demo Batch 1 (10 records: 7 valid, 3 flawed)
    preset_resp = client.get("/api/v1/loan/batch-presets/batch_1")
    rows = preset_resp.json()["rows"]

    batch_payload = {
        "filename": "demo_batch_1.csv",
        "rows": rows
    }
    response = client.post("/api/v1/loan/predict-batch-json", json=batch_payload)
    assert response.status_code == 200
    data = response.json()

    assert data["totalRecords"] == 10
    assert data["validRecords"] == 7
    assert data["flawedRecords"] == 3
    assert len(data["flawedData"]) == 3
    assert len(data["processedResults"]) == 7

    batch_id = data["batchId"]
    assert batch_id.startswith("BATCH-")

    # Verify batch appears in /batches listing
    batches_resp = client.get("/api/v1/loan/batches")
    assert batches_resp.status_code == 200
    batch_list = batches_resp.json()
    assert any(b["batchId"] == batch_id for b in batch_list)

    # Verify /batches/{batch_id} returns details
    detail_resp = client.get(f"/api/v1/loan/batches/{batch_id}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["batchId"] == batch_id
    assert len(detail["flawedData"]) == 3
    assert len(detail["processedEvaluations"]) == 7

    # Cleanup: Delete batch
    del_resp = client.delete(f"/api/v1/loan/batches/{batch_id}")
    assert del_resp.status_code == 200


def test_predict_batch_csv_file_upload_and_persistence():
    # Construct an in-memory CSV with 2 valid records and 1 flawed record (missing income)
    csv_content = (
        "Gender,Married,Dependents,Education,Employment_Status,Applicant_Income,Coapplicant_Income,Loan_Amount,Loan_Term,Credit_History,Property_Area,Age\n"
        "Female,Yes,0,Graduate,Salaried,75000,15000,120000,360,1,Urban,30\n"
        "Male,No,1,Graduate,Self-Employed,60000,0,100000,360,1,Semiurban,35\n"
        "Male,Yes,2,Not Graduate,Salaried,,0,80000,360,1,Rural,40\n"
    )
    
    files = {
        "file": ("test_upload.csv", csv_content.encode("utf-8"), "text/csv")
    }
    response = client.post("/api/v1/loan/predict-batch", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["totalRecords"] == 3
    assert data["validRecords"] == 2
    assert data["flawedRecords"] == 1
    assert len(data["flawedData"]) == 1
    assert "Applicant_Income is required" in data["flawedData"][0]["errorReason"]
    assert len(data["processedResults"]) == 2
    
    batch_id = data["batchId"]
    assert batch_id.startswith("BATCH-")
    
    # Verify cleanup works
    del_resp = client.delete(f"/api/v1/loan/batches/{batch_id}")
    assert del_resp.status_code == 200

