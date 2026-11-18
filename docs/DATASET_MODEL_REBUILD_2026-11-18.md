# Dataset and model rebuild — 18 November 2026

## Scope

Completed the agreed dataset corrections, rebuilt both product models, and checked
their integration. TrustFin remains a controlled synthetic lending/XAI project.
No observed repayment outcomes or banking certification are claimed. The report
PDF/LaTeX chapters and the existing explanation-metric formulas were not rewritten.

Original datasets, model bundles and generation/training scripts were preserved
locally in `experiments/before_dataset_rebuild_2026-11-18/` before changes.

## Phase 1: datasets

The source of approval policy is now `backend/app/ml/product_policy.py`, policy
version `project-lending-v1`. The current data version is `synthetic-products-v4.1`.

- Both products reject FOIR above 50% and three or more missed payments.
- CIBIL minimum: 560 home / 580 personal.
- Home LTV maximum: 92%.
- Personal card utilisation maximum: 88%; minimum monthly income: Rs.19,000.
- Numeric equality passes these mandatory thresholds. The additional authored
  synthetic score can still reject an applicant passing the thresholds.
- The female penalty was removed. Gender is retained as an input and audit field.
- EMI, FOIR and property-value ratios use the same calculation functions during
  generation, training and serving. Fixed interest-rate assumptions remain explicit.

| Product/cohort | Rows | Approved labels | Rejected labels |
|---|---:|---:|---:|
| Home main pool | 3,000 | 968 | 2,032 |
| Home independent | 1,000 | 325 | 675 |
| Home boundary | 300 | 168 | 132 |
| Personal main pool | 3,000 | 1,368 | 1,632 |
| Personal independent | 1,000 | 424 | 576 |
| Personal boundary | 360 | 210 | 150 |

All 8,660 rows passed label/policy and basic financial-validity checks. There are
no missing values, duplicate raw applicants, cross-cohort exact applicant overlaps,
approved-label mandatory-rule violations or Gender-only label changes.

The population is deliberately broader than the original income-sized requests:
some requests are independently sized; explicit high-LTV and high-card-utilisation
components cover previously unsupported rejection conditions. Class balance is
not forced to 50/50.

### A gap found during development

The first rebuilt models had 98.6%/97.6% independent accuracy but only 57.3%/69.4%
boundary accuracy. Neither original regenerated main pool contained high-CIBIL
applicants with three or more missed payments. The models learned the correlation
between credit score and payment history and failed that conflict case.

The generator now includes 10% explicit stress combinations: 5% strong-credit /
adverse-payment cases and 5% weak-credit / strong-capacity cases near the CIBIL
cutoff. This is a disclosed testing-population assumption, not an observed bank
population rate. The first diagnostics were archived in
`experiments/initial_boundary_diagnostics_2026-11-18/`.

After using that diagnostic feedback, independent/boundary data was regenerated
with fresh seeds 456/2027. No evaluation rows were fitted and model settings were
not tuned to these results. These remain tests from the authored generator, not
external real-customer validation or an untouched external benchmark. The main
pool uses seed 42; its 80/20 training/holdout split also uses 42.

## Phase 2: models and explanation backgrounds

The original XGBoost settings are retained: 120 trees, depth 4, learning rate 0.08,
row/column subsampling 0.85, seed 42. Each model fits 2,400 main-pool rows and
reports performance on its 600-row holdout plus the independent and boundary sets.

| Raw model accuracy | Home | Personal |
|---|---:|---:|
| Holdout | 98.50% | 96.50% |
| Independent | 98.10% | 97.60% |
| Boundary | 77.33% | 80.56% |

Current identifiers:

- `home_loan_v5-53d6124d20d7`
- `personal_loan_v5-2215fb06b715`

Each bundle includes a native XGBoost model, compatibility pickle, fitted
preprocessor, feature order, metrics, split IDs, provenance, and 200 LIME reference
rows sampled only from the training split. The raw references exactly reproduce
the transformed background matrix. SHAP continues to use TreeExplainer's implicit
tree-path background and raw log-odds output.

Runtime loading verifies dataset, policy, feature-calculation and artifact
fingerprints, feature order, and reference membership. A broken personal product
cannot silently fall back to the home model. Native model loading avoids relying
on XGBoost pickle compatibility for the two current products. Essential model and
provenance files are no longer ignored by Git; generated text uses stable LF line
endings for reproducible file fingerprints.

## Phase 3: policy and integration checks

Raw XGBoost occasionally violates mandatory rules: 7 home and 1 personal cases on
the 1,000-row independent sets. The API now computes an explicit policy assessment
from the shared rules, rather than assuming learned predictions obey them exactly.

- `prediction` remains the raw classifier output that SHAP/LIME explain.
- `policyCheck` contains pass/fail, violated rule codes, plain-language reasons,
  the policy version, and the policy-filtered assessment decision.
- A mandatory-rule failure returns a Rejected assessment even when the raw model
  predicts Approved. It does not alter the model or inflate its measured accuracy.
- Officer, applicant, audit and PDF views show that difference. History preserves
  the recorded check; old records receive no retroactive current-policy result.
- Personal-loan income checks now exclude coapplicant income consistently.
- API model versions come from the loaded bundle instead of a hardcoded v2 label.
- Product availability depends on the requested verified pipeline, not unrelated
  legacy global model loading. Unavailable products return HTTP 503, including in
  batches, rather than marking deployment failures as bad applicant rows.

### Validation

- Full backend suite: 58 tests plus 30 subtests passed in an isolated in-memory
  SQLite database. User application-history records were not used for test writes.
- Full frontend suite: 54 tests passed.
- Production frontend build passed.
- Changed frontend components passed lint with existing audit/dashboard warnings.
- `git diff --check` passed; line-ending notices on older files are informational.
- Older tests were updated for existing product-specific batch endpoints, CIBIL
  normalization, references, fixture product fields and current sample sizes.
  Predictions/metric expectations were not changed to force high scores.

Detailed logs, XML/JSON test reports and the isolated test runner are retained in
`experiments/model_rebuild_2026-11-18/`. Rebuild commands are in `datasets/README.md`.

## Remaining limitations and next decisions

1. Boundary performance remains lower than ordinary-case performance. The models
   are approximations and can reject policy-eligible applicants; hard-rule checks
   do not reproduce the entire authored soft-score function.
2. Main labels are Gender-neutral, but including Gender still permits learned
   differences. The independent home set has one raw Gender-only decision flip;
   the personal set has zero. Removing deliberate bias does not guarantee every
   trained-model fairness property.
3. The current faithfulness measure remains unchanged. On 200 randomly sampled
   independent applicants per product (seed 81), mean current faithfulness was:

   | Model decision | Home | Personal |
   |---|---:|---:|
   | Approved | 11.29% (65 cases) | 3.99% (85 cases) |
   | Rejected | 86.44% (135 cases) | 93.73% (115 cases) |

   SHAP additivity and score bounds passed for all 400 sampled applicants. These
   results again show that fixing datasets does not by itself fix the deletion
   test's approval/rejection asymmetry. Infidelity was not installed in serving.
   Its adaptation/reference/conversion remains a separate owner decision.
4. Existing stability/consistency definitions and the fairness audit are unchanged;
   the combined explanation index remains 40%/30%/30%, with fairness separate.
5. The legacy model remains for compatibility and emits older serialization/package
   warnings. The two rebuilt product bundles are the verified current artifacts.
6. Single-request validation still has legacy coercion behaviour beyond the audited
   generated inputs. This rebuild does not establish robustness to every malformed
   input or unsupported customer population.

Restart the backend to load the new product bundles. Historical scores and model
versions are retained as originally recorded rather than recomputed.
