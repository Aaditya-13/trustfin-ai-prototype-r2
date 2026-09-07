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
