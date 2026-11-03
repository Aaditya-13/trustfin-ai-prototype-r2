# TrustFin AI report image manifest

Place exported images at the exact paths below, relative to `report/`. Until an image is supplied, the LaTeX source displays a sized placeholder with the expected filename. For editable diagrams, update the corresponding `.puml` file in `figures/diagrams/source/` and export the PNG to the listed path. Do not use fabricated application screenshots or experimental plots.

| Filename | Chapter | Figure description | Required content | Suggested aspect ratio |
|---|---:|---|---|---:|
| `figures/diagrams/system_architecture.png` | 4 | Runtime architecture | React/Vite client; FastAPI; product pipelines; preprocessing; XGBoost; SHAP/LIME; trust checks; SQLite/optional PostgreSQL; PDF | 16:9 |
| `figures/diagrams/system_workflow.png` | 4 | Evaluation workflow | Request validation through product feature engineering, prediction, explanations, scores, persistence and response | 16:9 |
| `figures/diagrams/system_flowchart.png` | 4 | Evaluation flowchart | Valid and invalid request paths, batch flawed-row handling, scoring and response | 4:3 |
| `figures/diagrams/context_level_dfd.png` | 4 | Context-level DFD | Applicant/officer, TrustFin system boundary, submitted application and returned assessment/report | 16:9 |
| `figures/diagrams/level_1_dfd.png` | 4 | Level 1 DFD | Input processing, engineering, prediction, explanation, validation, database and reporting data flows | 16:9 |
| `figures/diagrams/use_case_diagram.png` | 4 | Use-case diagram | Applicant and bank-officer presentation-mode actions; note that roles are not authenticated | 4:3 |
| `figures/diagrams/class_diagram.png` | 4 | Implemented class diagram | Actual Pydantic schemas, SQLAlchemy models, model registry/product pipeline, explainers; no invented User/controller classes | 16:9 |
| `figures/diagrams/sequence_diagram.png` | 4 | Single evaluation sequence | React, API route, product pipeline/model, explainers, trust functions, database and response | 16:9 |
| `figures/diagrams/activity_diagram.png` | 4 | User activity | Product selection, form or batch, results, history and optional PDF paths | 4:3 |
| `figures/diagrams/component_diagram.png` | 4 | Component diagram | Frontend, API/router, product pipelines, explainability, validation, persistence and PDF modules | 16:9 |
| `figures/diagrams/deployment_diagram.png` | 4 | Development deployment | Vite and FastAPI processes, local model artifacts, SQLite fallback and optional PostgreSQL | 16:9 |
| `figures/diagrams/er_diagram.png` | 4 | Persistence ER diagram | `PredictionLog` and `BatchUpload`; show `batch_id` association as application-level, not a declared FK | 4:3 |
| `figures/diagrams/database_schema.png` | 4 | Database schema | Important scalar and JSON fields for both persisted entities | 16:9 |
| `figures/graphs/dataset_class_distribution.png` | 5 | Dataset class distribution | Counts from the generated home and personal loan CSVs: approved/rejected | 4:3 |
| `figures/graphs/shap_local_explanation.png` | 7 | SHAP local result | Actual SHAP output from one evaluated record, with feature labels and output scale | 4:3 |
| `figures/graphs/lime_local_explanation.png` | 7 | LIME local result | LIME output from the same record used for the SHAP figure | 4:3 |
| `figures/screenshots/loan_application_form.png` | 7 | Loan application form | Actual running application form, with product selected and real field layout | 16:9 |
| `figures/screenshots/bank_officer_results.png` | 7 | Officer results | Actual officer result view with decision, local explanations and trust metrics | 16:9 |
| `figures/screenshots/applicant_results.png` | 7 | Applicant results | Actual applicant result view, submitted-form access and affordability calculator | 16:9 |
| `figures/screenshots/pdf_report_preview.png` | 7 | PDF preview | Actual generated PDF preview based on a real evaluation | 16:9 |

## Editable diagram sources

PlantUML source files are in `figures/diagrams/source/`. Export each source to the matching PNG path above. The diagram sources are documentation artifacts and should be checked against the implementation before final submission if the application changes.
