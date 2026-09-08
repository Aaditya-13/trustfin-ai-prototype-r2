from fastapi import APIRouter, HTTPException, Response
import joblib
import pandas as pd
import numpy as np
import json
import os
import hashlib
from backend.app.api.schemas import LoanApplicationRequest, LoanPredictionResponse, SolvencyCheckResult, GenerateReportRequest
from backend.app.reporting.pdf_generator import generate_loan_report_pdf
from backend.app.ml.preprocessing import add_financial_features
from backend.app.explainability.shap_explainer import SHAPExplainer
from backend.app.explainability.lime_explainer import LIMEExplainer
from backend.app.validation.faithfulness import calculate_faithfulness
from backend.app.validation.stability import calculate_stability
from backend.app.validation.consistency import calculate_consistency
from backend.app.validation.fairness import calculate_counterfactual_fairness
from backend.app.trust.trust_score import calculate_trust_score

router = APIRouter()

def generate_applicant_seed(input_data: dict) -> int:
    """
    Derives a deterministic, cryptographically stable 32-bit integer seed
    from the applicant input features.
    Ensures identical inputs always produce identical random sequences for LIME
    sampling and stability perturbations, preventing artificial score drift on re-evaluations.
    """
    serialized = json.dumps(input_data, sort_keys=True, default=str)
    hash_hex = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
    return int(hash_hex[:8], 16) % (2**31 - 1)

try:
    print("Loading models for API...")
    model = joblib.load('models/loan_prediction_model.pkl')
    preprocessor = joblib.load('models/preprocessor.pkl')
    with open('models/feature_config.json', 'r') as f:
        config = json.load(f)
    feature_names = config["transformed_features"]
    raw_features = config["raw_features"]
    
    # Load sample training data for LIME baseline
    train_clean = pd.read_csv('data/processed/train_clean.csv')
    X_train_raw = train_clean[raw_features]
    X_train_transformed = preprocessor.transform(X_train_raw)
    
    # Initialize explainers globally to save time
    shap_explainer = SHAPExplainer(model, feature_names)
    lime_explainer = LIMEExplainer(X_train_transformed, feature_names)
    print("Models loaded successfully.")
    
except Exception as e:
    print(f"Error loading models: {e}")
    model = None

@router.post("/predict", response_model=LoanPredictionResponse)
async def predict_loan(request: LoanApplicationRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Models not loaded properly.")
        
    try:
        # 1. Preprocess Input with Financial Features
        input_data = request.model_dump()
        input_df = pd.DataFrame([input_data])
        input_df_enriched = add_financial_features(input_df)[raw_features]
        transformed_instance = preprocessor.transform(input_df_enriched)[0]
        
        # 2. Solvency Guardrail Calculation (Deterministic Banking Policy)
        loan_amount = float(input_data.get('Loan_Amount', 0))
        loan_term = float(input_data.get('Loan_Term', 1))
        monthly_emi = loan_amount / max(1.0, loan_term)
        total_income = float(input_data.get('Applicant_Income', 0) + input_data.get('Coapplicant_Income', 0))
        dti_ratio = monthly_emi / max(1.0, total_income)
        dti_percent = f"{dti_ratio * 100:.1f}%"
        
        if dti_ratio <= 0.35:
            solvency_status = "OPTIMAL"
            is_solvent = True
            override_warning = None
        elif dti_ratio <= 0.50:
            solvency_status = "MODERATE"
            is_solvent = True
            override_warning = "Moderate Debt Burden: Repayment represents 35%–50% of monthly income."
        else:
            solvency_status = "INSOLVENT"
            is_solvent = False
            override_warning = f"CRITICAL FINANCIAL RISK: Monthly repayment obligation (₹{monthly_emi:,.0f}/mo) represents {dti_percent} of income, exceeding the 50% regulatory insolvency limit."
            
        solvency_check = SolvencyCheckResult(
            monthlyEMI=round(monthly_emi, 2),
            totalIncome=round(total_income, 2),
            dtiRatio=round(dti_ratio, 4),
            dtiPercent=dti_percent,
            status=solvency_status,
            isSolvent=is_solvent,
            overrideWarning=override_warning
        )
        
        # 3. Predict (ML Model)
        transformed_2d = transformed_instance.reshape(1, -1)
        pred = model.predict(transformed_2d)[0]
        prob = model.predict_proba(transformed_2d)[0][1]
        
        prediction_str = "Approved" if pred == 1 else "Rejected"
        
        # 4. Explainability (SHAP & LIME)
        # Prepare original values mapping including enriched financial features
        orig_values = input_data.copy()
        orig_values['Monthly_EMI'] = monthly_emi
        orig_values['DTI_Ratio'] = dti_ratio
        
        # Derive deterministic seed per applicant profile to guarantee reproducible explanations & scores
        applicant_seed = generate_applicant_seed(input_data)
        
        shap_exp = shap_explainer.explain_instance(transformed_instance, original_values=orig_values)
        lime_exp = lime_explainer.explain_instance(
            model.predict_proba, 
            transformed_instance, 
            original_values=orig_values,
            seed=applicant_seed
        )
        
        # 5. Validation
        directional_mask = {}
        for feat in shap_exp.features:
            if feat.contribution > 0:
                directional_mask[feat.feature] = 0.0
            else:
                directional_mask[feat.feature] = 1.0 if feat.feature == 'Credit_History' else 0.0
                
        faithfulness_score = calculate_faithfulness(model, transformed_instance, shap_exp, feature_names, directional_mask, top_k=3)
        faithfulness_score = max(0.0, min(1.0, faithfulness_score))
        
        # Deterministic stability perturbation via local seeded RNG (ensures audit consistency for identical inputs)
        stability_rng = np.random.RandomState(applicant_seed)
        noise = stability_rng.normal(0, 0.01, size=transformed_instance.shape)
        perturbed_instance = transformed_instance + noise
        shap_exp_perturbed = shap_explainer.explain_instance(perturbed_instance, original_values=orig_values)
        stability_score = calculate_stability(shap_exp, shap_exp_perturbed)
        
        consistency_score = calculate_consistency(shap_exp, lime_exp, top_k=3)
        fairness_score = calculate_counterfactual_fairness(model, preprocessor, input_data, raw_features, sensitive_col='Gender')
        
        # 6. Trust Score (4 Equal Pillars of 25% each)
        trust_eval = calculate_trust_score(faithfulness_score, stability_score, consistency_score, fairness_score)
        
        # 7. Save to Database
        try:
            from backend.app.db.session import SessionLocal
            from backend.app.db.models import PredictionLog
            
            db = SessionLocal()
            log_entry = PredictionLog(
                applicant_age=input_data.get('Age'),
                applicant_income=input_data.get('Applicant_Income'),
                loan_amount=input_data.get('Loan_Amount'),
                raw_input_data=input_data,
                prediction=prediction_str,
                probability=float(prob),
                shap_explanation=shap_exp.model_dump(),
                lime_explanation=lime_exp.model_dump(),
                faithfulness_score=faithfulness_score,
                stability_score=stability_score,
                consistency_score=consistency_score,
                fairness_score=fairness_score,
                trust_score=trust_eval.overallTrustScore
            )
            db.add(log_entry)
            db.commit()
            db.close()
        except Exception as db_err:
            print(f"Warning: Failed to save to database: {db_err}")
        
        # 8. Response
        return LoanPredictionResponse(
            prediction=prediction_str,
            probability=float(prob),
            confidenceScore=float(prob) if pred == 1 else float(1 - prob),
            modelVersion="v1",
            shap=shap_exp,
            lime=lime_exp,
            trustScore=trust_eval,
            solvencyCheck=solvency_check
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@router.post("/generate-pdf")
async def generate_pdf_report(request: GenerateReportRequest):
    try:
        applicant_data = request.applicantData.model_dump()
        prediction_result = request.predictionResult.model_dump()
        pdf_bytes = generate_loan_report_pdf(applicant_data, prediction_result)
        
        status_slug = "Sanction" if prediction_result.get("prediction") == "Approved" else "Status_Advisory"
        filename = f"TrustFin_Bank_{status_slug}_Letter.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

