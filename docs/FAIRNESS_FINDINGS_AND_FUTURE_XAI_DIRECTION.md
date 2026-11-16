# Fairness: Gender-input findings and future SHAP/LIME work

Recorded: 17 November 2026.

This file preserves two discussions for later use. Part 1 contains completed experimental results. Part 2 contains a possible research direction that has **not** been investigated or implemented. Neither part establishes real-world fair-lending compliance.

## 1. Completed investigation: Gender included versus excluded

**Finding: removing the female penalty does not guarantee that a model will ignore Gender when Gender is included as an input.**

Both options were compared using the corrected datasets, matching training settings, and **20,000 fresh applicant profiles per loan product**. For each profile, only Gender was changed to check whether the model's decision changed.

The following results are from the main comparison: training/split seed 42, 120 depth-4 XGBoost trees, and the current column-sampling setting of 0.85. The two fresh cohorts contain 10,000 profiles each, generated with seeds 271828 and 314159. The labels contain no deliberate female penalty. These are model predictions, not independently enforced final lending-policy decisions.

| Model | Gender included? | Decisions changed solely by changing Gender |
|---|---|---:|
| Home loan | No | **0 / 20,000** |
| Home loan | Yes | **8 / 20,000** |
| Personal loan | No | **0 / 20,000** |
| Personal loan | Yes | **13 / 20,000** |

The changes were rare, but they existed: 0.040% of the home-loan profiles and 0.065% of the personal-loan profiles in this run. Those frequencies describe this experiment; they are not an agreed acceptable-discrimination threshold.

### Two actual examples from the generated test data

| Same financial details | Male approval probability | Female approval probability |
|---|---:|---:|
| Home-loan applicant | **49.72% → Rejected** | **50.63% → Approved** |
| Personal-loan applicant | **51.17% → Approved** | **49.09% → Rejected** |

Both of these particular examples have a neutral reference label of Rejected. They therefore illustrate a changed mistaken approval, not necessarily an unfair rejection of an eligible woman. The full results include other profiles and their reference labels.

The learned differences did **not always favor the same gender**. In the main run:

- All eight home-loan changes favored female applicants.
- Ten personal-loan changes favored male applicants; three favored female applicants.

### Repeated training

Training was repeated using five seeds: 42, 7, 19, 73, and 101. Gender-only decision changes appeared in **three of five home-loan runs** and **all five personal-loan runs** under the current settings.

An additional comparison removed random column selection by setting `colsample_bytree=1.0`. Changes persisted in four of five home-loan runs and all five personal-loan runs. All Gender-excluded models had zero Gender-only probability differences on the evaluated cohorts.

There were 40 experimental models in total: two loan products × five training seeds × two column-sampling settings × two Gender-input options. The same fresh profiles were reused across model comparisons; repeated runs are not additional distinct applicants.

### Did including Gender improve accuracy?

There was no consistent useful improvement across the repeated runs:

| Product | Average accuracy without Gender | Average accuracy with Gender |
|---|---:|---:|
| Home loan | 97.950% | 97.962% |
| Personal loan | 97.479% | 97.421% |

These are averages over the five current-setting runs on fresh data. The tiny differences do not establish that either option predicts better. Adding a column also changes the training path and random feature selection, so accuracy differences alone do not isolate the direct effect of Gender. The paired-input decision changes do test that direct dependence.

### What this means

Removing the deliberate penalty **fixes the labeling rule**. The fitted model can still learn accidental Gender-dependent patterns.

Group approval rates among eligible applicants were also measured. They looked similar in the main comparison despite the individual decision changes. Group comparisons and identical-applicant comparisons therefore need separate checks.

| Product | Gender input? | Eligible men approved | Eligible women approved | Absolute gap |
|---|---|---:|---:|---:|
| Home | No | 97.312% | 97.799% | 0.487 percentage points |
| Home | Yes | 97.333% | 97.858% | 0.525 percentage points |
| Personal | No | 97.058% | 97.073% | 0.015 percentage points |
| Personal | Yes | 97.287% | 97.120% | 0.167 percentage points |

These are descriptive point estimates, not proof of population-level equality or inequality. Group counts, error counts, and uncertainty intervals are retained in the raw results.

The recommendation made after this experiment was to **keep Gender for auditing and exclude it from the main prediction inputs**: for these datasets, inclusion added little demonstrated value while creating an avoidable dependency. This recommendation concerns the tested models and synthetic data; it does not mean every model including Gender is automatically unfair.

**Historical preservation:** the serving models, datasets, and existing score formulas were unchanged during this investigation. A later decision to adopt Gender-included models is separate from that experimental preservation claim.

### Evidence and reproduction

- [Plain-language findings](../experiments/gender_input_study/FINDINGS.md)
- [Detailed report](../experiments/gender_input_study/REPORT.md)
- [Raw results, group counts, examples, intervals and hashes](../experiments/gender_input_study/results.json)
- [Experiment script](../scripts/investigate_gender_input.py)
- Experimental model checkpoints: `models/experiments/gender_input_study/`.
- Reproduce from the repository root: `python scripts/investigate_gender_input.py`.

## 2. Future direction: including SHAP and LIME in a fairness audit

**Including SHAP and LIME in the fairness check would not, by itself, change XGBoost's loan prediction.** It would expand what is checked about the assessment. Changing the final decision based on such a check would require a separately defined policy.

There are two different approaches.

### Approach A: use explanations to understand differences in loan decisions

First check whether eligible male and female applicants receive similar approval rates. Then use SHAP and LIME to investigate **which features contributed to the model's decisions**. For example, they might show that income or existing debt contributed strongly to rejected applications.

Different feature contributions alone do not prove unfairness: applicants can have different finances. SHAP's documentation describes using explanations to investigate measured fairness differences. Our current TreeSHAP values are in log-odds; a future decomposition must respect the chosen metric's output scale rather than silently treating them as probability contributions.

Reference: [SHAP — Explaining quantitative measures of fairness](https://shap.readthedocs.io/en/stable/example_notebooks/overviews/Explaining%20quantitative%20measures%20of%20fairness.html).

### Approach B: check whether explanations are equally reliable

The question is:

> **Do male and female applicants receive explanations of similar quality?**

For an invented example, the same explanation test might show that:

- LIME closely follows XGBoost's behavior for male applicants.
- LIME follows it much less accurately for female applicants.

The model could have similar approval rates across genders while one group receives worse explanations. This is a possible explanation-quality problem, not a result already observed in TrustFin.

This is an established research direction: **Dai et al., _Fairness via Explanation Quality: Evaluating Disparities in the Quality of Post hoc Explanations_, AIES 2022**. [Paper](https://arxiv.org/abs/2205.07277).

### Effect of including or excluding Gender

| Prediction input | What SHAP/LIME could add |
|---|---|
| **Gender included** | Help investigate how Gender contributes to predictions, and whether explanation quality differs across groups. |
| **Gender excluded** | Still allow comparison of explanation quality across male and female applicants. No direct Gender contribution is expected, but explanation quality can still differ. |

For SHAP, checking only that its values reconstruct the prediction is insufficient: this can pass by design. A meaningful quality test, such as an explicitly approved faithfulness or stability evaluation, would be needed.

Any comparison must control LIME sampling randomness and apply the same evaluation conditions to both groups. Different feature bars for different financial profiles are not automatically evidence of unequal explanation quality. No particular fairness gap or score formula has been selected for this future work.

**Expectation:** SHAP and LIME could provide a richer fairness audit. They would not automatically improve fairness or eliminate the observed Gender-related decision changes.

Approach B is particularly relevant to the project's aim of checking whether explanations are trustworthy. It must be called **fairness of explanation quality**. It would not, by itself, establish fair loan decisions.

**Status: this investigation has not been run. Its outcomes cannot yet be claimed to be good or bad.**

## 3. Owner's subsequent choice

After reviewing the investigation, the owner chose to **include Gender as a prediction input** while keeping the corrected main labels free of the deliberate female penalty. This supersedes the earlier recommendation to exclude Gender; it does not change the historical results above.

The chosen model is allowed to use Gender, so direct Gender invariance must not be asserted. The small observed flip counts will remain documented. They are learned differences observed in the synthetic experiment, not deliberately engineered real-world effects, evidence that the differences are harmless, or proof of fair lending.

The inclusion choice does not approve a new fairness formula or a SHAP/LIME fairness method. Those definitions remain under discussion.

### Applied configuration and verification

The selected Gender-included configuration was applied on 17 November 2026:

- Home model: `home_loan_v4-04190fb76be9` (20 transformed features, including `Gender_Male`).
- Personal model: `personal_loan_v4-8eecbbbf9e25` (21 transformed features, including `Gender_Male`).
- Both saved model files exactly reproduce the main Gender-included experimental checkpoints. The datasets and their neutral labels were not changed by this adoption step.
- The previous Gender-excluded serving artifacts were backed up under `scratch/model_backups/before_gender_inclusion_20261116T185007Z/` (UTC timestamp in the directory name).
- Training metadata now records actual paired Gender effects instead of asserting zero effects. The original experiment remains a historical record.
- All 20 foundation/product API tests pass. The full backend suite reports 34 passed and the same eight older contract failures. Test database writes were isolated from the normal application history.
- Existing fairness, faithfulness, consistency, stability and composite formulas remain unchanged. A running backend process must reload the models to use the new artifacts.

The comparison results informed the feature-selection discussion. A later final confirmation test should use a newly reserved evaluation cohort, rather than presenting these already-inspected cohorts as a fresh final test after model selection.
