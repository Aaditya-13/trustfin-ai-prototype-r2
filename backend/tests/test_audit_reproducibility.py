"""
Module 5 Test Suite: Audit Reproducibility & Cryptographic Invariance (BCBS 239)
Validates deterministic seeding across LIME perturbations, verifying zero stochastic
drift across re-evaluations and ensuring regulatory compliance.
"""

import pytest
import hashlib
import json
from backend.app.api.routes.prediction import generate_applicant_seed


def test_deterministic_seed_generation(prime_applicant, insolvent_shortcut_applicant):
    """
    [TEST 4.1 - SEED INVARIANCE & SENSITIVITY]
    Verifies that generate_applicant_seed:
    1. Produces identical integer seeds for identical applicant dossiers across repeated executions.
    2. Produces completely distinct seeds when applicant attributes change.
    """
    seed_1 = generate_applicant_seed(prime_applicant)
    seed_2 = generate_applicant_seed(prime_applicant.copy())
    seed_other = generate_applicant_seed(insolvent_shortcut_applicant)
    
    assert seed_1 == seed_2, f"Seed mismatch for identical inputs: {seed_1} != {seed_2}"
    assert seed_1 != seed_other, f"Seed collision for distinct inputs: {seed_1} == {seed_other}"
    assert 0 <= seed_1 < (2**31 - 1), f"Seed exceeds 32-bit positive integer range: {seed_1}"
    
    print("\n" + "="*70)
    print("DETERMINISTIC SEED AUDIT TRAIL (BCBS 239 COMPLIANCE):")
    print(f"  Applicant: Prime Executive -> Seed: {seed_1} (SHA-256 derived)")
    print(f"  Repeated Evaluation Seed:  -> Seed: {seed_2} [ZERO DRIFT]")
    print(f"  Distinct Profile Seed:     -> Seed: {seed_other}")
    print("="*70)


def test_zero_stochastic_drift_across_api_reevaluation(api_client, prime_applicant):
    """
    [TEST 4.2 - ZERO STOCHASTIC DRIFT IN LIME & TRUST EVALUATION]
    Standard LIME is stochastic because it draws Monte Carlo perturbations.
    TrustFin AI fixes this via deterministic applicant-seeded RNGs.
    Verifies that calling the prediction endpoint twice yields 100% identical:
    - SHAP explanation weights
    - LIME explanation weights
    - Trust Score metrics (Faithfulness, Stability, Consistency, Fairness)
    """
    # Run Evaluation 1
    res1 = api_client.post("/api/v1/loan/predict", json=prime_applicant)
    assert res1.status_code == 200
    data1 = res1.json()
    
    # Run Evaluation 2 (Independent request)
    res2 = api_client.post("/api/v1/loan/predict", json=prime_applicant)
    assert res2.status_code == 200
    data2 = res2.json()
    
    # 1. Prediction & Confidence Invariance
    assert data1["prediction"] == data2["prediction"]
    assert data1["confidenceScore"] == data2["confidenceScore"]
    
    # 2. LIME Explanation Invariance (Zero Drift)
    lime1 = {f["feature"]: round(f["contribution"], 6) for f in data1["lime"]["features"]}
    lime2 = {f["feature"]: round(f["contribution"], 6) for f in data2["lime"]["features"]}
    assert lime1 == lime2, f"Stochastic drift detected in LIME feature weights: {lime1} vs {lime2}"
    
    # 3. SHAP Explanation Invariance
    shap1 = {f["feature"]: round(f["contribution"], 6) for f in data1["shap"]["features"]}
    shap2 = {f["feature"]: round(f["contribution"], 6) for f in data2["shap"]["features"]}
    assert shap1 == shap2, f"Drift detected in SHAP feature weights: {shap1} vs {shap2}"
    
    # 4. Trust Score Invariance
    trust1 = data1["trustScore"]
    trust2 = data2["trustScore"]
    assert trust1["overallTrustScore"] == trust2["overallTrustScore"]
    assert trust1["faithfulness"] == trust2["faithfulness"]
    assert trust1["stability"] == trust2["stability"]
    assert trust1["consistency"] == trust2["consistency"]
    assert trust1["fairness"] == trust2["fairness"]
    
    print("\n" + "="*70)
    print("AUDIT REPRODUCIBILITY & ZERO DRIFT VERIFICATION (PPT SLIDE DATA):")
    print(f"  Metric                     Run #1            Run #2            Absolute Drift")
    print("  ----------------------------------------------------------------------------")
    print(f"  Prediction Decision        {data1['prediction']:<17} {data2['prediction']:<17} 0.000000")
    print(f"  Confidence Probability     {data1['confidenceScore']*100:.4f}%          {data2['confidenceScore']*100:.4f}%          0.000000%")
    print(f"  LIME Top Feature Weight    {data1['lime']['features'][0]['contribution']:<17.6f} {data2['lime']['features'][0]['contribution']:<17.6f} 0.000000")
    print(f"  Composite Trust Score      {trust1['overallTrustScore']*100:.4f}%          {trust2['overallTrustScore']*100:.4f}%          0.000000%")
    print("  ----------------------------------------------------------------------------")
    print("  Regulatory Status: 100% Deterministic & Audit-Compliant under BCBS 239")
    print("="*70)
