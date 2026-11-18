# Top-five local concordance simulation

Research run: 19 November 2026. No production formula, model, dataset, saved
assessment or Trust Score weight was changed. Current weights remain exactly
one-third each for faithfulness, stability and consistency; fairness is separate.

## Question and source

Does a short explanation reconstruct the original applicant's model output?
The reference is Amparore, Perotti and Bajardi (2021), *To trust or not to trust
an explanation: using LEAF to evaluate local linear XAI methods*:

- [Paper](https://doi.org/10.7717/peerj-cs.479)
- [Author implementation](https://github.com/amparore/leaf/blob/master/leaf.py)

The evaluated score is `100 * max(0, 1 - abs(p - g))`, where `p` is XGBoost's
approval probability and `g` is the short explanation's approximation for that
same applicant. This checks reconstruction rather than effects of feature
replacement or performance on other applicants.

## Prespecified project adaptation

The same 20 applicants were reused: five approvals and five rejections per loan
product. Their original selection was random within predicted outcome in the
earlier 400-applicant independent evaluation cohort, without inspecting
faithfulness. No applicants were replaced after observing these results.

Models are `home_loan_v5-53d6124d20d7` and
`personal_loan_v5-2215fb06b715`. Predictions, probabilities and current deletion
scores were checked against the saved investigation.

Primary k=5 was fixed before running the simulation. Features here mean model
columns, including categorical indicators and engineered financial features.

- SHAP: keep the five largest absolute original contributions and the existing
  expected raw margin. Apply sigmoid to their sum before comparison with the
  original approval probability. This is necessary because current TreeSHAP
  contributions use log-odds. The paper uses probability-output KernelSHAP.
- LIME: retain the current full-fit intercept and truncate its existing
  explanation to the five largest absolute contributions. Capture LIME's
  actual interpretable row; do not multiply its weights by raw income or by
  processed numerical input values. The current discretized LIME original row
  consists of ones, which was verified for every case.
- LIME sensitivity check: separately refit with `num_features=5` and the same
  applicant seed. This changes the explanation and is reported separately.
  The paper fits LIME at its requested feature count and uses an undiscretized
  representation; this investigation retains the project's current settings.
- Linear LIME predictions were not clipped to [0,1] before computing error.
  There was one out-of-range top-five prediction in the primary run.
- k=1,3,10 and all columns were retained as sensitivity checks. Two additional
  LIME seeds were run without selecting whichever result scored best.

## Primary results

All scores below are on a 0-100 scale. SHAP and LIME are separate results, not
an approved new combination of them.

| Applicants | n | SHAP mean | SHAP range | LIME mean | LIME range |
| --- | ---: | ---: | ---: | ---: | ---: |
| Approved | 10 | 99.24 | 94.11-99.94 | 62.50 | 28.30-90.59 |
| Rejected | 10 | 98.76 | 93.32-99.99 | 77.75 | 38.72-97.87 |
| All | 20 | 99.00 | 93.32-99.99 | 70.12 | 28.30-97.87 |

Home-loan mean scores were 98.43 for SHAP and 74.39 for LIME. Personal-loan
means were 99.57 and 65.86 respectively. No primary top-five score was zero.

LIME refitted to five features averaged 69.94, ranging from 30.04 to 97.62.
Its approval/rejection averages were 63.07/76.82. Thus, refitting did not produce
a large average improvement here, though individual results changed.

The mean per-applicant LIME score span across the serving-derived seed and two
additional seeds was 5.50 points; the largest span was 9.57. The production
applicant seed remains deterministic.

## Feature-count sensitivity

| Number retained | SHAP mean | LIME mean, existing fit truncated |
| --- | ---: | ---: |
| 1 | 90.61 | 52.80 |
| 3 | 97.71 | 70.30 |
| 5, primary | 99.00 | 70.12 |
| 10 | 99.89 | 70.45 |
| All | 100.00 | 69.96 |

Full SHAP reconstruction is essentially exact by design and floating-point
precision. It is a calculation check, not independent proof of attribution
quality. Adding features need not improve reconstruction at every step because
positive and negative contributions can cancel.

## Examples and meaning

For HLI00532, XGBoost approval probability was 71.27%. The top-five SHAP
reconstruction was 77.16%, a 5.89-point gap. Its concordance was 94.11.

For HLI00337, approval probability was 15.42%, meaning the model rejected it.
Top-five SHAP reconstructed 8.74%, a 6.68-point gap, giving concordance 93.32.
The previously tested correlation for this same case was -0.0879: the metrics
ask different questions, so these results are not contradictory.

High SHAP values also reflect the probability scale. For HLI00528, the omitted
SHAP sum was about 0.254 in log-odds, but the probability changed only from
99.786% to 99.724%, giving concordance 99.94. A small probability gap does not
mean that the omitted contributions were zero.

Six of twenty primary short LIME approximations predicted the opposite class
from XGBoost; none of the primary SHAP approximations did. More generally, high
concordance does not guarantee class agreement: the analytic example p=0.51,
g=0.49 scores 98 despite opposite decisions.

## Controls and limits

- Reassigning the same contribution values to different feature names left
  both SHAP and LIME top-five concordance unchanged in all 20 cases. Their sums
  are unchanged at the original input. This metric cannot detect incorrect
  feature labels or allocations when the retained signed values are the same.
- The SHAP sign-reversal control averaged 9.13 versus 99.00 for original SHAP.
  However, a LIME sign-reversal control scored 99.97 on HLI00104 versus 72.18
  for its original top-five explanation. A matching sum alone can occur for
  incorrect contribution directions.
- Using only the SHAP baseline, without any selected contribution, averaged
  53.84. An uninformative constant probability of 0.5 also averaged 53.84 in
  this balanced set; any probability p in [0,1] gives it at least 50 points.
  Therefore, 50 is not evidence of a useful explanation under this metric.
- Averaging over every size-five subset gave mean SHAP concordance 68.27 and
  LIME concordance 49.90. The chosen top-five explanations reconstructed the
  predictions better on average than uniform subset selection. These controls
  do not resolve the feature-label blindness above.
- Across applicants, the mean fraction of SHAP size-five subsets scoring at
  least 90 was 24.07%. High reconstruction is not exclusive to the top-five
  selection.
- No model responses to changed applicants were evaluated by this score. It
  does not establish broader behavioral faithfulness, causal importance or
  prediction correctness. Twenty original applicants do not establish a
  population performance range.

## Hypothetical combined index

Keeping the same recomputed stability and consistency values and current exact
one-third weights, substituting SHAP top-five concordance for the faithfulness
component would change the mean combined index from 75.62 to 92.03. The
hypothetical range would be 83.01-99.97. These are offline calculations; no
history was saved and no production metric was replaced. Higher numbers here
reflect a different test rather than an improvement to the explanations.

## Per-applicant primary scores

| ID | Outcome | SHAP | LIME |
| --- | --- | ---: | ---: |
| HLI00041 | Approved | 99.70 | 47.05 |
| HLI00315 | Approved | 99.93 | 77.81 |
| HLI00528 | Approved | 99.94 | 78.48 |
| HLI00532 | Approved | 94.11 | 62.67 |
| HLI00639 | Approved | 99.90 | 78.09 |
| HLI00104 | Rejected | 99.96 | 72.18 |
| HLI00214 | Rejected | 99.80 | 58.80 |
| HLI00337 | Rejected | 93.32 | 97.87 |
| HLI00673 | Rejected | 97.79 | 96.18 |
| HLI00930 | Rejected | 99.91 | 74.73 |
| PLI00105 | Approved | 99.92 | 90.59 |
| PLI00381 | Approved | 99.93 | 78.54 |
| PLI00512 | Approved | 99.93 | 36.54 |
| PLI00673 | Approved | 99.69 | 28.30 |
| PLI00948 | Approved | 99.40 | 46.88 |
| PLI00341 | Rejected | 99.98 | 96.43 |
| PLI00643 | Rejected | 97.57 | 68.71 |
| PLI00732 | Rejected | 99.51 | 38.72 |
| PLI00740 | Rejected | 99.99 | 94.09 |
| PLI00789 | Rejected | 99.77 | 79.82 |

## Reproduction and integrity

Run `.venv/Scripts/python.exe experiments/local_concordance_20_2026-11-19/run_simulation.py`
from the repository root. The ignored experiment directory contains the script,
prespecified protocol, analytic checks, detailed per-case JSON/CSV, summary and
integrity evidence. Source, tests, models, datasets, README files, ignore rules
and the local database were fingerprinted before and after; all were unchanged.
Checks confirmed SHAP raw-margin reconstruction and the full LIME reconstruction
against its native `local_pred`. No external author implementation was copied
into the project.
