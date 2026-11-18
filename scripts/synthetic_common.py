"""Reproducible synthetic lending cohorts with explicit ordinary/stress coverage."""
import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd

from backend.app.ml.product_policy import (
    DATASET_VERSION, POLICY_VERSION, POLICIES, add_product_financial_features,
    label_applications, monthly_emi, policy_dict, rejection_flags, synthetic_score,
)

ROOT = Path(__file__).resolve().parents[1]
PRODUCT_DIRS = {"home_loan": "homeloan", "personal_loan": "personalloan"}


def generate_applicants(product, n_samples=3000, random_state=42, prefix=None):
    if n_samples < 1:
        raise ValueError("n_samples must be positive")
    rng = np.random.default_rng(random_state)
    n, home = n_samples, product == "home_loan"
    age = rng.integers(23 if home else 21, 58, n)
    edu = rng.choice(["Graduate", "Not Graduate"], n, p=[.78, .22] if home else [.75, .25])
    income = np.round(np.clip(rng.lognormal(np.where(edu == "Graduate", 11.0 if home else 10.8, 10.5 if home else 10.3), .45, n), 20000 if home else 18000, 350000 if home else 250000), -2).astype(int)
    d = pd.DataFrame({
        "Gender": rng.choice(["Male", "Female"], n, p=[.60, .40]), "Age": age,
        "Married": rng.choice(["Yes", "No"], n, p=[.68, .32] if home else [.55, .45]),
        "Dependents": rng.choice([0, 1, 2, 3], n, p=[.42, .26, .22, .10]), "Education": edu,
        "Employment_Status": rng.choice(["Salaried", "Self-Employed"], n, p=[.72, .28]),
        "Work_Experience": np.clip(np.rint(rng.normal(age-23, 2.5)), 1, age-21).astype(int),
        "Applicant_Income": income,
        "Existing_EMI": np.round(income*rng.beta(1.5, 9, n), -2).astype(int),
    })
    if home:
        coapp = rng.random(n) < np.where(d.Married.eq("Yes"), .65, .20)
        d["Coapplicant_Income"] = np.round(np.where(coapp, np.clip(rng.lognormal(10.4, .42, n), 0, 200000), 0), -2).astype(int)
        terms = np.array([60, 120, 180, 240, 300, 360])
        d["Loan_Term"] = [rng.choice(terms[terms <= min(30, 65-a)*12]) for a in age]
        total = income + d.Coapplicant_Income.to_numpy()
        sized = total*(d.Loan_Term.to_numpy()/12)*2.3*rng.uniform(.55, 1.55, n)
        unsized = rng.lognormal(np.log(2500000), .65, n)
        amount = np.where(rng.random(n) < .20, unsized, sized)
        d["Loan_Amount"] = np.round(np.clip(amount, 300000, 10000000), -3).astype(int)
        # Most are ordinary requests; the explicit tail makes LTV rejection learnable.
        ltv = np.where(rng.random(n) < .15, rng.uniform(.90, 1.10, n), .60+.30*rng.beta(6, 2.5, n))
        d["Property_Value"] = np.round(d.Loan_Amount/ltv, -3).astype(int)
        d["Property_Area"] = rng.choice(["Urban", "Semiurban", "Rural"], n, p=[.45, .35, .20])
    else:
        d["Loan_Term"] = rng.choice([6, 12, 24, 36, 48, 60], n, p=[.08, .20, .28, .24, .12, .08])
        sized = income*np.clip(d.Loan_Term.to_numpy()/12*1.8, .5, 5)*rng.uniform(.6, 1.3, n)
        unsized = rng.lognormal(np.log(220000), .8, n)
        d["Loan_Amount"] = np.round(np.clip(np.where(rng.random(n) < .20, unsized, sized), 30000, 1000000), -3).astype(int)
        d["Loan_Purpose"] = rng.choice(["Debt_Consolidation", "Medical_Emergency", "Home_Renovation", "Education", "Wedding", "Travel"], n, p=[.28, .22, .18, .14, .10, .08])
        d["Credit_Card_Utilization"] = np.round(np.where(rng.random(n) < .10, rng.uniform(.80, 1., n), .05+.90*rng.beta(2.5, 3.5, n)), 2)
    d["CIBIL_Score"] = np.rint(np.clip(300+600*rng.beta(5.8 if home else 5.5, 2.6 if home else 2.8, n), 320, 895)).astype(int)
    missed = []
    for c in d.CIBIL_Score:
        values, probs = ([0, 1], [.97, .03]) if c >= 780 else (([0, 1, 2], [.85, .13, .02]) if c >= 720 else (([0, 1, 2, 3], [.60, .28, .10, .02]) if c >= 640 else (([0, 1, 2, 3], [.30, .40, .22, .08]) if c >= 550 else ([1, 2, 3, 4], [.15, .40, .30, .15]))))
        missed.append(rng.choice(values, p=probs))
    d["Missed_Payments_12M"] = missed
    # Explicit combinations the ordinary correlated sampler cannot produce:
    # 5% strong-credit / adverse-payment cases and 5% weak-credit / strong-capacity
    # cases. These are disclosed stress components, not sampled real bank rates.
    stress = rng.permutation(n)[:int(.10*n)]
    payment_stress, credit_boundary = np.array_split(stress, 2)
    d.loc[payment_stress, "CIBIL_Score"] = rng.integers(780, 881, len(payment_stress))
    d.loc[payment_stress, "Missed_Payments_12M"] = rng.choice([3, 4], len(payment_stress))
    d.loc[credit_boundary, "CIBIL_Score"] = rng.integers(POLICIES[product].min_cibil-25, POLICIES[product].min_cibil+26, len(credit_boundary))
    d.loc[credit_boundary, "Missed_Payments_12M"] = 0
    d.loc[stress, "Applicant_Income"] = rng.integers(1000, 2001, len(stress))*100
    d.loc[stress, "Existing_EMI"] = rng.integers(0, 6, len(stress))*100
    d.loc[stress, "Education"] = "Graduate"
    d.loc[stress, "Employment_Status"] = "Salaried"
    d.loc[stress, "Loan_Amount"] = rng.integers(300, 601, len(stress))*1000 if home else rng.integers(30, 61, len(stress))*1000
    if home:
        d.loc[stress, "Coapplicant_Income"] = 0
        d.loc[stress, "Property_Area"] = "Urban"
        d.loc[stress, "Property_Value"] = np.round(d.loc[stress, "Loan_Amount"]/rng.uniform(.60, .65, len(stress)), -3).astype(int)
    else:
        d.loc[stress, "Loan_Purpose"] = "Medical_Emergency"
        d.loc[stress, "Credit_Card_Utilization"] = np.round(rng.uniform(.05, .15, len(stress)), 2)
    prefix = prefix or ("HL" if home else "PL")
    d.insert(0, "Loan_ID", [f"{prefix}{i+1:05d}" for i in range(n)])
    d["Loan_Status"] = label_applications(d, product)
    return d


def generate_boundary_applicants(product, random_state=2026):
    """Matched Gender pairs around each cutoff plus the smooth-score boundary."""
    rng = np.random.default_rng(random_state)
    home = product == "home_loan"
    p = POLICIES[product]
    levels = {"credit_score": [p.min_cibil-1, p.min_cibil, p.min_cibil+1],
              "missed_payments": [2, 3, 4], "repayment_burden": [.49, .50, .51],
              "latent_score": [-.05, 0., .05]}
    levels.update({"property_value": [91., 92., 93.]} if home else {"card_utilization": [.87, .88, .89], "minimum_income": [18900, 19000, 19100]})
    rows = []
    for scenario, values in levels.items():
        for replicate in range(10):
            for value in values:
                source = generate_applicants(product, 1, int(rng.integers(1, 2**31-1))).iloc[0].to_dict()
                source.update(Age=32, Work_Experience=10, Education="Graduate", Employment_Status="Salaried", Married="Yes", Dependents=1,
                              Applicant_Income=70000+replicate*1500+int(rng.integers(0, 10))*10, Existing_EMI=1000, CIBIL_Score=840, Missed_Payments_12M=0,
                              Loan_Amount=1000000 if home else 100000, Loan_Term=240 if home else 36)
                if home:
                    source.update(Coapplicant_Income=0, Property_Value=round(source["Loan_Amount"]/.75, 2), Property_Area="Urban")
                else:
                    source.update(Loan_Purpose="Medical_Emergency", Credit_Card_Utilization=.20)
                if scenario == "credit_score":
                    source["CIBIL_Score"] = value
                    source["Existing_EMI"] = 0
                    if home:
                        source["Property_Value"] = round(source["Loan_Amount"]/.60, 2)
                    else:
                        source.update(Loan_Amount=30000, Loan_Term=60, Credit_Card_Utilization=.05)
                elif scenario == "missed_payments":
                    source["Missed_Payments_12M"] = value
                elif scenario == "property_value":
                    source["Property_Value"] = round(source["Loan_Amount"]/(value/100), 2)
                elif scenario == "card_utilization":
                    source["Credit_Card_Utilization"] = value
                elif scenario == "minimum_income":
                    source.update(Applicant_Income=value, Loan_Amount=30000+replicate*1000, Loan_Term=36, Existing_EMI=100)
                if scenario in ["repayment_burden", "latent_score"]:
                    target = value
                    if scenario == "latent_score":
                        source["CIBIL_Score"] = 660 if home else 640
                        frame = pd.DataFrame([source])
                        f = add_product_financial_features(frame, product)
                        coefficient = 3.8 if home else 4.5
                        target = (float(synthetic_score(frame, product)[0])+coefficient*float(f.FOIR.iloc[0])-value)/coefficient
                    emi = float(monthly_emi(source["Loan_Amount"], source["Loan_Term"], p.annual_rate))
                    source["Existing_EMI"] = round(target*source["Applicant_Income"]-emi, 2)
                    assert source["Existing_EMI"] >= 0
                for gender in ["Male", "Female"]:
                    row = {**source, "Gender": gender, "Loan_ID": f"{'HL' if home else 'PL'}B{len(rows)+1:05d}", "Scenario": scenario}
                    rows.append(row)
    result = pd.DataFrame(rows)
    result["Loan_Status"] = label_applications(result, product)
    return result


def validate_dataset(df, product):
    if df.isna().any().any() or df.Loan_ID.duplicated().any():
        raise ValueError("Missing values or duplicate IDs")
    raw = df.drop(columns=[c for c in ["Loan_ID", "Loan_Status", "Scenario"] if c in df])
    if raw.duplicated().any():
        raise ValueError("Duplicate raw applicants")
    numbers = df.select_dtypes(include="number")
    if not np.isfinite(numbers.to_numpy()).all():
        raise ValueError("Non-finite numeric values")
    if not ((df.Applicant_Income > 0) & (df.Existing_EMI >= 0) & (df.Loan_Amount > 0) & (df.Loan_Term > 0)).all():
        raise ValueError("Invalid financial inputs")
    if not ((df.Age+df.Loan_Term/12 <= 65) & (df.Work_Experience <= df.Age-18) & (df.Work_Experience >= 0)).all():
        raise ValueError("Invalid age, experience or loan maturity")
    if not df.CIBIL_Score.between(300, 900).all():
        raise ValueError("Invalid CIBIL score")
    if product == "home_loan" and not (df.Property_Value > 0).all():
        raise ValueError("Invalid property value")
    if product == "personal_loan" and not df.Credit_Card_Utilization.between(0, 1).all():
        raise ValueError("Invalid card utilization")
    if not np.array_equal(df.Loan_Status.to_numpy(), label_applications(df, product)):
        raise ValueError("Labels violate the shared synthetic policy")
    flipped = df.copy()
    flipped["Gender"] = np.where(df.Gender == "Male", "Female", "Male")
    if not np.array_equal(df.Loan_Status, label_applications(flipped, product)):
        raise ValueError("Labels depend on Gender")
    flags = rejection_flags(df, product)
    if (df.Loan_Status.eq("Approved") & flags.any(axis=1)).any():
        raise ValueError("An approved label violates a mandatory policy rule")
    return {"rows": len(df), "class_counts": df.Loan_Status.value_counts().to_dict(),
            "gender_counts": df.Gender.value_counts().to_dict(), "rule_trigger_counts": {k: int(v) for k, v in flags.sum().items()},
            "gender_label_flips": 0, "approved_policy_violations": 0, "missing_cells": 0, "duplicate_applicants": 0}


def sha256(path):
    path = Path(path)
    content = path.read_bytes()
    if path.suffix == ".py":
        content = content.replace(b"\r\n", b"\n")
    return hashlib.sha256(content).hexdigest()


def write_product_datasets(product):
    suffix = PRODUCT_DIRS[product]
    manifest_path = ROOT / "datasets/manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    cohorts = {}
    frames, prepared = [], []
    for name, seed, df, relative in [
        ("training", 42, generate_applicants(product, 3000, 42), f"datasets/{suffix}_train.csv"),
        ("independent", 456, generate_applicants(product, 1000, 456, prefix="HLI" if product == "home_loan" else "PLI"), f"datasets/evaluation/{suffix}_independent.csv"),
        ("boundary", 2027, generate_boundary_applicants(product, 2027), f"datasets/evaluation/{suffix}_boundary.csv"),
    ]:
        checks = validate_dataset(df, product)
        if name != "boundary" and min(checks["rule_trigger_counts"].values()) < len(df)//100:
            raise ValueError(f"Insufficient rejection-rule coverage: {checks}")
        prepared.append((name, seed, df, relative, checks))
        frames.append(df.drop(columns=[c for c in ["Loan_ID", "Loan_Status", "Scenario"] if c in df]))
    if pd.concat(frames, ignore_index=True).duplicated().any():
        raise ValueError("Applicant overlap between generated cohorts")
    for name, seed, df, relative, checks in prepared:
        path = ROOT / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(path, index=False, lineterminator="\n")
        cohorts[name] = {"path": relative, "seed": seed, "sha256": sha256(path), "used_for_training": name == "training", **checks}
    manifest[product] = {"dataset_version": DATASET_VERSION, "policy_version": POLICY_VERSION, "policy": policy_dict(product),
                         "target": "simulated_underwriting_approval", "labels_use_gender": False, "gender_in_prediction": True,
                         "assumptions": "Authored synthetic policy and population, fixed rates, deterministic labels; no observed repayment outcomes or regulatory certification. Ordinary requests predominate, with explicit high-LTV/card-utilization tails and some requests not sized to income. Ten percent are explicit high-credit/adverse-payment or low-credit/strong-capacity stress combinations.",
                         "cohorts": cohorts, "generator_sha256": sha256(__file__), "policy_sha256": sha256(ROOT / "backend/app/ml/product_policy.py")}
    manifest_path.write_text(json.dumps(manifest, indent=2)+"\n", encoding="utf-8", newline="\n")
    print(json.dumps({"product": product, "cohorts": cohorts}, indent=2))
