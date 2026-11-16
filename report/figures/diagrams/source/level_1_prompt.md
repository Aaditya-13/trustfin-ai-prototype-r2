# Simplified Level 1 DFD prompt

Create a simple Level 1 Data Flow Diagram for **TrustFin AI**. Use a white
background, black lines, readable serif font, rectangular external entities,
numbered circular processes, and two parallel lines for the database.

External entities: Applicant, Bank Officer.

Processes:
1. 1.0 Prepare Application
2. 2.0 Predict Loan Outcome (XGBoost)
3. 3.0 Generate Explanations (SHAP and LIME)
4. 4.0 Calculate Trust Score
5. 5.0 Manage Results and Reports

Data store: D1 Assessment Database.

Draw only these directed, labelled connections:

| From | To | Label |
|---|---|---|
| Applicant | 1.0 | Loan details |
| Bank Officer | 1.0 | Application or batch data |
| 1.0 | 2.0 | Prepared application |
| 2.0 | 3.0 | Prediction and applicant data |
| 3.0 | 4.0 | Explanations and assessment data |
| 4.0 | 5.0 | Assessment and Trust Score |
| Applicant | 5.0 | PDF request |
| Bank Officer | 5.0 | History or report request |
| 5.0 | Applicant | Assessment and PDF report |
| 5.0 | Bank Officer | Results, history and PDF reports |
| 5.0 | D1 | Assessment records |
| D1 | 5.0 | Saved records |

Process 4.0 combines Faithfulness, Stability, Consistency and Fairness. Do not
draw extra metric circles. Keep the main sequence easy to follow, place D1 near
5.0, and route return arrows around the outside. Never connect the two external
entities directly. Omit training, model files, authentication, decorative
elements, an internal title and additional databases. Export a sharp landscape
image.
