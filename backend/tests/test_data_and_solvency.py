"""
Module 1 & 3 Test Suite: Data Pipeline & Solvency Guardrails
Tests normal solvency evaluation, boundary conditions, zero-division immunity,
and statutory insolvency override detection.
"""

import pytest
import pandas as pd
from backend.app.ml.preprocessing import add_financial_features


def test_solvent_prime_applicant_metrics(api_client, prime_applicant):
    """
    [TEST 1.1 - NORMAL SOLVENT PASS]
    Verifies that a high-surplus prime applicant is categorized as OPTIMAL
    with DTI comfortably below the 35% safe threshold.
    """
    response = api_client.post("/api/v1/loan/predict", json=prime_applicant)
    assert response.status_code == 200, f"API error: {response.text}"
    
    data = response.json()
    solvency = data["solvencyCheck"]
    
    # Financial Verification
    assert solvency["isSolvent"] is True, "Prime applicant must be marked solvent"
    assert solvency["status"] == "OPTIMAL", f"Expected OPTIMAL, got {solvency['status']}"
    assert solvency["dtiRatio"] < 0.35, f"DTI ratio {solvency['dtiRatio']} exceeds 35%"
    assert solvency["overrideWarning"] is None, "Prime applicant must have no override warning"
    
    print(f"\n[PASS] Prime Solvency: Income=INR {solvency['totalIncome']:,.0f}, EMI=INR {solvency['monthlyEMI']:,.0f}, DTI={solvency['dtiPercent']}")


def test_insolvency_guardrail_tripped(api_client, insolvent_shortcut_applicant):
    """
    [TEST 1.2 - REGULATORY BREACH / FAILURE INTERCEPTION]
    Verifies that an applicant with severe debt burden (DTI = 1,066.7%)
    trips the deterministic 50% Solvency Guardrail and is flagged INSOLVENT.
    """
    response = api_client.post("/api/v1/loan/predict", json=insolvent_shortcut_applicant)
    assert response.status_code == 200
    
    data = response.json()
    solvency = data["solvencyCheck"]
    
    # Assert Guardrail Triggers
    assert solvency["isSolvent"] is False, "DTI > 50% must be marked insolvent"
    assert solvency["status"] == "INSOLVENT", f"Expected INSOLVENT, got {solvency['status']}"
    assert solvency["dtiRatio"] > 5.0, f"Expected DTI > 500%, got {solvency['dtiRatio'] * 100:.1f}%"
    assert solvency["overrideWarning"] is not None, "Insolvent breach must produce override warning"
    assert "CRITICAL FINANCIAL RISK" in solvency["overrideWarning"]
    
    # Assert Hard Decision Override
    assert data["prediction"] == "Rejected", "Insolvent breach must enforce mandatory rejection"
    
    print(f"\n[GUARDRAIL TRIGGERED] Insolvent Breach: DTI={solvency['dtiPercent']}, Action=Hard Rejection Override")


def test_zero_division_guardrail_immunity():
    """
    [TEST 1.3 - CRASH PREVENTION / ZERO DIVISION IMMUNITY]
    Verifies that pathological inputs (Loan_Term=0, Total_Income=0)
    do not throw ZeroDivisionError and are clamped safely using max(1.0, ...).
    """
    pathological_data = {
        'Applicant_Income': [0],
        'Coapplicant_Income': [0],
        'Loan_Amount': [50000],
        'Loan_Term': [0]
    }
    df = pd.DataFrame(pathological_data)
    
    # Must not raise ZeroDivisionError
    enriched = add_financial_features(df)
    
    assert 'Monthly_EMI' in enriched.columns
    assert 'DTI_Ratio' in enriched.columns
    assert not enriched['Monthly_EMI'].isna().any()
    assert not enriched['DTI_Ratio'].isna().any()
    assert enriched['Monthly_EMI'].iloc[0] == 50000.0  # 50000 / max(1, 0) = 50000
    assert enriched['DTI_Ratio'].iloc[0] == 50000.0   # 50000 / max(1, 0) = 50000
    
    print("\n[PASS] Zero-Division Crash Immunity: Clamped correctly without runtime exceptions")
