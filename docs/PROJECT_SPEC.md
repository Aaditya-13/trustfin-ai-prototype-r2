# TrustFin Project Specification

## Objective

TrustFin is an Explainable AI-based decision-support system for loan approval.

The system predicts loan approval and generates SHAP and LIME explanations.

The system validates explanation quality using:

- Faithfulness
- Stability
- Consistency
- Fairness

A composite Trust Score is generated from the approved validation methodology.

## Technology

Backend:
- Python
- FastAPI

ML:
- Scikit-learn
- XGBoost
- SHAP
- LIME
- Fairlearn

Frontend:
- React
- Vite
- Tailwind CSS
- Recharts/Plotly

Database:
- PostgreSQL
- SQLAlchemy

Reporting:
- ReportLab

## Core Pipeline

Dataset
→ preprocessing
→ feature selection
→ model
→ prediction
→ SHAP
→ LIME
→ explanation validation
→ Trust Score
→ dashboard/report

## Current Scope

Loan approval only.

Fraud detection is not part of the current implementation unless explicitly added later.

## Main Outputs

- loan prediction
- prediction probability/confidence representation
- SHAP explanation
- LIME explanation
- faithfulness score
- stability score
- consistency score
- fairness evaluation
- Trust Score
- model performance
- PDF report

## Primary Research Question

How can the reliability of local XAI explanations for loan approval predictions be quantitatively evaluated before presenting those explanations to users?

## Important Constraint

The Trust Score methodology is a research decision and must be explicitly designed, justified, documented, and evaluated.

## Future Scope & Strategic Roadmap

Detailed specifications and mathematical formulations are documented in [`docs/FUTURE_SCOPE.md`](./FUTURE_SCOPE.md):

1. **Interactive Counterfactual Recourse Engine (Priority 1 — Most Essential)**:
   - Moving from diagnostic XAI (SHAP/LIME) to actionable recourse (DiCE / Constrained Optimization).
   - Real-time "What-If" eligibility sandbox in the applicant UI allowing rejected applicants to simulate the exact minimal changes (tenor extension, principal reduction, co-borrower addition) required to achieve statutory clearance.
2. **Enterprise Database Persistence & Audit Trail (Priority 2)**:
   - Relational storage (PostgreSQL/SQLAlchemy) for underwriting dossiers, solvency gate determinations, multi-auditor XAI trust records, and officer counter-signatures for regulatory compliance (Basel III/IV, SR 11-7).
3. **High-Throughput Batch Processing & Portfolio Analytics (Priority 3)**:
   - Bulk ingestion (CSV/Excel) of 50–500 loan applications with vectorized solvency checks, portfolio-wide Fair Lending demographic parity audits, and bulk PDF generation.

