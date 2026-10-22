import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.reporting.pdf_generator import generate_loan_report_pdf

client = TestClient(app)

def test_direct_pdf_generator_function(prime_applicant):
    # Obtain prediction result from predict endpoint
    pred_res = client.post("/api/v1/loan/predict", json=prime_applicant)
    assert pred_res.status_code == 200
    prediction_result = pred_res.json()
    
    # Generate PDF directly
    pdf_bytes = generate_loan_report_pdf(prime_applicant, prediction_result)
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 1000
    # PDF magic bytes header check
    assert pdf_bytes.startswith(b"%PDF")


def test_api_generate_pdf_endpoint(prime_applicant):
    # Predict first
    pred_res = client.post("/api/v1/loan/predict", json=prime_applicant)
    assert pred_res.status_code == 200
    prediction_result = pred_res.json()
    
    payload = {
        "applicantData": prime_applicant,
        "predictionResult": prediction_result
    }
    
    response = client.post("/api/v1/loan/generate-pdf", json=payload)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "TrustFin_Bank" in response.headers["content-disposition"]
    assert response.content.startswith(b"%PDF")
    assert len(response.content) > 1000
