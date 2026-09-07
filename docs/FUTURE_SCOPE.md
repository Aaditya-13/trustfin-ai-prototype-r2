# TrustFin AI: Future Scope & Strategic Roadmap

This document outlines the strategic engineering roadmap and academic research extensions for **TrustFin AI**. These items are prioritized based on regulatory necessity, commercial banking utility, and academic rigor for research evaluation.

---

## Roadmap Priority Matrix

| Phase | Milestone / Feature | Core Objective | Key Regulatory & Academic Standards |
| :---: | :--- | :--- | :--- |
| **Priority 1** | **Actionable Counterfactual Recourse Engine** | Transform post-hoc rejection reasons into exact, actionable steps for credit approval. | GDPR Art. 22 (Right to Explanation), ECOA § 701, DiCE, Causal ML |
| **Priority 2** | **Enterprise Database Persistence & Audit Trail** | Store timestamped underwriting dossiers and officer sign-offs in a relational store. | Basel III/IV, RBI Fair Practice Code, Model Risk Management (SR 11-7) |
| **Priority 3** | **Batch Loan Processing & Portfolio Risk Analytics** | Enable bulk evaluation of 50–500 loan applications with portfolio fairness audits. | Commercial Retail Operations, Disparate Impact (4/5ths Rule) |

---

## 1. Actionable Counterfactual Recourse & Interactive "What-If" Simulator (Priority 1 — Most Essential)

### 1.1 The Theoretical & Practical Problem
Traditional Explainable AI (SHAP and LIME) provides **post-hoc diagnostic attribution**: it explains *which features* contributed negatively to a loan denial (e.g., *"Applicant Income contributed -2.14 log-odds, and Repayment Tenor contributed -1.20"*). 

While diagnostic attribution fulfills basic transparency, **it is practically useless to an applicant seeking credit**, and fails modern algorithmic justice criteria:
1. **Diagnostic $\neq$ Actionable**: Telling an applicant their income is insufficient does not tell them *how much* additional income is needed, or whether adjusting the loan terms would suffice.
2. **Regulatory Mandates for Recourse**: Under the **US Equal Credit Opportunity Act (ECOA § 701)** and the **EU General Data Protection Regulation (GDPR Article 22)**, adverse action notices must provide specific, actionable reasons and paths to remediation.
3. **The Counterfactual Standard**: Explainability literature (Wachter et al., 2017; Mothilal et al., 2020 — *DiCE: Diverse Counterfactual Explanations*) establishes that the gold standard of XAI is **Counterfactual Recourse**: answering *"What is the smallest, most realistic change to the applicant's profile that flips the model outcome from Rejected to Approved?"*

---

### 1.2 Mathematical Formulation of Counterfactual Recourse

Given a trained model $f(x) \in \{0, 1\}$ and an input vector $x$ where $f(x) = 0$ (Rejected), the counterfactual recourse engine finds a perturbed instance $x^*$ solving:

$$\min_{x^*} \text{dist}(x, x^*) + \lambda \, \mathcal{L}\big(f(x^*), 1\big) \quad \text{subject to } x^* \in \mathcal{C}_{\text{feasible}}$$

Where:
- $\text{dist}(x, x^*)$ is the normalized Manhattan distance weighted by inverse median absolute deviation (MAD) to prevent penalizing features with naturally high variances:
  $$\text{dist}(x, x^*) = \sum_{j=1}^{d} \frac{|x_j - x^*_j|}{\text{MAD}_j}$$
- $\mathcal{L}\big(f(x^*), 1\big)$ is the prediction loss driving the output to **Approved** ($f(x^*) = 1$).
- $\mathcal{C}_{\text{feasible}}$ represents **Institutional & Physical Actionability Constraints**:
  - **Immutable Features**: Protected demographics (`Gender`, `Age`, `Marital_Status`) are strictly frozen:
    $$x^*_j = x_j \quad \forall j \in \{\text{Gender}, \text{Age}, \text{Marital\_Status}\}$$
  - **Monotonic Features**: `Credit_History` cannot be instantly forged or artificially increased; past delinquency must heal via time.
  - **Actionable Financial Levers**:
    - $\text{Loan\_Term} \in [12, 360]$ months (repayment horizon extension).
    - $\text{Loan\_Amount} \in [\text{Min}, x_{\text{Loan\_Amount}}]$ (principal reduction).
    - $\text{Coapplicant\_Income} \in [0, \infty)$ (adding a creditworthy co-borrower).
  - **Deterministic Solvency Constraint**: $x^*$ must satisfy the statutory lending gate:
    $$\text{FOIR}(x^*) = \frac{\text{EMI}(x^*_{\text{Loan\_Amount}}, x^*_{\text{Loan\_Term}})}{x^*_{\text{Applicant\_Income}} + x^*_{\text{Coapplicant\_Income}}} \le 0.50$$

---

### 1.3 System Implementation Architecture

```
[ Applicant Rejection Dossier ]
              │
              ▼
[ Counterfactual Recourse Engine (DiCE / Constrained Optimization) ]
              │
              ├── Frozen: Gender, Age, Marital Status, Education
              ├── Optimization Targets: Loan_Term (↑), Loan_Amount (↓), Coapplicant_Income (↑)
              └── Hard Barrier: FOIR <= 50.0% (Solvency Guardrail)
              │
              ▼
[ Minimal Recourse Triplet Computed ]
  • Option A: Extend Tenor: 180 Mo ➔ 240 Mo (EMI drops ₹18,400 ➔ ₹13,200 | FOIR: 42.1%)
  • Option B: Lower Principal: ₹300,000 ➔ ₹210,000 (EMI drops to ₹14,100 | FOIR: 45.0%)
  • Option C: Add Co-Borrower with verified income >= ₹22,000/mo
              │
              ▼
[ Interactive "What-If" Recourse Simulator UI ]
  • Live Range Sliders for Loan Term & Loan Principal
  • Dynamic FOIR Gauge with real-time recalculation
  • Instant Status Flip: [ STATUTORY CLEARANCE ACHIEVED ]
```

---

### 1.4 Frontend UI Specification: The "What-If" Recourse Simulator

In the **Applicant Sanction & Adverse Action Notice View**, rejected applicants will receive an interactive **Eligibility Recourse Sandbox**:

1. **Interactive Financial Levers**:
   - **Tenor Slider**: Drag from current tenor (e.g., 180 months) up to 360 months.
   - **Loan Principal Slider**: Drag requested loan amount downwards from current request (e.g., ₹400,000 down to ₹200,000).
   - **Co-Borrower Income Input**: Enter proposed guarantor / co-applicant income.
2. **Real-Time Solvency Feedback**:
   - As the applicant drags sliders, the **FOIR progress bar** dynamically shifts from red (`Insolvent > 50%`) through amber (`Manageable 35-50%`) to green (`Optimal < 35%`).
   - The monthly net cash surplus updates synchronously: `₹ Total Income - ₹ Recalculated EMI`.
3. **Instant "Recourse Approved" Pre-Qualification**:
   - When the simulated numbers cross the solvency threshold and ML confidence requirement, the UI displays a green clearance banner:
     > **`Simulation Benchmark Met: Eligible for Reapplication under Simulated Terms`**
   - Includes a one-click button: **`[ Update Application with Simulated Terms ]`** to re-submit directly for underwriting.

---

## 2. Enterprise Database Persistence & Regulatory Audit Trail (Priority 2)

### 2.1 The Need for Institutional Persistence
Currently, TrustFin AI evaluates applications statelessly in memory. In commercial banking governance, **unlogged automated decisions are a direct violation of regulatory standards**:
- **BCBS 239 (Risk Data Aggregation)**: Banks must maintain an immutable history of risk calculations.
- **Federal Reserve SR 11-7 / OCC 2011-12 (Model Risk Management)**: Every automated credit appraisal must preserve an audit trail showing the input data, model version, prediction probability, and explainability attributions.
- **Fair Lending Examination Audits**: Regulators periodically sample historical determinations to test for disparate impact across protected classes over time.

---

### 2.2 Relational Database Schema (`PostgreSQL / SQLite via SQLAlchemy`)

```sql
-- 1. Core Underwriting Dossiers
CREATE TABLE underwriting_dossiers (
    dossier_id VARCHAR(32) PRIMARY KEY, -- e.g., 'TF-2026-891'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    applicant_gender VARCHAR(10) NOT NULL,
    applicant_age INTEGER NOT NULL,
    marital_status VARCHAR(10) NOT NULL,
    dependents INTEGER NOT NULL,
    education VARCHAR(20) NOT NULL,
    employment_status VARCHAR(20) NOT NULL,
    applicant_income NUMERIC(12, 2) NOT NULL,
    coapplicant_income NUMERIC(12, 2) NOT NULL,
    loan_amount NUMERIC(12, 2) NOT NULL,
    loan_term INTEGER NOT NULL,
    credit_history INTEGER NOT NULL,
    property_area VARCHAR(20) NOT NULL
);

-- 2. Appraisal Outcomes & Solvency Gate Rulings
CREATE TABLE appraisal_outcomes (
    outcome_id SERIAL PRIMARY KEY,
    dossier_id VARCHAR(32) REFERENCES underwriting_dossiers(dossier_id),
    model_version VARCHAR(20) NOT NULL, -- e.g., 'v1.2-hybrid'
    raw_prediction VARCHAR(10) NOT NULL, -- 'Approved' / 'Rejected'
    confidence_score NUMERIC(5, 4) NOT NULL,
    monthly_emi NUMERIC(10, 2) NOT NULL,
    total_household_income NUMERIC(12, 2) NOT NULL,
    foir_ratio NUMERIC(6, 4) NOT NULL,
    is_solvent BOOLEAN NOT NULL,
    solvency_override_applied BOOLEAN DEFAULT FALSE,
    final_determination VARCHAR(10) NOT NULL
);

-- 3. Model Governance & XAI Trust Validation Records
CREATE TABLE xai_trust_records (
    trust_id SERIAL PRIMARY KEY,
    dossier_id VARCHAR(32) REFERENCES underwriting_dossiers(dossier_id),
    faithfulness_score NUMERIC(5, 4) NOT NULL,
    stability_score NUMERIC(5, 4) NOT NULL,
    consistency_score NUMERIC(5, 4) NOT NULL,
    parity_score NUMERIC(5, 4) NOT NULL,
    composite_trust_score NUMERIC(5, 4) NOT NULL,
    audit_classification VARCHAR(30) NOT NULL, -- 'HIGH_RELIABILITY' | 'SECONDARY_REVIEW' | 'ANOMALY'
    top_shap_features JSONB NOT NULL,
    top_lime_features JSONB NOT NULL
);

-- 4. Officer Review & Document Signature Ledger
CREATE TABLE officer_review_ledger (
    review_id SERIAL PRIMARY KEY,
    dossier_id VARCHAR(32) REFERENCES underwriting_dossiers(dossier_id),
    officer_id VARCHAR(50) NOT NULL,
    officer_action VARCHAR(20) NOT NULL, -- 'COUNTER_SIGNED' | 'OVERRIDDEN' | 'FLAGGED_FOR_AUDIT'
    officer_notes TEXT,
    pdf_sha256_hash VARCHAR(64) NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

### 2.3 Bank Console Historical Ledger UI
- **Auditing Table**: Loan officers can view past appraisals with filterable columns: *Dossier Ref*, *Date*, *Income*, *Loan Amount*, *FOIR*, *Determination*, and *Trust Score*.
- **Anomaly Investigation Queue**: A dedicated filter for appraisals where Trust Score $< 50\%$ or where the Solvency Gate overrode the raw ML prediction, allowing instant review of edge cases.

---

## 3. High-Throughput Batch Loan Processing & Portfolio Risk Analytics (Priority 3)

### 3.1 Commercial Need
In real-world retail banking, loan operations process bulk loan files submitted by mortgage brokers, corporate tie-ups, or micro-finance field units. Processing applications one-by-one is inefficient for large portfolios.

---

### 3.2 Batch Pipeline Architecture

1. **Intake API**:
   - `POST /api/v1/loan/batch-evaluate` accepting `.csv` or `.xlsx` files with up to 500 applicant records.
2. **Chunked Pipeline Execution**:
   - **Vectorized Preprocessing**: Scikit-learn pipeline applies transformations in memory across all rows simultaneously.
   - **Batched Inference**: XGBoost batch scoring computes predictions and confidence probabilities in under 200ms for 500 records.
   - **Vectorized Solvency Gate**: NumPy-based EMI and FOIR vector evaluation flags statutory policy breaches instantly.
   - **Lightweight Sampled XAI Audit**: Computes TreeSHAP for the entire batch; samples 10% for intensive LIME surrogate validation to optimize compute latency.
3. **Portfolio Risk Summary & Export**:
   - **Portfolio Clearance Rate**: Total applications evaluated, count approved vs. rejected, total credit volume sanctioned ($₹$).
   - **Insolvency Breach Heatmap**: Identifies clusters of high-leverage applicants violating the 50.0% FOIR limit.
   - **Portfolio Demographic Parity Report**: Automatically evaluates the four-fifths rule across male vs. female applicants to certify portfolio-wide Fair Lending compliance before final disbursements.
   - **Bulk PDF Archive**: One-click download of a `.zip` archive containing all 500 individual 1-page A4 commercial sanction letters and adverse action notices.

---

## Summary of Academic & Engineering Deliverables

```
TrustFin AI Current State (Stage 8 Completed)
├── Hybrid ML Model (XGBoost + Solvency Guardrail)
├── Multi-Auditor XAI (TreeSHAP + LIME)
├── 4-Pillar Equal-Weighted Trust Index (Fidelity, Stability, Consensus, Parity)
├── Official 1-Page A4 PDF Generator (ReportLab with TrueType fonts)
└── Dual-Persona UIDAI Enterprise Dashboard (Bank Console vs. Applicant Notice)
      │
      ▼ Future Scope Implementation Path
      │
      ├── [Phase 1] Counterfactual Recourse Engine (DiCE + Interactive Sliders)
      ├── [Phase 2] Relational Persistence & Historical Audit Ledger (PostgreSQL + SQLAlchemy)
      └── [Phase 3] High-Throughput Batch Processing & Portfolio Analytics (CSV + Zip Export)
```
