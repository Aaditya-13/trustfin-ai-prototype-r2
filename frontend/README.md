# TrustFin AI — Frontend Portal & Interface Guide

The **TrustFin AI Frontend** is an institutional decision-support and explainability governance dashboard built for commercial banking operations. 
It is purely functional, robust, and designed for dual stakeholders: **Credit Underwriting Officers** and **Retail Loan Applicants**.

---

## 1. Key Interface Features & Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ TrustFin Credit Decision & Audit System      [Credit Risk & Underwriting Division]      │
├─────────────────────────────────────────┬────────────────────────────────────────────────┤
│ Borrower Credit Application Dossier     │ Dual-Stakeholder Underwriting & Audit Console  │
│                                         │ [ Bank Underwriting Console ] [ Applicant ]    │
│ • Part I: Demographics & Employment     ├────────────────────────────────────────────────┤
│ • Part II: Cashflow & Proposed Credit   │ 1. Underwriting Determination Banner           │
│ • 1-Click Pre-Calibrated Benchmarks     │ 2. Official Bank PDF Report Action Card        │
│ • [ Execute Credit Underwriting ]       │ 3. Statutory Solvency Gate (FOIR / DTI)        │
│                                         │ 4. 4-Pillar Model Governance Audit Index       │
│                                         │ 5. Local Attribution Scorecard (SHAP / LIME)   │
│                                         │ 6. Cross-Auditor Concordance Matrix            │
└─────────────────────────────────────────┴────────────────────────────────────────────────┘
```

---

## 2. Interface Component Breakdown

### A. Enterprise Navigation Header (`App.jsx`)
- **System Classification**: *"TrustFin Credit Decision & Audit System — Institutional Credit Underwriting & Explainability Governance Portal"*.

---

### B. Borrower Credit Application Dossier (`ApplicantForm.jsx`)
A structured two-part intake form mirroring commercial bank loan appraisal formats:
1. **Part I: Borrower Demographic & Employment Classification**:
   - Gender, Marital Status, Number of Financial Dependents, Educational Qualification, Employment Sector (Salaried / Self-Employed / Unemployed), and Borrower Age.
2. **Part II: Household Cashflow & Proposed Credit Facility**:
   - Primary Net Monthly Income ($₹$), Co-Borrower Monthly Income ($₹$), Requested Principal ($₹$), Repayment Tenor (Months), Credit Bureau CIBIL Rating Proxy, and Collateral Jurisdiction Zone.
3. **Standard Underwriting Case Benchmarks**:
   - Quick-load pre-calibrated test profiles for rapid live appraisal demonstrations:
     - `Dossier #101: Prime Salaried Executive` (*Low Risk — Instant Sanction*)
     - `Dossier #102: Subprime Unemployed Applicant` (*Derogatory CIBIL — Rejection*)
     - `Dossier #103: Self-Employed Enterprise` (*Borderline Bureau — Marginal*)
     - `Dossier #104: High-Leverage Salaried` (*High Principal Burden*)
     - `Dossier #105: Dual-Income Prime Household` (*Co-Borrower Backed*)
     - `Dossier #106: Rural Micro-Enterprise` (*Priority Sector Lending*)
     - `Dossier #107: Severe Solvency Stress Test` (*FOIR > 1000% — Insolvent Breach*)

---

### C. Dual-Stakeholder Insights Dashboard (`InsightsDashboard.jsx`)

The right-hand console features an instant persona switcher:

#### View 1: Bank Underwriting & Regulatory Risk Audit Console
Designed for credit risk officers, auditors, and bank branch managers:
1. **Primary Underwriting Determination Banner**:
   - Instant determination: **`ELIGIBLE FOR APPROVAL`** (Green) or **`RECOMMENDED FOR REJECTION`** (Red).
   - Dossier tracking reference (e.g. `Dossier Ref #TF-2026-891`) and statistical confidence percentage.
2. **Official Bank PDF Report Card**:
   - Clean, flat, two-tier enterprise utility card.
   - Displays document title, status chip (`Sanction Advice` / `Adverse Notice`), and subtext.
   - Bottom action bar provides direct **`[ 👁 Preview Document ]`** and **`[ 📥 Download Official PDF ]`** buttons.
3. **Statutory Solvency & Debt-Service Compliance Gate (FOIR / DTI)**:
   - 4 high-contrast metric tiles: *Monthly Debt Service (EMI)*, *Household Net Income*, *Fixed Obligation to Income Ratio (FOIR)*, and *Net Monthly Cash Surplus*.
   - Flags statutory policy breaches when FOIR exceeds the 50.0% prudential ceiling, enforcing mandatory loan denial regardless of pure statistical score.
4. **Decision Explainability & Model Governance Audit Index**:
   - Live composite audit score ($0 - 100\%$) backed by **4 co-equal pillars (25% each)**:
     - **Fidelity (25%)**: Counterfactual feature masking.
     - **Robustness (25%)**: 1% Gaussian noise invariance.
     - **Consensus (25%)**: SHAP vs. LIME inter-auditor Jaccard agreement.
     - **Parity (25%)**: Counterfactual demographic invariance across protected classes.
   - Includes an expandable transparency drawer explaining academic and regulatory weighting proofs (Dawes 1979 / OECD 2008).
5. **Underwriting Scorecard Drivers (Local Attribution)**:
   - Horizontal bar charts rendering positive (green) and adverse (red) risk contributions.
   - Tab switcher between **Ensemble TreeSHAP** (cooperative game theory) and **Independent LIME** (local surrogate).
6. **Cross-Auditor Concordance Matrix**:
   - Cross-validation table comparing SHAP impact vs. LIME local weights side-by-side with official banking definitions and alignment badges (*Consensus Favorable*, *Consensus Adverse*, or *Methodology Divergence*).

---

#### View 2: Applicant Sanction & Adverse Action Notice
Formatted as an authentic, customer-facing **Bank Memorandum Letterhead**:
1. **Official Letterhead Header**:
   - Bank division branding, document type (*Provisional Facility Sanction Advice* vs. *Notice of Adverse Credit Determination*), generation date, dossier reference (`Ref: TF-SANCT-849201`), and header PDF **`Preview`** and **`Download`** buttons.
2. **Plain-Language Determination Statement**:
   - Completely strips out intimidating academic jargon; explains terms clearly in plain language.
3. **Household Monthly Cashflow & Affordability Breakdown**:
   - Displays verified income, monthly installment (EMI), and a color-coded visual debt burden meter (*Safe: 0-35%*, *Manageable: 35-50%*, *Insolvent: >50%*).
4. **Conditional Decision Breakdown**:
   - **If Approved**: Highlights key eligibility strengths (affordable debt servicing, clean bureau history, cashflow surplus) and outlines a 3-step guide for physical disbursement and KYC.
   - **If Rejected**: Outlines statutory Fair Lending adverse reasons (FOIR exceeded, adverse credit history, loan-to-income disproportion) and provides 4 actionable remediation steps (increase tenor, add earning co-borrower, lower principal, rebuild credit score).
5. **Institutional Sign-Off**:
   - Official Fair Lending and Equal Credit Opportunity compliance notice.

---

### D. Interactive In-App PDF Preview Modal
- Clicking **`Preview Document`** opens an in-app viewer displaying the generated single-page A4 bank memorandum directly inside the browser.
- Includes **Print**, **Download**, and **Close** controls without needing external PDF reader extensions.

---

## 3. Design System & Aesthetics (The "UIDAI" Standard)

| Token | Implementation | Rationale |
| :--- | :--- | :--- |
| **Primary Accent** | `#0056b3` (`bg-gov-blue`) | Official government/institutional banking blue |
| **Background** | `#f8f9fa` (`bg-gov-gray`) / `#ffffff` | Clean, flat, high-contrast paper look |
| **Clearance Color** | `#28a745` (`bg-gov-green`) | Official sanction green |
| **Adverse Color** | `#dc3545` (`bg-gov-red`) | High-visibility statutory rejection red |
| **Borders** | `1px solid #d1d5db` / `#cbd5e1` | Crisp architectural grid layout |
| **Corner Radius** | `rounded-sm` (`0.125rem` / `2px`) | Minimal rounding; eliminates consumer SaaS pill shapes |
| **Typography** | System UI / Segoe UI / Roboto | Clean, readable institutional typography |
| **Currency** | Indian Rupee (`₹`) | Standard localization |

---

## 4. Tech Stack & Dependencies

- **Framework**: React 19 with Vite
- **Styling**: Tailwind CSS v3 with customized enterprise tokens
- **Visualizations**: Recharts (horizontal attribution bar charts)
- **Icons**: Lucide React (feather-style enterprise icons)
- **API Client**: Axios with delayed blob revocation for seamless PDF streaming

---

## 5. Development & Build Scripts

From the `frontend/` directory:

```powershell
# Install dependencies
npm install

# Start local development server (Port 5173 with HMR)
npm run dev

# Compile production bundle
npm run build

# Preview production build locally
npm run preview
```
