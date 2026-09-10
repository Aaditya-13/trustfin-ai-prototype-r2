# TrustFin Architecture Decisions

## ADR-001 — Primary Model

Decision:
Use XGBoost as the initial primary model.

Reason:
Suitable for structured/tabular loan data and compatible with SHAP.

Status:
Approved

---

## ADR-002 — Backend

Decision:
Use FastAPI.

Reason:
The ML/XAI pipeline is Python-based, so this avoids unnecessary language/runtime boundaries.

Status:
Approved

---

## ADR-003 — Database

Decision:
Use PostgreSQL.

Status:
Approved

---

## ADR-004 — Deterministic XAI Evaluation & Auditability

Decision:
Implement input-hashed pseudo-random seeding for LIME synthetic sampling and Stability Gaussian perturbations.

Reason:
Eliminates artificial Trust Score fluctuation on repeated evaluations of identical applicant inputs, satisfying banking auditability, regulatory model reproducibility (BCBS 239 / Fed SR 11-7 / RBI Fair Lending), and credit officer trust without degrading localized perturbation mechanics.

Status:
Approved

---

## ADR-005 — Scope Demarcation vs. AegisAI and Deep Explainability Research Frontiers

Decision:
1. Strictly ban all enterprise policy/governance terminology (`governance`, `policy engine`, `multi-tenancy`, `RBAC`, `risk routing`) from TrustFin's UI and technical documentation to eliminate domain overlap with AegisAI.
2. Focus TrustFin's core research and academic contribution exclusively on **Scientific Explanation Validation (Meta-XAI)**, **Dual-Explainer Consensus (SHAP vs. LIME)**, **Algorithmic Counterfactual Recourse (Wachter et al.)**, and **Contrastive Case-Based Explanations**.

Reason:
AegisAI positions itself as an external policy middleware for third-party black-box models. TrustFin's core scientific contribution is evaluating whether post-hoc AI explanations can mathematically be trusted and providing actionable algorithmic recourse to applicants.

Status:
Approved


