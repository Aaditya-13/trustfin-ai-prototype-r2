# Faithfulness Correlation: twenty-applicant simulation

Date: 19 November 2026

## Main result

The grouped correlation test produces more balanced approval/rejection scores than the current replacement-drop score, but it does not establish consistently high explanation quality. The primary two-group version averages 49.87% under the provisional positive-correlation display mapping. Taking absolute correlation is not a suitable fix because it awards the same score to an explanation and its sign-reversed counterpart.

This is a research simulation. Production metrics, SHAP/LIME implementations, models, datasets, weights and database records were not changed.

## Published basis and project adaptations

Bhatt, Weller and Moura, *Evaluating and Aggregating Feature-based Model Explanations* (IJCAI 2020), Definition 3, evaluates correlation between summed attributions on fixed-size feature subsets and model output changes after reference replacement. [Paper](https://arxiv.org/abs/2005.00631).

The formula applied here is:

```text
For one original applicant x and one fixed training reference b:
    Choose every subset S of exactly k input groups.
    estimated_change(S) = sum(original signed SHAP values in groups S)
    actual_change(S) = model_margin(x) - model_margin(x with groups S from b)
    r_b = Pearson correlation(estimated_change(S), actual_change(S))

Applicant r = mean of finite signed r_b across all training references.
Provisional display = 100 * max(0, Applicant r).
```

The primary subset size was declared as k=2 before examining results. All six two-of-four group subsets were evaluated for each reference. A separately reported k=1 check evaluates all four single-group subsets. They are different protocol choices, not interchangeable score scales.

Project adaptations are explicit: model-column SHAP values are summed into four raw-input groups; the number of groups is fixed while their column counts differ; the paper correlation is averaged across multiple separate reference applicants; and the 0–100 display mapping is our convention. This evaluates coarse group alignment, not the correctness of every individual feature contribution. Group sums are not claimed to be newly computed grouped Shapley values.

## Inputs and replacements

The exact same 20 applicants from the previous investigation were retained: ten model approvals and ten rejections, with five of each outcome per product. The current rebuilt models are `home_loan_v5-53d6124d20d7` and `personal_loan_v5-2215fb06b715`.

Four disjoint groups keep financial dependencies together:

1. Income, existing EMI, loan amount, term, age and work experience; home loans also include co-applicant income and property value. Derived EMI, FOIR and LTV belong to this group.
2. CIBIL and missed payments; personal loans also include card use.
3. Marital status, dependents, education, employment and property area or loan purpose.
4. Gender.

For each test, selected raw groups are copied from one actual fitted-training applicant, and financial features are recalculated before preprocessing. Domain/count bounds, age/term consistency, credit-score/card bounds and EMI/FOIR/LTV formulas were checked. Training references were not selected by outcome or by how well they scored.

Current TreeSHAP and XGBoost both use raw-margin/log-odds units. Neither explainer background nor model output scale was changed.

## Sampling and precision check

The initial pilot used 128 randomly drawn training references per seed, with three seeds. The main two-group score averaged 49.25%; the median per-applicant score span across seeds was 6.47 percentage points, and the largest span was 19.75 points. That variation justified checking the estimator more precisely.

The precision run enumerated all 2,400 fitted-training references per loan product, without changing the formula, subset sizes or reference pool. It evaluated 288,000 two-group modified inputs plus 192,000 single-group inputs across the 20 original applicants. All references were considered; correlations with zero variation were undefined and excluded rather than assigned 100%. The number of scorable reference correlations per applicant ranged from 2,372 to 2,400.

The full-pool result below has no random reference-sampling variation for this fixed dataset and protocol. This does not prove stability across different reference populations, group definitions or model changes.

## Primary two-group results

| Product | Original outcome | Cases | Current score mean | Previous infidelity-based mean | Correlation-based mean | Correlation-based range |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Home | Approved | 5 | 8.33% | 43.68% | 50.83% | 21.10–70.24% |
| Home | Rejected | 5 | 87.32% | 34.39% | 40.77% | 0.00–72.56% |
| Personal | Approved | 5 | 7.43% | 49.71% | 49.86% | 27.64–68.17% |
| Personal | Rejected | 5 | 95.90% | 57.25% | 58.03% | 30.59–89.64% |

| Original outcome | Cases | Mean raw correlation | Mean displayed score | Range |
| --- | ---: | ---: | ---: | ---: |
| Approved | 10 | 0.5035 | 50.35% | 21.10–70.24% |
| Rejected | 10 | 0.4852 | 49.40% | 0.00–89.64% |

Overall raw r mean: 0.4943. Mean displayed score: **49.87%**. One applicant had negative average correlation and displayed 0%; no real applicant was wholly unscorable. The highest primary score was **89.64%**; no primary score reached 100%.

The values above are averages of per-applicant displayed scores. Clipping after averaging all applicants, or clipping every individual reference correlation before averaging, would produce different statistics. Those alternatives were not substituted.

## Why absolute value is unsuitable

For the chosen orientation, positive correlation means the attributed and actual changes track in the same direction. Negative correlation means the relationship is reversed. Absolute value keeps relationship strength but discards that distinction.

Actual example from PLI00341:

| Explanation | Raw correlation | 100 × abs(r) | 100 × max(0,r) |
| --- | ---: | ---: | ---: |
| Original SHAP | +0.8964 | 89.64% | 89.64% |
| Every attribution sign deliberately reversed | -0.8964 | 89.64% | 0.00% |

This equality under absolute value holds for every applicant, not only the displayed example. It makes a strongly opposite explanation look equally good. If a score has the wrong sign because its definition uses the opposite subtraction direction, fix that convention explicitly; do not erase the sign with absolute value.

In this particular cohort, absolute value would increase the overall mean only from 49.87% to 50.31%. The real negative case, HLI00337, had r=-0.0879; absolute value would show 8.79% instead of 0%. It would not solve the modest-score issue.

## Controls

Every one of the 23 nonidentity permutations of the four group attributions was evaluated on the same model changes. This is a group-allocation control, not a new model explanation.

- Real SHAP scored above the average displayed shuffled score in **19/20 cases**.
- The average shuffled displayed score, after converting each shuffled candidate separately, was **10.80%** versus 49.87% for original SHAP.
- Original SHAP ranked first among all 24 group-attribution permutations in **10/20 cases**. It was not always the best assignment under this test.
- Sign-reversing the explanation reverses r; absolute-value scoring fails this deliberately incorrect-direction control.
- Multiplying all attributions by a positive constant, including 100, leaves correlation unchanged. This score therefore checks tracking rather than calibrated contribution magnitudes.
- Constant/empty explanation estimates have undefined correlation, not a legitimate high score.
- A matched additive test gives r=+1; its deliberately reversed explanation gives r=-1. Calculations were also cross-checked against NumPy correlation.

A control-summary caveat matters: averaging signed correlations over every group permutation is constrained by the permutation symmetry. Excluding the original makes the average shuffled signed r algebraically related to the original r. That average alone is not strong validation evidence. The report therefore also gives each shuffled candidate a displayed score before averaging, and reports the original rank among all permutations.

## Single-group sensitivity check

| Protocol | Approved mean | Rejected mean | Overall mean | Highest score |
| --- | ---: | ---: | ---: | ---: |
| Two groups, prespecified primary | 50.35% | 49.40% | 49.87% | 89.64% |
| One group, sensitivity check | 57.19% | 55.37% | 56.28% | 93.22% |

The single-group version has a higher mean and maximum here. It changes the question from joint group effects to single-group effects. It should not be chosen merely because it produces larger numbers.

## All twenty samples

| ID | Product | Outcome | Raw r | Positive display | Absolute display, diagnostic only | k=1 display | Scorable training references |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| HLI00041 | Home | Approved | +0.7024 | 70.24% | 70.24% | 76.87% | 2400 / 2400 |
| HLI00315 | Home | Approved | +0.5146 | 51.46% | 51.46% | 53.77% | 2400 / 2400 |
| HLI00528 | Home | Approved | +0.5389 | 53.89% | 53.89% | 56.34% | 2400 / 2400 |
| HLI00532 | Home | Approved | +0.2110 | 21.10% | 21.10% | 20.50% | 2400 / 2400 |
| HLI00639 | Home | Approved | +0.5746 | 57.46% | 57.46% | 62.07% | 2400 / 2400 |
| HLI00104 | Home | Rejected | +0.6136 | 61.36% | 61.36% | 66.80% | 2400 / 2400 |
| HLI00214 | Home | Rejected | +0.7256 | 72.56% | 72.56% | 80.06% | 2400 / 2400 |
| HLI00337 | Home | Rejected | -0.0879 | 0.00% | 8.79% | 0.00% | 2400 / 2400 |
| HLI00673 | Home | Rejected | +0.1571 | 15.71% | 15.71% | 20.20% | 2400 / 2400 |
| HLI00930 | Home | Rejected | +0.5420 | 54.20% | 54.20% | 54.77% | 2400 / 2400 |
| PLI00105 | Personal | Approved | +0.5579 | 55.79% | 55.79% | 60.53% | 2400 / 2400 |
| PLI00381 | Personal | Approved | +0.6817 | 68.17% | 68.17% | 70.86% | 2400 / 2400 |
| PLI00512 | Personal | Approved | +0.5728 | 57.28% | 57.28% | 63.68% | 2400 / 2400 |
| PLI00673 | Personal | Approved | +0.2764 | 27.64% | 27.64% | 32.98% | 2400 / 2400 |
| PLI00948 | Personal | Approved | +0.4044 | 40.44% | 40.44% | 74.30% | 2396 / 2400 |
| PLI00341 | Personal | Rejected | +0.8964 | 89.64% | 89.64% | 93.22% | 2400 / 2400 |
| PLI00643 | Personal | Rejected | +0.3059 | 30.59% | 30.59% | 35.14% | 2400 / 2400 |
| PLI00732 | Personal | Rejected | +0.5380 | 53.80% | 53.80% | 73.23% | 2372 / 2400 |
| PLI00740 | Personal | Rejected | +0.6579 | 65.79% | 65.79% | 73.22% | 2400 / 2400 |
| PLI00789 | Personal | Rejected | +0.5031 | 50.31% | 50.31% | 57.08% | 2400 / 2400 |

## Interpretation

This test is distinct from the existing consistency and stability pillars. Consistency compares SHAP with LIME; stability compares explanations before and after small input changes. This correlation test compares attributed group importance with actual XGBoost changes under stated replacements.

A positive score is evidence of group-level model alignment under these tests. It is not a probability of correctness. It does not validate individual feature magnitudes or prove accurate lending decisions. Reference choice, coarse groups, nonlinear interactions and the difference between the current SHAP background and each training reference still affect interpretation.

The exhaustive reference run removes sampling error for this particular finite reference pool. It does not remove those methodological limitations or establish a population performance range from only 20 original applicants.

Use the signed coefficient and document any 0–100 presentation rule. Do not use absolute value for signed faithfulness. No production formula has been installed.

## Reproduction

Files are local under the ignored directory `experiments/faithfulness_correlation_20_2026-11-19/`. The top-level results contain the three-seed pilot; `all_training_references/` contains the full-pool precision run. Each includes protocol, analytic checks, per-case JSON/CSV, summary and source-integrity checks. Reproduce with `run_simulation.py` and `run_simulation.py --all-training-references` respectively.
