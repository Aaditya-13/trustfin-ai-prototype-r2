import numpy as np
import pandas as pd
import os

def generate_personalloan_dataset(n_samples: int = 3000, random_state: int = 42) -> pd.DataFrame:
    """
    Generates a realistic, domain-accurate Indian Personal / Retail Loan dataset.
    
    Key Characteristics:
    - Unsecured lending: Zero property/collateral features.
    - Loan Tenures: 6 to 60 months (0.5 to 5 years).
    - Loan Amounts: ₹30,000 to ₹10,00,000 (₹30k to ₹10 Lakhs).
    - Authentic Unsecured Metrics:
        * Loan_Purpose: Medical_Emergency, Education, Home_Renovation, Wedding, Travel, Debt_Consolidation.
        * Credit_Card_Utilization: Revolving debt burden (5% to 95%).
        * CIBIL_Score: Continuous 300 to 900.
        * Missed_Payments_12M: Delinquency count (0 to 4).
    - Strict Underwriting:
        * Auto-Reject rules enforced (subprime CIBIL < 580, >= 3 delinquencies, FOIR > 60%, maxed credit card).
        * NO blind Auto-Approve (all applicants must qualify on multi-factor cash flow).
        * Calibrated ~50/50 balance with intentional demographic audit gap (Disparate Impact ~0.86).
    """
    np.random.seed(random_state)
    n = n_samples

    # 1. Demographics
    gender = np.random.choice(['Male', 'Female'], size=n, p=[0.60, 0.40])
    age = np.random.randint(21, 58, size=n)
    married = np.random.choice(['Yes', 'No'], size=n, p=[0.55, 0.45])
    dependents = np.random.choice([0, 1, 2, 3], size=n, p=[0.50, 0.25, 0.18, 0.07])
    education = np.random.choice(['Graduate', 'Not Graduate'], size=n, p=[0.75, 0.25])
    employment = np.random.choice(['Salaried', 'Self-Employed'], size=n, p=[0.75, 0.25])
    work_exp = np.array([max(1, min(a - 20, int(np.random.normal(a - 22, 2.5)))) for a in age])

    # 2. Monthly Income (₹18,000 to ₹2,50,000)
    base_inc = np.where(
        education == 'Graduate',
        np.random.lognormal(10.8, 0.45, size=n),
        np.random.lognormal(10.3, 0.40, size=n)
    )
    applicant_income = np.round(np.clip(base_inc, 18000, 250000), -2).astype(int)

    # 3. Existing Monthly EMIs
    existing_emi = np.round(applicant_income * np.random.beta(1.5, 8.5, size=n), -2).astype(int)

    # 4. Loan Term (6, 12, 24, 36, 48, 60 months)
    loan_term = np.random.choice([6, 12, 24, 36, 48, 60], size=n, p=[0.08, 0.20, 0.28, 0.24, 0.12, 0.08])

    # 5. Loan Amount (₹30k to ₹10 Lakhs, sized to income and tenure)
    term_years = loan_term / 12.0
    eligible_amt = applicant_income * np.clip(term_years * 1.8, 0.5, 5.0)
    rand_factor = np.random.uniform(0.6, 1.3, size=n)
    raw_loan_amt = eligible_amt * rand_factor
    loan_amount = np.round(np.clip(raw_loan_amt, 30000, 1000000), -3).astype(int)

    # 6. Loan Purpose
    purposes = ['Debt_Consolidation', 'Medical_Emergency', 'Home_Renovation', 'Education', 'Wedding', 'Travel']
    purpose_probs = [0.28, 0.22, 0.18, 0.14, 0.10, 0.08]
    loan_purpose = np.random.choice(purposes, size=n, p=purpose_probs)

    # 7. Credit Card Utilization Ratio (0.05 to 0.95)
    cc_util = np.round(np.random.beta(2.5, 3.5, size=n) * 0.90 + 0.05, 2)

    # 8. CIBIL Score (300 to 900)
    cibil_raw = 300 + 600 * np.random.beta(5.5, 2.8, size=n)
    cibil_score = np.round(np.clip(cibil_raw, 320, 895)).astype(int)

    # 9. Missed Payments (delinquencies in 12M, conditioned on CIBIL)
    missed_payments = []
    for c in cibil_score:
        if c >= 780:
            m = np.random.choice([0, 1], p=[0.96, 0.04])
        elif c >= 720:
            m = np.random.choice([0, 1, 2], p=[0.82, 0.15, 0.03])
        elif c >= 640:
            m = np.random.choice([0, 1, 2, 3], p=[0.55, 0.30, 0.12, 0.03])
        elif c >= 550:
            m = np.random.choice([0, 1, 2, 3], p=[0.25, 0.40, 0.25, 0.10])
        else:
            m = np.random.choice([1, 2, 3, 4], p=[0.15, 0.40, 0.30, 0.15])
        missed_payments.append(m)
    missed_payments = np.array(missed_payments)

    # 10. Monthly EMI & FOIR (at 13.5% p.a. standard unsecured personal loan rate)
    r = 0.135 / 12
    monthly_emi = np.round(loan_amount * (r * (1 + r)**loan_term) / ((1 + r)**loan_term - 1), 2)
    foir = np.round((existing_emi + monthly_emi) / applicant_income, 4)

    # 11. Purpose Risk Weighting
    purpose_map = {
        'Medical_Emergency': 0.35,
        'Education': 0.25,
        'Home_Renovation': 0.10,
        'Wedding': 0.0,
        'Travel': -0.25,
        'Debt_Consolidation': -0.40
    }
    purpose_score = np.array([purpose_map[p] for p in loan_purpose])

    # 12. Latent Log-Odds Score
    z = (
        -0.18 +
        2.5 * ((cibil_score - 695) / 100.0) +
        -4.5 * (foir - 0.42) +
        -2.0 * (cc_util - 0.40) +
        -1.4 * missed_payments +
        0.4 * np.log(applicant_income / 48000.0) +
        0.3 * (education == 'Graduate').astype(float) +
        0.25 * (employment == 'Salaried').astype(float) +
        0.3 * np.clip(work_exp / 8.0, 0, 1) +
        purpose_score
    )

    # Borderline demographic friction for Fairness Pillar
    borderline = np.abs(z) < 1.0
    z_adj = z.copy()
    z_adj[(gender == 'Female') & borderline] -= 0.65

    # Hard Auto-Reject rules ONLY (NO auto-approve)
    hard_reject = (
        (cibil_score < 580) |
        (missed_payments >= 3) |
        (foir > 0.60) |
        (cc_util > 0.88) |
        (applicant_income < 19000)
    )

    prob = 1.0 / (1.0 + np.exp(-z_adj))
    status = np.where(prob >= 0.50, 'Approved', 'Rejected')
    status[hard_reject] = 'Rejected'

    df = pd.DataFrame({
        'Loan_ID': [f'PL{i+1:05d}' for i in range(n)],
        'Gender': gender,
        'Age': age,
        'Married': married,
        'Dependents': dependents,
        'Education': education,
        'Employment_Status': employment,
        'Work_Experience': work_exp,
        'Applicant_Income': applicant_income,
        'Existing_EMI': existing_emi,
        'Loan_Amount': loan_amount,
        'Loan_Term': loan_term,
        'Loan_Purpose': loan_purpose,
        'Credit_Card_Utilization': cc_util,
        'CIBIL_Score': cibil_score,
        'Missed_Payments_12M': missed_payments,
        'Loan_Status': status
    })

    return df

if __name__ == '__main__':
    os.makedirs('datasets', exist_ok=True)
    df = generate_personalloan_dataset(n_samples=3000, random_state=42)
    output_path = os.path.join('datasets', 'personalloan_train.csv')
    df.to_csv(output_path, index=False)
    print(f"Generated {len(df)} records -> {output_path}")
    print("\nClass Distribution:")
    print(df['Loan_Status'].value_counts(normalize=True))
    print(df['Loan_Status'].value_counts())
    print("\nGender Approval Rates:")
    print(df.groupby('Gender')['Loan_Status'].value_counts(normalize=True).unstack())

