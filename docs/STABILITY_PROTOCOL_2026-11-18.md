# SHAP stability update — 18 November 2026

## What the score means

The check asks: **when a financial input changes slightly, do SHAP's important features and their contribution directions remain similar?**

It evaluates the explanation, while separately reporting whether XGBoost's decision changed. It does not establish that a decision is correct or that the explanation is faithful. A stable explanation can still be wrong or uninformative.

Protocol identifier: `shap-financial-neighbours-v1`.

## Nearby applications

The evaluator requests **20 distinct nearby applications**, each changing **one original numeric input**. It uses only fields used by the selected product model.

| Input | Changes allowed |
| --- | --- |
| Applicant income, requested loan amount | Up to ±2% |
| Existing EMI, coapplicant income, property value, where applicable | Up to ±2% |
| CIBIL score | Integer changes up to ±5 points, within 300–900 |
| Card utilisation | Up to ±0.01, meaning one percentage point, within 0–1 |

The ordered grid cycles through income, loan amount, CIBIL, existing EMI, card utilisation, coapplicant income and property value. The first pass uses monetary steps −1%, +1%, −2%, +2%; CIBIL −5, +5, −2, +2; and utilisation −1, +1, −0.5, +0.5 percentage points. It takes one step across the available fields before moving to the next step and stops at 20 cases.

At a boundary or with zero amounts, finer steps fill the remaining budget. Monetary steps are ±0.5%, ±1.5%, ±0.25%, ±0.75%; remaining CIBIL steps are ±4, ±1, ±3; and utilisation steps are ±0.25, ±0.75, ±0.1, ±0.9 percentage points. The implementation defines their exact order. Currency is rounded to two decimal places without allowing rounding to exceed the 2% limit.

Gender and other categories, counts, age, experience and loan term remain fixed. Zero existing EMI or coapplicant income remains zero rather than being replaced with an invented amount. Invalid, unchanged and duplicate inputs are excluded. If fewer than 20 distinct processed inputs remain, the actual count is recorded; fewer than two makes the check unavailable.

Every case passes through the existing product financial feature function and preprocessor. EMI, FOIR, LTV and other dependent features are recalculated from the changed inputs. A nearby case may cross a lending threshold; it remains part of the test.

All neighbours use **one batched Tree SHAP call**. Normal application assessment still calls LIME once, with no LIME calls inside stability. Tree SHAP retains the existing raw-margin attribution units and implicit tree-path background.

## Calculation

For original explanation vector `a` and neighbour vector `b`, align feature names, treating missing features as zero.

1. Rank features by absolute contribution, using average ranks for ties. Compute Spearman correlation `rho`. The rank component is `R = clip(rho, 0, 1)`. Identical constant ranks receive 1; a single meaningful feature has rank one.
2. Take the union of each explanation's five highest absolute contributions. Exclude features that are effectively zero in both. `D` is the fraction whose contribution signs agree. A contribution disappearing to zero counts as disagreement.
3. Pairwise similarity is `s = 0.70 R + 0.30 D`.
4. Overall stability is the arithmetic mean of all tested `s` values. The interface displays `100 × mean(s)`.

An empty or all-zero original explanation makes the assessment unavailable rather than producing a fabricated Trust Score. An empty/all-zero neighbour receives zero similarity and remains included. There is no score floor, percentile conversion or upward scaling.

The response also saves the lowest tested similarity, changed fields and values, approval probability changes, and the number of model decision flips. The lowest comparison is the minimum among the tested cases, not a global worst-case guarantee. Decision flips refer to XGBoost's raw decision, not the separate policy-gated outcome.

## API, history and presentation

`LoanPredictionResponse.stabilityCheck` contains the protocol, method, requested/actual counts, mean, minimum, decision-change count/rate, maximum probability change, tested fields and individual comparisons. `trustScore.stability` uses the mean.

Bank officer summary, audit and insights views show the sample count, lowest comparison and decision-change count. The generated assessment PDF includes the same summary. Full metadata persists with the assessment and is returned from history. Older records keep their saved scores and have no invented new stability evidence.

## Paired experiment

The comparison used the **same 400 applicants** as the model rebuild explanation check: 200 independent synthetic applicants per product, with 65 home approvals and 85 personal approvals. The input files, models and original faithfulness results were verified against that earlier run. Each applicant had 20 valid neighbours, giving **8,000 comparisons**.

| Product | Previous stability mean | New stability mean | New per-applicant range | Lowest individual comparison | Applicants with any model decision flip | Flips across 4,000 comparisons |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Home | 97.28% | **99.52%** | 91.23–100% | 67.68% | 6 / 200 | 17 |
| Personal | 96.83% | **99.87%** | 98.39–100% | 88.09% | 6 / 200 | 12 |

The previous check used one Gaussian perturbation of the processed vector. Both the perturbation procedure and the zero/top-feature handling changed, so this comparison does not isolate the effect of sample count alone. Six repeatability checks also passed, including reordered input dictionaries.

High scores mean **ranks and signs were similar under this small, one-field test**. They do not mean contribution magnitudes were unchanged or that all lending decisions were stable. Uniformly multiplying contributions can preserve a perfect score. The minimum and flip counts should be read alongside the mean.

### Local runtime

Warm serial timing used 30 profiles per product, one warm-up pass and two measured passes. Tests and frontend builds were not running concurrently. Times vary by machine and application.

| Median time | Home | Personal |
| --- | ---: | ---: |
| Previous stability step | 1.89 ms | 2.40 ms |
| New 20-neighbour stability step | **29.39 ms** | **34.02 ms** |
| Full backend assessment, five measured applications per product | 119.01 ms | 118.58 ms |

Full assessment timing excludes network, HTTP overhead and database writes. Each of those ten assessments was checked to call LIME exactly once.

Machine-readable results and scripts are in the ignored local directory `experiments/stability_update_2026-11-18/`: `benchmark.py`, `benchmark_rows.json`, `benchmark_rows.csv`, `summary.json`, `integrity.json`, `timing.py`, and `timing.json`. Benchmark-loop timings in `summary.json` overlapped other checks; use the dedicated serial `timing.json` for runtime reporting.

## Research basis and limits

- Alvarez-Melis and Jaakkola, *On the Robustness of Interpretability Methods* (ICML Workshop on Human Interpretability in Machine Learning, 2018), motivates checking explanation similarity for similar inputs: [paper](https://arxiv.org/abs/1806.08049).
- Yeh et al., *On the (In)fidelity and Sensitivity of Explanations* (NeurIPS 2019), studies sensitivity and highlights why a stable explanation alone is insufficient: [paper](https://proceedings.neurips.cc/paper_files/paper/2019/hash/a7471fdc77b3435276507cc8f2dc2569-Abstract.html).

**The financial grid, 70/30 similarity and mean aggregation are project adaptations, not either paper's exact formula.** Unlike local Lipschitz or maximum sensitivity measures, this implementation does not divide attribution change by input distance or search for the worst possible perturbation. It offers a bounded, repeatable local check with financial dependencies preserved.

It evaluates SHAP only. It does not evaluate LIME stability, simultaneous financial changes, categorical changes, zero-debt transitions, large financial shocks, population robustness or fairness. These scope choices keep the test interpretable and inexpensive.

## Verification and scope of this change

Tests cover valid financial changes and bounds, preserved categories/counts, recomputed finances, SHAP batching, retained prediction flips, empty/zero explanations, minimum-versus-mean reporting, API/history/PDF persistence and old-record compatibility. Real product SHAP outputs match between batch and single-row execution and reconstruct the model's raw margin.

Verification passed: **69 backend tests and 30 subtests**, **57 frontend tests**, and the production frontend build. The backend suite used an isolated in-memory database. Existing legacy model serialization warnings and the frontend bundle-size warning remain.

Dataset files, trained model artifacts, faithfulness, consistency, fairness and the 40/30/30 Trust Score weights were not changed by this stability update. No infidelity-based faithfulness score was introduced.
