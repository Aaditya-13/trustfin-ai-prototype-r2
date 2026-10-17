# TrustFin AI: Project Review – III Presentation Deck
## Modular Testing, Empirical Failure Verification & COCOMO II Cost Analysis

> **AI Presentation Generator Prompt (Gamma, Tome, ChatGPT/Claude Slides, SlidesAI, Canva):**  
> Generate an executive 26-slide presentation deck using the exact content, structure, tables, and callouts below.  
> - **Visual Theme:** Institutional FinTech dark theme: Deep Navy (`#0A1128`), Slate Gray (`#1E293B`), Emerald Green (`#10B981`), Alert Crimson (`#EF4444`), Amber Warning (`#F59E0B`), Crisp White text.  
> - **Typography:** Clean sans-serif (Inter / Roboto / Outfit).  
> - **Strict Rule:** Do not summarize, alter, or round any numerical figures (percentages, SLOC counts, Person-Months, or INR ₹ values). Retain all terminal snippets and formulas verbatim.

---

# Slide 1: Cover Slide

### Header:
**PROJECT REVIEW – III PRESENTATION**

### Title:
# TrustFin AI
### Subtitle:
**An Explainable AI (XAI) Decision Support System for Automated Retail Lending with Multi-Metric Verification, Regulatory Guardrails, and Algorithmic Recourse**

### Presented By:
- **Project Team:** TrustFin AI Research & Engineering Group
- **Institute:** Department of Computer Engineering
- **Guide:** Project Faculty Advisor
- **Review Date:** October 2026

---

# Slide 2: System Architecture — Brief Recap

### Header:
**PROJECT REVIEW – III | SYSTEM RECAP**

### Title:
## System Architecture — Brief Recap

### Core Operational Workflow:
- **Data Ingestion & Synthesis:** Collect and enrich applicant dossiers with domain-grounded financial indices (`Monthly_EMI`, `DTI_Ratio`, and bureau history).
- **Deterministic Solvency Guardrail:** Institute a statutory pre-ML mathematical circuit breaker: if debt-to-income $\text{DTI} > 50\%$, enforce a hard regulatory `REJECTED` override.
- **Dual Explainability Pipeline:** Concurrently compute cooperative game theory attributions (**TreeSHAP**) and local linear surrogate estimations (**LIME**).
- **4-Pillar Meta-XAI Trust Engine:** Cross-audit explanations across **Faithfulness**, **Stability**, **Consistency**, and **Fairness** to yield a composite Trust Score $\mathcal{T}(\mathbf{x}) \in [0.0, 1.0]$.
- **Dual-Portal Delivery:** Output interactive audit controls for **Bank Officers** and GDPR Article 22 counterfactual recourse notices for **Consumers**.

### System Architecture Flow:
```
[Applicant Dossier] ──> [Financial Feature Synthesis]
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
       [DTI > 50% Breach?]           [XGBoost Classifier]
        │              │                     │
      (Yes)           (No)                   ▼
        │              │             [Dual XAI: SHAP & LIME]
        ▼              ▼                     │
 [Hard Rejection] [ML Scoring] ──────> [4-Pillar Trust Engine]
                                             │
                               ┌─────────────┴─────────────┐
                               ▼                           ▼
                    [Bank Officer Audit]       [Consumer Recourse Notice]
```

---

# Slide 3: Section Divider — Modular Testing

### Header:
**PROJECT REVIEW – III | MODULAR TESTING**

# Modular Testing
### Rigorous Verification of Data Integrity, Solvency Circuit Breakers, Shortcut Learning Interception, Meta-XAI Trust Collapse, and BCBS 239 Cryptographic Invariance

---

# Slide 4: Modular Testing Workflow

### Header:
**PROJECT REVIEW – III | MODULAR TESTING**

## Modular Testing Workflow

### Core Verification Principles:
- Demonstrate that each underwriting, explainability, and validation subsystem functions independently.
- Test edge-case boundaries, zero-division crashes, shortcut feature traps, model degradation ablation, and cryptographic seed invariance.

### Testing Pipeline Diagram:
```
┌───────────────────────┐
│ Module Implementation │
└───────────┬───────────┘
            ▼
┌───────────────────────┐
│ Prepare Isolated Data │
└───────────┬───────────┘
            ▼
┌───────────────────────┐       ┌───────────────────────────────┐
│ Run Automated Pytest  │ ────> │ Module 1: Data & Solvency     │
│ Test Suites           │       ├───────────────────────────────┤
└───────────┬───────────┘       │ Module 2: Shortcut Learning   │
            │                   ├───────────────────────────────┤
            │                   │ Module 3: Crash Immunity      │
            │                   ├───────────────────────────────┤
            │                   │ Module 4: Meta-XAI Ablation   │
            │                   ├───────────────────────────────┤
            │                   │ Module 5: BCBS 239 Audit Hash │
            │                   └───────────────┬───────────────┘
            ▼                                   ▼
┌───────────────────────┐           ┌───────────────────────┐
│ Collect Test Evidence │ <──────── │ Assertions & Metrics  │
└───────────┬───────────┘           └───────────────────────┘
            ▼
     [Assertions Pass?]
       ├── (Yes) ──> [Validated Production Module]
       └── (No)  ──> [Isolate Defect, Refactor & Re-run]
```

---

# Slide 5: Actual Test Outcomes — Updated

### Header:
**PROJECT REVIEW – III | MODULAR TESTING**

## Actual Test Outcomes — Automated Test Suite
**Status:** 9 passed, 0 failed, 0 errors in **5.92 seconds** (100% Pass Rate).

### Test Distribution Summary:

```
Test Cases
 10 ┌────────────────────────────────────────────────────────┐
    │                                                        │
  8 │                        9 PASSED                        │
    │                   (100% Pass Rate)                     │
  6 │                                                        │
    │                                                        │
  4 │                                                        │
    │                                                        │
  2 │                                                        │
    │                                                        │
  0 └────────────────────────────────────────────────────────┘
       Core Backend Suite          Zero Deficiencies
```

### Detailed Breakdown:
- **Total Test Cases Executed:** **9 tests**
- **Passed:** **9 tests (100%)**
- **Failed / Skipped:** **0 tests (0%)**
- **Suite Execution Latency:** **5.92s** (on Python 3.13.7 / `pytest-9.1.1`)
- **Mean Single-Evaluation Roundtrip:** **< 550ms**

---

# Slide 6: Module A: Data Pipeline & Solvency Guardrails Testing

### Header:
**PROJECT REVIEW – III | MODULAR TESTING**

## Module A: Data Pipeline & Solvency Guardrails Testing

| Module Component | Test Scenario | Expected Result | Status |
| :--- | :--- | :--- | :---: |
| **Solvency Pipeline** | Prime applicant (`Income=₹100k`, `EMI=₹278`, `DTI=0.3%`) | Marked `OPTIMAL` with DTI < 35%; zero warnings | **PASS** |
| **Solvency Guardrail** | Insolvent borrower (`Income=₹2.5k`, `Loan=₹80k`, `DTI=1,066.7%`) | Flags `INSOLVENT`; enforces mandatory `REJECTED` override | **PASS** |
| **Crash Immunity** | Pathological zero inputs (`Loan_Term=0`, `Total_Income=0`) | Clamps via $\max(1.0, x)$; prevents `ZeroDivisionError` | **PASS** |
| **Boundary Guard** | Borderline applicant at statutory 50% DTI ceiling | Flags `MODERATE` advisory; alerts credit officer | **PASS** |
| **Feature Synthesis** | Automatic calculation of `Monthly_EMI` and `DTI_Ratio` | Columns synthesized correctly without NaN values | **PASS** |

---

# Slide 7: Module A Terminal Verification Logs

### Header:
**PROJECT REVIEW – III | MODULAR TESTING**

## Module A: Data Pipeline & Solvency Guardrails — Log Evidence

```text
SOURCE: backend/tests/test_data_and_solvency.py
COMMAND: python -m pytest -v -s backend/tests/test_data_and_solvency.py

backend/tests/test_data_and_solvency.py::test_solvent_prime_applicant_metrics 
[PASS] Prime Solvency: Income=INR 100,000, EMI=INR 278, DTI=0.3%
PASSED [ 33%]

backend/tests/test_data_and_solvency.py::test_insolvency_guardrail_tripped 
[GUARDRAIL TRIGGERED] Insolvent Breach: DTI=1066.7%, Action=Hard Rejection Override
PASSED [ 66%]

backend/tests/test_data_and_solvency.py::test_zero_division_guardrail_immunity 
[PASS] Zero-Division Crash Immunity: Clamped correctly without runtime exceptions
PASSED [100%]

======================== 3 passed in 1.42s ========================
```

---

# Slide 8: Module B: Shortcut Learning Paradox & Solvency Override Testing

### Header:
**PROJECT REVIEW – III | MODULAR TESTING**

## Module B: Shortcut Learning Paradox & Solvency Override

| Subsystem | Test Scenario | Expected Result | Status |
| :--- | :--- | :--- | :---: |
| **Academic Baseline** | Unconstrained Tree on clean credit (`Credit_History=1`) with 1,066% DTI | Naively approves borrower with 99.60% false assurance | **VULNERABLE** |
| **TrustFin ML Core** | Feature-synthesized XGBoost on extreme DTI dossier | Correctly penalizes severe debt burden with 99.63% confidence | **PASS** |
| **Composite Guardrail** | End-to-end API evaluation of Alex Turner profile | Overrides ML decision into hard `REJECTED` via FOIR > 50% gate | **PASS** |
| **Recourse Engine** | Adverse action recourse generated for DTI violation | Proposes term extension (to 84 mo) or principal downsizing | **PASS** |

---

# Slide 9: Module B Terminal Verification Logs

### Header:
**PROJECT REVIEW – III | MODULAR TESTING**

## Module B: Shortcut Learning Paradox — Log Evidence

```text
SOURCE: backend/tests/test_shortcut_learning.py
COMMAND: python -m pytest -v -s backend/tests/test_shortcut_learning.py

backend/tests/test_shortcut_learning.py::test_pure_xgboost_shortcut_learning_failure 
======================================================================
EMPIRICAL PROOF OF SHORTCUT LEARNING & SOLVENCY INTERCEPTION (PPT DATA):
  Applicant Gross Monthly Income: INR 2,500
  Requested Repayment (EMI):      INR 26,667 / month
  Debt-to-Income (DTI) Ratio:     1,066.7% [Severely Insolvent]
  Bureau Credit History:          1.00 [Clean Record]
  --------------------------------------------------------------
  Unconstrained Baseline ML:      APPROVED (99.60% False Assurance - Shortcut Trap)
  TrustFin Model Output:          REJECTED (99.63% Confidence)
  Deterministic Solvency Gate:    INSOLVENT OVERRIDE ENFORCED (DTI > 50% Hard Block)
======================================================================
PASSED [ 50%]

backend/tests/test_shortcut_learning.py::test_hybrid_architecture_intercepts_shortcut_failure 
[PASS] Hybrid System Interception: ML Model=Approve (99.6%) -> System Outcome=REJECTED (FOIR > 50% Hard Block)
PASSED [100%]

======================== 2 passed in 1.86s ========================
```

---

# Slide 10: Module C: 4-Pillar Meta-XAI Validation & Ablation Testing

### Header:
**PROJECT REVIEW – III | MODULAR TESTING**

## Module C: 4-Pillar Meta-XAI Validation & Ablation Testing

| Metric Pillar | Test Scenario | Expected Benchmark | Empirical Result | Status |
| :--- | :--- | :--- | :---: | :---: |
| **Pillar 1: Faithfulness** | Counterfactual top-3 feature ablation | Probability drop $\ge 70\%$ | **99.96%** | **PASS** |
| **Pillar 2: Stability** | 1% localized Gaussian noise perturbation | Spearman rank correlation $\ge 85\%$ | **97.65%** | **PASS** |
| **Pillar 3: Consistency** | Top-3 concordance between SHAP and LIME | Jaccard index $\ge 50\%$ | **50.00%** | **PASS** |
| **Pillar 4: Fairness** | Demographic inversion across Gender attribute | Decision delta $\le 10\%$ | **100.00%** | **PASS** |
| **Composite Trust** | Calibrated production model baseline | $\mathcal{T}(\mathbf{x}) \ge 80\%$ (High Trust) | **86.90%** | **PASS** |
| **Failure Injection** | Model degradation ablation (`Credit_History` stripped) | Trust score crashes below 40% | **32.27%** | **PASS** |

---

# Slide 11: Module C & BCBS 239 Audit Invariance Terminal Logs

### Header:
**PROJECT REVIEW – III | MODULAR TESTING**

## Module C & Audit Invariance — Log Evidence

```text
SOURCE: backend/tests/test_audit_reproducibility.py, test_xai_and_ablation.py

backend/tests/test_audit_reproducibility.py::test_deterministic_seed_generation PASSED
======================================================================
DETERMINISTIC SEED AUDIT TRAIL (BCBS 239 COMPLIANCE):
  Applicant: Prime Executive -> Seed: 1631520666 (SHA-256 derived)
  Repeated Evaluation Seed:  -> Seed: 1631520666 [ZERO DRIFT]
======================================================================

backend/tests/test_audit_reproducibility.py::test_zero_stochastic_drift_across_api_reevaluation PASSED
======================================================================
AUDIT REPRODUCIBILITY & ZERO DRIFT VERIFICATION (PPT SLIDE DATA):
  Metric                     Run #1            Run #2            Absolute Drift
  ----------------------------------------------------------------------------
  Prediction Decision        Approved          Approved          0.000000
  Confidence Probability     99.9974%          99.9974%          0.000000%
  LIME Top Feature Weight    0.001300          0.001300          0.000000
  Composite Trust Score      86.9029%          86.9029%          0.000000%
  ----------------------------------------------------------------------------
  Regulatory Status: 100% Deterministic & Audit-Compliant under BCBS 239
======================================================================

backend/tests/test_xai_and_ablation.py::test_deliberate_ablation_trust_score_collapse PASSED
======================================================================
DELIBERATE FAILURE INJECTION: ABLATION COLLAPSE (PPT TABLE II DATA):
  Predictive Accuracy         99.17%             50.83% (Random Guessing)
  Explanation Faithfulness    89.40%             12.70% [COLLAPSED]
  Explanation Stability       98.10%             54.30% [ERRATIC]
  SHAP-LIME Consistency      86.70%              0.00% [DISCORDANT]
  Demographic Fairness       100.00%             62.10% [COMPROMISED]
  Composite Trust Score T(x)  93.55% [HIGH]       32.27% [UNRELIABLE ALERT]
======================================================================
```

---

# Slide 12: Section Divider — Results, Conclusion & Future Scope

### Header:
**PROJECT REVIEW – III | RESULTS & CONCLUSION**

# Results, Conclusion & Future Scope
### Empirical Validation, Dual-Stakeholder Visualizations, Operational Limitations, and Full-Scale Enhancement Roadmap

---

# Slide 13: System Implementation & Functional Results

### Header:
**PROJECT REVIEW – III | TEST CASE EVIDENCE**

## System Implementation & Functional Results
*TrustFin AI integrates non-linear gradient-boosted underwriting, dual XAI concordance, deterministic solvency circuit breakers, and algorithmic recourse.*

| Evidence | Measured Outcome | Interpretation |
| :--- | :--- | :--- |
| **Automated Backend Pytest** | **9 passed / 0 failed / 0 errors** | Core underwriting, solvency guardrails, and validation pass completely. |
| **Predictive Classification** | **99.17% Accuracy / 0.9997 ROC-AUC** | Evaluated on $N=600$ held-out test applicants ($TN=308, TP=287, FP=4, FN=1$). |
| **Demographic Fairness** | **EOR: 98.98% / DPR: 85.94%** | Fully satisfies statutory US EEOC Four-Fifths (80%) Rule across Gender. |
| **Audit Reproducibility** | **0.000000 Absolute Drift** | Seed-locked LIME and Gaussian perturbations eliminate stochastic drift (BCBS 239). |
| **Frontend Production Build** | **Vite build: PASS (0 errors)** | Clean React 19 production compilation with responsive audit workstations. |
| **Adverse Action PDF Output** | **ReportLab 200 OK (< 350ms)** | Generates formal bank sanction letter or adverse advisory PDF on demand. |

---

# Slide 14: Meta-XAI Trust Scoring & Comparative Analysis

### Header:
**PROJECT REVIEW – III | META-XAI FORMULATION**

## Meta-XAI Trust Scoring & Comparative Analysis

The Composite Trust Engine evaluates explanation credibility through four equally weighted validation dimensions:

$$\mathcal{T}(\mathbf{x}) = \sum_{i=1}^4 w_i V_i(\mathbf{x}) = 0.25 V_{\text{faith}} + 0.25 V_{\text{stab}} + 0.25 V_{\text{cons}} + 0.25 V_{\text{fair}}$$

### 4-Pillar Baseline vs. Ablated Model Comparison:

```
Metric Score (%)
100 ┌────────────────────────────────────────────────────────┐
    │   99.96%   97.65%                    100.0%    86.90%  │
 80 │   ──────   ──────                    ──────    ──────  │ ■ Calibrated Model
    │                                                        │
 60 │                     54.30%            62.10%           │ □ Degraded Model
 40 │                     ░░░░░░            ░░░░░░   32.27%  │   (Ablated)
 20 │   12.70%                    0.00%              ░░░░░░  │
  0 └───░░░░░░────────────────────░░░░░──────────────────────┘
        Faith.   Stab.    Cons.    Fair.    Overall Trust
```

---

# Slide 15: Dual-Portal Visual Results

### Header:
**PROJECT REVIEW – III | VISUAL WORKSTATIONS**

## Dual-Stakeholder Visual Workstations

```
┌───────────────────────────────────────┐       ┌───────────────────────────────────────┐
│ A. Bank Officer Audit Workstation     │       │ B. Consumer Adverse Action Portal     │
├───────────────────────────────────────┤       ├───────────────────────────────────────┤
│ • High-level Sanction / Review badge  │       │ • Plain-language decision notice      │
│ • Side-by-side SHAP vs LIME matrix    │       │ • Top positive & negative drivers     │
│ • Real-time interactive weight sliders│       │ • Interactive Recourse Simulator      │
│ • 4-Pillar mathematical score card    │       │ • 3 lowest-cost approval pathways     │
│ • Official bank letter PDF generator  │       │ • Right to explanation fulfillment    │
└───────────────────────────────────────┘       └───────────────────────────────────────┘
```

- **A. Bank Officer Workstation:** Provides compliance officers with granular attribution weights, solvency diagnostics, and audit hashes before approving high-value loans.
- **B. Consumer Recourse Portal:** Complies with GDPR Article 22 by showing applicants exactly how to modify mutable parameters (tenure, co-applicant) to achieve approval.

---

# Slide 16: End-to-End Decision & Recourse Workflow

### Header:
**PROJECT REVIEW – III | WORKFLOW INTEGRATION**

## End-to-End Decision & Recourse Workflow

```
               [Application Submitted via REST API]
                               │
                               ▼
               [Synthesize EMI & DTI Financial Data]
                               │
                               ▼
                   [DTI > 50% Solvency Limit?]
                  /                           \
           (Yes) /                             \ (No)
                ▼                               ▼
     [Flag Insolvent Breach]          [XGBoost Probability Scoring]
                │                               │
                ▼                               ▼
    [Enforce HARD REJECTION]          [Dual TreeSHAP & LIME Engine]
                │                               │
                ▼                               ▼
    [Trigger Wachter Recourse]        [Evaluate 4-Pillar Trust Score]
                │                               │
                ▼                               ▼
    [Generate Adverse Notice]         [Composite Trust T(x) >= 75%?]
                │                            /                \
                ▼                     (Yes) /                  \ (No)
    [Deliver Consumer PDF]                 ▼                    ▼
                                  [Fast-Track Approval]  [Manual Officer Audit]
```

---

# Slide 17: Reliability, Security and Error Handling

### Header:
**PROJECT REVIEW – III | SYSTEM RELIABILITY**

## Reliability, Security and Error Handling

| System Area | Actual Empirical Evidence | Boundary / Current Limitation |
| :--- | :--- | :--- |
| **Solvency Guardrails** | 100% interception of DTI > 50% profiles; hard rejection lock | Assumes verified income; relies on upstream bureau accuracy. |
| **Crash Immunity** | Zero-division clamped safely via $\max(1.0, x)$ floors | Tested on synthetic edge inputs; live malformed payloads sanitized by Pydantic. |
| **Audit Reproducibility** | $0.000000$ drift across repeated API queries (BCBS 239) | Deterministic within identical payload digest; re-evaluations require exact JSON match. |
| **Cross-Explainer Bias** | Flags divergence when SHAP and LIME identify disjoint features | Discretized top-3 Jaccard step function ($K=3 \implies \{0.0, 0.2, 0.5, 1.0\}$). |
| **Demographic Inversion** | Counterfactual gender flip yields 0.00% shift in loan outcome | Audited across binary Gender; multi-intersectionality requires broader dataset. |
| **Algorithmic Recourse** | Computes 3 lowest-effort counterfactual vectors (Wachter $L_1$) | Recourse paths assume applicant has capacity to recruit co-applicant or adjust term. |

---

# Slide 18: Validated Capabilities and Current Limitations

### Header:
**PROJECT REVIEW – III | CAPABILITIES & BOUNDARIES**

## Validated Capabilities and Current Limitations

```
┌───────────────────────────────────────┐       ┌───────────────────────────────────────┐
│  Validated System Capabilities        │       │ !  Current Engineering Limitations    │
├───────────────────────────────────────┤       ├───────────────────────────────────────┤
│ • Non-linear XGBoost (99.17% Acc)     │       │ • Historical bureau dataset coverage  │
│ • Deterministic 50% Solvency Gate     │       │ • Physical collateral field appraisal │
│ • Dual SHAP & LIME Concordance        │       │ • Dynamic macro interest rate shifts  │
│ • 4-Pillar Meta-XAI Trust Score       │       │ • Upstream core banking API integration│
│ • Zero stochastic audit drift         │       │ • Production open banking live tokens │
│ • Automated ReportLab PDF Sanctions   │       │ • Formal banking charter licensing   │
└───────────────────────────────────────┘       └───────────────────────────────────────┘
```

> **Takeaway:** *TrustFin AI demonstrates a mathematically verified, audit-compliant automated underwriting engine; commercial deployment will incorporate live core banking APIs and verified field valuation.*

---

# Slide 19: Section Divider — Cost Evaluation

### Header:
**PROJECT REVIEW – III | COST EVALUATION**

# Cost Evaluation
### COCOMO II Post-Architecture Software Sizing, Development Effort, Schedule Estimation, and Professional Indian-Market Budget

---

# Slide 20: COCOMO II — Repository-Based Software Size

### Header:
**PROJECT REVIEW – III | COCOMO II COST ANALYSIS**

## COCOMO II — Repository-Based Software Size
*Post-Architecture estimation uses effective maintained production source size, strictly excluding tests and dependencies.*

```
┌───────────────────────────────────────┐       ┌────────────────────────────────────────────────────────┐
│ EFFECTIVE SOFTWARE SIZE               │       │ Maintained Logical Source by Area                      │
│                                       │       │                                                        │
│  4.419 KSLOC                          │       │ Frontend UI (React 19 / JSX)       3,523 SLOC (79.7%)  │
│                                       │       │ Backend Core (FastAPI / Python)      896 SLOC (20.3%)  │
│  4,419 logical source lines           │       │ ────────────────────────────────────────────────────── │
│  5,073 physical LOC • 33 source files │       │ Total Logical Source:              4,419 SLOC (100.0%) │
└───────────────────────────────────────┘       └────────────────────────────────────────────────────────┘
```

| Exclusion Scope | Volume Excluded | Rationale |
| :--- | :--- | :--- |
| **Pytest Test Suites** | 350+ physical LOC | Non-delivered verification scaffolding. |
| **Documentation & Specs** | 4 markdown files | Project documentation and slide specs. |
| **Build & Cache Output** | `node_modules`, `__pycache__` | Ephemeral compilation artifacts. |
| **Data & Binary Weights** | `.pkl`, `.csv` assets | Static runtime model serialization. |

---

# Slide 21: COCOMO II — Effort and Schedule Estimation

### Header:
**PROJECT REVIEW – III | COCOMO II COST ANALYSIS**

## COCOMO II — Effort and Schedule Estimation
*Model constants, scale factors, and cost drivers convert source size into estimated professional engineering effort.*

```
┌───────────────────────────────────────────────────────┐       ┌───────────────────────────────────────┐
│ EFFORT MODEL                                          │       │ Scale Exponent E                      │
│ PM = 2.94 × (4.419)^1.0746 × 0.6929                   │       │ 1.0746                                │
│ 10.06 person-months                                   │       ├───────────────────────────────────────┤
├───────────────────────────────────────────────────────┤       │ Effort Factor EAF (∏ EM)              │
│ SCHEDULE MODEL                                        │       │ 0.6929                                │
│ TDEV = 3.67 × (10.06)^0.3129                          │       ├───────────────────────────────────────┤
│ 7.56 calendar months                                  │       │ Implied Average Team                  │
│                                                       │       │ 1.33 FTE (~2 Developers)              │
└───────────────────────────────────────────────────────┘       └───────────────────────────────────────┘
```

### Sensitivity Benchmark:
- **Primary COCOMO II Model (with tool & personnel gains):** **10.06 PM** | **7.56 Months**
- **Nominal Reference EAF (1.000):** **14.52 PM** | **8.48 Months**
- **Scale Factor Sum ($\sum \text{SF}_j$):** **16.46** (High architecture risk resolution & team cohesion)

---

# Slide 22: Estimated Development Budget — Professional Scenario

### Header:
**PROJECT REVIEW – III | COCOMO II COST ANALYSIS**

## Estimated Development Budget — Professional Scenario
*Hypothetical 2026 Indian-market replacement cost; NOT actual expenditure by the student project team.*

| Budget Component | Estimated Cost (INR) | Allocation Basis |
| :--- | :---: | :--- |
| **Fully Loaded Professional Labor** | **₹8,54,829** | 10.06 Person-Months @ ₹85,000/PM (Tier-1 AI/FinTech dev) |
| **Existing Equipment & Workstation Allocation** | **₹35,000** | 2 developer workstations amortized over 7.56 months |
| **Project-Attributed High-Speed Internet** | **₹11,340** | Dedicated fiber broadband @ ₹1,500/month |
| **Pre-Launch Staging & Testing Cloud Hosting** | **₹3,500** | Initial staging sandbox environment |
| **Software License Purchases** | **₹0** | 100% Open-Source Stack (Python, React, FastAPI, SQLite) |
| **Initial Direct Cost** | **₹9,04,669** | Subtotal direct project expenditures |
| **15% Contingency Reserve** | **₹1,35,700** | Prudential risk buffer for scope adjustments |
| **TOTAL INITIAL DEVELOPMENT BUDGET** | **₹10,40,369** | **₹10.40 Lakhs (including 15% contingency reserve)** |

```
Composition of Initial Budget:
[ Labor: 82.2% ] [ Equipment/Net: 4.5% ] [ Contingency Reserve: 13.0% ] [ Cloud: 0.3% ]
```

---

# Slide 23: Pilot Deployment and First-Year Maintenance

### Header:
**PROJECT REVIEW – III | COCOMO II COST ANALYSIS**

## Pilot Deployment and First-Year Maintenance
*Operating and hosting costs are modeled separately from initial COCOMO II development expenditure.*

```
┌───────────────────────────────────────┐       ┌───────────────────────────────────────┐
│ PILOT HOSTING BREAKDOWN               │       │ FIRST 12 MONTHS AFTER LAUNCH          │
│                                       │       │                                       │
│ ₹3,500 / month                        │       │ ₹1.74 Lakhs                           │
│                                       │       │ (₹1,73,824 estimated annual ops)      │
├───────────────────────────────────────┤       ├───────────────────────────────────────┤
│ API & Static Web Frontend    ₹2,500   │       │ Maintenance Labor (15% base) ₹1,28,224│
│ Managed Storage & DB Backups   ₹500   │       │ 12-Month Cloud Hosting         ₹42,000│
│ Bandwidth & APM Monitoring     ₹400   │       │ Dedicated Connectivity          ₹3,600│
│ Domain & SSL Certificate       ₹100   │       │                                       │
└───────────────────────────────────────┘       └───────────────────────────────────────┘
```

$$\mathbf{\text{COMBINED PLANNING BUDGET: ₹12,14,193}}\quad (\approx \mathbf{₹12.14\text{ Lakhs for Initial Build + Year 1 Ops}})$$

---

# Slide 24: Future Scope and Enhancement Roadmap

### Header:
**PROJECT REVIEW – III | ROADMAP**

## Future Scope and Enhancement Roadmap

```
┌─────────────────────────┐       ┌─────────────────────────┐       ┌─────────────────────────┐
│ Phase 1: Pilot & Audit  │ ────> │ Phase 2: Operations     │ ────> │ Phase 3: Enterprise     │
├─────────────────────────┤       ├─────────────────────────┤       ├─────────────────────────┤
│ • Production shadow-run │       │ • Real-time bank OTP    │       │ • Core Banking Engine   │
│   with branch officers  │       │   SMS & WhatsApp push   │       │   (Finacle/Flexcube)    │
│ • Live bureau API link  │       │ • KYC Aadhaar & PAN OCR │       │ • Multi-product lending │
│   (CIBIL / Experian)    │       │   digital ingestion     │       │   (Mortgage / Auto)     │
│ • Stress testing with   │       │ • Automated adverse     │       │ • Distributed real-time │
│   100,000 synthetic apps│       │   action appeal portal  │       │   GPU TreeSHAP serving  │
└─────────────────────────┘       └─────────────────────────┘       └─────────────────────────┘
```

---

# Slide 25: Conclusion

### Header:
**PROJECT REVIEW – III | CONCLUSION**

## Conclusion
*TrustFin AI demonstrates a mathematically verified, audit-compliant automated underwriting and explainable AI platform.*

```
┌───────────────────────────────────────┐       ┌───────────────────────────────────────┐
│  Explainable Decision Support         │       │  Defensive Solvency Guardrails        │
│ Dual SHAP & LIME concordance with     │       │ Statutory 50% DTI ceiling intercepts  │
│ 4-Pillar Trust Score verification.    │       │ shortcut traps and model failures.    │
├───────────────────────────────────────┤       ├───────────────────────────────────────┤
│  Cryptographic Audit Invariance       │       │  Actionable Consumer Recourse         │
│ Seed-locked LIME perturbations ensure │       │ GDPR Art. 22 minimal-cost counter-    │
│ zero stochastic drift under BCBS 239. │       │ factual pathways empower borrowers.   │
└───────────────────────────────────────┘       └───────────────────────────────────────┘
```

> **Closing Synthesis:**  
> The system replaces arbitrary algorithmic black-boxes with mathematically auditable, non-discriminatory lending decisions, proving that institutional AI safety requires both explanatory transparency and deterministic financial guardrails.

---

# Slide 26: Thank You / Questions & Discussion

### Header:
**PROJECT REVIEW – III | END OF PRESENTATION**

# Thank You
## Questions & Discussion

### TrustFin AI | Project Review – III
*Department of Computer Engineering • Academic Year 2026*
