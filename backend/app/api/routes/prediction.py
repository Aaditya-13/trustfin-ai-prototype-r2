from fastapi import APIRouter, HTTPException, Response, Depends
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import joblib
import pandas as pd
import numpy as np
import json
import os
import hashlib
from backend.app.api.schemas import (
    LoanApplicationRequest, 
    LoanPredictionResponse, 
    SolvencyCheckResult, 
    GenerateReportRequest,
    EvaluationSummaryItem,
    EvaluationDetailResponse
)
from backend.app.db.session import get_db
from backend.app.db.models import PredictionLog
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

def generate_dossier_id(input_data: dict) -> str:
    """
    Generates an institutional dossier tracking code: TF-YYYYMMDD-XXXX
    Combines today's date with a 4-character deterministic applicant hash.
    """
    today_str = datetime.now().strftime("%Y%m%d")
    serialized = json.dumps(input_data, sort_keys=True, default=str)
    hash_hex = hashlib.sha256(serialized.encode("utf-8")).hexdigest()[:4].upper()
    return f"TF-{today_str}-{hash_hex}"


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
async def predict_loan(request: LoanApplicationRequest, db: Session = Depends(get_db)):
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
        
        dossier_id = generate_dossier_id(input_data)
        confidence_score = float(prob) if pred == 1 else float(1 - prob)
        
        # 7. Construct Response Object
        response_obj = LoanPredictionResponse(
            prediction=prediction_str,
            probability=float(prob),
            confidenceScore=confidence_score,
            modelVersion="v1",
            shap=shap_exp,
            lime=lime_exp,
            trustScore=trust_eval,
            solvencyCheck=solvency_check,
            dossierId=dossier_id
        )
        
        # Derive rating label from score
        if trust_eval.overallTrustScore >= 0.75:
            trust_rating = "HIGH TRUST"
        elif trust_eval.overallTrustScore >= 0.50:
            trust_rating = "MODERATE TRUST"
        else:
            trust_rating = "LOW TRUST"

        # 8. Save to Database (PostgreSQL with SQLite fallback)
        try:
            log_entry = PredictionLog(
                dossier_id=dossier_id,
                applicant_age=input_data.get('Age'),
                applicant_income=input_data.get('Applicant_Income'),
                loan_amount=input_data.get('Loan_Amount'),
                raw_input_data=input_data,
                prediction=prediction_str,
                probability=float(prob),
                confidence_score=confidence_score,
                solvency_status=solvency_status,
                dti_ratio=float(dti_ratio),
                monthly_emi=float(monthly_emi),
                shap_explanation=shap_exp.model_dump(),
                lime_explanation=lime_exp.model_dump(),
                faithfulness_score=faithfulness_score,
                stability_score=stability_score,
                consistency_score=consistency_score,
                fairness_score=fairness_score,
                trust_score=trust_eval.overallTrustScore,
                trust_rating=trust_rating,
                full_response=response_obj.model_dump()
            )
            db.add(log_entry)
            db.commit()
            db.refresh(log_entry)
            response_obj.evaluationId = log_entry.id
        except Exception as db_err:
            print(f"Warning: Failed to save to database: {db_err}")
            try:
                db.rollback()
            except Exception:
                pass
        
        return response_obj
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@router.get("/evaluations", response_model=List[EvaluationSummaryItem])
def list_evaluations(limit: int = 50, db: Session = Depends(get_db)):
    """
    Returns recent loan evaluation audit records stored in the database.
    """
    try:
        records = db.query(PredictionLog).order_by(PredictionLog.id.desc()).limit(limit).all()
        
        summary_list = []
        for r in records:
            timestamp_str = r.timestamp.strftime("%Y-%m-%d %H:%M:%S") if r.timestamp else ""
            summary_list.append(EvaluationSummaryItem(
                id=r.id,
                dossierId=r.dossier_id or f"TF-EVAL-{r.id:04d}",
                timestamp=timestamp_str,
                applicantAge=r.applicant_age,
                applicantIncome=r.applicant_income,
                loanAmount=r.loan_amount,
                prediction=r.prediction or "Unknown",
                probability=r.probability or 0.0,
                confidenceScore=r.confidence_score,
                solvencyStatus=r.solvency_status,
                dtiRatio=r.dti_ratio,
                monthlyEMI=r.monthly_emi,
                trustScore=r.trust_score or 0.0,
                trustRating=r.trust_rating
            ))
        return summary_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch evaluations: {str(e)}")

@router.get("/evaluations/{evaluation_id}", response_model=EvaluationDetailResponse)
def get_evaluation_detail(evaluation_id: int, db: Session = Depends(get_db)):
    """
    Retrieves full evaluation details (input dossier + explanation output) for a past assessment.
    """
    try:
        record = db.query(PredictionLog).filter(PredictionLog.id == evaluation_id).first()
        if not record:
            raise HTTPException(status_code=404, detail=f"Evaluation record #{evaluation_id} not found.")
            
        timestamp_str = record.timestamp.strftime("%Y-%m-%d %H:%M:%S") if record.timestamp else ""
        
        # If full_response is stored, reconstitute it
        if record.full_response:
            pred_result = LoanPredictionResponse.model_validate(record.full_response)
            pred_result.evaluationId = record.id
            if record.dossier_id:
                pred_result.dossierId = record.dossier_id
        else:
            # Fallback reconstruction
            pred_result = LoanPredictionResponse(
                prediction=record.prediction,
                probability=record.probability or 0.5,
                confidenceScore=record.confidence_score or record.probability or 0.5,
                modelVersion="v1",
                shap=record.shap_explanation,
                lime=record.lime_explanation,
                trustScore={
                    "overallTrustScore": record.trust_score or 0.0,
                    "rating": record.trust_rating or "N/A",
                    "rationale": "Retrieved from stored audit log",
                    "faithfulness": record.faithfulness_score or 0.0,
                    "stability": record.stability_score or 0.0,
                    "consistency": record.consistency_score or 0.0,
                    "fairness": record.fairness_score or 0.0
                },
                evaluationId=record.id,
                dossierId=record.dossier_id
            )
            
        return EvaluationDetailResponse(
            id=record.id,
            dossierId=record.dossier_id or f"TF-EVAL-{record.id:04d}",
            timestamp=timestamp_str,
            applicantData=record.raw_input_data or {},
            predictionResult=pred_result
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load evaluation detail: {str(e)}")

@router.delete("/evaluations/{evaluation_id}")
def delete_evaluation_record(evaluation_id: int, db: Session = Depends(get_db)):
    """
    Deletes an evaluation record from the database.
    """
    try:
        record = db.query(PredictionLog).filter(PredictionLog.id == evaluation_id).first()
        if not record:
            raise HTTPException(status_code=404, detail=f"Evaluation record #{evaluation_id} not found.")
        db.delete(record)
        db.commit()
        return {"status": "success", "message": f"Dossier #{evaluation_id} deleted successfully."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete evaluation record: {str(e)}")

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


