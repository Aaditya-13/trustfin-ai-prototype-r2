# TrustFin ML and XAI Rules

## ML

The initial system uses:

- Python
- Pandas
- NumPy
- Scikit-learn
- XGBoost

LightGBM may be used for model comparison when justified.

## Reproducibility

Use deterministic random seeds where appropriate.

Record:
- dataset version
- preprocessing configuration
- selected features
- model configuration
- model version
- random seed
- evaluation results

## Preprocessing

Never modify the dataset preprocessing silently.

Before changing preprocessing:
- explain the proposed transformation
- explain why it is required
- identify possible information leakage
- identify potential impact on explainability

## Data Leakage

Actively check for data leakage.

Do not fit preprocessing transformations using the test set.

Do not use target-derived information as an input feature unless explicitly justified.

## Feature Selection

Feature selection must be explicit and reproducible.

Do not remove features merely because they appear weak without explaining the rationale.

Consider:
- predictive usefulness
- domain relevance
- interpretability
- leakage
- fairness implications

## SHAP

Use SHAP for:
- local explanations
- global feature importance where appropriate

Document:
- explainer type
- model compatibility
- background/reference data where applicable
- output interpretation

Do not treat SHAP importance as causal importance.

## LIME

Use LIME for local explanations.

Document:
- number of perturbations
- sampling configuration
- random seed where applicable
- model interface
- explanation parameters

Do not assume LIME explanations are inherently stable.

## Explanation Semantics

Never describe feature contribution as causal influence unless causal methodology has actually been implemented.

Use language such as:
"contributed to the model prediction"
rather than:
"caused the loan approval."

## Prediction Probability vs Confidence

Do not automatically label a raw class probability as calibrated confidence.

If the UI uses the term "confidence score", document exactly how it is calculated.

If calibration is required, implement and evaluate calibration separately.
