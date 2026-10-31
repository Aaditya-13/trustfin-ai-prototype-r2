from fastapi import APIRouter, HTTPException, Response, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
import joblib
import pandas as pd
import numpy as np
import json
import os
import hashlib
import uuid
import io
import csv
from backend.app.api.schemas import (
    LoanApplicationRequest, 
    LoanPredictionResponse, 
    SolvencyCheckResult, 
    GenerateReportRequest,
    EvaluationSummaryItem,
    EvaluationDetailResponse,
    BatchUploadResponse,
    BatchSummaryItem,
    BatchDetailResponse,
    FlawedRecordItem,
    BatchUploadJsonRequest
)
from backend.app.db.session import get_db
from backend.app.db.models import PredictionLog, BatchUpload
from backend.app.reporting.pdf_generator import generate_loan_report_pdf
from backend.app.ml.preprocessing import add_financial_features
from backend.app.ml.registry import registry
from backend.app.explainability.shap_explainer import SHAPExplainer
from backend.app.explainability.lime_explainer import LIMEExplainer
from backend.app.validation.faithfulness import calculate_faithfulness
from backend.app.validation.stability import calculate_stability
from backend.app.validation.consistency import calculate_consistency
from backend.app.validation.fairness import calculate_counterfactual_fairness
from backend.app.trust.trust_score import calculate_trust_score

router = APIRouter()

def generate_dossier_id(input_data: dict, is_batch: bool = False) -> str:
    """
    Generates H-/P- references for individual applications and BH-/BP- for batch rows.
    Combines today's date with a unique hex suffix to ensure database record uniqueness.
    """
    today_str = datetime.now().strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    loan_type = str(input_data.get("loan_type", "home_loan")).lower()
    product_prefix = "P" if "personal" in loan_type else "H"
    source_prefix = "B" if is_batch else ""
    return f"{source_prefix}{product_prefix}-{today_str}-{unique_suffix}"


def generate_applicant_seed(input_data: dict) -> int:
    """
    Derives a deterministic, cryptographically stable 32-bit integer seed
    from the applicant input features.
    Ensures identical inputs always produce identical random sequences for LIME
    sampling and stability perturbations, preventing artificial score drift on re-evaluations.
    """
    filtered = {k: v for k, v in input_data.items() if v is not None}
    legacy_core_keys = ['Age', 'Applicant_Income', 'Coapplicant_Income', 'Credit_History', 'Dependents', 'Education', 'Employment_Status', 'Gender', 'Loan_Amount', 'Loan_Term', 'Married', 'Property_Area']
    if all(k in filtered for k in legacy_core_keys) and not filtered.get('CIBIL_Score'):
        core = {k: filtered[k] for k in legacy_core_keys}
        serialized = json.dumps(core, sort_keys=True, default=str)
    else:
        serialized = json.dumps(filtered, sort_keys=True, default=str)
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

def generate_batch_id(loan_type: Optional[str] = None) -> str:
    """
    Generates BH-/BP- product-specific batch tracking identifiers.
    """
    today_str = datetime.now().strftime("%Y%m%d")
    rnd_suffix = uuid.uuid4().hex[:4].upper()
    product_prefix = "P" if loan_type and "personal" in loan_type.lower() else "H"
    return f"B{product_prefix}-{today_str}-{rnd_suffix}"


def validate_batch_record(raw_row: dict, row_idx: int, default_loan_type: Optional[str] = None):
    """Validate and normalize one product-specific batch row."""
    normalized = {
        str(key).strip().lower(): value
        for key, value in raw_row.items()
        if key is not None
    }
    errors = []

    def get_val(*aliases):
        for alias in aliases:
            value = normalized.get(alias.lower())
            if value is None:
                continue
            if isinstance(value, str):
                value = value.strip()
                if value.lower() in {"", "nan", "null", "none"}:
                    continue
            else:
                try:
                    if pd.isna(value):
                        continue
                except (TypeError, ValueError):
                    pass
            return value
        return None

    raw_type = get_val("loan_type", "loan type", "product") or default_loan_type
    if raw_type is None:
        raw_type = "personal_loan" if get_val("Loan_Purpose", "Purpose") is not None else "home_loan"
    type_key = str(raw_type).strip().lower().replace("-", "_").replace(" ", "_")
    if "personal" in type_key:
        loan_type = "personal_loan"
    elif "home" in type_key or type_key in {"mortgage", "housing"}:
        loan_type = "home_loan"
    else:
        return False, None, f"Row #{row_idx}: loan_type must be home_loan or personal_loan"

    def number(label, aliases, *, default=None, minimum=None, maximum=None, integer=False):
        value = get_val(*aliases)
        if value is None:
            if default is not None:
                return default
            errors.append(f"{label} is required")
            return None
        try:
            parsed = float(value)
            if minimum is not None and parsed < minimum:
                errors.append(f"{label} must be at least {minimum}")
            if maximum is not None and parsed > maximum:
                errors.append(f"{label} must be at most {maximum}")
            return int(parsed) if integer else parsed
        except (ValueError, TypeError):
            errors.append(f"{label} must be a valid number")
            return None

    def text_value(label, aliases, *, default=None):
        value = get_val(*aliases)
        if value is None:
            if default is not None:
                return default
            errors.append(f"{label} is required")
            return None
        return str(value).strip()

    gender_value = text_value("Gender", ("Gender",))
    gender = None
    if gender_value:
        if gender_value.lower().startswith("f"):
            gender = "Female"
        elif gender_value.lower().startswith("m"):
            gender = "Male"
        else:
            errors.append("Gender must be Male or Female")

    married_value = text_value("Married", ("Married",), default="No")
    married = "Yes" if married_value and married_value.lower() in {"yes", "y", "true", "1"} else "No"

    dependents = number("Dependents", ("Dependents",), default=0, minimum=0, maximum=10, integer=True)
    education_value = text_value("Education", ("Education",), default="Graduate")
    education = "Not Graduate" if education_value and "not" in education_value.lower() else "Graduate"

    employment_value = text_value("Employment_Status", ("Employment_Status", "EmploymentStatus", "Self_Employed"), default="Salaried")
    employment = "Self-Employed" if employment_value and "self" in employment_value.lower() else (
        "Unemployed" if employment_value and "unemploy" in employment_value.lower() else "Salaried"
    )

    applicant_income = number("Applicant_Income", ("Applicant_Income", "ApplicantIncome", "Income"), minimum=0.01)
    loan_amount = number("Loan_Amount", ("Loan_Amount", "LoanAmount", "Amount"), minimum=0.01)
    loan_term = number("Loan_Term", ("Loan_Term", "LoanTerm", "Term", "Loan_Amount_Term"), minimum=1, integer=True)
    age = number("Age", ("Age",), default=32, minimum=18, maximum=100)
    work_experience = number("Work_Experience", ("Work_Experience", "WorkExperience"), default=max(1, int((age or 32) - 22)), minimum=0, maximum=60, integer=True)
    existing_emi = number("Existing_EMI", ("Existing_EMI", "ExistingEMI"), default=0, minimum=0)
    missed_payments = number("Missed_Payments_12M", ("Missed_Payments_12M", "MissedPayments12M"), default=0, minimum=0, maximum=12, integer=True)

    cibil_value = get_val("CIBIL_Score", "CIBIL", "cibil")
    if cibil_value is None:
        legacy_history = get_val("Credit_History", "CreditHistory")
        if legacy_history is not None:
            cibil_value = 750 if str(legacy_history).strip() in {"1", "1.0"} else 480
    cibil_score = number("CIBIL_Score", ("CIBIL_Score", "CIBIL", "cibil"), default=cibil_value, minimum=300, maximum=900, integer=True)
    if cibil_value is not None and cibil_score is None and not any("CIBIL_Score" in error for error in errors):
        errors.append("CIBIL_Score must be a valid score from 300 to 900")

    cleaned = {
        "loan_type": loan_type,
        "Gender": gender,
        "Married": married,
        "Dependents": dependents,
        "Education": education,
        "Employment_Status": employment,
        "Age": age,
        "Work_Experience": work_experience,
        "Applicant_Income": applicant_income,
        "Coapplicant_Income": 0.0,
        "Existing_EMI": existing_emi,
        "Loan_Amount": loan_amount,
        "Loan_Term": loan_term,
        "CIBIL_Score": cibil_score,
        "Missed_Payments_12M": missed_payments,
    }

    if loan_type == "home_loan":
        coapplicant_income = number("Coapplicant_Income", ("Coapplicant_Income", "CoapplicantIncome", "Coapplicant"), default=0, minimum=0)
        property_value = number("Property_Value", ("Property_Value", "PropertyValue"), default=(loan_amount / 0.75 if loan_amount else None), minimum=0.01)
        area_value = text_value("Property_Area", ("Property_Area", "PropertyArea", "Area"), default="Urban")
        if area_value and "semi" in area_value.lower():
            property_area = "Semiurban"
        elif area_value and "rur" in area_value.lower():
            property_area = "Rural"
        else:
            property_area = "Urban"
        cleaned.update({
            "Coapplicant_Income": coapplicant_income,
            "Property_Value": property_value,
            "Property_Area": property_area,
        })
    else:
        purpose = text_value("Loan_Purpose", ("Loan_Purpose", "LoanPurpose", "Purpose"), default="Medical_Emergency")
        utilization = number("Credit_Card_Utilization", ("Credit_Card_Utilization", "CreditCardUtilization", "Credit_Card_Usage", "CC_Utilization"), default=0.3, minimum=0, maximum=100)
        if utilization is not None and utilization > 1:
            utilization /= 100
        cleaned.update({
            "Loan_Purpose": purpose,
            "Credit_Card_Utilization": utilization,
        })

    if errors:
        return False, None, f"Row #{row_idx}: {'; '.join(errors)}"
    return True, cleaned, None


def evaluate_single_record(input_data: dict, is_batch: bool = False):
    """
    Core end-to-end evaluation: Solvency check, ML prediction, SHAP, LIME,
    4-Pillar Trust Scores, and database dictionary preparation.
    Supports multi-product routing (Home Loan vs Personal Loan).
    """
    product_id = input_data.get('loan_type')
    if not product_id:
        if 'CIBIL_Score' in input_data and input_data['CIBIL_Score'] is not None:
            product_id = 'home_loan'
        else:
            product_id = 'legacy' if 'legacy' in registry.pipelines else 'home_loan'
        
    pipe = registry.get_pipeline(product_id)
    
    # 1. Normalize and Enrich
    normalized_data = registry.normalize_input(pipe.product_id, input_data)
    input_df = pd.DataFrame([normalized_data])
    
    if pipe.product_id == 'legacy':
        input_df_enriched = pipe.feature_fn(input_df)[pipe.raw_features]
        monthly_emi = float(normalized_data.get('Loan_Amount', 0)) / max(1.0, float(normalized_data.get('Loan_Term', 1)))
        total_income = float(normalized_data.get('Applicant_Income', 0) + normalized_data.get('Coapplicant_Income', 0))
        dti_ratio = monthly_emi / max(1.0, total_income)
        dti_status_ratio = dti_ratio
        orig_values = input_data.copy()
        orig_values['Monthly_EMI'] = monthly_emi
        orig_values['DTI_Ratio'] = dti_ratio
    else:
        input_df_enriched = pipe.feature_fn(input_df)
        monthly_emi = float(input_df_enriched['Monthly_EMI'].iloc[0])
        total_income = float(normalized_data['Applicant_Income'] + normalized_data.get('Coapplicant_Income', 0))
        dti_ratio = float(input_df_enriched['FOIR'].iloc[0])
        dti_status_ratio = dti_ratio
        orig_values = normalized_data.copy()
        orig_values['Monthly_EMI'] = monthly_emi
        orig_values['DTI_Ratio'] = dti_ratio
        orig_values['FOIR'] = dti_ratio

    transformed_instance = pipe.preprocessor.transform(input_df_enriched)[0]

    # 2. Solvency / FOIR Guardrail Calculation (Deterministic Banking Limit)
    existing_emi = float(normalized_data.get('Existing_EMI', 0.0) or 0.0)
    total_obligation = round(monthly_emi + existing_emi, 2)
    net_disposable = round(total_income - total_obligation, 2)
    dti_percent = f"{dti_status_ratio * 100:.1f}%"

    if dti_status_ratio <= 0.35:
        solvency_status = "OPTIMAL"
        is_solvent = True
        override_warning = None
    elif dti_status_ratio <= 0.50:
        solvency_status = "MODERATE"
        is_solvent = True
        override_warning = f"Moderate Debt Burden: Total obligations of ₹{total_obligation:,.0f}/mo represent {dti_percent} of monthly income (35%–50% zone)."
    else:
        solvency_status = "INSOLVENT"
        is_solvent = False
        if existing_emi > 0:
            override_warning = f"CRITICAL FINANCIAL RISK: Total monthly debt obligation of ₹{total_obligation:,.0f}/mo (including ₹{existing_emi:,.0f} existing debt) represents {dti_percent} of income, exceeding the 50% regulatory ceiling."
        else:
            override_warning = f"CRITICAL FINANCIAL RISK: Monthly repayment obligation (₹{monthly_emi:,.0f}/mo) represents {dti_percent} of income, exceeding the 50% regulatory limit."

    solvency_check = SolvencyCheckResult(
        monthlyEMI=round(monthly_emi, 2),
        existingEMI=round(existing_emi, 2),
        totalMonthlyObligation=total_obligation,
        netDisposableIncome=net_disposable,
        totalIncome=round(total_income, 2),
        dtiRatio=round(dti_ratio, 4),
        dtiPercent=dti_percent,
        status=solvency_status,
        isSolvent=is_solvent,
        overrideWarning=override_warning
    )

    # 3. ML Model Prediction
    transformed_2d = transformed_instance.reshape(1, -1)
    pred = pipe.model.predict(transformed_2d)[0]
    prob = pipe.model.predict_proba(transformed_2d)[0][1]
    prediction_str = "Approved" if pred == 1 else "Rejected"

    # 4. Explainability (SHAP & LIME)
    applicant_seed = generate_applicant_seed(input_data)
    shap_exp = pipe.shap_explainer.explain_instance(transformed_instance, original_values=orig_values)
    lime_exp = pipe.lime_explainer.explain_instance(
        pipe.model.predict_proba, 
        transformed_instance, 
        original_values=orig_values,
        seed=applicant_seed
    )

    # 5. 4-Pillar Validation Suite
    faithfulness_score = calculate_faithfulness(pipe.model, transformed_instance, shap_exp, pipe.feature_names)

    stability_rng = np.random.RandomState(applicant_seed)
    noise = stability_rng.normal(0, 0.01, size=transformed_instance.shape)
    perturbed_instance = transformed_instance + noise
    shap_exp_perturbed = pipe.shap_explainer.explain_instance(perturbed_instance, original_values=orig_values)
    stability_score = calculate_stability(shap_exp, shap_exp_perturbed)

    consistency_score = calculate_consistency(shap_exp, lime_exp, top_k=3)
    fairness_score = calculate_counterfactual_fairness(
        pipe.model, 
        pipe.preprocessor, 
        normalized_data if pipe.product_id != 'legacy' else input_data, 
        pipe.raw_features, 
        sensitive_col='Gender',
        feature_fn=pipe.feature_fn
    )

    trust_eval = calculate_trust_score(faithfulness_score, stability_score, consistency_score, fairness_score)
    dossier_id = generate_dossier_id(normalized_data, is_batch=is_batch)
    confidence_score = float(prob) if pred == 1 else float(1 - prob)

    model_version_str = "v1" if pipe.product_id == 'legacy' else f"{pipe.product_id}_v2"

    response_obj = LoanPredictionResponse(
        prediction=prediction_str,
        probability=float(prob),
        confidenceScore=confidence_score,
        modelVersion=model_version_str,
        shap=shap_exp,
        lime=lime_exp,
        trustScore=trust_eval,
        solvencyCheck=solvency_check,
        dossierId=dossier_id
    )

    if trust_eval.overallTrustScore >= 0.85:
        trust_rating = "HIGH TRUST"
    elif trust_eval.overallTrustScore >= 0.70:
        trust_rating = "MODERATE TRUST"
    else:
        trust_rating = "LOW TRUST"

    db_fields = {
        "dossier_id": dossier_id,
        "loan_type": pipe.product_id,
        "cibil_score": normalized_data.get('CIBIL_Score'),
        "applicant_age": normalized_data.get('Age'),
        "applicant_income": normalized_data.get('Applicant_Income'),
        "loan_amount": normalized_data.get('Loan_Amount'),
        "raw_input_data": normalized_data,
        "prediction": prediction_str,
        "probability": float(prob),
        "confidence_score": confidence_score,
        "solvency_status": solvency_status,
        "dti_ratio": float(dti_ratio),
        "monthly_emi": float(monthly_emi),
        "shap_explanation": shap_exp.model_dump(),
        "lime_explanation": lime_exp.model_dump(),
        "faithfulness_score": faithfulness_score,
        "stability_score": stability_score,
        "consistency_score": consistency_score,
        "fairness_score": fairness_score,
        "trust_score": trust_eval.overallTrustScore,
        "trust_rating": trust_rating,
        "full_response": response_obj.model_dump()
    }
    return response_obj, db_fields


def process_rows_into_batch(rows: list, filename: str, db: Session, default_loan_type: Optional[str] = None) -> BatchUploadResponse:
    """
    Ingests raw rows, trashes flawed rows with explicit errors, processes valid rows
    through ML/XAI pipeline, persists to database, and creates a BatchUpload log.
    """
    if model is None:
        raise HTTPException(status_code=500, detail="Models not loaded properly.")

    inferred_loan_type = default_loan_type
    if inferred_loan_type is None and rows:
        first_row = {str(key).strip().lower(): value for key, value in rows[0].items() if key is not None}
        inferred_loan_type = first_row.get("loan_type") or first_row.get("loan type")
        if inferred_loan_type is None:
            inferred_loan_type = "personal_loan" if first_row.get("loan_purpose") else "home_loan"
    batch_id = generate_batch_id(inferred_loan_type)
    now_ts = datetime.now(timezone.utc)
    now_str = now_ts.strftime("%Y-%m-%d %H:%M:%S")

    total_records = len(rows)
    valid_count = 0
    flawed_count = 0

    flawed_list: List[FlawedRecordItem] = []
    processed_list: List[LoanPredictionResponse] = []
    loan_types = set()

    approved_count = 0
    rejected_count = 0
    trust_scores = []

    for idx, raw_row in enumerate(rows, start=1):
        is_valid, cleaned_data, err_reason = validate_batch_record(raw_row, idx, default_loan_type)

        if not is_valid:
            flawed_count += 1
            flawed_list.append(FlawedRecordItem(
                row=idx,
                rawData={str(k): str(v) for k, v in raw_row.items() if v is not None and not pd.isna(v)},
                errorReason=err_reason
            ))
            continue

        try:
            response_obj, db_fields = evaluate_single_record(cleaned_data, is_batch=True)
            loan_types.add(db_fields["loan_type"])
            db_fields["batch_id"] = batch_id

            log_entry = PredictionLog(**db_fields)
            db.add(log_entry)
            db.flush()
            response_obj.evaluationId = log_entry.id

            processed_list.append(response_obj)
            valid_count += 1

            if response_obj.prediction == "Approved":
                approved_count += 1
            else:
                rejected_count += 1
            trust_scores.append(response_obj.trustScore.overallTrustScore)

        except Exception as eval_err:
            flawed_count += 1
            flawed_list.append(FlawedRecordItem(
                row=idx,
                rawData={str(k): str(v) for k, v in raw_row.items() if v is not None and not pd.isna(v)},
                errorReason=f"Row #{idx}: Internal evaluation error - {str(eval_err)}"
            ))

    avg_trust = round(float(np.mean(trust_scores)), 4) if trust_scores else 0.0
    batch_loan_type = next(iter(loan_types)) if len(loan_types) == 1 else ("mixed" if loan_types else default_loan_type or "unknown")
    summary_dict = {
        "approvedCount": approved_count,
        "rejectedCount": rejected_count,
        "averageTrustScore": avg_trust
    }

    try:
        batch_record = BatchUpload(
            batch_id=batch_id,
            loan_type=batch_loan_type,
            filename=filename,
            timestamp=now_ts,
            total_records=total_records,
            valid_records=valid_count,
            flawed_records=flawed_count,
            flawed_data=[item.model_dump() for item in flawed_list],
            summary=summary_dict
        )
        db.add(batch_record)
        db.commit()
    except Exception as db_err:
        print(f"Warning: Failed to save BatchUpload record: {db_err}")
        try:
            db.rollback()
        except Exception:
            pass

    return BatchUploadResponse(
        batchId=batch_id,
        filename=filename,
        timestamp=now_str,
        totalRecords=total_records,
        validRecords=valid_count,
        flawedRecords=flawed_count,
        flawedData=flawed_list,
        processedResults=processed_list,
        summary=summary_dict
    )


@router.post("/predict", response_model=LoanPredictionResponse)
async def predict_loan(request: LoanApplicationRequest, db: Session = Depends(get_db)):
    if model is None:
        raise HTTPException(status_code=500, detail="Models not loaded properly.")
    try:
        input_data = request.model_dump()
        response_obj, db_fields = evaluate_single_record(input_data)

        try:
            log_entry = PredictionLog(**db_fields)
            db.add(log_entry)
            db.commit()
            db.refresh(log_entry)
            response_obj.evaluationId = log_entry.id
        except Exception as db_err:
            print(f"Warning: Failed to save single evaluation to database: {db_err}")
            try:
                db.rollback()
            except Exception:
                pass

        return response_obj
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.post("/predict-batch", response_model=BatchUploadResponse)
async def predict_batch_file(
    file: UploadFile = File(...),
    loan_type: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Ingests an uploaded CSV file, filters flawed records, and executes full ML/XAI pipeline on valid rows.
    """
    try:
        content = await file.read()
        text_stream = io.StringIO(content.decode("utf-8-sig", errors="replace"))
        reader = csv.DictReader(text_stream)
        rows = [row for row in reader]
        if not rows:
            raise HTTPException(status_code=400, detail="The uploaded CSV file is empty.")
        return process_rows_into_batch(rows, file.filename or "uploaded_applications.csv", db, loan_type)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process CSV file: {str(e)}")


@router.post("/predict-batch-json", response_model=BatchUploadResponse)
def predict_batch_json(request: BatchUploadJsonRequest, db: Session = Depends(get_db)):
    """
    Evaluates preset demo batches or programmatic JSON row lists.
    """
    if not request.rows:
        raise HTTPException(status_code=400, detail="No application records provided in batch request.")
    return process_rows_into_batch(request.rows, request.filename or "preset_batch.csv", db, request.loan_type)


@router.get("/batches", response_model=List[BatchSummaryItem])
def list_batches(limit: int = 50, db: Session = Depends(get_db)):
    """
    Lists historical batch upload jobs with summary counts.
    """
    try:
        records = db.query(BatchUpload).order_by(BatchUpload.id.desc()).limit(limit).all()
        items = []
        for b in records:
            ts_str = b.timestamp.strftime("%Y-%m-%d %H:%M:%S") if b.timestamp else ""
            summ = b.summary or {}
            items.append(BatchSummaryItem(
                id=b.id,
                batchId=b.batch_id,
                loanType=b.loan_type,
                filename=b.filename,
                timestamp=ts_str,
                totalRecords=b.total_records,
                validRecords=b.valid_records,
                flawedRecords=b.flawed_records,
                approvedCount=summ.get("approvedCount", 0),
                rejectedCount=summ.get("rejectedCount", 0)
            ))
        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch batches: {str(e)}")


@router.get("/batches/{batch_id}", response_model=BatchDetailResponse)
def get_batch_detail(batch_id: str, db: Session = Depends(get_db)):
    """
    Returns full details of a specific batch run including both processed applications and flawed records.
    """
    try:
        b = db.query(BatchUpload).filter(BatchUpload.batch_id == batch_id).first()
        if not b:
            raise HTTPException(status_code=404, detail=f"Batch '{batch_id}' not found.")

        # Linked individual evaluations
        eval_records = db.query(PredictionLog).filter(PredictionLog.batch_id == batch_id).order_by(PredictionLog.id.asc()).all()

        eval_summaries = []
        for r in eval_records:
            ts_str = r.timestamp.strftime("%Y-%m-%d %H:%M:%S") if r.timestamp else ""
            eval_summaries.append(EvaluationSummaryItem(
                id=r.id,
                dossierId=r.dossier_id or f"TF-EVAL-{r.id:04d}",
                timestamp=ts_str,
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

        ts_str = b.timestamp.strftime("%Y-%m-%d %H:%M:%S") if b.timestamp else ""
        return BatchDetailResponse(
            id=b.id,
            batchId=b.batch_id,
            loanType=b.loan_type,
            filename=b.filename,
            timestamp=ts_str,
            totalRecords=b.total_records,
            validRecords=b.valid_records,
            flawedRecords=b.flawed_records,
            flawedData=b.flawed_data or [],
            processedEvaluations=eval_summaries,
            summary=b.summary or {}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch batch detail: {str(e)}")


@router.delete("/batches/{batch_id}")
def delete_batch(batch_id: str, db: Session = Depends(get_db)):
    """
    Deletes a batch upload record and all associated individual application logs.
    """
    try:
        b = db.query(BatchUpload).filter(BatchUpload.batch_id == batch_id).first()
        if not b:
            raise HTTPException(status_code=404, detail=f"Batch '{batch_id}' not found.")

        db.query(PredictionLog).filter(PredictionLog.batch_id == batch_id).delete()
        db.delete(b)
        db.commit()
        return {"status": "success", "message": f"Batch '{batch_id}' and all associated records deleted."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete batch: {str(e)}")


def get_product_batch_rows(loan_type: str):
    if loan_type == "home_loan":
        return [
            {"loan_type": "home_loan", "Gender": "Female", "Married": "Yes", "Dependents": 1, "Education": "Graduate", "Employment_Status": "Salaried", "Age": 35, "Work_Experience": 10, "Applicant_Income": 80000, "Coapplicant_Income": 20000, "Existing_EMI": 6000, "Loan_Amount": 3500000, "Loan_Term": 240, "Property_Value": 5000000, "Property_Area": "Urban", "CIBIL_Score": 810, "Missed_Payments_12M": 0},
            {"loan_type": "home_loan", "Gender": "Male", "Married": "No", "Dependents": 2, "Education": "Not Graduate", "Employment_Status": "Self-Employed", "Age": 42, "Work_Experience": 6, "Applicant_Income": 40000, "Coapplicant_Income": 0, "Existing_EMI": 8000, "Loan_Amount": 2200000, "Loan_Term": 240, "Property_Value": 2800000, "Property_Area": "Rural", "CIBIL_Score": 535, "Missed_Payments_12M": 2},
            {"loan_type": "home_loan", "Gender": "Male", "Married": "Yes", "Dependents": 1, "Education": "Graduate", "Employment_Status": "Salaried", "Age": 30, "Work_Experience": 7, "Applicant_Income": 38000, "Coapplicant_Income": 0, "Existing_EMI": 7000, "Loan_Amount": 3200000, "Loan_Term": 180, "Property_Value": 4200000, "Property_Area": "Semiurban", "CIBIL_Score": 785, "Missed_Payments_12M": 0},
            {"loan_type": "home_loan", "Gender": "Female", "Married": "Yes", "Dependents": 1, "Education": "Graduate", "Employment_Status": "Salaried", "Age": 31, "Work_Experience": 6, "Applicant_Income": 62000, "Coapplicant_Income": 18000, "Existing_EMI": 5000, "Loan_Amount": 2800000, "Loan_Term": 240, "Property_Value": 3800000, "Property_Area": "Urban", "CIBIL_Score": 665, "Missed_Payments_12M": 1},
            {"loan_type": "home_loan", "Gender": "Male", "Married": "Yes", "Dependents": 2, "Education": "Graduate", "Employment_Status": "Salaried", "Age": 39, "Work_Experience": 15, "Applicant_Income": 95000, "Coapplicant_Income": 35000, "Existing_EMI": 9000, "Loan_Amount": 5600000, "Loan_Term": 300, "Property_Value": 7600000, "Property_Area": "Urban", "CIBIL_Score": 825, "Missed_Payments_12M": 0},
            {"loan_type": "home_loan", "Gender": "Female", "Married": "No", "Dependents": 0, "Education": "Graduate", "Employment_Status": "Self-Employed", "Age": 34, "Work_Experience": 9, "Applicant_Income": 72000, "Coapplicant_Income": 0, "Existing_EMI": 6000, "Loan_Amount": 2600000, "Loan_Term": 180, "Property_Value": 3600000, "Property_Area": "Semiurban", "CIBIL_Score": 745, "Missed_Payments_12M": 0},
            {"loan_type": "home_loan", "Gender": "Male", "Married": "Yes", "Dependents": 3, "Education": "Graduate", "Employment_Status": "Salaried", "Age": 46, "Work_Experience": 20, "Applicant_Income": 68000, "Coapplicant_Income": 24000, "Existing_EMI": 11000, "Loan_Amount": 4100000, "Loan_Term": 240, "Property_Value": 5900000, "Property_Area": "Rural", "CIBIL_Score": 690, "Missed_Payments_12M": 1},
            {"loan_type": "home_loan", "Gender": "Female", "Married": "Yes", "Dependents": 1, "Education": "Not Graduate", "Employment_Status": "Salaried", "Age": 28, "Work_Experience": 5, "Applicant_Income": 54000, "Coapplicant_Income": 16000, "Existing_EMI": 3000, "Loan_Amount": 2400000, "Loan_Term": 240, "Property_Value": 3400000, "Property_Area": "Semiurban", "CIBIL_Score": 715, "Missed_Payments_12M": 0},
            {"loan_type": "home_loan", "Gender": "Male", "Married": "No", "Dependents": 1, "Education": "Graduate", "Employment_Status": "Self-Employed", "Age": 41, "Work_Experience": 14, "Applicant_Income": None, "Coapplicant_Income": 0, "Existing_EMI": 5000, "Loan_Amount": 3000000, "Loan_Term": 240, "Property_Value": 4200000, "Property_Area": "Urban", "CIBIL_Score": 730, "Missed_Payments_12M": 0},
        ]

    if loan_type == "personal_loan":
        return [
            {"loan_type": "personal_loan", "Gender": "Female", "Married": "No", "Dependents": 0, "Education": "Graduate", "Employment_Status": "Salaried", "Age": 29, "Work_Experience": 6, "Applicant_Income": 85000, "Existing_EMI": 4000, "Loan_Amount": 350000, "Loan_Term": 24, "Loan_Purpose": "Medical_Emergency", "Credit_Card_Utilization": 0.10, "CIBIL_Score": 795, "Missed_Payments_12M": 0},
            {"loan_type": "personal_loan", "Gender": "Male", "Married": "Yes", "Dependents": 2, "Education": "Not Graduate", "Employment_Status": "Self-Employed", "Age": 44, "Work_Experience": 12, "Applicant_Income": 38000, "Existing_EMI": 11000, "Loan_Amount": 450000, "Loan_Term": 36, "Loan_Purpose": "Debt_Consolidation", "Credit_Card_Utilization": 0.89, "CIBIL_Score": 565, "Missed_Payments_12M": 3},
            {"loan_type": "personal_loan", "Gender": "Female", "Married": "No", "Dependents": 0, "Education": "Graduate", "Employment_Status": "Salaried", "Age": 27, "Work_Experience": 4, "Applicant_Income": 52000, "Existing_EMI": 3500, "Loan_Amount": 250000, "Loan_Term": 36, "Loan_Purpose": "Home_Renovation", "Credit_Card_Utilization": 0.42, "CIBIL_Score": 675, "Missed_Payments_12M": 0},
            {"loan_type": "personal_loan", "Gender": "Male", "Married": "Yes", "Dependents": 1, "Education": "Graduate", "Employment_Status": "Salaried", "Age": 36, "Work_Experience": 11, "Applicant_Income": 110000, "Existing_EMI": 8000, "Loan_Amount": 700000, "Loan_Term": 48, "Loan_Purpose": "Education", "Credit_Card_Utilization": 0.28, "CIBIL_Score": 770, "Missed_Payments_12M": 0},
            {"loan_type": "personal_loan", "Gender": "Male", "Married": "No", "Dependents": 0, "Education": "Graduate", "Employment_Status": "Salaried", "Age": 33, "Work_Experience": 9, "Applicant_Income": 67000, "Existing_EMI": 5500, "Loan_Amount": 300000, "Loan_Term": 24, "Loan_Purpose": "Travel", "Credit_Card_Utilization": 0.32, "CIBIL_Score": 735, "Missed_Payments_12M": 0},
            {"loan_type": "personal_loan", "Gender": "Female", "Married": "Yes", "Dependents": 1, "Education": "Graduate", "Employment_Status": "Salaried", "Age": 38, "Work_Experience": 15, "Applicant_Income": 92000, "Existing_EMI": 14000, "Loan_Amount": 600000, "Loan_Term": 48, "Loan_Purpose": "Wedding", "Credit_Card_Utilization": 0.58, "CIBIL_Score": 690, "Missed_Payments_12M": 1},
            {"loan_type": "personal_loan", "Gender": "Male", "Married": "Yes", "Dependents": 2, "Education": "Graduate", "Employment_Status": "Self-Employed", "Age": 47, "Work_Experience": 18, "Applicant_Income": 78000, "Existing_EMI": 17000, "Loan_Amount": 500000, "Loan_Term": 36, "Loan_Purpose": "Debt_Consolidation", "Credit_Card_Utilization": 0.76, "CIBIL_Score": 625, "Missed_Payments_12M": 2},
            {"loan_type": "personal_loan", "Gender": "Female", "Married": "No", "Dependents": 0, "Education": "Graduate", "Employment_Status": "Salaried", "Age": 26, "Work_Experience": 4, "Applicant_Income": 48000, "Existing_EMI": 2000, "Loan_Amount": 180000, "Loan_Term": 12, "Loan_Purpose": "Education", "Credit_Card_Utilization": 0.18, "CIBIL_Score": 760, "Missed_Payments_12M": 0},
            {"loan_type": "personal_loan", "Gender": "Female", "Married": "Yes", "Dependents": 2, "Education": "Graduate", "Employment_Status": "Salaried", "Age": 35, "Work_Experience": 12, "Applicant_Income": None, "Existing_EMI": 6500, "Loan_Amount": 320000, "Loan_Term": 24, "Loan_Purpose": "Home_Renovation", "Credit_Card_Utilization": 0.36, "CIBIL_Score": 740, "Missed_Payments_12M": 0},
        ]

    raise HTTPException(status_code=404, detail="Unknown loan product. Use home_loan or personal_loan.")


def get_product_sample_csv_rows(loan_type: str):
    """Return a ten-record CSV, keeping the demo preset at eight regular cases plus its validation case."""
    rows = get_product_batch_rows(loan_type)
    if loan_type == "home_loan":
        rows.append({"loan_type": "home_loan", "Gender": "Female", "Married": "Yes", "Dependents": 2, "Education": "Graduate", "Employment_Status": "Salaried", "Age": 37, "Work_Experience": 13, "Applicant_Income": 88000, "Coapplicant_Income": 26000, "Existing_EMI": 7500, "Loan_Amount": 4600000, "Loan_Term": 240, "Property_Value": 6400000, "Property_Area": "Semiurban", "CIBIL_Score": 790, "Missed_Payments_12M": 0})
    elif loan_type == "personal_loan":
        rows.append({"loan_type": "personal_loan", "Gender": "Male", "Married": "No", "Dependents": 0, "Education": "Graduate", "Employment_Status": "Salaried", "Age": 32, "Work_Experience": 9, "Applicant_Income": 74000, "Existing_EMI": 6000, "Loan_Amount": 380000, "Loan_Term": 36, "Loan_Purpose": "Travel", "Credit_Card_Utilization": 0.24, "CIBIL_Score": 755, "Missed_Payments_12M": 0})
    return rows


@router.get("/batch-sample-csv")
def download_sample_batch_csv(loan_type: str = "home_loan"):
    loan_type = loan_type.strip().lower().replace("-", "_").replace(" ", "_")
    rows = get_product_sample_csv_rows(loan_type)
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)
    filename = f"trustfin_{loan_type}_sample.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/batch-presets/{preset_id}")
def get_batch_preset(preset_id: str):
    loan_type = preset_id.strip().lower().replace("-", "_").replace(" ", "_")
    rows = get_product_batch_rows(loan_type)
    title = "Home Loan Portfolio" if loan_type == "home_loan" else "Personal Loan Portfolio"
    return {"presetId": loan_type, "name": title, "rows": rows}

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
                loanType=getattr(r, 'loan_type', 'home_loan') or 'home_loan',
                cibilScore=getattr(r, 'cibil_score', None),
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


