# Experimental Findings: Shortcut Bias, Solvency Inversion, and the Limits of XAI Faithfulness

> **Target Review Criterion (Rubric Sr. No. 1)**:  
> *Experimental Setup / Simulation, Performance Parameters, Efficiency Issues (10 Marks)*  
> **Prepared for**: Final-Year Project Presentation & Viva Defense — TrustFin AI Research Team

---

## 1. Executive Summary

During our rigorous simulation testing of TrustFin AI across edge-case financial profiles, our team uncovered a critical machine learning defect known as **Shortcut Learning (Feature Dominance Bias)**. 

Specifically, the model approved a loan of **₹80,000 over a 3-month term** for an applicant earning only **₹2,500/month** with **99.6% confidence**, because the applicant had a good credit history (`Credit_History = 1`). In reality, this requires an impossible monthly repayment of $\approx$ **₹27,000/month** (1,080% of the applicant's monthly income).

Crucially, TrustFin's explanation validation engine awarded this decision a **High Trust Score (83.2%)** with **99.6% Faithfulness**. 

This phenomenon provides our project with its most profound research insight:  
**An XAI explainer can be 100% faithful to an absurd model decision.** The explainer truthfully revealed that the model ignored financial solvency and blindly followed credit history. This experimental finding allows our group to demonstrate how we identify, analyze, and resolve real-world algorithmic failure modes by building a **Hybrid Decision-Support Architecture (Domain Guardrails + XAI)**.

---

## 2. Experimental Simulation & The Failure Case

### Input Test Parameters
* **Applicant**: 22-year-old Salaried Graduate, Single, 0 Dependents, Urban area.
* **Applicant Monthly Income**: **₹2,500** (Coapplicant Income: **₹0**)
* **Requested Loan Amount**: **₹80,000**
* **Loan Term**: **3 Months**
* **Credit History**: **1 (Good / Repaid prior loans)**

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FINANCIAL MATH SANITY CHECK                     │
├────────────────────────────────────────────────────────────────────────┤
│ Total Loan Required:               ₹80,000                             │
│ Repayment Horizon:                 3 Months                            │
│ Estimated Monthly EMI:             ₹80,000 / 3 ≈ ₹26,667 / month       │
│ Applicant Monthly Income:          ₹2,500 / month                      │
│ Debt-to-Income (DTI) Ratio:        ₹26,667 / ₹2,500 = 1,066.7%         │
│ Banking Standard Maximum DTI:      40% to 50%                          │
│ Realistic Outcome:                 IMMEDIATE REJECTION FOR INSOLVENCY  │
└────────────────────────────────────────────────────────────────────────┘
```

### Actual System Output
* **Model Recommendation**: **`APPROVED`** (Confidence: **`99.6%`**)
* **Trust Validation Score**: **`83.2%` (`HIGH TRUST`)**
  - **Faithfulness**: `99.6%`
  - **Stability**: `100.0%`
  - **Consistency**: `50.0%`
  - **Fairness**: `100.0%`

---

## 3. In-Depth Root Cause Analysis

### A. Data-Level Flaw: Spurious Correlation & Distribution Shift
An empirical audit of the training dataset (`datasets/train.csv`, 3,192 records) revealed the origin of this pathology:
1. **Overwhelming Target Dominance**: Whenever `Credit_History == 1`, the target `Loan_Status` was Approved in **96.67%** of cases across the entire dataset.
2. **Out-of-Distribution (OOD) Extremes**:
   - Training dataset minimum income: **₹15,000** (Median: ₹60,290). The test input of ₹2,500 was outside the training distribution.
   - Training dataset minimum loan term: **60 months (5 years)**. The test input of 3 months was an extreme outlier that the model had never encountered.

### B. Model-Level Pathology: "Clever Hans" / Shortcut Learning
Because `Credit_History` was such a dominant statistical predictor in the training set, the gradient boosted trees in XGBoost minimized loss by learning a greedy shortcut:
$$\text{Decision Rule learned: } \text{IF } \text{Credit\_History} = 1 \implies \text{APPROVE}$$

We extracted the raw SHAP log-odds attribution vector for this applicant to inspect the model's internal reasoning:

| Feature | SHAP Contribution (Log-Odds) | Direction | Explainer Reasoning |
| :--- | :---: | :---: | :--- |
| **`Credit_History`** | **`+4.607`** | **Approval Driver** | Overwhelming positive push |
| **`Loan_Amount`** | **`+1.474`** | **Approval Driver** | Moderate positive push |
| **`Applicant_Income`** | **`-1.784`** | **Rejection Driver** | Correctly recognized low income as a risk |
| **`Coapplicant_Income`** | **`-1.267`** | **Rejection Driver** | Recognized lack of secondary income |

**The Finding**: The model was not entirely blind—it *did* penalize the ₹2,500 income ($-1.78$) and zero coapplicant income ($-1.27$). However, the single positive weight of `Credit_History` ($+4.61$) acted as a **statistical bulldozer**, completely crushing the combined negative penalties and driving the final sigmoid probability to **99.6% Approval**!

---

## 4. The Critical XAI Revelation: Faithfulness vs. Soundness

This scenario demonstrates the single most important conceptual nuance in Explainable AI research:

```
┌───────────────────────────────────┐       ┌───────────────────────────────────┐
│     EXPLANATION FAITHFULNESS      │  vs.  │      MODEL FINANCIAL SOUNDNESS    │
├───────────────────────────────────┤       ├───────────────────────────────────┤
│ "Did the explainer accurately     │       │ "Did the model make a sensible,   │
│  describe what the model did?"    │       │  solvent financial decision?"     │
│                                   │       │                                   │
│ Result: YES (Score = 99.6%)       │       │ Result: NO (Catastrophic Failure) │
└───────────────────────────────────┘       └───────────────────────────────────┘
```

### Why did Faithfulness score 99.6%?
Our Faithfulness metric masks the top features identified by SHAP (`Credit_History`) and observes whether the prediction probability collapses.
* When `Credit_History` was masked, the approval probability plunged from **99.6% to 0.0%**.
* This mathematically proves that **the explainer was 100% truthful**: the model *really did* make its approval based solely on credit history.

### The Viva Defense Thesis
> *"Our project demonstrates that a high Trust Validation Score validates the **integrity of the explanation**, not the **domain sanity of the underlying model**. If a black-box model makes an irrational decision, a faithful explainer will truthfully explain an irrational decision. Therefore, trustworthy AI in banking cannot rely on post-hoc XAI alone—it requires a **Hybrid Architecture pairing XAI with Deterministic Solvency Guardrails**."*

---

## 5. How TrustFin AI Solves This Problem

To resolve this issue, our team designed a multi-tiered engineering solution:

```
                       Applicant Application
                                │
                 ┌──────────────┴──────────────┐
                 ▼                             ▼
       [ XGBoost + XAI Engine ]      [ Solvency Guardrail Engine ]
       • SHAP / LIME Attribution     • Monthly EMI Calculation
       • 4-Pillar Trust Score        • DTI Ratio vs. Regulatory Cap (50%)
                 │                             │
                 └──────────────┬──────────────┘
                                ▼
                   [ Hybrid Decision Gateway ]
            • If DTI > 50%: REJECT / FLAG INSOLVENCY OVERRIDE
            • Else: Follow Model + Trust Recommendation
```

### Tier 1: Deterministic Solvency Guardrail Engine (Immediate Rule-Based Gate)
Before any ML prediction is presented as actionable, a financial guardrail checks:
1. **Estimated Monthly EMI**:
   $$\text{EMI} \approx \frac{\text{Loan Amount} \times (1 + r)}{\text{Loan Term}}$$
2. **Debt-to-Income (DTI) Ratio**:
   $$\text{DTI} = \frac{\text{Monthly EMI}}{\text{Applicant Monthly Income} + \text{Coapplicant Monthly Income}}$$
3. **Automated Override**: If $\text{DTI} > 0.50$ ($50\%$), the dashboard triggers a prominent **`CRITICAL SOLVENCY WARNING: Insolvent Debt-to-Income Ratio (1,066%)`**, immediately overriding or qualifying the ML approval badge.

### Tier 2: Feature Engineering & Monotonic Constraints
In model iteration:
1. Synthesize two derived features:
   - `Monthly_Debt_Obligation = Loan_Amount / Loan_Term`
   - `DTI_Ratio = Monthly_Debt_Obligation / (Applicant_Income + Coapplicant_Income)`
2. Configure **XGBoost Monotonic Constraints**:
   - Enforce `monotone_constraints=(-1)` on `DTI_Ratio`, guaranteeing that as the debt ratio increases, the probability of approval *must strictly decrease*, preventing credit history from overriding mathematical insolvency.

### Tier 3: Dual-Certification Dashboard UI
The UI displays two distinct badges side-by-side:
1. **Model & XAI Trustworthiness** (`High Explainer Faithfulness`)
2. **Financial Viability Clearance** (`FAILED - DTI Insolvency Threshold Exceeded`)

---

### 5.1 Verification of the Implemented Solution

We evaluated the newly implemented Hybrid Architecture against the exact test case (Income: ₹2,500, Loan: ₹80,000, Term: 3 months, Good Credit):

| Dimension | Before (Pure Statistical ML) | After (Hybrid Solution: DTI Feature + Guardrail) |
| :--- | :--- | :--- |
| **Model Decision** | `APPROVED` (99.6% Confidence) ❌ | **`REJECTED` (99.63% Confidence)** ✅ |
| **Top Negative SHAP Drivers** | Weak penalty (`-1.78` Income) | **Massive penalty**: Income (`-5.02`), `DTI_Ratio` (`-1.93`), `Monthly_EMI` (`-1.27`) ✅ |
| **Credit History Influence** | Bulldozer (`+4.61` log-odds) | Overwhelmed by solvency reality (`+2.45` vs. `-10.41` total penalties) ✅ |
| **Deterministic Guardrail** | None | **`CRITICAL SOLVENCY BREACH (1,066.7% DTI)`** active on UI ✅ |
| **Banking Viability** | Catastrophic False Positive | **100% Solvency Protected** ✅ |

---

## 6. Viva Presentation Guide (Talking Points for the Committee)

When presenting Criterion 1 (*Experimental Setup / Simulation & Efficiency Issues*), present this exact narrative:

* **Slide/Point 1 (The Experiment)**:  
  *"We did not just test standard applicants; we simulated extreme stress profiles. In Profile #7, an applicant earning ₹2,500 requested ₹80,000 for 3 months, creating an impossible ₹27,000/month repayment obligation."*
* **Slide/Point 2 (The Discovered Defect)**:  
  *"The XGBoost model approved it with 99.6% confidence due to 'Shortcut Learning' caused by Credit History dominance in the training distribution."*
* **Slide/Point 3 (The XAI Insight that separates our project)**:  
  *"Our XAI validation engine gave this a 83.2% Trust Score with 99.6% Faithfulness. This proved our core academic hypothesis: **SHAP faithfully explained a broken model decision**. The explainer proved that the model relied almost entirely on Credit History (+4.61 log-odds) while suppressing Income (-1.78)."*
* **Slide/Point 4 (Our Solution)**:  
  *"We engineered a Hybrid Decision Gateway combining our XAI Trust Score with a deterministic Debt-to-Income (DTI) Solvency Guardrail, ensuring financial domain sanity overrides statistical shortcut bias."*
