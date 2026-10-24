# TrustFin AI: Presentation Deck Specification
## Criterion 1: Modular Testing (10 Marks)

> **Codex Luna 6 High / AI Presentation Generator Directive:**  
> Generate an executive presentation deck using the exact visual style, layout, color palette, clean data cards, and execution logs specified below:  
> - **Slide Aspect Ratio:** 16:9 Widescreen.  
> - **Color Theme (Editorial Warm Sand / Academic FinTech):**  
>   - **Canvas Background:** Soft Alabaster / Warm Sand (`#FAF8F5`).  
>   - **Top Running Header Bar:** Deep Umber / Dark Taupe (`#3E3832`) with crisp white uppercase tracking (`#FFFFFF`).  
>   - **Primary Typography:** Dark Charcoal (`#2C2723`) for slide titles; Muted Olive-Gray (`#6B655E`) for subtitles.  
>   - **Table Headers:** Earthy Taupe / Warm Bronze (`#7E6F62`) with white text (`#FFFFFF`).  
>   - **Table Rows:** Alternating clean white (`#FFFFFF`) and faint warm linen (`#F3F0EA`).  
>   - **Accent Success / Validated:** Forest Sage Green (`#4A6B53`).  
>   - **Accent Warning / Risk / Highlights:** Muted Terracotta / Brick Rust (`#B85D43`).  
>   - **Container / KPI Cards:** Warm Light Sand (`#EFECE6` or `#F3F0EA`) with subtle borders (`#DFDBD3`).  
>   - **Footer:** Subdued left-aligned text: `TrustFin AI • K. K. Wagh Institute of Engineering Education & Research` with slide number right-aligned (`#8A7D70`).  
> - **Visual Card Layout:** Use clean, balanced split-cards with colored accent bars. Keep the visual hierarchy neat, simple, and clutter-free.

---

# Slide 1: Modular Testing Overview & Automated Test Setup

### Top Running Header:
`CRITERION 1: MODULAR TESTING (10 MARKS) | TESTING OVERVIEW`

### Slide Title:
## Modular Testing Overview & Automated Test Setup
*Testing each module independently with automated test runners to guarantee zero software defects and fast performance.*

### Visual Split-Card Layout:
- **Left Card:** Test Execution Workflow showing automated isolation testing.
- **Right Card:** Real Test Results Summary in Forest Sage (`#4A6B53`) and Warm Sand (`#EFECE6`).

```text
┌────────────────────────────────────────────────────────┐       ┌────────────────────────────────────────────────────────┐
│ MODULAR TEST EXECUTION FLOW                            │       │ AUTOMATED TEST OUTCOMES SUMMARY                        │
│                                                        │       │                                                        │
│ [Isolated Modules: API, ML, Rules, UI]                 │       │ TOTAL TESTS EXECUTED: 46 PASSED (100% PASS RATE)       │
│            ▼                                           │       │                                                        │
│ [Controlled Test Environment: Mocks & Memory DB]       │       │ • Backend Automated Tests (Pytest): 22 Passed in 31.0s │
│            ▼                                           │       │ • Frontend Screen Tests (Vitest):   24 Passed in 3.75s │
│ [Dual Test Runners: Pytest (Backend) + Vitest (UI)]    │       │ • Zero Setup Errors & Zero Failed Checks               │
│            ▼                                           │       │                                                        │
│ [100% Verified Pass Across All 46 Core Tests]          │       │ Verified in 34.75 seconds total execution time         │
└────────────────────────────────────────────────────────┘       └────────────────────────────────────────────────────────┘
```

### What Modular Testing Means in Our Project:
- **Testing in Isolation:** Each part of the system (calculations, AI explainers, safety rules, user screens) was tested by itself so bugs could not hide behind other components.
- **Backend Test Suite (Pytest — 22 Tests):** Covers repayment safety math, AI decision shortcuts, broken model detection, batch CSV uploads, database saving, and PDF report creation.
- **Frontend Test Suite (Vitest — 24 Tests):** Covers user role permissions (Bank Officer vs Borrower), application history search, batch upload windows, and server communication.
- **Fast & Reliable:** All 46 tests run automatically in under 35 seconds, ensuring quick bug detection whenever code is updated.

### Slide Footer:
`TrustFin AI • K. K. Wagh Institute of Engineering Education & Research                          01`

---

# Slide 2: Module A — Loan Safety Checks & The Credit Score Blindspot

### Top Running Header:
`CRITERION 1: MODULAR TESTING (10 MARKS) | REPAYMENT SAFETY & AI BLINDSPOT`

### Slide Title:
## Module A: Loan Safety Checks & The Credit Score Blindspot
*Verifying that safety rules stop the AI from blindly approving loans when the borrower cannot afford the monthly payment.*

### The Real Stress Test Case:
- **Applicant Monthly Salary:** ₹2,500 / month
- **Loan Amount Requested:** ₹80,000 over a 3-month duration
- **Required Monthly Payment (EMI):** **₹26,667 / month** (**1,066.7% of monthly salary!**)
- **Credit Score (Past Record):** **Clean (Never defaulted in the past)**

### What Was Tested & What the Passed Test Means:

| Test Scenario | Standard AI (Black-Box Model) | TrustFin AI (With Safety Rules) | What the Passed Test Means |
| :--- | :--- | :--- | :--- |
| **Loan Decision** | **APPROVED (99.60% Confidence)** | **REJECTED (99.63% Confidence)** | Standard AI gets fooled by good credit; TrustFin catches the income shortfall. |
| **Strict 50% EMI Rule** | No safety check (Approves bad loan) | **BLOCKED: EMI exceeds 50% of salary** | The safety rule immediately overrides the AI and stops the bad loan. |
| **Real-World Impact** | Borrower defaults; bank loses money | Bank and borrower are protected | Prevents bad debt before money leaves the bank. |
| **Crash Protection** | Entering ₹0 salary can crash software | Handled safely via zero-division guard | System never crashes even when given unusual zero or negative numbers. |

### Terminal Test Log Box:
```text
SOURCE: backend/tests/test_data_and_solvency.py & test_shortcut_learning.py
test_solvent_prime_applicant_metrics [PASS] Income=₹100k, EMI=₹278, Safe DTI PASSED [ 33%]
test_insolvency_guardrail_tripped    [PASS] EMI too high, Hard Rejection     PASSED [ 66%]
test_zero_division_guardrail_immunity [PASS] Zero income handled safely      PASSED [100%]
test_pure_xgboost_shortcut_learning_failure [PASS] Proves standard AI error  PASSED [ 50%]
test_hybrid_architecture_intercepts_shortcut_failure [PASS] TrustFin blocks it PASSED [100%]
```

### Slide Footer:
`TrustFin AI • K. K. Wagh Institute of Engineering Education & Research                          02`

---

# Slide 3: Module B — 4-Pillar Trust Score: Healthy vs Broken Model

### Top Running Header:
`CRITERION 1: MODULAR TESTING (10 MARKS) | 4-PILLAR TRUST SCORE & STRESS TEST`

### Slide Title:
## Module B: 4-Pillar Trust Score: Healthy vs Broken Model
*Proving that our 4-pillar trust score detects when an AI model degrades, loses accuracy, or becomes untrustworthy.*

### The 4 Trust Pillars Simply Explained:
1. **Faithfulness (25%):** Does the explanation truthfully match how the AI made its decision?
2. **Stability (25%):** Does the explanation remain steady if the applicant's numbers change slightly?
3. **Consistency (25%):** Do both SHAP and LIME agree on the most important loan reasons?
4. **Fairness (25%):** Does the AI treat male and female applicants equally and without bias?

$$\text{Overall Trust Score} = 0.25(\text{Faithfulness}) + 0.25(\text{Stability}) + 0.25(\text{Consistency}) + 0.25(\text{Fairness})$$

### Stress-Testing: Healthy Model vs Broken Model

| Measured Pillar | Healthy Model (Normal System) | Broken Model (Stress Test) | What Changed? | What This Passed Test Means |
| :--- | :---: | :---: | :--- | :--- |
| **Model Accuracy** | **99.17%** | **50.83%** | Drops by $-48.3\%$ | The model degrades to random coin-toss guessing. |
| **Explanation Truthfulness** | **89.40%** | **12.70%** | Drops by $-76.7\%$ | Explanations no longer explain real patterns. |
| **Explanation Stability** | **98.10%** | **54.30%** | Drops by $-43.8\%$ | Tiny input changes make explanations jump wildly. |
| **SHAP & LIME Agreement** | **86.70%** | **0.00%** | Drops to $0.0\%$ | Both explainers completely contradict each other. |
| **Gender Fairness** | **100.00%** | **62.10%** | Drops by $-37.9\%$ | Unfair demographic bias creeps into decisions. |
| **Overall Trust Score** | **86.90% [HIGH TRUST]** | **32.27% [CRITICAL RISK]** | **Score plunges by $-54.6\%$** | **Acts as an emergency alarm: halts automated loans and forces manual review.** |

### Slide Footer:
`TrustFin AI • K. K. Wagh Institute of Engineering Education & Research                          03`

---

# Slide 4: Module C — Bulk Loan Upload & Handling Bad Data (Batch Testing)

### Top Running Header:
`CRITERION 1: MODULAR TESTING (10 MARKS) | BATCH PROCESSING & ERROR HANDLING`

### Slide Title:
## Module C: Bulk Loan Upload & Handling Bad Data (Batch Testing)
*Testing bulk CSV uploads: validating rows one-by-one, separating incomplete entries, and processing clean applications.*

### The 3-Step Batch Processing Pipeline:
1. **Row-by-Row Pre-Check:** Verifies all necessary fields (income, requested loan, duration, credit score) before the AI runs.
2. **Isolate Incomplete Rows:** Applications with missing or broken data (blank salary, missing credit score, negative loan) are immediately set aside with clear error reasons.
3. **Process & Store Good Rows:** Clean applications are evaluated by the AI, explained in plain English, and stored in the database under a unique Batch ID.

### Batch Scenarios Verified in Automated Tests:

| Test Scenario | Total Applications | Clean & Evaluated | Incomplete & Separated | What Was Verified in the Test | Status |
| :--- | :---: | :---: | :---: | :--- | :---: |
| **Demo Batch 1 (Quick Test)** | **10** | **7** | **3** | Caught: missing credit score, blank salary, zero loan amount | **PASS** |
| **Demo Batch 2 (Large Test)** | **30** | **24** | **6** | Realistic mix of clean files and multiple data entry errors | **PASS** |
| **Sample CSV Template Download** | **20** | **15** | **5** | Verified template format with sample valid and invalid rows | **PASS** |
| **Direct File Upload (`.csv`)** | **3** | **2** | **1** | Tested actual file upload endpoint and error reporting | **PASS** |

### What These Passed Tests Mean:
- Proves the system handles real-world dirty data without crashing.
- Incomplete applications never pollute the clean database or corrupt loan statistics.

### Slide Footer:
`TrustFin AI • K. K. Wagh Institute of Engineering Education & Research                          04`

---

# Slide 5: Module D — User Screens & Access Control Testing (Frontend Vitest)

### Top Running Header:
`CRITERION 1: MODULAR TESTING (10 MARKS) | FRONTEND COMPONENT TESTING`

### Slide Title:
## Module D: User Screens & Access Control Testing (Frontend Vitest)
*Automated screen testing: verifying role permissions, modal windows, search filters, and server communication.*

### Frontend Test Environment:
- **Test Framework:** **Vitest 5.0** + React Testing Library + JSDOM.
- **Speed & Reliability:** **24 automated screen tests completed in 3.75s** with 100% pass rate.

### Screens & Features Tested:

| Screen Component | Feature Tested | Behavior Verified in Test | What the Passed Test Means |
| :--- | :--- | :--- | :--- |
| **`ApplicantForm.test.jsx`** | Role Permissions & Presets | • "Upload Batch" button is visible for **Bank Officers**, hidden for **Borrowers**.<br>• Preset profile buttons accurately fill out sample application forms. | Ensures borrowers cannot access internal bank officer bulk tools. |
| **`BatchUploadModal.test.jsx`** | Batch Window & Tabs | • Modal window opens and closes smoothly.<br>• Dual tabs allow toggling between **Processed Applications** and **Incomplete Records**. | Officers can easily inspect which rows passed and which had data errors. |
| **`AuditHistoryModal.test.jsx`** | Application History Ledger | • Dual tabs toggle between **Individual Loans** and **Batch Upload History**.<br>• Search bar filters applications by ID.<br>• "Inspect" button opens detailed AI explanations. | Officers can look up past decisions instantly during customer inquiries or record checks. |
| **`api.test.js`** | Server Networking Client | • Tested sending applications, uploading CSV files, downloading templates, and handling network errors. | Frontend handles connection errors gracefully without freezing the browser. |

### Slide Footer:
`TrustFin AI • K. K. Wagh Institute of Engineering Education & Research                          05`

---

# Slide 6: Module E — End-to-End System Integration Testing

### Top Running Header:
`CRITERION 1: MODULAR TESTING (10 MARKS) | FULL SYSTEM INTEGRATION`

### Slide Title:
## Module E: End-to-End System Integration Testing
*Testing the complete loan lifecycle across all connected components with zero breaks or data loss.*

### [AI Diagram Directive for Codex Luna]:
> **Generate Horizontal Lifecycle Flowchart on `#FAF8F5`:**  
> Create a clean vector flow diagram:  
> `[1. Form Submission]` $\to$ `[2. 50% EMI Safety Check]` $\to$ `[3. AI Risk Prediction]` $\to$ `[4. Plain Explanations]` $\to$ `[5. Database Storage]` $\to$ `[6. Official PDF Letter Download]`.  
> Use Forest Sage (`#4A6B53`) and Warm Bronze (`#7E6F62`) node containers with crisp white text and directional arrows.

### Key Integration Scenarios Verified in Tests:
- **Full Loan Lifecycle Journey:** Form submission automatically triggers safety rule validation, sub-second AI evaluation, plain-English explanations, database persistence, and official PDF generation.
- **Bulk Batch Portfolio Lifecycle:** Validates entire CSV files, isolates incomplete rows, evaluates valid applications, saves under a unique Batch ID, and permits safe record cleanup.
- **Offline Database Fallback:** Automatically switches to local SQLite with zero downtime or software crashes if the primary cloud PostgreSQL database is unreachable.

### Terminal Test Log Box:
```text
SOURCE: backend/tests/test_full_system_integration.py & test_reporting_and_pdf.py
test_e2e_single_application_pipeline_integration    [FULL SYSTEM JOURNEY OK] PASSED [ 33%]
test_e2e_batch_portfolio_pipeline_integration      [BATCH DATABASE FLOW OK] PASSED [ 66%]
test_database_sqlite_fallback_and_schema_resilience [OFFLINE SQLITE OK]     PASSED [100%]
test_direct_pdf_generator_function                  [VALID PDF FILE OK]      PASSED [ 50%]
test_api_generate_pdf_endpoint                      [PDF DOWNLOAD API OK]    PASSED [100%]
```

### Slide Footer:
`TrustFin AI • K. K. Wagh Institute of Engineering Education & Research                          06`

---

# Slide 7: Modular Testing Scorecard & Complete Summary

### Top Running Header:
`CRITERION 1: MODULAR TESTING (10 MARKS) | TESTING SCORECARD & SUMMARY`

### Slide Title:
## Modular Testing Scorecard & Complete Summary
*Consolidated verification results across all 5 testing modules (46 total automated tests passed).*

### Visual Metrics Cards:
- **Card 1:** Total Tests: **46 Executed / 46 Passed (100% Pass Rate)**
- **Card 2:** Defect Count: **Zero Setup Errors & Zero Failed Checks**
- **Card 3:** Combined Execution Speed: **< 35 Seconds Total Duration**

### Complete Modular Testing Scorecard Table:

| Tested Module Area | Primary Function Verified | Test Framework | Total Tests | Status |
| :--- | :--- | :---: | :---: | :---: |
| **Module A: Loan Safety Rules** | Strict 50% EMI limit, ₹0 crash protection, income checks | Pytest (Backend) | 5 Tests | **100% PASS** |
| **Module B: 4-Pillar Trust Score** | Healthy vs broken model detection, fairness, accuracy | Pytest (Backend) | 3 Tests | **100% PASS** |
| **Module C: Batch Loan Processing** | Row pre-checking, separating broken data, CSV uploads | Pytest (Backend) | 7 Tests | **100% PASS** |
| **Module D: User Screens & Access** | Role permissions, batch modals, history search, API client | Vitest (Frontend) | 24 Tests | **100% PASS** |
| **Module E: End-to-End Journeys** | Single application, batch lifecycle, offline database, PDF | Pytest (Backend) | 7 Tests | **100% PASS** |
| **Complete System Verification** | **Zero setup errors, zero failed checks (< 35s execution)** | **Pytest + Vitest** | **46 Tests** | **100% PASS** |

### Key Engineering Takeaways:
- **Full-Stack Test Coverage:** Every layer—from mathematical loan safety rules to machine learning explainers and frontend React user screens—is verified by automated tests.
- **Safe Test Environment:** Mocks and in-memory test databases ensure comprehensive testing without altering live production databases.

### Slide Footer:
`TrustFin AI • K. K. Wagh Institute of Engineering Education & Research                          07`

---

# Slide 8: Key Finding 1 — The "Good Credit" Trap & Hybrid Safety Rules

### Top Running Header:
`CRITERION 2: RESULTS & DISCUSSION (30 MARKS) | KEY FINDING 1: HYBRID SAFETY RULES`

### Slide Title:
## Key Finding 1: The "Good Credit" Trap & Hybrid Safety Rules
*An explanation can faithfully describe a dangerous decision. That does not make the decision safe.*

### [Codex Presentation Layout Directive]:
> **Render Exactly Two Balanced Side-by-Side Cards on `#FAF8F5`:**  
> - **Left Card (Terracotta Accent `#B85D43`):** Standard AI Model & The Blindspot.  
> - **Right Card (Forest Sage Accent `#4A6B53`):** TrustFin AI & The 50% Safety Rule.  
> - **Do NOT render any bottom banners or extra boxes.** All explanations are contained inside the two cards.

```text
┌────────────────────────────────────────────────────────┐       ┌────────────────────────────────────────────────────────┐
│ STANDARD AI MODEL (THE BLINDSPOT)                      │       │ TRUSTFIN AI (WITH 50% SAFETY RULE)                     │
│ [Terracotta Accent Bar: #B85D43]                       │       │ [Forest Sage Accent Bar: #4A6B53]                      │
│                                                        │       │                                                        │
│ • The Lazy Shortcut:                                   │       │ • Strict Repayment Safety Rule:                        │
│   In past loan data, 96.7% of people with good credit  │       │   Banks cannot lend if monthly loan payments exceed    │
│   were approved. The AI learned a lazy rule:           │       │   50% of the applicant's monthly salary.               │
│   "If credit is good, approve immediately."            │       │                                                        │
│                                                        │       │ • Checking Loan Affordability:                         │
│ • The Dangerous Test Case:                             │       │   The requested payment of ₹26,667 was way higher than │
│   An applicant earning ₹2,500/month asked for an       │       │   the maximum safe limit of ₹1,250/month (50% cap).    │
│   ₹80,000 loan over 3 months. Monthly EMI came out to  │       │                                                        │
│   ₹26,667/month (10 times their monthly salary!).      │       │ • The System Action:                                   │
│                                                        │       │   The 50% safety rule stepped in, overrode the AI's    │
│ • The AI's Mistake:                                    │       │   approval, and immediately REJECTED the loan.         │
│   The AI approved the impossible loan with 99.6% high  │       │                                                        │
│   confidence, completely ignoring their tiny salary.   │       │ • Why AI Needs Hard Rules:                             │
│                                                        │       │   Explaining a decision only shows what the AI thought │
│ • The Faithful AI Trap:                                │       │   —it does not make the decision safe. Hard banking    │
│   SHAP and LIME gave this reckless approval a 99.6%    │       │   rules are mandatory to protect banks from bad debt.  │
│   faithfulness score, faithfully defending a disaster. │       │                                                        │
│ ────────────────────────────────────────────────────── │       │ ────────────────────────────────────────────────────── │
│ Result: Immediate loan default and total loss of money │       │ Result: Bank capital is safe; bad loan is prevented    │
└────────────────────────────────────────────────────────┘       └────────────────────────────────────────────────────────┘
```

### Slide Footer:
`TrustFin AI • K. K. Wagh Institute of Engineering Education & Research                          08`

---

# Slide 9: Key Finding 2 — Consistent Explanations & The Emergency Shutoff

### Top Running Header:
`CRITERION 2: RESULTS & DISCUSSION (30 MARKS) | KEY FINDING 2: CONSISTENCY & SAFETY SHUTOFF`

### Slide Title:
## Key Finding 2: Consistent Explanations & The Emergency Shutoff
*Eliminating random changes on repeat checks and freezing loan payouts when AI models degrade.*

### [Codex Presentation Layout Directive]:
> **Render Exactly Two Balanced Side-by-Side Cards on `#FAF8F5`:**  
> - **Left Card (Warm Bronze Accent `#7E6F62`):** 100% Consistent Explanations.  
> - **Right Card (Forest Sage Accent `#4A6B53`):** The Automated Emergency Shutoff.  
> - **Do NOT render any bottom banners or extra boxes.** All explanations are contained inside the two cards.

```text
┌────────────────────────────────────────────────────────┐       ┌────────────────────────────────────────────────────────┐
│ 100% CONSISTENT EXPLANATIONS                           │       │ THE AUTOMATED EMERGENCY SHUTOFF                        │
│ [Warm Bronze Accent Bar: #7E6F62]                      │       │ [Forest Sage Accent Bar: #4A6B53]                      │
│                                                        │       │                                                        │
│ • The Problem: Shifting Explanations                   │       │ • The Silent Danger:                                   │
│   Standard AI tools use random numbers. Refreshing the │       │   When AI models degrade over time or receive bad data,│
│   same loan application made the explanation numbers   │       │   black-box AI silently approves risky loans, causing  │
│   and percentages shift by 3% to 7% every time!        │       │   massive defaults months later.                       │
│                                                        │       │                                                        │
│ • Why Changing Explanations Cause Trouble:             │       │ • Our Stress Test on a Damaged Model:                  │
│   If a customer or loan officer checks an application  │       │   When we tested a damaged model, the system's Trust   │
│   today and re-checks it tomorrow, getting different   │       │   Score instantly collapsed from 86.9% [High Trust]    │
│   reasons destroys trust and causes complaints.        │       │   down to 32.3% [Critical Risk].                       │
│                                                        │       │                                                        │
│ • Our Fix: Locking the Numbers                         │       │ • The Automated Circuit Breaker:                       │
│   We locked the explanation generator using the        │       │   The Trust Score acts like an electrical fuse in a    │
│   applicant's unique details so it never randomizes.   │       │   house: it automatically freezes loan payouts and     │
│                                                        │       │   sends the file to a senior officer for human review. │
│ • The Result:                                          │       │                                                        │
│   Exactly 0.000000 random change. Re-testing the same  │       │ • The Result:                                          │
│   person gives the exact same reasons and percentages  │       │   Stops bad debt and protects bank capital before money│
│   every single time.                                   │       │   leaves the bank.                                     │
│ ────────────────────────────────────────────────────── │       │ ────────────────────────────────────────────────────── │
│ Outcome: Explanations Never Change on Repeat Checks    │       │ Outcome: Capital Protected Against Broken AI Models    │
└────────────────────────────────────────────────────────┘       └────────────────────────────────────────────────────────┘
```

### Slide Footer:
`TrustFin AI • K. K. Wagh Institute of Engineering Education & Research                          09`

---

# Slide 10: Key Finding 3 — Turning "Rejections" into Actionable Approvals

### Top Running Header:
`CRITERION 2: RESULTS & DISCUSSION (30 MARKS) | KEY FINDING 3: ACTIONABLE PATHS TO APPROVAL`

### Slide Title:
## Key Finding 3: Turning "Rejections" into Actionable Approvals
*Transforming cold rejection letters into clear, practical roadmaps that show borrowers how to qualify.*

### [Codex Presentation Layout Directive]:
> **Render Two-Column Layout (Content Card on Left, Blank Space on Right) on `#FAF8F5`:**  
> - **Left Column (50% Width):** Single content card with Forest Sage accent (`#4A6B53`) explaining the 3 actionable paths.  
> - **Right Column (50% Width):** Leave completely blank / empty open space for user screenshot.  
> - **Do NOT render any bottom banners or extra boxes.**

```text
┌────────────────────────────────────────────────────────┐       ┌────────────────────────────────────────────────────────┐
│ TURNING REJECTIONS INTO APPROVALS                      │       │                                                        │
│ [Forest Sage Accent Bar: #4A6B53]                      │       │                                                        │
│                                                        │       │                                                        │
│ • The Problem with Traditional Banks:                  │       │                                                        │
│   Banks issue cold, flat refusals with zero guidance,  │       │                                                        │
│   leaving borrowers confused and banks losing paying   │       │                                                        │
│   customers to competing lenders.                      │       │                                                        │
│                                                        │       │                                                        │
│ • TrustFin's "What-If" Solution:                       │       │                                                        │
│   Instead of a dead end, TrustFin AI calculates 3      │       │               [BLANK AREA RESERVED                     │
│   practical, realistic ways to turn a "NO" into a      │       │                    FOR SCREENSHOT]                     │
│   "YES":                                               │       │                                                        │
│                                                        │       │                                                        │
│ • 1. Spread Payments Over More Time:                   │       │                                                        │
│   Extending repayment time (e.g. 12 to 36 months) cuts │       │                                                        │
│   monthly EMI from 68% down to 28% of salary.          │       │                                                        │
│                                                        │       │                                                        │
│ • 2. Add an Earning Family Member:                     │       │                                                        │
│   Pooling income with a working spouse or parent       │       │                                                        │
│   doubles household income and cuts debt burden in half│       │                                                        │
│                                                        │       │                                                        │
│ • 3. Pay a Small Down Payment:                         │       │                                                        │
│   Paying 15% to 20% upfront reduces loan principal     │       │                                                        │
│   so monthly payments fit the borrower's income.       │       │                                                        │
│ ────────────────────────────────────────────────────── │       │                                                        │
│ Outcome: Empowers Borrowers; Retains Bank Customers    │       │                                                        │
└────────────────────────────────────────────────────────┘       └────────────────────────────────────────────────────────┘
```

### Slide Footer:
`TrustFin AI • K. K. Wagh Institute of Engineering Education & Research                          10`

---

# Slide 11: Double-Checking Decisions: TrustFin AI vs Existing Systems

### Top Running Header:
`CRITERION 2: RESULTS & DISCUSSION (30 MARKS) | DUAL EXPLAINABILITY & COMPARISON`

### Slide Title:
## Double-Checking Decisions: TrustFin AI vs Existing Systems
*Why running two independent explainers (SHAP & LIME) beats legacy credit bureaus and opaque FinTech black boxes.*

### [Codex Presentation Layout Directive]:
> **Render Exactly Two Balanced Side-by-Side Cards on `#FAF8F5`:**  
> - **Left Card (Warm Bronze Accent `#7E6F62`):** Dual Explainers (SHAP & LIME).  
> - **Right Card (Forest Sage Accent `#4A6B53`):** Comparison with Existing Technology.  
> - **Do NOT render any bottom banners or extra boxes.** All explanations are contained inside the two cards.

```text
┌────────────────────────────────────────────────────────┐       ┌────────────────────────────────────────────────────────┐
│ DUAL EXPLAINERS (SHAP & LIME)                          │       │ COMPARISON WITH EXISTING SYSTEMS                       │
│ [Warm Bronze Accent Bar: #7E6F62]                      │       │ [Forest Sage Accent Bar: #4A6B53]                      │
│                                                        │       │                                                        │
│ • The "Second Opinion" Approach:                       │       │ • Traditional Credit Bureaus (CIBIL / Experian):       │
│   A single tool can have blind spots. TrustFin runs    │       │   Takes days to weeks; gives only a 3-digit score with │
│   two independent tools on every loan to double-check  │       │   zero explanation for why an applicant was rejected.  │
│   reasons.                                             │       │                                                        │
│                                                        │       │ • Commercial FinTech Apps:                             │
│ • How the Two Tools Work:                              │       │   Fast, but completely opaque black boxes. When models │
│   • SHAP: Measures how much each financial factor      │       │   degrade, they fail silently and cause bad debt.      │
│     pushed the decision up or down overall.            │       │                                                        │
│   • LIME: Tests small variations around the applicant  │       │ • TrustFin AI (Our System):                            │
│     to see what drove the decision at the cutoff line. │       │   • Fast Sub-Second Decisions: Results in < 850ms.     │
│                                                        │       │   • Dual Plain-English Explanations: SHAP + LIME.      │
│ • High Agreement (86.7% Score):                        │       │   • Hard Safety Rules: 50% EMI cap overrides bad loans.│
│   Both tools agreed on the top 3 loan reasons across   │       │   • Circuit Breaker: Halts payouts on degraded models. │
│   all 600 validation test cases.                       │       │   • Actionable Guidance: 3 practical paths to qualify. │
│                                                        │       │                                                        │
│ • Automatic Disagreement Alert:                        │       │ • The Real-World Advantage:                            │
│   If the two tools ever disagree, the system flags the │       │   Combines modern FinTech speed with traditional       │
│   file for immediate human underwriter review.         │       │   banking safety and complete transparency.            │
│ ────────────────────────────────────────────────────── │       │ ────────────────────────────────────────────────────── │
│ Outcome: Independent Verification; Zero Blind Spots    │       │ Outcome: Faster Than Bureaus, Safer Than Black Boxes   │
└────────────────────────────────────────────────────────┘       └────────────────────────────────────────────────────────┘
```

### Slide Footer:
`TrustFin AI • K. K. Wagh Institute of Engineering Education & Research                          11`

---

# Slide 12: End-to-End Decision Workflow

### Top Running Header:
`CRITERION 2: RESULTS & DISCUSSION (30 MARKS) | SYSTEM WORKFLOW`

### Slide Title:
## End-to-End Decision Workflow
*A complete visual pipeline: from applicant intake and safety screening to explainable decisions and audit.*

### [Codex Presentation Layout Directive]:
> **GENERATE A SINGLE FULL-SLIDE WORKFLOW IMAGE:**  
> - **Full-Bleed Graphic:** Generate a single, high-resolution vector infographic diagram covering the entire slide area on `#FAF8F5`.  
> - **Zero Text Clutter:** Do NOT render any split cards, bullet lists, or side text boxes. The visual workflow diagram occupies 100% of the slide body.  
> - **4-Stage Pipeline Flow (Left to Right):**  
>   1. **`Data Intake`** (Applicant financials & bulk CSV upload)  
>   2. **`Safety Gate`** (Hard 50% EMI debt rule with safety shield icon)  
>   3. **`Dual AI & XAI Engine`** (Sub-second scoring with SHAP & LIME dual validation)  
>   4. **`Decision & Audit`** (Branching into **Approved** with SHA-256 PDF letter, and **Rejected** with 3 actionable guidance paths)  
> - **Color Scheme:** Editorial Warm Sand `#FAF8F5` background, Forest Sage `#4A6B53` (safety/approved), Terracotta `#B85D43` (recourse/rejected), and Dark Slate `#3E3832` headers.

*(Full-slide visual workflow image generated across the entire slide)*

### Slide Footer:
`TrustFin AI • K. K. Wagh Institute of Engineering Education & Research                          12`

---

# Slide 13: Live System Interface: Officer Portal & Borrower Guidance

### Top Running Header:
`CRITERION 2: RESULTS & DISCUSSION (30 MARKS) | USER INTERFACE & DEMONSTRATION`

### Slide Title:
## Live System Interface: Officer Portal & Borrower Guidance
*Side-by-side interactive screens: comprehensive underwriting dashboard vs plain-English applicant guidance.*

### [Codex Presentation Layout Directive]:
> **Render Exactly Two Balanced Side-by-Side Screenshot Frames on `#FAF8F5`:**  
> - **Left Frame (Warm Neutral `#EFECE6` with Forest Sage Border `#4A6B53`):** Bank Officer Underwriting Dashboard.  
> - **Right Frame (Warm Neutral `#EFECE6` with Terracotta Border `#B85D43`):** Applicant Counterfactual Guidance Screen.  
> - **No Text Clutter:** Clean framed screenshot holders reserved for high-resolution product demo screenshots.

```text
┌────────────────────────────────────────────────────────┐       ┌────────────────────────────────────────────────────────┐
│ BANK OFFICER UNDERWRITING DASHBOARD                    │       │ APPLICANT RECOURSE & GUIDANCE SCREEN                   │
│ [Forest Sage Accent Bar: #4A6B53]                      │       │ [Terracotta Accent Bar: #B85D43]                       │
│                                                        │       │                                                        │
│                                                        │       │                                                        │
│                                                        │       │                                                        │
│               [BLANK AREA RESERVED                     │       │               [BLANK AREA RESERVED                     │
│               FOR OFFICER DASHBOARD                    │       │               FOR APPLICANT RECOURSE                   │
│                    SCREENSHOT]                         │       │                    SCREENSHOT]                         │
│                                                        │       │                                                        │
│                                                        │       │                                                        │
│                                                        │       │                                                        │
│ ────────────────────────────────────────────────────── │       │ ────────────────────────────────────────────────────── │
│ Role: Loan Officer / Underwriter View                  │       │ Role: Customer / Applicant Transparency View           │
└────────────────────────────────────────────────────────┘       └────────────────────────────────────────────────────────┘
```

### Slide Footer:
`TrustFin AI • K. K. Wagh Institute of Engineering Education & Research                          13`

---

# Slide 14: Future Scope: Practical System Extensions

### Top Running Header:
`CRITERION 2: RESULTS & DISCUSSION (30 MARKS) | FUTURE SCOPE & ROADMAP`

### Slide Title:
## Future Scope: Practical System Extensions
*Three actionable, engineering-focused enhancements to transition TrustFin AI into commercial operations.*

### [Codex Presentation Layout Directive]:
> **Render Exactly Three Balanced Side-by-Side Cards on `#FAF8F5`:**  
> - **Card 1 (Forest Sage Accent `#4A6B53`):** Automated Document OCR.  
> - **Card 2 (Warm Bronze Accent `#7E6F62`):** Live Banking API Feeds.  
> - **Card 3 (Terracotta Accent `#B85D43`):** Regional Language Support.  
> - **Do NOT render any bottom banners or extra text boxes.** Keep all content clean and balanced across the three cards.

```text
┌──────────────────────────────────┐     ┌──────────────────────────────────┐     ┌──────────────────────────────────┐
│ AUTOMATED DOCUMENT OCR           │     │ LIVE BANKING API FEEDS           │     │ REGIONAL LANGUAGE SUPPORT        │
│ [Forest Sage Accent: #4A6B53]    │     │ [Warm Bronze Accent: #7E6F62]    │     │ [Terracotta Accent: #B85D43]     │
│                                  │     │                                  │     │                                  │
│ • Objective:                     │     │ • Objective:                     │     │ • Objective:                     │
│   Auto-read salary slips & bank  │     │   Direct connection to verified  │     │   Plain explanations in regional │
│   statements from uploaded PDFs. │     │   bank account cashflow feeds.   │     │   Indian languages for borrowers.│
│                                  │     │                                  │     │                                  │
│ • Engineering Path:              │     │ • Engineering Path:              │     │ • Engineering Path:              │
│   Lightweight OCR parser to pull │     │   Account Aggregator (AA) sandbox│     │   Multilingual translation layer │
│   income and existing EMI fields.│     │   integration with user consent. │     │   supporting Hindi and Marathi.  │
│                                  │     │                                  │     │                                  │
│ • Practical Impact:              │     │ • Practical Impact:              │     │ • Practical Impact:              │
│   Cuts intake time from minutes  │     │   Verifies real bank deposits and│     │   Empowers non-English speaking  │
│   to seconds; removes typos.     │     │   blocks forged or edited PDFs.  │     │   applicants to understand terms.│
│ ──────────────────────────────── │     │ ──────────────────────────────── │     │ ──────────────────────────────── │
│ Outcome: Zero Manual Data Entry  │     │ Outcome: 100% Tamper-Proof Data  │     │ Outcome: Fair Credit for All     │
└──────────────────────────────────┘     └──────────────────────────────────┘     └──────────────────────────────────┘
```

### Slide Footer:
`TrustFin AI • K. K. Wagh Institute of Engineering Education & Research                          14`

---

# Slide 15: Conclusion: What TrustFin AI Proves for Modern Banking

### Top Running Header:
`CRITERION 2: RESULTS & DISCUSSION (30 MARKS) | PROJECT CONCLUSION & KEY TAKEAWAYS`

### Slide Title:
## Conclusion: What TrustFin AI Proves for Modern Banking
*Why combining sub-second machine learning with deterministic safety rules creates safer, fairer lending than black-box AI.*

### [Codex Presentation Layout Directive]:
> **Render Exactly Two Balanced Side-by-Side Cards on `#FAF8F5`:**  
> - **Left Card (Forest Sage Accent `#4A6B53`):** Core Engineering & Research Lessons.  
> - **Right Card (Warm Bronze Accent `#7E6F62`):** Real-World Impact for Banks & Borrowers.  
> - **Do NOT render any bottom banners or extra text boxes.** Keep all conclusions cleanly balanced within the two cards.

```text
┌────────────────────────────────────────────────────────┐       ┌────────────────────────────────────────────────────────┐
│ CORE ENGINEERING & RESEARCH LESSONS                    │       │ REAL-WORLD IMPACT FOR BANKS & BORROWERS                │
│ [Forest Sage Accent Bar: #4A6B53]                      │       │ [Warm Bronze Accent Bar: #7E6F62]                      │
│                                                        │       │                                                        │
│ • 1. Explainability Alone Does Not Mean Safety:        │       │ • 1. For Financial Institutions (Banks):               │
│   Our tests proved that SHAP & LIME can faithfully     │       │   • Zero blind-spot defaults from high-credit traps.   │
│   defend dangerous loans. AI models must always be     │       │   • Automated batch evaluation processes files safely. │
│   bounded by hard banking rules (50% EMI cap).         │       │   • Every loan is backed by a permanent audit trail.   │
│                                                        │       │                                                        │
│ • 2. Explanation Drift Demands Circuit Breakers:       │       │ • 2. For Borrowers (Actionable Financial Recourse):    │
│   Models fail silently as data shifts. TrustFin's      │       │   • Rejections are no longer dead-end "black boxes".   │
│   4-Pillar Trust Score instantly detects degradation   │       │   • 3 mathematically verified turnaround options show  │
│   (86.9% down to 32.3%) and freezes payouts.           │       │     borrowers exactly how to qualify for approval.     │
│                                                        │       │                                                        │
│ • 3. Sub-Second Speed with Zero Black Boxes:           │       │ • 3. For Regulators (RBI & Fair Lending Compliance):   │
│   Delivered full dual explainability (SHAP + LIME) in  │       │   • Cryptographic SHA-256 PDF sanction verification.   │
│   under 850ms, proving compliance needs no slowdown.   │       │   • High explainer agreement (86.7%) prevents bias.    │
│ ────────────────────────────────────────────────────── │       │ ────────────────────────────────────────────────────── │
│ Takeaway: Safety Rules Overwrite; Trust Scores Protect │       │ Takeaway: Transparent Underwriting; Zero Lost Customers│
└────────────────────────────────────────────────────────┘       └────────────────────────────────────────────────────────┘
```

### Slide Footer:
`TrustFin AI • K. K. Wagh Institute of Engineering Education & Research                          15`

---

# Slide 16: Repository-Based Software Sizing: Logical SLOC Breakdown

### Top Running Header:
`CRITERION 3: COST ESTIMATION (10 MARKS) | SOFTWARE SIZING & REPOSITORY AUDIT`

### Slide Title:
## Repository-Based Software Sizing: Logical SLOC Breakdown
*Audited code metrics across 50 production files totaling 7,514 logical source lines of code.*

### [Codex Presentation Layout Directive]:
> **Render a Structured Visual Sizing Dashboard on `#FAF8F5`:**  
> - **Top Row (3 Visual Metric Cards):**  
>   - `Total Codebase`: **7,514 Logical SLOC** (7.514 KSLOC)  
>   - `Active Files`: **50 Production Files** (Zero auto-generated bloat)  
>   - `Testing Density`: **46 Automated Tests** (33% of backend codebase)  
> - **Main Visual Table:** Render a clean, high-contrast breakdown table comparing the 4 core architectural subsystems with exact lines of code, primary languages, and architectural roles.  
> - **Palette:** Warm Sand `#FAF8F5` background, Forest Sage `#4A6B53` and Warm Bronze `#7E6F62` headers.

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ SOFTWARE REPOSITORY AUDIT BREAKDOWN (TOTAL SIZE: 7,514 LOGICAL SLOC)                                                   │
│ [Forest Sage Accent Bar: #4A6B53]                                                                                      │
│                                                                                                                        │
│  Subsystem Area                  Primary Tech Stack          Files    Logical SLOC    Share (%)   Primary Function     │
│  ──────────────────────────────  ──────────────────────────  ─────    ────────────    ─────────   ──────────────────── │
│  1. ML, XAI & Trust Engine       Python, XGBoost, SHAP, LIME  12       2,335 SLOC       31.1%     Scoring & Explanations│
│  2. Backend APIs & Safety Rules  FastAPI, Pydantic, Python    15       2,057 SLOC       27.4%     50% EMI Rule & Routes│
│  3. Frontend User Dashboard      React 18, Vanilla CSS, Vite  13       2,000 SLOC       26.6%     Officer & User UIs   │
│  4. Testing Suites & Persistence Pytest, Vitest, SQLAlchemy   10       1,122 SLOC       14.9%     46 Tests & Fallback  │
│  ──────────────────────────────  ──────────────────────────  ─────    ────────────    ─────────   ──────────────────── │
│  TOTAL AUDITED REPOSITORY CODE   Full-Stack Python + React    50       7,514 SLOC      100.0%     7.514 KSLOC Size (S) │
│                                                                                                                        │
│ • Sizing Methodology: Evaluated via physical line counters strictly filtering for executable logic, excluding         │
│   third-party libraries (venv, node_modules), documentation, and compiled artifacts.                                  │
│ ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── │
│ Outcome: Defensible 7.514 KSLOC Baseline for COCOMO II Effort & Schedule Equations                                    │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Slide Footer:
`TrustFin AI • K. K. Wagh Institute of Engineering Education & Research                          16`

---

# Slide 17: Effort and Schedule Estimation: COCOMO II Post-Architecture

### Top Running Header:
`CRITERION 3: COST ESTIMATION (10 MARKS) | EFFORT & SCHEDULE DERIVATION`

### Slide Title:
## Effort and Schedule Estimation: COCOMO II Post-Architecture
*Mathematical derivation of engineering effort, project duration, and optimal team size.*

### [Codex Presentation Layout Directive]:
> **Render Exactly Two Balanced Side-by-Side Cards on `#FAF8F5`:**  
> - **Left Card (Forest Sage Accent `#4A6B53`):** The COCOMO II Effort Model ($E$).  
> - **Right Card (Warm Bronze Accent `#7E6F62`):** Schedule ($TDEV$) & Staffing Requirements ($FTE$).  
> - **Do NOT render any bottom banners or extra text boxes.** Keep all calculations cleanly balanced inside the cards.

```text
┌────────────────────────────────────────────────────────┐       ┌────────────────────────────────────────────────────────┐
│ COCOMO II EFFORT ESTIMATION MODEL                      │       │ SCHEDULE (TDEV) & STAFFING (FTE) MODEL                 │
│ [Forest Sage Accent Bar: #4A6B53]                      │       │ [Warm Bronze Accent Bar: #7E6F62]                      │
│                                                        │       │                                                        │
│ • 1. Mathematical Effort Equation:                     │       │ • 1. Development Duration Equation:                   │
│   Effort (E) = A × (Size)^B × ∏(Cost Drivers)          │       │   Schedule (TDEV) = C × (Effort)^D                     │
│                                                        │       │                                                        │
│ • 2. Parameter Inputs & Constants:                     │       │ • 2. Schedule Constants & Derivation:                 │
│   • Baseline Coefficient (A): 2.94 (Calibrated Base)   │       │   • Schedule Coefficient (C): 3.67                     │
│   • Software Size (Size):     7.514 KSLOC (Audited)    │       │   • Schedule Exponent (D):    0.3179 (Standard Scale)  │
│   • Scaling Exponent (B):     1.0997 (Nominal Scale)   │       │   TDEV = 3.67 × (17.79)^0.3179                         │
│   • Combined Multipliers:     0.6550 (High Capability) │       │   TDEV = 3.67 × 2.461 = 9.03 Calendar Months           │
│                                                        │       │                                                        │
│ • 3. Step-by-Step Derivation:                          │       │ • 3. Full-Time Personnel Requirements (FTE):          │
│   E = 2.94 × (7.514)^1.0997 × 0.6550                   │       │   Staffing = Effort / Duration = 17.79 / 9.03          │
│   E = 2.94 × 9.243 × 0.6550                            │       │   Required Staffing = 1.97 ≈ 2 Full-Time Engineers     │
│   E = 17.79 Person-Months (PM)                         │       │                                                        │
│                                                        │       │ • Real-World Academic Alignment:                       │
│                                                        │       │   Matches our 2-engineer team over 2 semesters (9 mo)! │
│ ────────────────────────────────────────────────────── │       │ ────────────────────────────────────────────────────── │
│ Calculated Effort: 17.79 Person-Months of Engineering  │       │ Calculated Timeline: 9.03 Months with 2 Developers    │
└────────────────────────────────────────────────────────┘       └────────────────────────────────────────────────────────┘
```

### Slide Footer:
`TrustFin AI • K. K. Wagh Institute of Engineering Education & Research                          17`

---

# Slide 18: Estimated Development Budget: Professional Scenario

### Top Running Header:
`CRITERION 3: COST ESTIMATION (10 MARKS) | COMMERCIAL BUDGET & VALUATION`

### Slide Title:
## Estimated Development Budget: Professional Scenario
*Commercial replacement valuation based on prevailing Indian FinTech engineering market compensation.*

### [Codex Presentation Layout Directive]:
> **Render Exactly Two Balanced Side-by-Side Cards on `#FAF8F5`:**  
> - **Left Card (Forest Sage Accent `#4A6B53`):** Engineering Personnel Compensation.  
> - **Right Card (Warm Bronze Accent `#7E6F62`):** Infrastructure, Tooling & Overheads.  
> - **Do NOT render any bottom banners or extra text boxes.** Keep all cost figures cleanly contained inside the cards.

```text
┌────────────────────────────────────────────────────────┐       ┌────────────────────────────────────────────────────────┐
│ ENGINEERING PERSONNEL COMPENSATION                     │       │ INFRASTRUCTURE, TOOLING & OVERHEAD                     │
│ [Forest Sage Accent Bar: #4A6B53]                      │       │ [Warm Bronze Accent Bar: #7E6F62]                      │
│                                                        │       │                                                        │
│ • Benchmark: Indian Retail FinTech Market Rates        │       │ • 1. Cloud Infrastructure & Compute:                   │
│   Standard industry compensation for mid-level Python  │       │   • AWS EC2 (t3.xlarge) + Managed PostgreSQL: ₹68,000  │
│   backend and React engineering in tier-1 Indian hubs. │       │   • Model Training & TreeSHAP Compute:        ₹24,000  │
│                                                        │       │                                                        │
│ • 1. Lead Full-Stack Engineer (Backend & Architecture):│       │ • 2. Development Tooling & Compliance:                 │
│   • Monthly Base:   ₹95,000 / month                    │       │   • PDF Cryptographic Verification Licenses:  ₹18,000  │
│   • Duration:       9.03 Months (4.52 Person-Months)   │       │   • Automated CI/CD & Testing Sandboxes:      ₹22,000  │
│   • Total Cost:     ₹8,57,850                          │       │                                                        │
│                                                        │       │ • 3. Statutory Benefits & Administration (4%):         │
│ • 2. Machine Learning & XAI Engineer (Models & XAI):   │       │   • Equipment amortization & cloud egress:    ₹64,175  │
│   • Monthly Base:   ₹82,500 / month                    │       │                                                        │
│   • Duration:       9.03 Months (4.51 Person-Months)   │       │                                                        │
│   • Total Cost:     ₹7,44,975                          │       │                                                        │
│ ────────────────────────────────────────────────────── │       │ ────────────────────────────────────────────────────── │
│ Subtotal Engineering Salary: ₹16,02,825 (16.03 Lakhs)  │       │ Subtotal Operational Overhead: ₹1,96,175 (1.96 Lakhs)  │
└────────────────────────────────────────────────────────┘       └────────────────────────────────────────────────────────┘
```

### Slide Footer:
`TrustFin AI • K. K. Wagh Institute of Engineering Education & Research                          18`

---

# Slide 19: Pilot Deployment and First-Year Maintenance

### Top Running Header:
`CRITERION 3: COST ESTIMATION (10 MARKS) | OPERATIONAL RUN RATE & ROI`

### Slide Title:
## Pilot Deployment and First-Year Maintenance
*First-year operational run rate vs credit risk mitigation: how TrustFin AI pays for itself.*

### [Codex Presentation Layout Directive]:
> **Render Exactly Two Balanced Side-by-Side Cards on `#FAF8F5`:**  
> - **Left Card (Forest Sage Accent `#4A6B53`):** First-Year Pilot Maintenance Budget.  
> - **Right Card (Warm Bronze Accent `#7E6F62`):** Risk Mitigation & Return on Investment (ROI).  
> - **Do NOT render any bottom banners or extra text boxes.** Keep all financial takeaways cleanly balanced inside the cards.

```text
┌────────────────────────────────────────────────────────┐       ┌────────────────────────────────────────────────────────┐
│ FIRST-YEAR PILOT MAINTENANCE BUDGET                    │       │ RISK MITIGATION & RETURN ON INVESTMENT (ROI)           │
│ [Forest Sage Accent Bar: #4A6B53]                      │       │ [Warm Bronze Accent Bar: #7E6F62]                      │
│                                                        │       │                                                        │
│ • 1. Production Cloud Hosting (AWS India):             │       │ • 1. The Cost of Bad Lending Decisions:                │
│   Managed containers, database replication & SSL       │       │   Average retail personal loan in India: ₹10L - ₹25L.   │
│   Annual Cost: ₹1,20,000 / year (₹10,000 / month)      │       │   Average bank loss upon unsecured default: ₹12 Lakhs.  │
│                                                        │       │                                                        │
│ • 2. Model Drift Monitoring & Retraining:              │       │ • 2. Proven Loss Avoidance (The 50% Rule):             │
│   Quarterly dataset recalibration & XAI consistency    │       │   Stopping just TWO bad loans that standard models     │
│   Annual Cost: ₹1,05,000 / year                        │       │   approved saves ₹24.00 Lakhs in direct write-offs.     │
│                                                        │       │                                                        │
│ • 3. Security Audits & Technical Support:              │       │ • 3. Mathematical Return on Investment (ROI):          │
│   Automated Sentry error tracking, patches & backups   │       │   Net Benefit = Saved Capital / Annual Operation Cost   │
│   Annual Cost: ₹1,20,000 / year                        │       │   ROI Ratio = ₹24,00,000 / ₹3,45,000 = 6.96× ROI        │
│ ────────────────────────────────────────────────────── │       │ ────────────────────────────────────────────────────── │
│ Total Annual Operational Run Rate: ₹3,45,000 / Year    │       │ Outcome: System Pays for Itself on the 1st Blocked Bad │
└────────────────────────────────────────────────────────┘       └────────────────────────────────────────────────────────┘
```

### Slide Footer:
`TrustFin AI • K. K. Wagh Institute of Engineering Education & Research                          19`






