# Infidelity simulation on the current rebuilt models

Date: 19 November 2026

## Scope

This is an isolated research rerun, not a production formula change. It uses exactly the same 20 applicants as the last investigation: 10 model approvals and 10 model rejections, with five cases per outcome per loan product. No cases were added or removed after seeing their scores.

The currently saved models remain the rebuilt v5 pair:

- Home: `home_loan_v5-53d6124d20d7`
- Personal: `personal_loan_v5-2215fb06b715`

The previous 512-draw experiment was replayed for these 20 cases. Its raw errors and converted scores were reproduced within 0.00000001. A separate fresh run then used 1,024 donor-replacement draws for each of three seeds, or 3,072 draws per applicant and 61,440 fresh draws overall. Draws are sampled with replacement and are not all distinct applicants.

## What was calculated

The starting point is Yeh et al., *On the (In)fidelity and Sensitivity of Explanations*, NeurIPS 2019: [paper](https://proceedings.neurips.cc/paper_files/paper/2019/file/a7471fdc77b3435276507cc8f2dc2569-Paper.pdf). The paper studies expected squared disagreement between an explanation-based estimate and actual model output changes. Its distinction between sensitivity-style and output-contribution explanations matters here.

This simulation uses the previously disclosed binary-mask adaptation for current SHAP output contributions:

```text
actual_change = original_model_margin - replacement_model_margin
estimated_change = sum(original_SHAP_values_on_changed_model_coordinates)
raw_infidelity = mean((estimated_change - actual_change)^2)
empty_explanation_error = mean(actual_change^2)
converted_score = 100 * max(0, 1 - raw_infidelity / empty_explanation_error)
```

Both changes use raw-margin/log-odds units, matching the current TreeSHAP output. Raw infidelity is an error: lower is better and it has no fixed 0–100 range. The percentage conversion above is an experimental project adaptation, not a percentage defined by Yeh et al. No scale factor was fitted to improve results.

A converted 50% means half the squared error of an explanation with no feature contributions on the same tested changes. It does not mean 50% correct explanations. A score of 0 means equal or worse error than that baseline; negative unconverted relative scores are retained in the JSON/CSV. An effectively zero denominator would produce unavailable rather than 100%.

Errors were pooled over the three seeds per applicant, converted per applicant, and then averaged across applicants. Averaging all raw errors first and converting a single pooled cohort ratio would be a different summary.

## Replacement procedure

Replacement donors come only from the 2,400 fitted training rows for that product. Donors were not selected by approval, rejection, faithfulness or a desired score. Each draw selects one or two of four raw-input groups and copies those groups from one common donor:

1. Financial and age/experience fields: income, existing EMI, loan amount, term, age and work experience; home loans also include co-applicant income and property value.
2. Credit fields: CIBIL and missed payments; personal loans also include card use.
3. Marital status, dependents, education, employment and property area or loan purpose.
4. Gender.

EMI, FOIR and LTV are recalculated before preprocessing. The simulation checks integer/discrete fields, credit-score and card-use bounds, positive financial inputs, work experience, age at the end of the term, and financial formula consistency. All fresh draws passed these checks. These checks establish consistency with the project data constraints, not proof that every hybrid applicant represents a real-world population draw.

Every processed coordinate changed by raw-input replacement and feature engineering is marked in the attribution comparison. Unchanged/duplicate draws remain part of the stated sampling distribution. Some donor changes are large; this is not the small-change stability test. Gender and demographic changes are included in this protocol.

## Main converted results

| Product | Original model outcome | Cases | Current faithfulness mean | Converted infidelity mean | Converted range |
| --- | --- | ---: | ---: | ---: | ---: |
| Home | Approved | 5 | 8.33% | 43.68% | 13.73–56.35% |
| Home | Rejected | 5 | 87.32% | 34.39% | 0.00–69.69% |
| Personal | Approved | 5 | 7.43% | 49.71% | 45.58–53.56% |
| Personal | Rejected | 5 | 95.90% | 57.25% | 26.93–76.38% |

| Original outcome | Cases | Current mean | Converted infidelity mean | Range |
| --- | ---: | ---: | ---: | ---: |
| Approved | 10 | 7.88% | 46.69% | 13.73–56.35% |
| Rejected | 10 | 91.61% | 45.82% | 0.00–76.38% |

Overall converted mean: **46.26%**. Observed range: **0.00–76.38%**. One case scored zero; no case reached 100%; none was unavailable.

The large aggregate approval/rejection gap is much smaller under this different test. That is not proof of outcome-independent measurement: home and personal product subgroup differences remain, and there are only five cases in each subgroup.

## Raw errors

The values below are mean squared-margin errors, with lower infidelity better. Group averages of raw errors and group averages of per-applicant converted scores need not give the same ratio.

| Original outcome | Mean raw infidelity | Mean empty-explanation error |
| --- | ---: | ---: |
| Approved | 14.5564 | 27.8799 |
| Rejected | 9.5341 | 20.1092 |

## Checks against deliberately poor explanations

- Current SHAP had lower error than the average shuffled-attribution control for **20/20 applicants**.
- It had lower error than the empty-attribution control for **19/20 applicants**.
- Across all seeds, it beat **589/600** individual shuffled comparisons. It did not beat every shuffle.
- The empty-attribution score is 0% by construction when model changes are informative. The average shuffled score here was 11.24%, versus 46.26% for current SHAP.
- A matched linear additive sanity case gave effectively zero raw error and 100%; empty attributions scored 0%.
- Reversing both SHAP signs and model-change signs leaves the error unchanged. No approval/rejection-specific score inversion was used.

One difficult case must remain visible: **HLI00337**, a home-loan rejection, had raw error 9.7587 versus 9.6107 for the empty explanation. Its unbounded relative score was -1.54%, clipped to 0%. Its current deletion-based score was 91.75%. A high score in the current test therefore does not imply a high score in this different test.

## Repeated-seed variation

The same applicants were evaluated independently under seeds 20261119, 20261219 and 20261319. The following values describe the span from the lowest to highest converted score across those three runs, not confidence intervals:

- Median per-applicant span: **1.88 percentage points**.
- Mean span: **2.43 points**.
- Largest span: **8.84 points**, for HLI00930.

Repeated scores are reasonably close for many cases, but a nearly nine-point change could matter for score bands. A production protocol would need a fixed sampling design and an explicit treatment of sampling uncertainty.

## Why the replacement design still matters

The historical processed-zero-coordinate infidelity procedure was also replayed as a diagnostic. It is not the recommended financial test and was not mixed into the main scores:

| Original outcome | Infidelity with processed-zero replacements | Infidelity with fresh valid grouped replacements |
| --- | ---: | ---: |
| Approved | 30.35% | 46.69% |
| Rejected | 83.31% | 45.82% |

Changing the name or error formula alone does not repair inappropriate modified applicants. This diagnostic also uses a different perturbation distribution and draw count, so it is not a controlled estimate of the effect of financial recalculation alone.

## Important remaining interpretation limit

The serving TreeSHAP values explain an applicant relative to the implicit tree-path background. They are not attributions for comparison with each specific randomly chosen donor. The sum of original attributions on changed coordinates is consequently not guaranteed to predict the output difference to that donor, even when the SHAP calculation itself is correct.

For example, SHAP completeness states that summing all contributions reconstructs the original margin minus the SHAP base margin. Fully replacing an applicant by a donor instead changes the margin by the original margin minus that donor’s margin. Those quantities differ whenever the donor margin differs from the SHAP base margin. Thus some error can reflect reference mismatch rather than poor SHAP computation.

The current result is useful as a disclosed, Yeh-inspired agreement audit under the specified donor changes. It does not establish a universal faithfulness percentage or prove that this adaptation is the best production metric. Matching attribution units and aligning the intended comparison remain necessary; checking SHAP reconstruction alone would not provide an independent faithfulness test.

## All twenty applications

| ID | Product | Model outcome | Current score | New converted score | Raw infidelity | Empty error | Three-seed score range |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| HLI00041 | Home | Approved | 10.70% | 56.35% | 12.6356 | 28.9468 | 55.01–57.65% |
| HLI00315 | Home | Approved | 9.05% | 47.79% | 19.8347 | 37.9874 | 47.13–48.34% |
| HLI00528 | Home | Approved | 15.47% | 49.05% | 21.2670 | 41.7434 | 48.02–49.97% |
| HLI00532 | Home | Approved | 0.00% | 13.73% | 17.2934 | 20.0467 | 12.06–15.04% |
| HLI00639 | Home | Approved | 6.42% | 51.46% | 19.9954 | 41.1974 | 51.28–51.71% |
| HLI00104 | Home | Rejected | 88.08% | 48.52% | 12.0819 | 23.4701 | 45.56–51.18% |
| HLI00214 | Home | Rejected | 79.70% | 69.69% | 5.8634 | 19.3453 | 67.49–71.30% |
| HLI00337 | Home | Rejected | 91.75% | 0.00% | 9.7587 | 9.6107 | 0.00–0.08% |
| HLI00673 | Home | Rejected | 92.36% | 9.47% | 12.4124 | 13.7112 | 9.05–9.81% |
| HLI00930 | Home | Rejected | 84.74% | 44.28% | 12.2891 | 22.0537 | 38.73–47.57% |
| PLI00105 | Personal | Approved | 12.73% | 49.90% | 9.7314 | 19.4222 | 48.54–50.57% |
| PLI00381 | Personal | Approved | 3.16% | 53.56% | 11.8192 | 25.4513 | 52.51–54.41% |
| PLI00512 | Personal | Approved | 14.94% | 51.43% | 11.2993 | 23.2651 | 50.94–52.22% |
| PLI00673 | Personal | Approved | 3.06% | 45.58% | 11.6083 | 21.3299 | 44.95–46.22% |
| PLI00948 | Personal | Approved | 3.26% | 48.07% | 10.0795 | 19.4085 | 46.36–49.12% |
| PLI00341 | Personal | Rejected | 96.12% | 76.38% | 7.6532 | 32.3991 | 75.63–77.21% |
| PLI00643 | Personal | Rejected | 96.83% | 26.93% | 9.2345 | 12.6372 | 24.57–28.83% |
| PLI00732 | Personal | Rejected | 97.47% | 62.81% | 7.4285 | 19.9719 | 62.09–63.89% |
| PLI00740 | Personal | Rejected | 98.75% | 65.80% | 9.7056 | 28.3818 | 65.12–66.75% |
| PLI00789 | Personal | Rejected | 90.34% | 54.32% | 8.9137 | 19.5114 | 53.67–55.53% |

## Integrity and reproducibility

The simulation verified identical applicant IDs, original predictions and current faithfulness scores; replayed the earlier infidelity result; checked the SHAP raw-margin reconstruction; validated the replacement inputs; and compared source/data/model hashes before and after. Models, production explanations, metric formulas, datasets, history records and 40/30/30 weights were unchanged.

Reproduction scripts and complete results are saved in the ignored local directory `experiments/infidelity_20_2026-11-19/`: `run_simulation.py`, `protocol.json`, `comparison_rows.json`, `comparison_rows.csv`, `summary.json`, `analytic_checks.json` and `integrity.json`.
