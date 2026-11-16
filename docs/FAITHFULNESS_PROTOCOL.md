# Faithfulness: held-out local fidelity (LIME), version 1

The owner approved implementing the discussed baseline-relative error score.
This replaces the old forced-high-band score. It does **not** deploy ERASER
comprehensiveness or a percentile transformation. Implementation:
`backend/app/validation/faithfulness.py`.

## Meaning and formula

For applicant x, let p=f(x) be XGBoost's approval probability. Fit the usual LIME
explanation at x and freeze that exact local surrogate g, including its intercept,
coefficients and original-bin indicator encoding. Independently generate 128
valid raw-input test variations z_i. Recompute EMI, FOIR and LTV before model
preprocessing. Do not refit LIME on these test cases.

`E = mean_i abs(g(z_i) - f(z_i))`

`B = mean_i abs(p - f(z_i))`

`raw_skill = 1 - E / B`

`faithfulness = max(0, raw_skill)`

API/database values remain in [0,1]; the UI/PDF multiply by 100. A score of 80
means 80% less average probability error than always predicting the original
probability, under this declared test distribution. It is not 80% explanation
correctness, decision accuracy, fairness or repayment probability. Use approval
probabilities throughout, including originally rejected and decision-flipping
test cases. There is no requirement to flip a decision.

An explanation worse than the constant baseline scores zero and retains its
negative raw_skill. Do not clip LIME's linear probability estimates before MAE:
out-of-range estimates count as errors. If B <= 1e-6, or fewer than eight cases
change XGBoost probability by more than 1e-6, report **unavailable**. Invalid or
nonfinite evaluation values also produce an unavailable measurement. These are
numerical/support rules, not validated universal quality thresholds.

## Fixed test distribution and reproducibility

- 128 tests, independently seeded with SHA-256 of protocol version, product ID
  and the original predictive-input seed. This is separate from LIME's fitting
  RNG. No adaptive radius or sample selection based on obtained scores.
- Independently multiply applicant/coapplicant income, existing debt, principal
  and property value by Uniform(0.9,1.1), where those fields exist. Zero amounts
  stay zero. Income, principal, tenure and home property value must be positive.
- CIBIL: integer change uniformly from -30 to +30, clipped to [300,900].
- Missed payments: change -1,0,+1 with probabilities .2,.6,.2, clipped to [0,4].
- Card utilization: add Uniform(-.08,.08), clipped to [0,1].
- Keep Gender, categories, age, work experience and tenure fixed. Reject invalid
  original financial quantities, age/experience or bureau/utilization values.
- Product preprocessing regenerates all deterministic descendants. Policy
  breaches are valid hypothetical applications; do not discard them to improve
  the score. Decision-flipping examples are included.
- Persist protocol/config, seed, transformed-neighborhood SHA-256, both MAEs,
  changed/test counts, actual/estimated probabilities and applicant-point error.
  The explanation's fitted LIME snapshot is stored in `lime.localModel`.

LIME continues to fit with 5,000 draws using the existing transformed training
background, quartile discretization and default kernel. This change correctly
replays its fitted conditional-bin model on valid held-out raw variations. It
does **not** yet replace LIME's original fitting-neighborhood generator, which
can violate financial dependencies. Poor scores are retained as findings; the
formula must not be adjusted to produce a desired grade. Backgrounds for current
products are the saved 100 training-only rows. Legacy retains its older background.

## Scope and integration

This version explicitly evaluates **LIME local fidelity**. SHAP retains its
existing attribution output and participates in the existing other checks.
There is no new SHAP faithfulness value and no invented aggregation of SHAP and
LIME quality. A reference-compatible SHAP attribution test is future work.
Reconstructing the original prediction using all SHAP values is insufficient.

The existing 35% faithfulness weight now uses this local-fidelity value. The
remaining weights and metrics are unchanged. If faithfulness is unavailable,
overall trust is unavailable: no perfect default and no implicit reweighting.
Expose this in API, history, batch summaries, UI and PDF. Saved old evaluations
remain historical; their scores are not rewritten as if computed by this method.
The proposed A/B/C/D grades are a separate pending presentation change.

## Literature, alternatives and limits

[Ribeiro et al., LIME, KDD 2016](https://arxiv.org/abs/1602.04938) motivates local
model approximation. [Yeh et al., NeurIPS 2019](https://arxiv.org/abs/1901.09392)
compares explanation-estimated and actual output changes using squared error.
This held-out MAE normalization against a constant baseline is **TrustFin's
project-defined choice**, not a formula supplied or validated by either paper.

The alternative [ERASER comprehensiveness](https://aclanthology.org/2020.acl-main.408.pdf)
measures support removed by deleting selected information. The earlier pilot
remains useful evidence, but raw effect size is not directly used as graded
quality in this version. Its old serving comparator is frozen in
`experiments/faithfulness_pilot/serving_faithfulness_snapshot.py` for reproduction.

The score depends on the declared neighborhood, original confidence and baseline.
Clipping at zero compresses different poor outcomes, so retain raw_skill and
MAEs. Near-flat model outputs make ratios fragile and often uninformative.
Independently sampled financial/bureau changes may still be atypical despite
valid categories and recomputed formulas. These are model sensitivity tests,
not causal or population estimates. A strong local fit does not establish global
explanation quality, prediction correctness, fairness, stability or real-world
lending suitability. Repeatability from fixed seeds is not a confidence interval.

The implementation is accepted on arithmetic, independent surrogate replay,
valid-neighborhood construction, explicit failure handling, genuine corrupted
controls and model/data integrity checks, not on achieving high scores.
