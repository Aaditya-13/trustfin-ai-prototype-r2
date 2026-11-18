# Faithfulness investigation: 10 approvals and 10 rejections

Date: 18 November 2026

## Main finding

The current scores are strongly affected by the replacement procedure. These results do not establish that SHAP explanations are poor for approvals or that approval scores should be inverted.

Every one of the 20 modified inputs was predicted Approved after the current top-five replacement. The ten original approvals remained approved; all ten original rejections changed to approval. This explains the direction of the score gap in this batch.

## Sampling and checks

Five approvals and five rejections were selected per loan product, giving exactly ten of each outcome. Selection was uniform without replacement from the previous 400-case independent synthetic evaluation cohort, using seed 20261118. The selection used the model outcome, without inspecting faithfulness. This is a small stratified diagnostic sample, not a population estimate.

The current production function was called directly. Every selected applicant reproduced its previously saved prediction and faithfulness score. Model artifacts, dataset files, faithfulness source and Trust Score weights were fingerprinted before and after the investigation and remained unchanged. No production code or database records were edited.

The current test selects the five largest absolute SHAP contributions, sets those five processed input values to zero, and measures the relative probability drop for the original model outcome. Negative drops are clipped to zero. Probabilities are for approval on approved cases and rejection on rejected cases.

## Current results

| Outcome | Samples | Average faithfulness | Minimum | Maximum | Decisions changed after replacement |
| --- | ---: | ---: | ---: | ---: | ---: |
| Approved | 10 | 7.88% | 0.00% | 15.47% | 0 / 10 |
| Rejected | 10 | 91.61% | 79.70% | 98.75% | 10 / 10 |

| Loan product | Outcome | Samples | Average | Range |
| --- | --- | ---: | ---: | ---: |
| Home | Approved | 5 | 8.33% | 0.00–15.47% |
| Home | Rejected | 5 | 87.32% | 79.70–92.36% |
| Personal | Approved | 5 | 7.43% | 3.06–14.94% |
| Personal | Rejected | 5 | 95.90% | 90.34–98.75% |

Both groups initially had similar average support for their own outcome: 96.25% for approvals and 96.07% for rejections. Their different starting confidence therefore does not explain the observed gap by itself.

## What the replacement actually does

### 1. Zero is a training average for numeric features

The numeric preprocessor uses StandardScaler. A processed zero decodes to the mean of that training feature. It does not remove the feature or make its SHAP contribution zero.

| Replaced feature | Home-loan replacement | Personal-loan replacement |
| --- | ---: | ---: |
| CIBIL score | 712.1383 | 700.8717 |
| Missed payments | 0.6300 | 0.6979 |
| Monthly debt / income | 46.52% | 32.18% |
| Applicant monthly income | Rs. 70,413.21 | Rs. 59,765.92 |

For example, personal-loan applicant PLI00341 had CIBIL 548 and three missed payments. The replacement changed them to approximately 700.87 and 0.698, respectively. Its rejection probability fell from 99.93% to 3.88%, giving 96.12% faithfulness. These are test-created values, not the original submitted values.

An additional diagnostic set every processed feature to zero. That internal vector received approval probability of 90.06% from the home model and 96.48% from the personal model. This vector is not claimed to be a valid applicant, a missing-data representation, or the SHAP reference. It demonstrates that zero is not a neutral approval/rejection input here. These values do not describe the models’ approval rates on ordinary applicants.

The current SHAP explainers retain their implicit tree-path backgrounds and explain raw margins. Their expected raw margins were approximately -0.8205 (home) and -0.2415 (personal); setting input values to zero is a different operation from returning an explanation to its SHAP reference.

### 2. Absolute importance mixes supporting and opposing contributions

Seven of the ten approved cases and nine of the ten rejected cases included at least one top-five contribution opposing the original prediction. Replacing both kinds of features can offset changes that would be visible when the supporting features are tested alone. SHAP contribution signs describe the original explanation; they do not guarantee the direction of a particular replacement.

Actual example HLI00532:

| Probe | Approval probability | Current-style relative drop, clipped at zero |
| --- | ---: | ---: |
| Original application | 71.27% | — |
| Current five-feature replacement | 84.40% | 0.00% |
| Replace only the three supporting features within those same five | 35.63% | 50.00% |

The original loan/property-value ratio was 89.20%. Replacing that opposing feature with the training mean of 81.57% increased approval probability to 97.08% when changed alone. Replacing FOIR alone reduced approval probability to 33.77%. The combined test obscures this pattern.

As a diagnostic control, the same replacement was applied only to the supporting subset within each original top-five selection. It was not a new fixed-five selection: subset size varied, and the zero baseline was unchanged.

| Outcome | Current average | Supporting-subset diagnostic average |
| --- | ---: | ---: |
| Approved | 7.88% | 36.35% |
| Rejected | 91.61% | 97.60% |

This identifies cancellation as a contributor in the sampled cases. It is not a validated replacement metric: it still uses the same baseline and may produce inconsistent financial inputs.

### 3. Modified inputs can violate financial and count constraints

Nineteen of the twenty modified vectors had at least one inconsistent derived feature: EMI, FOIR or LTV no longer matched the changed or unchanged raw financial inputs. All twenty had fractional values in at least one field that should be discrete, such as CIBIL score or missed-payment count. Two rejected cases also selected a categorical indicator that was already zero, so that particular feature input did not change.

These findings concern the artificial inputs created by this faithfulness test. They are not evidence of invalid original dataset records.

For HLI00315, the current test set FOIR to 46.522%, but the financial values represented by the modified raw inputs require FOIR of 17.26%. The current test did not perform that recalculation.

### 4. Probability percentages compress strong positive model outputs

For HLI00315 the model raw margin fell from 5.9124 to 2.2782. Approval probability nevertheless remained high, moving from 99.73% to 90.71%, so the current score was 9.05%. This is a substantial raw-output change expressed as a smaller probability change. It does not, by itself, prove that the explanation is unfaithful.

## All twenty samples

“Support before/after” means the probability of the original model outcome. For rejected rows it is rejection probability, even if the modified input subsequently receives an Approved prediction.

| Applicant ID | Product | Original outcome | Support before | Support after | Faithfulness | Modified outcome |
| --- | --- | --- | ---: | ---: | ---: | --- |
| HLI00041 | Home | Approved | 96.28% | 85.97% | 10.70% | Approved |
| HLI00315 | Home | Approved | 99.73% | 90.71% | 9.05% | Approved |
| HLI00528 | Home | Approved | 99.79% | 84.35% | 15.47% | Approved |
| HLI00532 | Home | Approved | 71.27% | 84.40% | 0.00% | Approved |
| HLI00639 | Home | Approved | 99.82% | 93.41% | 6.42% | Approved |
| HLI00104 | Home | Rejected | 99.71% | 11.88% | 88.08% | Approved |
| HLI00214 | Home | Rejected | 98.23% | 19.95% | 79.70% | Approved |
| HLI00337 | Home | Rejected | 84.58% | 6.98% | 91.75% | Approved |
| HLI00673 | Home | Rejected | 85.50% | 6.53% | 92.36% | Approved |
| HLI00930 | Home | Rejected | 99.45% | 15.18% | 84.74% | Approved |
| PLI00105 | Personal | Approved | 99.37% | 86.72% | 12.73% | Approved |
| PLI00381 | Personal | Approved | 99.70% | 96.55% | 3.16% | Approved |
| PLI00512 | Personal | Approved | 99.12% | 84.32% | 14.94% | Approved |
| PLI00673 | Personal | Approved | 98.86% | 95.84% | 3.06% | Approved |
| PLI00948 | Personal | Approved | 98.54% | 95.33% | 3.26% | Approved |
| PLI00341 | Personal | Rejected | 99.93% | 3.88% | 96.12% | Approved |
| PLI00643 | Personal | Rejected | 94.48% | 2.99% | 96.83% | Approved |
| PLI00732 | Personal | Rejected | 99.31% | 2.51% | 97.47% | Approved |
| PLI00740 | Personal | Rejected | 99.92% | 1.24% | 98.75% | Approved |
| PLI00789 | Personal | Rejected | 99.55% | 9.62% | 90.34% | Approved |

## Interpretation and next step

The current score captures the effect of a particular five-feature, zero-in-processed-space replacement. It should not be read as an absolute percentage of explanation correctness, and the large rejection scores need the same scrutiny as the low approval scores.

The evidence supports evaluating a replacement protocol that respects financial dependencies and discrete inputs, with an explicit choice about supporting versus opposing features. Compare it against controls and retain the same score meaning for both outcomes. The supporting-subset probe is useful diagnostic evidence, not a finished production recommendation.

Do not invert scores on approval. In the zero-score example, such inversion would award 100% precisely when the existing replacement increased approval probability. It would conceal the replacement and direction issues rather than resolve them.

Twenty cases are enough to expose these specific implementation effects, but not to establish a general performance range for a redesigned metric. No faithfulness implementation has been changed by this investigation.

Detailed feature-by-feature evidence, raw inputs, single-feature checks, source fingerprints and the executable script are saved locally in the ignored `experiments/faithfulness_20_2026-11-18/` directory (`results.json`, `results.csv`, `integrity.json`, `investigate.py`).
