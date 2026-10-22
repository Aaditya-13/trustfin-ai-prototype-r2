from fastapi import APIRouter, HTTPException, Response, Depends, UploadFile, File
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
    Generates an institutional dossier tracking code: TF-YYYYMMDD-XXXXXX
    Combines today's date with a unique hex suffix to ensure database record uniqueness.
    """
    today_str = datetime.now().strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    return f"TF-{today_str}-{unique_suffix}"


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

def generate_batch_id() -> str:
    """
    Generates an institutional batch tracking identifier: BATCH-YYYYMMDD-XXXX
    """
    today_str = datetime.now().strftime("%Y%m%d")
    rnd_suffix = uuid.uuid4().hex[:4].upper()
    return f"BATCH-{today_str}-{rnd_suffix}"


def validate_batch_record(raw_row: dict, row_idx: int):
    """
    Validates a raw row from CSV or JSON against required credit scoring schema.
    Trashes flawed or incomplete records and explains exact failure reasons.
    Returns: (is_valid: bool, cleaned_data: dict or None, error_reason: str or None)
    """
    normalized = {}
    for k, v in raw_row.items():
        if k is not None:
            normalized[str(k).strip().lower()] = v

    missing_fields = []

    def get_val(*aliases):
        for alias in aliases:
            al = alias.lower()
            if al in normalized and normalized[al] is not None:
                val = normalized[al]
                if isinstance(val, str):
                    val = val.strip()
                    if val == "" or val.lower() == "nan" or val.lower() == "null" or val.lower() == "none":
                        continue
                elif pd.isna(val):
                    continue
                return val
        return None

    # 1. Gender
    gender_val = get_val("Gender")
    if not gender_val:
        missing_fields.append("Gender is required")
    else:
        g_str = str(gender_val).capitalize()
        gender = "Female" if g_str.startswith("F") else "Male"

    # 2. Married
    married_val = get_val("Married")
    if not married_val:
        missing_fields.append("Married status is required")
    else:
        m_str = str(married_val).capitalize()
        married = "Yes" if m_str in ["Yes", "Y", "True", "1"] else "No"

    # 3. Dependents
    dep_val = get_val("Dependents")
    if dep_val is None:
        missing_fields.append("Dependents count is required")
    else:
        try:
            dep_int = int(float(str(dep_val).replace("+", "")))
            dependents = max(0, min(10, dep_int))
        except (ValueError, TypeError):
            missing_fields.append("Dependents must be a valid number")

    # 4. Education
    edu_val = get_val("Education")
    if not edu_val:
        missing_fields.append("Education level is required")
    else:
        e_str = str(edu_val)
        education = "Graduate" if "grad" in e_str.lower() and "not" not in e_str.lower() else "Not Graduate"

    # 5. Employment_Status
    emp_val = get_val("Employment_Status", "EmploymentStatus", "Self_Employed")
    if not emp_val:
        missing_fields.append("Employment_Status is required")
    else:
        emp_str = str(emp_val).capitalize()
        if emp_str in ["Salaried", "Self-Employed", "Unemployed"]:
            employment = emp_str
        elif "self" in emp_str.lower():
            employment = "Self-Employed"
        else:
            employment = "Salaried"

    # 6. Applicant_Income
    inc_val = get_val("Applicant_Income", "ApplicantIncome", "Income")
    if inc_val is None:
        missing_fields.append("Applicant_Income is required")
    else:
        try:
            app_income = float(inc_val)
            if app_income <= 0:
                missing_fields.append("Applicant_Income must be greater than 0")
        except (ValueError, TypeError):
            missing_fields.append("Applicant_Income must be a valid number")

    # 7. Coapplicant_Income
    co_inc_val = get_val("Coapplicant_Income", "CoapplicantIncome", "Coapplicant")
    if co_inc_val is None:
        coapplicant_income = 0.0
    else:
        try:
            coapplicant_income = float(co_inc_val)
            if coapplicant_income < 0:
                missing_fields.append("Coapplicant_Income cannot be negative")
        except (ValueError, TypeError):
            missing_fields.append("Coapplicant_Income must be a valid number")

    # 8. Loan_Amount
    amt_val = get_val("Loan_Amount", "LoanAmount", "Amount")
    if amt_val is None:
        missing_fields.append("Loan_Amount is required")
    else:
        try:
            loan_amount = float(amt_val)
            if loan_amount <= 0:
                missing_fields.append("Loan_Amount must be greater than 0")
        except (ValueError, TypeError):
            missing_fields.append("Loan_Amount must be a valid number")

    # 9. Loan_Term
    term_val = get_val("Loan_Term", "LoanTerm", "Term", "Loan_Amount_Term")
    if term_val is None:
        missing_fields.append("Loan_Term is required")
    else:
        try:
            loan_term = float(term_val)
            if loan_term <= 0:
                missing_fields.append("Loan_Term must be greater than 0")
        except (ValueError, TypeError):
            missing_fields.append("Loan_Term must be a valid number")

    # 10. Credit_History
    ch_val = get_val("Credit_History", "CreditHistory", "Credit")
    if ch_val is None:
        missing_fields.append("Credit_History is required (0 or 1)")
    else:
        try:
            ch_num = float(ch_val)
            if ch_num not in [0.0, 1.0]:
                missing_fields.append("Credit_History must be 0 (Poor) or 1 (Good)")
            else:
                credit_history = ch_num
        except (ValueError, TypeError):
            missing_fields.append("Credit_History must be 0 or 1")

    # 11. Property_Area
    prop_val = get_val("Property_Area", "PropertyArea", "Area")
    if not prop_val:
        missing_fields.append("Property_Area is required")
    else:
        p_str = str(prop_val).capitalize()
        if "semi" in p_str.lower():
            property_area = "Semiurban"
        elif "rur" in p_str.lower():
            property_area = "Rural"
        else:
            property_area = "Urban"

    # 12. Age
    age_val = get_val("Age")
    if age_val is None:
        age = 35.0
    else:
        try:
            age = float(age_val)
            if age < 18 or age > 100:
                missing_fields.append("Age must be between 18 and 100")
        except (ValueError, TypeError):
            missing_fields.append("Age must be a valid number")

    if missing_fields:
        return False, None, f"Row #{row_idx}: {'; '.join(missing_fields)}"

    cleaned = {
        "Gender": gender,
        "Married": married,
        "Dependents": dependents,
        "Education": education,
        "Employment_Status": employment,
        "Applicant_Income": app_income,
        "Coapplicant_Income": coapplicant_income,
        "Loan_Amount": loan_amount,
        "Loan_Term": loan_term,
        "Credit_History": credit_history,
        "Property_Area": property_area,
        "Age": age
    }
    return True, cleaned, None


def evaluate_single_record(input_data: dict):
    """
    Core end-to-end evaluation: Solvency check, ML prediction, SHAP, LIME,
    4-Pillar Trust Scores, and database dictionary preparation.
    """
    # 1. Enrich with Financial Features
    input_df = pd.DataFrame([input_data])
    input_df_enriched = add_financial_features(input_df)[raw_features]
    transformed_instance = preprocessor.transform(input_df_enriched)[0]

    # 2. Solvency Guardrail Calculation (Deterministic Banking Limit)
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
        override_warning = f"CRITICAL FINANCIAL RISK: Monthly repayment obligation (₹{monthly_emi:,.0f}/mo) represents {dti_percent} of income, exceeding the 50% regulatory limit."

    solvency_check = SolvencyCheckResult(
        monthlyEMI=round(monthly_emi, 2),
        totalIncome=round(total_income, 2),
        dtiRatio=round(dti_ratio, 4),
        dtiPercent=dti_percent,
        status=solvency_status,
        isSolvent=is_solvent,
        overrideWarning=override_warning
    )

    # 3. ML Model Prediction
    transformed_2d = transformed_instance.reshape(1, -1)
    pred = model.predict(transformed_2d)[0]
    prob = model.predict_proba(transformed_2d)[0][1]
    prediction_str = "Approved" if pred == 1 else "Rejected"

    # 4. Explainability (SHAP & LIME)
    orig_values = input_data.copy()
    orig_values['Monthly_EMI'] = monthly_emi
    orig_values['DTI_Ratio'] = dti_ratio

    applicant_seed = generate_applicant_seed(input_data)
    shap_exp = shap_explainer.explain_instance(transformed_instance, original_values=orig_values)
    lime_exp = lime_explainer.explain_instance(
        model.predict_proba, 
        transformed_instance, 
        original_values=orig_values,
        seed=applicant_seed
    )

    # 5. 4-Pillar Validation Suite
    directional_mask = {}
    for feat in shap_exp.features:
        if feat.contribution > 0:
            directional_mask[feat.feature] = 0.0
        else:
            directional_mask[feat.feature] = 1.0 if feat.feature == 'Credit_History' else 0.0

    faithfulness_score = calculate_faithfulness(model, transformed_instance, shap_exp, feature_names, directional_mask, top_k=3)
    faithfulness_score = max(0.0, min(1.0, faithfulness_score))

    stability_rng = np.random.RandomState(applicant_seed)
    noise = stability_rng.normal(0, 0.01, size=transformed_instance.shape)
    perturbed_instance = transformed_instance + noise
    shap_exp_perturbed = shap_explainer.explain_instance(perturbed_instance, original_values=orig_values)
    stability_score = calculate_stability(shap_exp, shap_exp_perturbed)

    consistency_score = calculate_consistency(shap_exp, lime_exp, top_k=3)
    fairness_score = calculate_counterfactual_fairness(model, preprocessor, input_data, raw_features, sensitive_col='Gender')

    trust_eval = calculate_trust_score(faithfulness_score, stability_score, consistency_score, fairness_score)
    dossier_id = generate_dossier_id(input_data)
    confidence_score = float(prob) if pred == 1 else float(1 - prob)

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

    if trust_eval.overallTrustScore >= 0.75:
        trust_rating = "HIGH TRUST"
    elif trust_eval.overallTrustScore >= 0.50:
        trust_rating = "MODERATE TRUST"
    else:
        trust_rating = "LOW TRUST"

    db_fields = {
        "dossier_id": dossier_id,
        "applicant_age": input_data.get('Age'),
        "applicant_income": input_data.get('Applicant_Income'),
        "loan_amount": input_data.get('Loan_Amount'),
        "raw_input_data": input_data,
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


def process_rows_into_batch(rows: list, filename: str, db: Session) -> BatchUploadResponse:
    """
    Ingests raw rows, trashes flawed rows with explicit errors, processes valid rows
    through ML/XAI pipeline, persists to database, and creates a BatchUpload log.
    """
    if model is None:
        raise HTTPException(status_code=500, detail="Models not loaded properly.")

    batch_id = generate_batch_id()
    now_ts = datetime.now(timezone.utc)
    now_str = now_ts.strftime("%Y-%m-%d %H:%M:%S")

    total_records = len(rows)
    valid_count = 0
    flawed_count = 0

    flawed_list: List[FlawedRecordItem] = []
    processed_list: List[LoanPredictionResponse] = []

    approved_count = 0
    rejected_count = 0
    trust_scores = []

    for idx, raw_row in enumerate(rows, start=1):
        is_valid, cleaned_data, err_reason = validate_batch_record(raw_row, idx)

        if not is_valid:
            flawed_count += 1
            flawed_list.append(FlawedRecordItem(
                row=idx,
                rawData={str(k): str(v) for k, v in raw_row.items() if v is not None and not pd.isna(v)},
                errorReason=err_reason
            ))
            continue

        try:
            response_obj, db_fields = evaluate_single_record(cleaned_data)
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
    summary_dict = {
        "approvedCount": approved_count,
        "rejectedCount": rejected_count,
        "averageTrustScore": avg_trust
    }

    try:
        batch_record = BatchUpload(
            batch_id=batch_id,
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
async def predict_batch_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
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
        return process_rows_into_batch(rows, file.filename or "uploaded_applications.csv", db)
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
    return process_rows_into_batch(request.rows, request.filename or "preset_batch.csv", db)


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


@router.get("/batch-sample-csv")
def download_sample_batch_csv():
    """
    Generates and returns an institutional 20-record sample CSV template with 15 valid
    applications and 5 flawed records (missing fields, invalid values) for testing file uploads.
    """
    sample_csv_content = (
        "Gender,Married,Dependents,Education,Employment_Status,Applicant_Income,Coapplicant_Income,Loan_Amount,Loan_Term,Credit_History,Property_Area,Age\n"
        "Male,Yes,1,Graduate,Salaried,55000,15000,160000,360,1,Urban,32\n"
        "Female,No,0,Graduate,Salaried,80000,0,120000,360,1,Urban,29\n"
        "Male,Yes,2,Not Graduate,Salaried,22000,0,150000,180,,Rural,41\n"
        "Female,Yes,1,Graduate,Self-Employed,65000,25000,200000,240,1,Semiurban,38\n"
        "Male,No,0,Graduate,Salaried,,0,80000,360,1,Urban,26\n"
        "Male,No,3,Not Graduate,Unemployed,12000,0,350000,360,0,Rural,24\n"
        "Female,Yes,0,Graduate,Salaried,72000,18000,140000,360,1,Urban,35\n"
        "Male,Yes,1,Graduate,Salaried,45000,0,0,360,1,Semiurban,33\n"
        "Male,Yes,2,Graduate,Salaried,95000,40000,250000,360,1,Urban,44\n"
        "Female,No,0,Graduate,Salaried,38000,0,90000,-120,1,Rural,30\n"
        "Male,No,1,Graduate,Self-Employed,52000,0,110000,360,1,Semiurban,37\n"
        "Female,Yes,2,Graduate,Salaried,60000,30000,130000,360,1,Urban,40\n"
        "Male,Yes,0,Not Graduate,Self-Employed,30000,10000,160000,360,0,Rural,48\n"
        "Female,No,0,Graduate,Salaried,85000,0,175000,360,1,Urban,31\n"
        "Male,Yes,1,Graduate,Salaried,,20000,120000,360,1,Semiurban,28\n"
        "Female,Yes,1,Graduate,Salaried,58000,12000,150000,360,1,Rural,36\n"
        "Male,No,0,Graduate,Salaried,48000,0,105000,360,1,Urban,34\n"
        "Female,Yes,0,Not Graduate,Self-Employed,28000,0,95000,240,1,Rural,45\n"
        "Male,Yes,3,Graduate,Salaried,110000,50000,300000,360,1,Urban,46\n"
        "Male,No,2,Graduate,Salaried,35000,0,80000,360,0,Semiurban,27\n"
    )
    return Response(
        content=sample_csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=trustfin_sample_batch_20.csv"
        }
    )


@router.get("/batch-presets/{preset_id}")
def get_batch_preset(preset_id: str):
    """
    Returns preset rows for Demo Batch 1 (10 records: 7 valid, 3 flawed)
    or Demo Batch 2 (30 records: 24 valid, 6 flawed).
    """
    if preset_id in ["batch_1", "1", "10"]:
        rows = [
            {"Gender": "Male", "Married": "Yes", "Dependents": 1, "Education": "Graduate", "Employment_Status": "Salaried", "Applicant_Income": 60000, "Coapplicant_Income": 15000, "Loan_Amount": 150000, "Loan_Term": 360, "Credit_History": 1, "Property_Area": "Urban", "Age": 32},
            {"Gender": "Female", "Married": "No", "Dependents": 0, "Education": "Graduate", "Employment_Status": "Salaried", "Applicant_Income": 85000, "Coapplicant_Income": 0, "Loan_Amount": 120000, "Loan_Term": 360, "Credit_History": 1, "Property_Area": "Urban", "Age": 29},
            {"Gender": "Male", "Married": "Yes", "Dependents": 2, "Education": "Not Graduate", "Employment_Status": "Salaried", "Applicant_Income": 22000, "Coapplicant_Income": 0, "Loan_Amount": 180000, "Loan_Term": 180, "Credit_History": None, "Property_Area": "Rural", "Age": 41}, # FLAWED: No Credit_History
            {"Gender": "Female", "Married": "Yes", "Dependents": 1, "Education": "Graduate", "Employment_Status": "Self-Employed", "Applicant_Income": 70000, "Coapplicant_Income": 25000, "Loan_Amount": 210000, "Loan_Term": 240, "Credit_History": 1, "Property_Area": "Semiurban", "Age": 38},
            {"Gender": "Male", "Married": "No", "Dependents": 0, "Education": "Graduate", "Employment_Status": "Salaried", "Applicant_Income": None, "Coapplicant_Income": 0, "Loan_Amount": 80000, "Loan_Term": 360, "Credit_History": 1, "Property_Area": "Urban", "Age": 26}, # FLAWED: Missing Income
            {"Gender": "Male", "Married": "No", "Dependents": 3, "Education": "Not Graduate", "Employment_Status": "Unemployed", "Applicant_Income": 12000, "Coapplicant_Income": 0, "Loan_Amount": 350000, "Loan_Term": 360, "Credit_History": 0, "Property_Area": "Rural", "Age": 24},
            {"Gender": "Female", "Married": "Yes", "Dependents": 0, "Education": "Graduate", "Employment_Status": "Salaried", "Applicant_Income": 72000, "Coapplicant_Income": 18000, "Loan_Amount": 140000, "Loan_Term": 360, "Credit_History": 1, "Property_Area": "Urban", "Age": 35},
            {"Gender": "Male", "Married": "Yes", "Dependents": 1, "Education": "Graduate", "Employment_Status": "Salaried", "Applicant_Income": 45000, "Coapplicant_Income": 0, "Loan_Amount": 0, "Loan_Term": 360, "Credit_History": 1, "Property_Area": "Semiurban", "Age": 33}, # FLAWED: Loan Amount 0
            {"Gender": "Male", "Married": "Yes", "Dependents": 2, "Education": "Graduate", "Employment_Status": "Salaried", "Applicant_Income": 95000, "Coapplicant_Income": 40000, "Loan_Amount": 250000, "Loan_Term": 360, "Credit_History": 1, "Property_Area": "Urban", "Age": 44},
            {"Gender": "Female", "Married": "No", "Dependents": 1, "Education": "Graduate", "Employment_Status": "Salaried", "Applicant_Income": 52000, "Coapplicant_Income": 0, "Loan_Amount": 110000, "Loan_Term": 360, "Credit_History": 1, "Property_Area": "Semiurban", "Age": 31}
        ]
        return {"presetId": "batch_1", "name": "Demo Batch 1 (10 Records)", "rows": rows}
    else:
        # Batch 2: 30 records (24 valid, 6 flawed)
        rows = [
            {"Gender": "Male", "Married": "Yes", "Dependents": 0, "Education": "Graduate", "Employment_Status": "Salaried", "Applicant_Income": 50000, "Coapplicant_Income": 20000, "Loan_Amount": 150000, "Loan_Term": 360, "Credit_History": 1, "Property_Area": "Urban", "Age": 30},
            {"Gender": "Female", "Married": "Yes", "Dependents": 1, "Education": "Graduate", "Employment_Status": "Salaried", "Applicant_Income": 65000, "Coapplicant_Income": 15000, "Loan_Amount": 180000, "Loan_Term": 360, "Credit_History": 1, "Property_Area": "Semiurban", "Age": 34},
            {"Gender": "Male", "Married": "No", "Dependents": 2, "Education": "Not Graduate", "Employment_Status": "Salaried", "Applicant_Income": 25000, "Coapplicant_Income": 0, "Loan_Amount": 120000, "Loan_Term": 180, "Credit_History": None, "Property_Area": "Rural", "Age": 39}, # FLAWED 1: Missing Credit_History
            {"Gender": "Female", "Married": "No", "Dependents": 0, "Education": "Graduate", "Employment_Status": "Self-Employed", "Applicant_Income": 90000, "Coapplicant_Income": 0, "Loan_Amount": 220000, "Loan_Term": 240, "Credit_History": 1, "Property_Area": "Urban", "Age": 28},
            {"Gender": "Male", "Married": "Yes", "Dependents": 3, "Education": "Graduate", "Employment_Status": "Salaried", "Applicant_Income": 110000, "Coapplicant_Income": 35000, "Loan_Amount": 300000, "Loan_Term": 360, "Credit_History": 1, "Property_Area": "Urban", "Age": 45},
            {"Gender": "Female", "Married": "Yes", "Dependents": 0, "Education": "Graduate", "Employment_Status": "Salaried", "Applicant_Income": None, "Coapplicant_Income": 10000, "Loan_Amount": 90000, "Loan_Term": 360, "Credit_History": 1, "Property_Area": "Semiurban", "Age": 27}, # FLAWED 2: Missing Income
            {"Gender": "Male", "Married": "No", "Dependents": 0, "Education": "Graduate", "Employment_Status": "Salaried", "Applicant_Income": 48000, "Coapplicant_Income": 0, "Loan_Amount": 110000, "Loan_Term": 360, "Credit_History": 1, "Property_Area": "Rural", "Age": 33},
            {"Gender": "Female", "Married": "Yes", "Dependents": 2, "Education": "Not Graduate", "Employment_Status": "Self-Employed", "Applicant_Income": 32000, "Coapplicant_Income": 12000, "Loan_Amount": 140000, "Loan_Term": 240, "Credit_History": 1, "Property_Area": "Semiurban", "Age": 42},
            {"Gender": "Male", "Married": "Yes", "Dependents": 1, "Education": "Graduate", "Employment_Status": "Salaried", "Applicant_Income": 75000, "Coapplicant_Income": 25000, "Loan_Amount": -50000, "Loan_Term": 360, "Credit_History": 1, "Property_Area": "Urban", "Age": 36}, # FLAWED 3: Negative Loan Amount
            {"Gender": "Male", "Married": "No", "Dependents": 0, "Education": "Graduate", "Employment_Status": "Salaried", "Applicant_Income": 58000, "Coapplicant_Income": 0, "Loan_Amount": 130000, "Loan_Term": 360, "Credit_History": 1, "Property_Area": "Urban", "Age": 31},
            {"Gender": "Female", "Married": "Yes", "Dependents": 1, "Education": "Graduate", "Employment_Status": "Salaried", "Applicant_Income": 82000, "Coapplicant_Income": 18000, "Loan_Amount": 190000, "Loan_Term": 360, "Credit_History": 1, "Property_Area": "Semiurban", "Age": 37},
            {"Gender": "Male", "Married": "Yes", "Dependents": 2, "Education": "Not Graduate", "Employment_Status": "Unemployed", "Applicant_Income": 15000, "Coapplicant_Income": 0, "Loan_Amount": 280000, "Loan_Term": 360, "Credit_History": 0, "Property_Area": "Rural", "Age": 25},
            {"Gender": "Female", "Married": "No", "Dependents": 0, "Education": "Graduate", "Employment_Status": "Salaried", "Applicant_Income": 40000, "Coapplicant_Income": 0, "Loan_Amount": 85000, "Loan_Term": -60, "Credit_History": 1, "Property_Area": "Urban", "Age": 29}, # FLAWED 4: Negative Loan Term
            {"Gender": "Male", "Married": "Yes", "Dependents": 0, "Education": "Graduate", "Employment_Status": "Salaried", "Applicant_Income": 62000, "Coapplicant_Income": 22000, "Loan_Amount": 160000, "Loan_Term": 360, "Credit_History": 1, "Property_Area": "Semiurban", "Age": 35},
            {"Gender": "Female", "Married": "Yes", "Dependents": 1, "Education": "Graduate", "Employment_Status": "Salaried", "Applicant_Income": 77000, "Coapplicant_Income": 0, "Loan_Amount": 170000, "Loan_Term": 360, "Credit_History": 1, "Property_Area": "Urban", "Age": 41},
            {"Gender": "Male", "Married": "No", "Dependents": 1, "Education": "Not Graduate", "Employment_Status": "Self-Employed", "Applicant_Income": 28000, "Coapplicant_Income": 0, "Loan_Amount": 95000, "Loan_Term": 180, "Credit_History": 0, "Property_Area": "Rural", "Age": 48},
            {"Gender": "Female", "Married": "No", "Dependents": 0, "Education": "Graduate", "Employment_Status": "Salaried", "Applicant_Income": 98000, "Coapplicant_Income": 0, "Loan_Amount": 240000, "Loan_Term": 360, "Credit_History": 1, "Property_Area": "Urban", "Age": 32},
            {"Gender": "Male", "Married": "Yes", "Dependents": 2, "Education": "Graduate", "Employment_Status": "Salaried", "Applicant_Income": 54000, "Coapplicant_Income": 16000, "Loan_Amount": 135000, "Loan_Term": 360, "Credit_History": 1, "Property_Area": "Semiurban", "Age": 38},
            {"Gender": "Female", "Married": "Yes", "Dependents": 0, "Education": None, "Employment_Status": "Salaried", "Applicant_Income": 47000, "Coapplicant_Income": 0, "Loan_Amount": 100000, "Loan_Term": 360, "Credit_History": 1, "Property_Area": "Urban", "Age": 30}, # FLAWED 5: Missing Education
            {"Gender": "Male", "Married": "Yes", "Dependents": 3, "Education": "Graduate", "Employment_Status": "Salaried", "Applicant_Income": 125000, "Coapplicant_Income": 45000, "Loan_Amount": 350000, "Loan_Term": 360, "Credit_History": 1, "Property_Area": "Urban", "Age": 46},
            {"Gender": "Female", "Married": "No", "Dependents": 0, "Education": "Graduate", "Employment_Status": "Salaried", "Applicant_Income": 68000, "Coapplicant_Income": 0, "Loan_Amount": 150000, "Loan_Term": 360, "Credit_History": 1, "Property_Area": "Semiurban", "Age": 33},
            {"Gender": "Male", "Married": "No", "Dependents": 1, "Education": "Not Graduate", "Employment_Status": "Salaried", "Applicant_Income": 36000, "Coapplicant_Income": 0, "Loan_Amount": 90000, "Loan_Term": 360, "Credit_History": 0, "Property_Area": "Rural", "Age": 26},
            {"Gender": "Female", "Married": "Yes", "Dependents": 2, "Education": "Graduate", "Employment_Status": "Self-Employed", "Applicant_Income": 88000, "Coapplicant_Income": 30000, "Loan_Amount": 260000, "Loan_Term": 360, "Credit_History": 1, "Property_Area": "Urban", "Age": 43},
            {"Gender": "Male", "Married": "Yes", "Dependents": 1, "Education": "Graduate", "Employment_Status": "Salaried", "Applicant_Income": 0, "Coapplicant_Income": 15000, "Loan_Amount": 110000, "Loan_Term": 360, "Credit_History": 1, "Property_Area": "Semiurban", "Age": 34}, # FLAWED 6: Income 0
            {"Gender": "Female", "Married": "No", "Dependents": 0, "Education": "Graduate", "Employment_Status": "Salaried", "Applicant_Income": 73000, "Coapplicant_Income": 0, "Loan_Amount": 160000, "Loan_Term": 360, "Credit_History": 1, "Property_Area": "Urban", "Age": 28},
            {"Gender": "Male", "Married": "Yes", "Dependents": 0, "Education": "Graduate", "Employment_Status": "Salaried", "Applicant_Income": 59000, "Coapplicant_Income": 17000, "Loan_Amount": 145000, "Loan_Term": 360, "Credit_History": 1, "Property_Area": "Rural", "Age": 36},
            {"Gender": "Female", "Married": "Yes", "Dependents": 1, "Education": "Graduate", "Employment_Status": "Salaried", "Applicant_Income": 81000, "Coapplicant_Income": 22000, "Loan_Amount": 200000, "Loan_Term": 360, "Credit_History": 1, "Property_Area": "Semiurban", "Age": 39},
            {"Gender": "Male", "Married": "No", "Dependents": 0, "Education": "Graduate", "Employment_Status": "Salaried", "Applicant_Income": 51000, "Coapplicant_Income": 0, "Loan_Amount": 115000, "Loan_Term": 360, "Credit_History": 1, "Property_Area": "Urban", "Age": 30},
            {"Gender": "Female", "Married": "Yes", "Dependents": 2, "Education": "Not Graduate", "Employment_Status": "Self-Employed", "Applicant_Income": 34000, "Coapplicant_Income": 10000, "Loan_Amount": 125000, "Loan_Term": 240, "Credit_History": 1, "Property_Area": "Rural", "Age": 44},
            {"Gender": "Male", "Married": "Yes", "Dependents": 1, "Education": "Graduate", "Employment_Status": "Salaried", "Applicant_Income": 92000, "Coapplicant_Income": 38000, "Loan_Amount": 270000, "Loan_Term": 360, "Credit_History": 1, "Property_Area": "Urban", "Age": 42}
        ]
        return {"presetId": "batch_2", "name": "Demo Batch 2 (30 Records)", "rows": rows}


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


