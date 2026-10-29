import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

@pytest.fixture
def api_client():
    return TestClient(app)

def test_home_loan_multiproduct_endpoint(api_client):
    """
    Verifies that selecting Home Loan routes to the 97% Home Loan model
    with continuous CIBIL Score (300-900), Property Value, and LTV Ratio.
    """
    payload = {
        "loan_type": "home_loan",
        "Gender": "Female",
        "Married": "Yes",
        "Dependents": 1,
        "Education": "Graduate",
        "Employment_Status": "Salaried",
        "Applicant_Income": 85000.0,
        "Coapplicant_Income": 35000.0,
        "Loan_Amount": 3500000.0,
        "Loan_Term": 240,
        "Property_Value": 4800000.0,
        "Property_Area": "Urban",
        "Age": 34.0,
        "CIBIL_Score": 790,
        "Missed_Payments_12M": 0,
        "Existing_EMI": 8000.0
    }
    
    response = api_client.post("/api/v1/loan/predict", json=payload)
    assert response.status_code == 200, f"Error: {response.text}"
    
    data = response.json()
    assert data["prediction"] in ["Approved", "Rejected"]
    assert data["modelVersion"] == "home_loan_v2"
    assert data["trustScore"]["overallTrustScore"] > 0.0
    assert len(data["shap"]["features"]) == 20
    assert len(data["lime"]["features"]) == 20
    
    # Verify CIBIL Score is present in explanation features
    feat_names = [f["feature"] for f in data["shap"]["features"]]
    assert "CIBIL_Score" in feat_names
    assert "LTV_Ratio" in feat_names

def test_personal_loan_multiproduct_endpoint(api_client):
    """
    Verifies that selecting Personal Loan routes to the 97% Personal Loan model
    with CIBIL Score, Loan Purpose, and Credit Card Utilization.
    """
    payload = {
        "loan_type": "personal_loan",
        "Gender": "Male",
        "Married": "No",
        "Dependents": 0,
        "Education": "Graduate",
        "Employment_Status": "Salaried",
        "Applicant_Income": 75000.0,
        "Loan_Amount": 400000.0,
        "Loan_Term": 36,
        "Age": 28.0,
        "CIBIL_Score": 760,
        "Missed_Payments_12M": 0,
        "Existing_EMI": 5000.0,
        "Loan_Purpose": "Medical_Emergency",
        "Credit_Card_Utilization": 0.28
    }
    
    response = api_client.post("/api/v1/loan/predict", json=payload)
    assert response.status_code == 200, f"Error: {response.text}"
    
    data = response.json()
    assert data["prediction"] in ["Approved", "Rejected"]
    assert data["modelVersion"] == "personal_loan_v2"
    assert data["trustScore"]["overallTrustScore"] > 0.0
    assert len(data["shap"]["features"]) == 21
    assert len(data["lime"]["features"]) == 21
    
    feat_names = [f["feature"] for f in data["shap"]["features"]]
    assert "CIBIL_Score" in feat_names
    assert "Credit_Card_Utilization" in feat_names

def test_personal_loan_zero_credit_card_utilization(api_client):
    """
    Verifies that Credit_Card_Utilization can be set to exactly 0.0 (Zero Revolving Debt)
    without being coerced to a default or causing any validation or preprocessor error.
    """
    payload = {
        "loan_type": "personal_loan",
        "Gender": "Female",
        "Married": "No",
        "Dependents": 0,
        "Education": "Graduate",
        "Employment_Status": "Salaried",
        "Applicant_Income": 85000.0,
        "Loan_Amount": 300000.0,
        "Loan_Term": 24,
        "Age": 29.0,
        "CIBIL_Score": 800,
        "Missed_Payments_12M": 0,
        "Existing_EMI": 2000.0,
        "Loan_Purpose": "Medical_Emergency",
        "Credit_Card_Utilization": 0.0
    }
    
    response = api_client.post("/api/v1/loan/predict", json=payload)
    assert response.status_code == 200, f"Error: {response.text}"
    
    data = response.json()
    assert data["prediction"] == "Approved"
    assert data["modelVersion"] == "personal_loan_v2"
    
    # Check that explanation contains Credit_Card_Utilization with non-null values
    cc_shap = next((f for f in data["shap"]["features"] if f["feature"] == "Credit_Card_Utilization"), None)
    assert cc_shap is not None
    assert cc_shap["value"] == 0.0

