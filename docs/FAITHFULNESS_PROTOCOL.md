# Faithfulness: top-five local concordance, SHAP 60% / LIME 40%

Approved for implementation by the project owner on 19 November 2026.
Protocol identifier: `local-concordance-top5-shap60-lime40-v1`.
Source: `backend/app/validation/faithfulness.py`.

## Meaning and reference

The score asks how closely short SHAP and LIME explanations reconstruct the
original applicant's XGBoost approval probability. It evaluates the existing
explanations at the original input; it does not generate replacement applicants,
refit a surrogate, or measure agreement on a new neighborhood.

The local-concordance definition is from Amparore, Perotti and Bajardi (2021),
[To trust or not to trust an explanation: using LEAF to evaluate local linear
XAI methods](https://doi.org/10.7717/peerj-cs.479).
The [author implementation](https://github.com/amparore/leaf/blob/master/leaf.py)
is a reference. No author source code was copied.

The 60/40 combination and the TreeSHAP adaptation below are project choices.
The paper does not prescribe these weights.

## Formula and units

Let p be the original XGBoost approval probability for either decision. For
each method retain up to five features with the largest absolute existing
contributions, preserving their signs and the existing intercept.

```
g_SHAP = sigmoid(SHAP expected raw margin + sum(selected signed contributions))
g_LIME = LIME intercept + sum(selected coefficient * original interpretable value)

LC_SHAP = max(0, 1 - abs(p - g_SHAP))
LC_LIME = max(0, 1 - abs(p - g_LIME))
faithfulness = 0.60 * LC_SHAP + 0.40 * LC_LIME
```

Scores are stored between 0 and 1 and displayed on a 0-100 scale.
XGBoost TreeSHAP contributions are in log-odds, so sigmoid is applied after
summing them. Do not add these contributions directly to a probability.
The current SHAP implementation uses its implicit tree-path background.

LIME weights belong to its interpretable representation. The adapter records
the actual original row from the native explanation; it does not multiply the
weights by displayed income or preprocessed financial values. Current LIME
uses discretization and 5,000 samples. For its original instance the matching
bin indicators are one. The code retains explicit multipliers so the metric
does not silently assume this for another representation.

Linear LIME estimates can fall outside [0,1]. Their full error is retained; the
estimate is not clipped before computing local concordance. There is no
nonzero score floor. Errors of one or more give zero concordance.

This truncates the existing full-fit explanation. It does not refit LIME with
five features or reselect an intercept. Features mean processed model columns,
including categorical indicators and derived financial features.

## Distinction from other checks

Consistency compares SHAP and LIME feature sets and contribution directions.
Stability compares explanations across valid nearby financial changes.
Local concordance instead compares each short explanation's approximation
with the model's output on the same original applicant.

The outer Trust Score is still:

`(faithfulness + stability + consistency) / 3`

The inner 60/40 weights do not change those three equal pillar weights.
Fairness stays a separate audit.

## Stored evidence and failure behavior

New SHAP/LIME responses include optional typed reconstruction metadata:
baseline/intercept, output space, multipliers and the full native prediction.
The API also returns `faithfulnessCheck` with the protocol, feature limit,
model probability, both component scores, approximations, absolute errors,
selected features, 60/40 weights and combined result.

Full SHAP reconstruction must match the actual model probability. Full LIME
reconstruction must match its native local prediction. Missing, inconsistent,
nonfinite or duplicate terms produce an unavailable/error response, not an
invented default score. No additional LIME call is needed.

The prediction response, batch results and stored history retain these details
inside the existing JSON payload, so no database column migration is needed.
Old records without the metadata retain their original scores. The interface
and PDF identify their method as not recorded; they are not relabelled as the
new protocol or recomputed.

## Limits to state in the report

- Close reconstruction is not a probability that an explanation is correct.
- Reassigning retained contribution numbers to different feature names can
  preserve their sum and therefore the score.
- A probability close to zero or one can hide substantial raw-margin error.
- Contributions can cancel; adding a feature need not improve reconstruction.
- High concordance can coexist with an opposite decision near the threshold.
- All-feature SHAP reconstruction is essentially exact by design and should
  not replace the fixed top-five test.
- This checks the original applicant only; broader behavioral faithfulness,
  causal effects and fair or accurate loan decisions are not established.
- Averaging the components can hide a weaker method, so display both scores.

## Evaluation and alternatives considered

The same 20 selected applicants were used in the offline investigation.
With 60/40 weights the measured mean was 87.45/100, ranging from 71.13 to
98.56. Approval/rejection means were 84.54/90.36. These are observations from
this small cohort, not guaranteed population results or target score bands.

Deletion-based faithfulness, Yeh infidelity adaptations and Bhatt correlation
were investigated earlier. They test different properties and remain historical
research outputs. Equal SHAP/LIME weighting was also compared; it averaged
84.56 on this cohort. Larger numbers alone do not establish better measurement.

The earlier held-out LIME protocol is superseded. Its pre-edit copy and the
previous deletion source are retained locally under the ignored directory
`experiments/faithfulness_implementation_2026-11-19/before/`. Historical
simulation scripts that import the old deletion function require that snapshot;
their recorded results describe the earlier serving implementation.

Implementation verification compares the actual serving path with the saved
20-case concordance experiment and checks predictions, component results,
60/40 aggregation, deterministic repetition, one LIME call per applicant,
history/batch persistence, old-record loading, failure behavior and generated
report wording. Unit regressions cover native units, feature truncation,
interpretable multipliers and out-of-range linear estimates.

The actual serving path reproduced all 20 saved component results and their
60/40 combinations to numerical tolerance. Its mean faithfulness was 87.45
and mean equal-pillar Trust Score was 88.18. New batch and history records
preserve the component metadata; missing reconstruction correctly returns an
unavailable response without saving a fabricated score. Four generated reports
(approval/rejection for both products) were rendered and visually checked;
each fits one page. Model/data artifacts, README files, ignore rules and the
existing local database remained unchanged. Local evidence is stored under
`experiments/faithfulness_implementation_2026-11-19/verification.json`.
