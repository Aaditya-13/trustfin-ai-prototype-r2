# TrustFin AI — Project Context & Developer Reference

> **For Team Members & AI Agents**:  
> This document provides complete context on the system architecture, mathematical methodologies, codebase structure, operational instructions, and current development roadmap. Any developer or AI agent joining this repository can read this single file to understand what is happening and continue development without regression.

---

## 1. Executive Summary & Research Goal

**TrustFin AI** is an Explainable AI (XAI) Decision-Support System designed for financial institutions (specifically loan credit approval). 

### The Core Problem
Traditional ML systems provide "black-box" predictions. While XAI methods like SHAP and LIME provide post-hoc explanations, **how does a bank or loan officer know if the explanation itself is trustworthy?** Explainers can be unfaithful to the underlying model, highly unstable to minor input noise, or contradict other explainers.

### The Solution
TrustFin AI does two things:
1. Predicts loan eligibility and provides intuitive local explanations (SHAP feature attribution bar charts).
2. **Validates the explanation quality mathematically** using a composite **Trust Validation Score** across three dimensions:
   - **Faithfulness** (Does masking top features actually degrade the model's confidence?)
   - **Stability** (Do tiny perturbations to input create wild changes in feature rankings?)
   - **Consistency** (Do SHAP and LIME agree on the decisive decision drivers?)

If a model makes a wild guess or an explainer hallucinates importance, the **Trust Score plummets**, alerting the credit officer to audit the case manually.

---

## 2. System Architecture & Tech Stack

```
[ React Frontend (Vite + Tailwind v3) ]  <-- Port 5173 (UIDAI-style enterprise flat UI)
              │
              ▼ REST API (HTTP POST /api/v1/loan/predict)
[ FastAPI Backend ]                      <-- Port 8000
    ├── Preprocessor (ColumnTransformer)
    ├── XGBoost Classifier (Baseline)
    ├── SHAP TreeExplainer
    ├── LIME TabularExplainer
    ├── Trust Validation Engine (Faithfulness, Stability, Consistency)
    └── Neon PostgreSQL (SQLAlchemy Audit Logging)
```

- **Backend**: Python 3.13, FastAPI, Uvicorn, Pydantic v2.
- **ML & XAI**: Scikit-Learn, XGBoost, SHAP (`TreeExplainer`), LIME (`LimeTabularExplainer`), SciPy.
- **Database**: Serverless PostgreSQL hosted on **Neon DB**, accessed via SQLAlchemy ORM (`backend/app/db/`).
- **Frontend**: React 18, Vite, Tailwind CSS v3 (`@tailwindcss/postcss` with pinned v3.4.17 for maximum stability), Axios, Lucide React.
- **UI Design System**: Clean, flat, enterprise/government aesthetic (inspired by India's UIDAI portal). Crisp high-contrast borders (`#0b4d75` Gov Navy / Blue, `#f4f6f8` gray backgrounds, sharp 2px corners, standard Indian Rupee `₹` currency, no generic dark mode or neon glow cards).

---

## 3. Mathematical Validation Methodology (Trust Score)

The Trust Score $T \in [0.0, 1.0]$ is an institutional composite of four co-equal regulatory dimensions (25% each, aligned with Dawes 1979 and OECD 2008 equal weighting standards):

$$T = (0.25 \times \text{Faithfulness}) + (0.25 \times \text{Stability}) + (0.25 \times \text{Consistency}) + (0.25 \times \text{Parity})$$

### A. Faithfulness (Comprehensiveness)
- **Concept**: If feature $f_i$ is truly important, nullifying it should cause a sharp drop in prediction probability for the chosen class.
- **Algorithm**:
  1. Identify Top-$K$ features ($K=3$) from the explanation.
  2. Perturb these features using directional counterfactual baselines:
     - For Approved applicants: positive drivers are zeroed out (`Credit_History` $\to 0.0$).
     - For Rejected applicants: penalty drivers are set to positive baselines (`Credit_History` $\to 1.0$).
  3. $\text{Score} = |P(x) - P(x_{perturbed})|$, clipped to $[0.0, 1.0]$.

### B. Stability (Local Robustness)
- **Concept**: A robust explanation should not flip upside down if the applicant's salary or loan amount changes by 1%.
- **Algorithm**:
  1. Injected Gaussian noise $\mathcal{N}(0, 0.01)$ into continuous inputs.
  2. Generate new explanation $E(x_{perturbed})$.
  3. Compute **Spearman Rank Correlation** between feature weights of $E(x)$ and $E(x_{perturbed})$.
  4. Scaled from $[-1, 1]$ to $[0, 1]$: $\text{Score} = \frac{\rho + 1}{2}$.
  4. Scaled from $[-1, 1]$ to $[0, 1]: \text{Score} = \frac{\rho + 1}{2}$.

### C. Consistency (Methodological Agreement)
- **Concept**: Two independent explanation paradigms (SHAP = Shapley values from cooperative game theory; LIME = local linear surrogate) should agree on the most critical factors.
- **Algorithm**:
  1. Extract Top-$K$ features from SHAP and LIME ($K=3$).
  2. Compute **Jaccard Similarity**:
     $$\text{Consistency} = \frac{| TopK_{SHAP} \cap TopK_{LIME} |}{| TopK_{SHAP} \cup TopK_{LIME} |}$$

### D. Parity (Counterfactual Demographic Invariance)
- **Concept**: A fair algorithmic decision must remain invariant when protected demographic attributes (e.g., `Gender`) are flipped, holding all financial variables constant.
- **Algorithm**:
  1. Generate counterfactual instance $x'$ by flipping `Gender` (`Male` $\leftrightarrow$ `Female`).
  2. Compute output prediction probability $P(x')$.
  3. $\text{Score} = 1.0 - |P(x) - P(x')|$, bounded in $[0.0, 1.0]$.
  4. Enforces the 80% four-fifths rule and statutory Equal Credit Opportunity Act compliance.

### Empirical Proof of Validity (The Ablation Experiment)
When `Credit_History` was temporarily ablated from training, the model's accuracy dropped to ~50% (random coin toss). In this degraded state:
- SHAP and LIME completely disagreed (Consistency fell to **0.0%**).
- Masking features had almost no impact (Faithfulness fell to **12.7%**).
- **The Composite Trust Score plummeted to 32.2%**, successfully proving that TrustFin AI mathematically flags untrustworthy predictions.

### Empirical Finding 2: Shortcut Learning & The Faithfulness vs. Soundness Paradox
During extreme simulation testing (Income ₹2,500 vs. Loan ₹80,000 for 3 months $\to$ EMI ₹26,667/month), pure statistical ML approved the loan with 99.6% confidence due to `Credit_History = 1` dominance (+4.61 log-odds vs -1.78 income).
- **The Finding**: The Trust Score was **83.2% (`HIGH TRUST`)** with **99.6% Faithfulness**.
- **The Academic Insight**: The explainer was 100% faithful to the model's actual decision path (the model genuinely ignored insolvency). This proves that **Explanation Faithfulness $\neq$ Financial Soundness**, demonstrating why real-world banking AI requires a **Hybrid Architecture (XAI Trust Score + Deterministic Solvency Guardrail)**.
- **Implemented Resolution (Option 3)**: We engineered explicit `Monthly_EMI` and `DTI_Ratio` features, augmented the training boundary cases, and added a deterministic regulatory solvency guardrail on the backend and UI. The model now correctly rejects the insolvent applicant with **99.63% confidence**, while SHAP directly highlights `Applicant_Income` ($-5.02$) and `DTI_Ratio` ($-1.93$) as the top rejection drivers!
- Full details documented in [`docs/RESEARCH_FINDINGS_SHORTCUT_BIAS.md`](file:///d:/Coding/final-yr-project/trustfin-ai-proto/docs/RESEARCH_FINDINGS_SHORTCUT_BIAS.md) for Project Review Criterion 1.

### Empirical Finding 3: Commercial Banking UI & Dual-Stakeholder Perspective
Standard developer-focused prototypes expose raw Python variables (`Applicant_Income`, `DTI_Ratio`, `Monthly_EMI`) and mathematical jargon (`log-odds`, `Gaussian perturbation`), which fail in real-world commercial banking.
- **The Solution**: We created a **Dual-Perspective Stakeholder Architecture**:
  1. **Bank Credit Underwriting & Risk Audit Console**: Official credit determination (`AUTO SANCTION` vs. `DECLINED`), statutory FOIR/DTI clearance, 4-pillar model audit index, and SHAP vs. LIME concordance.
  2. **Applicant Sanction & Adverse Action Notice**: Official bank letterhead with plain-language reasons for credit decisions, household cashflow breakdown (Income vs. EMI vs. Net Surplus), visual affordability gauge, and actionable remediation guidance to improve credit eligibility.
  3. **Standard Banking Lexicon**: Centralized dictionary in `frontend/src/utils/bankingTerms.js` mapping all data pipeline variables to formal retail banking terms.
- Full details documented in [`docs/BANKING_UI_AND_TERMINOLOGY_TRANSFORMATION.md`](file:///d:/Coding/final-yr-project/trustfin-ai-proto/docs/BANKING_UI_AND_TERMINOLOGY_TRANSFORMATION.md).

---

## 4. Codebase Directory Map

```
trustfin-ai-proto/
│
├── .agents/                        # Agent workflows and skill definitions
├── backend/
│   └── app/
│       ├── main.py                 # FastAPI application, CORS, router mounting
│       ├── api/
│       │   ├── schemas.py          # Pydantic schemas (LoanApplicationRequest, LoanPredictionResponse)
│       │   └── routes/
│       │       └── prediction.py   # Main POST /predict endpoint (Pipeline, XAI, Trust, DB Logging)
│       ├── ml/
│       │   └── preprocessing.py    # Feature definitions and Scikit-learn ColumnTransformer
│       ├── explainability/
│       │   ├── schemas.py          # StandardExplanation and FeatureContribution schemas
│       │   ├── shap_explainer.py   # TreeExplainer wrapper for XGBoost
│       │   └── lime_explainer.py   # LimeTabularExplainer wrapper with training baseline
│       ├── validation/
│       │   ├── faithfulness.py     # Counterfactual masking faithfulness calculation
│       │   ├── stability.py        # Spearman rank correlation stability calculation
│       │   └── consistency.py      # Top-K Jaccard similarity consistency calculation
│       ├── trust/
│       │   └── trust_score.py      # Composite Trust Evaluation engine
│       └── db/
│           ├── session.py          # SQLAlchemy engine & sessionmaker connected to Neon DB
│           └── models.py           # PredictionLog model schema (stores inputs, outputs, scores, raw JSON)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # Top-level container, header, quick status banner
│   │   ├── api.js                  # Axios client calling http://127.0.0.1:8000
│   │   └── components/
│   │       ├── ApplicantForm.jsx   # Input fields + 7 preset test profile buttons (Client 1 - 7)
│   │       └── InsightsDashboard.jsx# Decision badge, Trust Score progress bars, SHAP bar chart
│   ├── index.html
│   ├── tailwind.config.js          # Custom Gov-blue palette & typography
│   └── package.json
│
├── datasets/
│   └── train.csv                   # Raw training dataset (3,192 records)
├── data/processed/
│   └── train_clean.csv             # Cleaned training data (2,860 records after dropna)
├── models/
│   ├── loan_prediction_model.pkl   # Serialized XGBoost Classifier
│   ├── preprocessor.pkl            # Serialized Scikit-learn ColumnTransformer
│   ├── feature_config.json         # Raw & transformed feature orders and mappings
│   └── model_metadata.json         # Evaluation metrics (Accuracy: 0.9895, ROC-AUC: 0.9995)
├── scripts/
│   └── train_model.py              # Reproducible pipeline retraining script
├── scratch/
│   └── test_profiles.py            # Quick CLI validation script across all 7 test profiles
├── docs/
│   └── PROJECT_SPEC.md             # Project specification and requirements
├── .env                            # Environment variables (Neon DATABASE_URL)
└── context.md                      # This master context document
```

---

## 5. Quick Test Profiles Built-in to UI

The frontend includes 7 one-click test profiles under **Quick Load Test Profiles** (`ApplicantForm.jsx`):

1. **Client 1 (Clear Approval)**: Graduate, High Income (₹80k + ₹200k), Good Credit (`1`), Moderate Loan (`₹100k`).  
   $\to$ **Approved (100% confidence, Trust Score: ~75-81%)**
2. **Client 2 (Clear Rejection)**: Unemployed, Low Income (₹1500), Bad Credit (`0`), Huge Loan (`₹300k`).  
   $\to$ **Rejected (100% confidence, Trust Score: ~83%)**
3. **Client 3 (Borderline/Iffy)**: Self-employed, Moderate Income, Bad Credit (`0`), Loan `₹160k`.  
   $\to$ **Rejected (100% confidence, Trust Score: ~83%)**
4. **Client 4 (High Risk/High Loan)**: Single, Graduate, Good Credit (`1`), Huge Loan (`₹500k`).  
   $\to$ **Borderline/Rejected (18% confidence, Trust Score drops to ~35%)**
5. **Client 5 (Safe Bet)**: Salaried, Combined Income (₹10k), Good Credit (`1`), Low Loan (`₹120k`).  
   $\to$ **Approved (99.9% confidence, Trust Score: ~83%)**
6. **Client 6 (Self-Employed Risk)**: Self-Employed, Non-Graduate, Low Income, Good Credit (`1`), Loan `₹180k`.  
   $\to$ **Rejected due to debt-to-income ratio (Trust Score: ~64%)**
7. **Client 7 (Young/Low Income)**: Age 22, Income ₹2500, Good Credit (`1`), Small Loan `₹80k`.  
   $\to$ **Approved (99.6% confidence, Trust Score: ~81%)**

---

## 6. How to Run the Project (Windows / PowerShell)

### Prerequisites
- Python 3.11+ (installed with xgboost, scikit-learn, shap, lime, fastapi, uvicorn, psycopg2-binary, sqlalchemy).
- Node.js 18+ & npm.

### Step 1: Verify Environment Variables
Ensure `.env` at the root contains the Neon PostgreSQL connection string:
```env
DATABASE_URL=postgresql://username:password@ep-sample-pooler.region.aws.neon.tech/neondb?sslmode=require
# Or for local SQLite:
# DATABASE_URL=sqlite:///./trustfin_local.db
```

### Step 2: (Optional) Retrain Model
If you modify preprocessing or hyperparameters:
```powershell
python scripts/train_model.py
```

### Step 3: Run FastAPI Backend
From the workspace root:
```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

### Step 4: Run React Frontend
From the `frontend/` directory:
```powershell
cd frontend
npm run dev
```
- Dashboard UI: `http://localhost:5173/`

### Step 5: Run Automated CLI Validation
To test all 7 client profiles directly without the browser:
```powershell
python scratch/test_profiles.py
```

---

## 7. Project Status & Future Scope Roadmap

The core system, including the hybrid credit underwriting model, dual-auditor explainability (TreeSHAP + LIME), 4-pillar equal-weighted Trust Index, single-page A4 PDF memorandum generator, and dual-stakeholder UIDAI enterprise UI, is complete.

For the future scope and strategic research extensions, refer to the master specification in [`docs/FUTURE_SCOPE.md`](file:///d:/Coding/final-yr-project/trustfin-ai-proto/docs/FUTURE_SCOPE.md):

1. **Interactive Counterfactual Recourse Engine (Priority 1 — Most Essential)**:
   - Actionable recourse via DiCE / constrained optimization; interactive "What-If" sandbox for rejected applicants to simulate minimal changes for approval.
2. **Enterprise Database Persistence & Audit Trail (Priority 2)**:
   - Relational repository (PostgreSQL/SQLAlchemy) for timestamped underwriting records, solvency rulings, multi-auditor XAI logs, and officer counter-signatures.
3. **High-Throughput Batch Processing & Portfolio Risk Analytics (Priority 3)**:
   - Bulk CSV intake (50–500 files), vectorized inference and solvency checks, portfolio-wide Fair Lending audits, and bulk PDF packaging.

