import pytest
import os
import sys
import json
import joblib
import pandas as pd
from fastapi.testclient import TestClient

# Ensure workspace root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.app.main import app


@pytest.fixture(scope="session")
def api_client():
    """FastAPI TestClient fixture."""
    return TestClient(app)


@pytest.fixture(scope="session")
def model_artifacts():
    """Loads serialized production model, preprocessor, and schema."""
    model = joblib.load('models/loan_prediction_model.pkl')
    preprocessor = joblib.load('models/preprocessor.pkl')
    with open('models/feature_config.json', 'r') as f:
        config = json.load(f)
    return {
        "model": model,
        "preprocessor": preprocessor,
        "raw_features": config["raw_features"],
        "transformed_features": config["transformed_features"]
    }


@pytest.fixture
def prime_applicant():
    """
    Profile 1: Jane Doe (Prime Executive)
    Low risk, high cashflow surplus, excellent credit history.
    """
    return {
        "Gender": "Female",
        "Married": "Yes",
        "Dependents": 0,
        "Education": "Graduate",
        "Employment_Status": "Salaried",
        "Applicant_Income": 80000.0,
        "Coapplicant_Income": 20000.0,
        "Loan_Amount": 100000.0,
        "Loan_Term": 360,
        "Credit_History": 1,
        "Property_Area": "Urban",
        "Age": 35.0
    }


@pytest.fixture
def insolvent_shortcut_applicant():
    """
    Profile 7: Alex Turner (Shortcut Learning Paradox Case)
    Extreme debt burden: Income = 2,500, Loan = 80,000 over 3 months (EMI = 26,667, DTI = 1066.7%).
    Has Credit_History = 1 (Trap profile: pure ML model approves naively).
    """
    return {
        "Gender": "Male",
        "Married": "No",
        "Dependents": 0,
        "Education": "Graduate",
        "Employment_Status": "Salaried",
        "Applicant_Income": 2500.0,
        "Coapplicant_Income": 0.0,
        "Loan_Amount": 80000.0,
        "Loan_Term": 3,
        "Credit_History": 1,
        "Property_Area": "Urban",
        "Age": 22.0
    }


@pytest.fixture
def borderline_applicant():
    """
    Profile 3: Borderline applicant near regulatory 50% DTI ceiling.
    """
    return {
        "Gender": "Male",
        "Married": "Yes",
        "Dependents": 1,
        "Education": "Graduate",
        "Employment_Status": "Self-Employed",
        "Applicant_Income": 45000.0,
        "Coapplicant_Income": 0.0,
        "Loan_Amount": 160000.0,
        "Loan_Term": 180,
        "Credit_History": 0,
        "Property_Area": "Semiurban",
        "Age": 42.0
    }
