import numpy as np
import pandas as pd
import os

def generate_homeloan_dataset(n_samples: int = 3000, random_state: int = 42) -> pd.DataFrame:
    """
    Generates a realistic, domain-accurate Indian Home Loan (Housing Finance) dataset.
    
    Key Characteristics:
    - Loan Tenures: 5 to 30 years (60, 120, 180, 240, 300, 360 months).
    - Loan Amounts: ₹3 Lakhs to ₹1 Crore (₹300,000 to ₹10,000,000).
    - Collateral: Property_Value and Property_Area (Urban, Semiurban, Rural).
    - Bureau Credit: CIBIL_Score (300 to 900) + Missed_Payments_12M (0 to 4).
    - Ground Truth Underwriting: Balanced ~50% Approved / 50% Rejected with clear,
      learnable decision boundaries and realistic demographic fairness metrics
      (Disparate Impact ratio ~0.82) to demonstrate TrustFin AI's Fairness Pillar.
    """
    np.random.seed(random_state)
    n = n_samples

    # 1. Demographics
    gender = np.random.choice(['Male', 'Female'], size=n, p=[0.60, 0.40])
    age = np.random.randint(23, 58, size=n)
    married = np.random.choice(['Yes', 'No'], size=n, p=[0.68, 0.32])
    education = np.random.choice(['Graduate', 'Not Graduate'], size=n, p=[0.78, 0.22])
    employment = np.random.choice(['Salaried', 'Self-Employed'], size=n, p=[0.72, 0.28])
    dependents = np.random.choice([0, 1, 2, 3], size=n, p=[0.42, 0.26, 0.22, 0.10])
    work_exp = np.array([max(1, min(a - 21, int(np.random.normal(a - 23, 2.5)))) for a in age])
    prop_area = np.random.choice(['Urban', 'Semiurban', 'Rural'], size=n, p=[0.45, 0.35, 0.20])

    # 2. Incomes
    base_inc = np.where(
        education == 'Graduate',
        np.random.lognormal(11.0, 0.45, size=n),
        np.random.lognormal(10.5, 0.40, size=n)
    )
    applicant_income = np.round(np.clip(base_inc, 20000, 350000), -2).astype(int)

    coapp_prob = np.where(married == 'Yes', 0.65, 0.20)
    has_coapp = np.random.rand(n) < coapp_prob
    coapp_inc = np.where(has_coapp, np.random.lognormal(10.4, 0.42, size=n), 0)
    coapplicant_income = np.round(np.clip(coapp_inc, 0, 200000), -2).astype(int)

    total_income = applicant_income + coapplicant_income

    # 3. Existing debt obligations
    existing_emi = np.round(applicant_income * np.random.beta(1.5, 9.0, size=n), -2).astype(int)

    # 4. Loan Term (constrained by age: age + term/12 <= 65)
    max_allowed_term_years = np.clip(65 - age, 5, 30)
    possible_terms = np.array([60, 120, 180, 240, 300, 360])
    loan_term = []
    for m in max_allowed_term_years:
        valid = possible_terms[possible_terms <= m * 12]
        if len(valid) == 0:
            valid = np.array([60])
        loan_term.append(int(np.random.choice(valid)))
    loan_term = np.array(loan_term)

    # 5. Loan Amount (₹3L to ₹1Cr, sized realistically to income and tenure)
    term_years = loan_term / 12.0
    eligible_amt = total_income * term_years * 2.3
    rand_factor = np.random.uniform(0.7, 1.25, size=n)
    raw_loan_amt = eligible_amt * rand_factor
    loan_amount = np.round(np.clip(raw_loan_amt, 300000, 10000000), -4).astype(int)

    # 6. Property Value & LTV (Loan-to-Value)
    # LTV typically between 60% and 88%, occasionally higher for stretched applicants
    ltv_target = np.random.beta(6.0, 2.5, size=n) * 0.30 + 0.60
    property_value = np.round(loan_amount / ltv_target, -4).astype(int)
    actual_ltv = (loan_amount / property_value) * 100.0

    # 7. CIBIL Score (300 to 900)
    cibil_raw = 300 + 600 * np.random.beta(5.8, 2.6, size=n)
    cibil_score = np.round(np.clip(cibil_raw, 320, 895)).astype(int)

    # 8. Missed Payments (delinquencies in 12M, strongly inverse to CIBIL)
    missed_payments = []
    for c in cibil_score:
        if c >= 780:
            m = np.random.choice([0, 1], p=[0.97, 0.03])
        elif c >= 720:
            m = np.random.choice([0, 1, 2], p=[0.85, 0.13, 0.02])
        elif c >= 640:
            m = np.random.choice([0, 1, 2, 3], p=[0.60, 0.28, 0.10, 0.02])
        elif c >= 550:
            m = np.random.choice([0, 1, 2, 3], p=[0.30, 0.40, 0.22, 0.08])
        else:
            m = np.random.choice([1, 2, 3, 4], p=[0.15, 0.40, 0.30, 0.15])
        missed_payments.append(m)
    missed_payments = np.array(missed_payments)

    # 9. Monthly EMI & FOIR
    r = 0.085 / 12  # Standard 8.5% annual home loan rate
    monthly_emi = np.round(loan_amount * (r * (1 + r)**loan_term) / ((1 + r)**loan_term - 1), 2)
    foir = np.round((existing_emi + monthly_emi) / total_income, 4)

    # 10. Underwriting Latent Log-Odds (Calibrated for ~50/50 balance)
    z = (
        0.05 +
        2.3 * ((cibil_score - 690) / 100.0) +
        -3.8 * (foir - 0.45) +
        -0.08 * (actual_ltv - 75.0) +
        -1.2 * missed_payments +
        0.4 * np.log(total_income / 65000.0) +
        0.25 * (education == 'Graduate').astype(float) +
        0.2 * (employment == 'Salaried').astype(float) +
        0.15 * (prop_area != 'Rural').astype(float)
    )

    # Demographic friction in borderline band (|z| < 1.0) to demonstrate fairness audit
    borderline = np.abs(z) < 1.0
    z_adj = z.copy()
    z_adj[(gender == 'Female') & borderline] -= 0.65

    # Regulatory & Business Hard Guardrails
    hard_reject = (cibil_score < 560) | (missed_payments >= 3) | (foir > 0.68) | (actual_ltv > 92.0)
    hard_approve = (cibil_score >= 770) & (foir <= 0.40) & (actual_ltv <= 78.0) & (missed_payments == 0)

    prob = 1.0 / (1.0 + np.exp(-z_adj))
    status = np.where(prob >= 0.50, 'Approved', 'Rejected')
    status[hard_reject] = 'Rejected'
    status[hard_approve] = 'Approved'

    df = pd.DataFrame({
        'Loan_ID': [f'HL{i+1:05d}' for i in range(n)],
        'Gender': gender,
        'Married': married,
        'Dependents': dependents,
        'Education': education,
        'Employment_Status': employment,
        'Age': age,
        'Work_Experience': work_exp,
        'Applicant_Income': applicant_income,
        'Coapplicant_Income': coapplicant_income,
        'Existing_EMI': existing_emi,
        'Loan_Amount': loan_amount,
        'Loan_Term': loan_term,
        'Property_Value': property_value,
        'Property_Area': prop_area,
        'CIBIL_Score': cibil_score,
        'Missed_Payments_12M': missed_payments,
        'Loan_Status': status
    })

    return df

if __name__ == '__main__':
    os.makedirs('datasets', exist_ok=True)
    df = generate_homeloan_dataset(n_samples=3000, random_state=42)
    output_path = os.path.join('datasets', 'homeloan_train.csv')
    df.to_csv(output_path, index=False)
    print(f"Generated {len(df)} records -> {output_path}")
    print("\nClass Distribution:")
    print(df['Loan_Status'].value_counts(normalize=True))
    print(df['Loan_Status'].value_counts())
    print("\nGender Approval Rates:")
    print(df.groupby('Gender')['Loan_Status'].value_counts(normalize=True).unstack())

