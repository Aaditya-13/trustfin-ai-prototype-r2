# TrustFin synthetic loan data

These files simulate approval under an authored project policy. They contain no
observed customer repayment/default outcomes and make no regulatory-certification
claim. Generation settings, class counts, rule coverage and file fingerprints are
in `manifest.json`. Gender remains available for prediction and auditing; the label
formula does not use it.

For each product there are 3,000 main rows, 1,000 independent rows generated using
a different seed, and 300 home / 360 personal boundary cases. Training scripts split
only the main rows 80/20. Independent and boundary rows are never fitted or used
to choose training settings. Boundary cases include matched male/female pairs.

The shared definition is `backend/app/ml/product_policy.py`. Both products reject
FOIR above 50% and three or more missed payments. Minimum CIBIL is 560 for home
and 580 for personal. Home LTV above 92% is rejected. Personal card utilization
above 88% or income below Rs.19,000 is rejected. Equality passes these particular
thresholds; the additional synthetic score can still reject an eligible applicant.
Derived FOIR is rounded to four decimals and LTV to two, consistently with serving.

Fixed annual rates are 8.5% and 13.5%. Additional score weights for credit, income,
employment, education, location and purpose are explicitly authored simulation
assumptions in `synthetic_score`, not estimated real-world default coefficients.
Loan requests are mostly related to income/term, with a 20% independently sized
component. Home data adds a 15% high-LTV request component; personal data adds a
10% high-card-utilization component. Ten percent of rows are replaced with explicit
stress combinations: high credit with 3–4 missed payments, or low credit near the
cutoff with strong financial capacity. These expose shortcuts hidden by the
ordinary credit-score/payment correlation. This mixture is designed for demonstration
coverage and is not an estimate of a bank's customer population. No exact class
balance, target accuracy or explanation-score range is forced.

The first development boundary checks revealed those missing combinations. Their
results are archived under `experiments/initial_boundary_diagnostics_2026-11-18`.
After correcting coverage, independent and boundary cohorts use fresh seeds 456
and 2027. They remain synthetic challenge data, not external customer validation.

Reproduce from the repository root:

```powershell
.\.venv\Scripts\python.exe -B scripts/generate_homeloan_dataset.py
.\.venv\Scripts\python.exe -B scripts/generate_personalloan_dataset.py
.\.venv\Scripts\python.exe -B -m unittest backend.tests.test_product_datasets
.\.venv\Scripts\python.exe -B scripts/train_homeloan.py
.\.venv\Scripts\python.exe -B scripts/train_personalloan.py
.\.venv\Scripts\python.exe -B -m unittest backend.tests.test_product_bundles
```

Running generation replaces these synthetic CSVs and their manifest. Rebuild both
model bundles afterward using the training scripts; old bundles cannot be assumed
compatible with regenerated data. The legacy `train.csv` is unrelated to these
two product pipelines.

Model accuracy in `models/*/metrics.json` is measured before policy overrides.
Serving returns the raw `prediction` for SHAP/LIME interpretation and a separate
`policyCheck` with the policy-filtered assessment decision and failure reasons.
The API, officer/applicant screens and PDF preserve that distinction. Historical
records lacking a recorded policy check are not assigned a newly computed one.
