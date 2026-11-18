"""Authored TrustFin simulation policy; these are not universal banking rules."""
from dataclasses import asdict, dataclass

import numpy as np
import pandas as pd

POLICY_VERSION = "project-lending-v1"
DATASET_VERSION = "synthetic-products-v4.1"


@dataclass(frozen=True)
class ProductPolicy:
    annual_rate: float
    min_cibil: int
    max_foir: float = 0.50
    comfortable_foir: float = 0.35
    reject_missed_payments_at: int = 3
    max_ltv_percent: float | None = None
    max_card_utilization: float | None = None
    min_income: float | None = None


POLICIES = {
    "home_loan": ProductPolicy(.085, 560, max_ltv_percent=92.),
    "personal_loan": ProductPolicy(.135, 580, max_card_utilization=.88, min_income=19000.),
}


def policy_dict(product):
    return asdict(POLICIES[product])


def monthly_emi(amount, term, annual_rate):
    amount, term = np.asarray(amount, dtype=float), np.asarray(term, dtype=float)
    r = annual_rate / 12
    factor = (1+r)**term
    return np.round(amount*r*factor/(factor-1), 2)


def add_product_financial_features(df: pd.DataFrame, product: str) -> pd.DataFrame:
    data = df.copy()
    policy = POLICIES[product]
    income = data.Applicant_Income.astype(float)
    if product == "home_loan":
        income = income + data.Coapplicant_Income.astype(float)
        data["Total_Income"] = income
    data["Monthly_EMI"] = monthly_emi(data.Loan_Amount, data.Loan_Term.astype(float).replace(0, 1).fillna(1), policy.annual_rate)
    data["FOIR"] = np.round((data.Existing_EMI.astype(float).fillna(0)+data.Monthly_EMI)/income.replace(0, 1).fillna(1), 4)
    if product == "home_loan":
        data["LTV_Ratio"] = np.round(data.Loan_Amount.astype(float)/data.Property_Value.astype(float).replace(0, 1).fillna(1)*100, 2)
    return data


def rejection_flags(df: pd.DataFrame, product: str) -> pd.DataFrame:
    data = add_product_financial_features(df, product)
    p = POLICIES[product]
    flags = pd.DataFrame({
        "credit_score": data.CIBIL_Score < p.min_cibil,
        "missed_payments": data.Missed_Payments_12M >= p.reject_missed_payments_at,
        "repayment_burden": data.FOIR > p.max_foir,
    }, index=df.index)
    if p.max_ltv_percent is not None:
        flags["property_value"] = data.LTV_Ratio > p.max_ltv_percent
    if p.max_card_utilization is not None:
        flags["card_utilization"] = data.Credit_Card_Utilization > p.max_card_utilization
    if p.min_income is not None:
        flags["minimum_income"] = data.Applicant_Income < p.min_income
    return flags


def synthetic_score(df: pd.DataFrame, product: str) -> np.ndarray:
    """Disclosed synthetic preferences among applicants passing hard rules.

    Gender is deliberately absent. All coefficients are authored assumptions,
    not empirical default-risk estimates. No random labels or score inflation.
    """
    d = add_product_financial_features(df, product)
    if product == "home_loan":
        result = (.05 + 2.3*((d.CIBIL_Score-690)/100) - 3.8*(d.FOIR-.45)
                  - .08*(d.LTV_Ratio-75) - 1.2*d.Missed_Payments_12M
                  + .4*np.log(d.Total_Income/65000)
                  + .25*d.Education.eq("Graduate") + .2*d.Employment_Status.eq("Salaried")
                  + .15*d.Property_Area.ne("Rural"))
    else:
        purpose = d.Loan_Purpose.map({"Medical_Emergency": .35, "Education": .25,
                                     "Home_Renovation": .10, "Wedding": 0., "Travel": -.25,
                                     "Debt_Consolidation": -.40})
        if purpose.isna().any():
            raise ValueError("Unsupported synthetic loan purpose")
        result = (-.18 + 2.5*((d.CIBIL_Score-695)/100) - 4.5*(d.FOIR-.42)
                  - 2*(d.Credit_Card_Utilization-.4) - 1.4*d.Missed_Payments_12M
                  + .4*np.log(d.Applicant_Income/48000) + .3*d.Education.eq("Graduate")
                  + .25*d.Employment_Status.eq("Salaried") + .3*np.clip(d.Work_Experience/8, 0, 1)
                  + purpose)
    return result.to_numpy(dtype=float)


def label_applications(df: pd.DataFrame, product: str) -> np.ndarray:
    approved = (synthetic_score(df, product) >= 0) & ~rejection_flags(df, product).any(axis=1).to_numpy()
    return np.where(approved, "Approved", "Rejected")
