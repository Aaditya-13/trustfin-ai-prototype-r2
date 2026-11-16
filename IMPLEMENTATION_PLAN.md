# TrustFin implementation plan

The owner authorized staged implementation of the defensibility plan. Initial estimate: eight batches, approximately 30–45 source files plus tests, generated datasets and model artifacts. File counts will be recorded per completed batch; the estimate is not a promise to change a fixed number of files.

Existing user changes in README, context, docs and report are preserved. The source review dated 2026-11-16 describes the pre-change baseline.

**17 November decision update:** the owner chose Gender as a predictive input after reviewing the isolated inclusion experiment. This is now applied as model version v4, with the corrected Gender-neutral labels unchanged. The earlier Gender-excluded batch-1 results below are historical. Both input configurations remain available for experiments. All 20 foundation/product API tests pass; the full suite reports 34 passed and the same eight older contract failures. The full retained discussion and active model IDs are in [docs/FAIRNESS_FINDINGS_AND_FUTURE_XAI_DIRECTION.md](docs/FAIRNESS_FINDINGS_AND_FUTURE_XAI_DIRECTION.md). Metric formulas and SHAP/LIME fairness definitions remain unapproved and unchanged.

| Batch | Work | Completion evidence | Status |
|---|---|---|---|
| 1 | Correct main synthetic labels; exclude Gender from product predictors and sampling seeds; shared product assumptions; separate biased controls and test cohorts; retrain with interpretable baselines and provenance. | Deterministic generation, boundary checks, independent-cohort metrics, paired Gender invariance through the assessment pipeline, packaged artifacts. | Complete: 15 foundation tests and 3 current-product API tests pass; full suite 32 pass / 8 pre-existing stale-contract failures. |
| 2 | Unified input validation, product routing and backend assessment policy; distinguish model recommendation from policy outcome and review status. | Invalid requests fail clearly; policy breaches cannot become sanction outcomes; unavailable products cannot silently change models. | Pending implementation; source inspection started. |
| 3 | Correct SHAP metadata and displayed raw values; valid LIME sampling and local-fit diagnostics. | SHAP reconstruction, valid sampled applicants, interpretable LIME conditions and measured local fit. | Pending |
| 4 | Implement the agreed paper-based faithfulness, agreement, stability and fairness protocol; define aggregation and unavailable results explicitly. | Formula/config documentation and genuine failure-control experiments. Exact unresolved mathematical choices require owner approval under `.agents/skills/validation/SKILL.md`. | Protocol drafted in METRIC_PROTOCOL_PROPOSAL.md; owner requested reviewing formulas together before implementation. No metric formulas changed. |
| 5 | Consistent officer/applicant screens, report reasons and PDFs; remove unsupported certainty/compliance claims and stale previews. | Matching assessment across views, formatter tests and PDF content checks. | Pending |
| 6 | Reliable transactions, visible persistence status, reproducible audit metadata, configuration and honest access boundaries. | Failure-injection persistence checks, isolated database tests, artifact/config validation. | Pending |
| 7 | Cohort-level experiments: ordinary, boundary, biased/mitigated and corrupted-explanation controls. | Regenerable tables reporting computed results and limitations. | Pending |
| 8 | Final regression checks, setup/evaluation instructions and presentation alignment. | Passing current-contract tests, frontend build and a reproducible three-case demonstration. | Pending |

No high score is an acceptance criterion by itself. Missing measurements must remain distinguishable from successful evaluations. Synthetic approval probability must not be described as observed repayment/default probability.

## Batch 1 contract

- Main labels depend on declared simulated underwriting assumptions, with no Gender term. The existing 50% application FOIR ceiling is retained as a project policy assumption, not a legal/regulatory claim.
- Gender remains available for audits but is excluded from the two current product preprocessors and all stochastic assessment seeds for those products. The legacy pipeline is preserved as legacy.
- A separate biased control reproduces an explicitly labeled female penalty near the synthetic latent decision boundary. It is never loaded as the normal serving model or included in the normal training CSV.
- Holdout preprocessing is fitted on training rows only. Independent generated evaluation rows and targeted boundary rows do not participate in training or model selection.
- The shared constants are product assumptions, not a replacement explanation-validation metric. Four-pillar formulas remain unchanged in this batch and remain subject to the documented baseline review.
- Model versions, data hashes, split indices and package versions identify the new artifacts. Gender invariance establishes only direct invariance of the implemented inputs; it is not a claim of complete group or causal fairness.

## Batch 1 observed results

| Product | Holdout accuracy | Independent synthetic cohort | Targeted boundary cohort | Logistic baseline (holdout) | Depth-4 tree baseline (holdout) |
|---|---:|---:|---:|---:|---:|
| Home | 98.33% | 98.17% | 82.35% | 91.17% | 95.00% |
| Personal | 96.83% | 96.83% | 77.06% | 90.83% | 93.67% |

Boundary performance is deliberately reported separately: passing ordinary-data checks does not establish correct behavior at every policy threshold. Batch 2 must enforce product policy independently of model approximation errors. Holdout approval rates differ between groups despite exact paired-input Gender invariance: home Male 40.73%, Female 42.21%; personal Male 51.27%, Female 52.65%. These are descriptive sample results, not compliance decisions.

Existing weights/datasets were backed up under `scratch/model_backups/20261116T162914Z/`. Regenerate with `python scripts/generate_homeloan_dataset.py` and `python scripts/generate_personalloan_dataset.py`, then train with the corresponding `scripts/train_*.py` entry points. Saved provenance includes source/data/artifact hashes, exact split indices and package versions. Normal serving uses the corrected product artifacts; biased controls are data-only research fixtures, not additional live models.
