**TrustFin AI — review of the implemented final-year project, 16 November 2026**

This review treats the executable source and saved artifacts as the source of truth. It does not use the older README, context, docs, or report claims to infer implemented behavior. The project is assessed as a final-year project. The directory name `proto` is not used to classify its maturity.

The central finding is that the prediction pipeline works and its saved classification metrics are reproducible, but the current explanation-validation layer does not justify the strength of the reliability, fairness, and lending claims shown to users. There are also concrete disagreements between the API, officer recommendation, applicant view, and generated report.

No application source, model weights, datasets, or existing documentation were changed during this review. Review scripts and machine-readable evidence are under `scratch/repository_audit/`. Application database connections used by those scripts were redirected to a separate SQLite database in that directory. The ordinary application history was not used for test writes.

**1. What the code actually implements**

| Stage | Implemented behavior | Main source |
|---|---|---|
| Dataset generation | Two seeded, 3,000-row synthetic datasets. Labels come from explicit underwriting formulas and hard rules, including an intentional female penalty in a borderline band. | `scripts/generate_homeloan_dataset.py`, `scripts/generate_personalloan_dataset.py` |
| Feature engineering | Home loans: amortized EMI at 8.5%, FOIR, LTV. Personal loans: amortized EMI at 13.5%, FOIR. | `backend/app/ml/preprocessing_homeloan.py`, `preprocessing_personalloan.py` |
| Training | Separate XGBoost classifiers, 120 trees, depth 4; stratified 80/20 split; preprocessors fitted on training rows. | `scripts/train_homeloan.py`, `train_personalloan.py` |
| Runtime model selection | Registry loads home, personal, and legacy pipelines. Unknown/unavailable products can silently fall back to another pipeline. | `backend/app/ml/registry.py` |
| Prediction | Binary model decision plus approval-class probability; predicted-class probability is called confidence. | `backend/app/api/routes/prediction.py:348` |
| SHAP | TreeExplainer, raw model output, tree-path-dependent reference distribution. For these classifiers the contributions are in log-odds. | `backend/app/explainability/shap_explainer.py:17` |
| LIME | Local surrogate fitted to `predict_proba`, operating on transformed features; default discretization; 100 transformed training rows initialize each new product explainer. | `backend/app/explainability/lime_explainer.py:22` |
| Faithfulness | Select class-supporting SHAP coordinates, zero them, measure absolute probability movement, and apply a piecewise high-score mapping. | `backend/app/validation/faithfulness.py` |
| Stability | Explain one Gaussian perturbation of transformed inputs using SHAP; rescale signed-contribution Spearman correlation into [0,1]. | `prediction.py:368`, `validation/stability.py` |
| Consistency | Jaccard overlap of the three largest absolute SHAP and LIME contributions. | `validation/consistency.py` |
| Fairness | Flip Gender, keep other raw attributes fixed, and return one minus the absolute approval-probability difference. | `validation/fairness.py:39` |
| Trust | Weighted sum: 35% faithfulness, 30% consistency, 25% stability, 10% fairness. | `trust/trust_score.py:11` |
| Persistence | SQLAlchemy prediction and batch records; complete response snapshots; PostgreSQL with SQLite fallback. | `backend/app/db/` |
| Presentation | React officer/applicant screens, local contribution charts, agreement table, audit history, batch uploads, PDF export, affordability calculator. | `frontend/src/` |

There is a third, legacy pipeline, not just the two current product models. Many tests and standalone scripts still target it. `InsightsDashboard.jsx` is not imported by the active `App.jsx`; the active officer screens are `BankOfficerSummary.jsx` and `BankOfficerAudit.jsx`.

**2. Verification results**

| Check | Result |
|---|---|
| Python parsing | All 51 Python source files found under backend, scripts, and scratch parsed at the time of the check, including the review helpers then present. |
| Existing backend suite | 17 passed, 8 failed. See `scratch/repository_audit/backend_results.xml` and `backend_test_output.txt`. |
| Existing frontend suite | 18 passed, 7 failed, across 4 test files. |
| Frontend production build | Passed. Main JavaScript bundle approximately 780 kB before gzip, 221 kB gzip; build reports a chunk-size warning. |
| Frontend lint | Exited successfully with warnings, including unused code and React effect/component warnings. |
| Stored home-loan holdout | Accuracy 0.9700; ROC-AUC 0.997810; confusion matrix [[282,12],[6,300]]. |
| Stored personal-loan holdout | Accuracy 0.973333; ROC-AUC 0.996338; confusion matrix [[279,8],[8,305]]. |
| Generator reproduction | Both saved product datasets match the current default generators in values, allowing normal CSV floating-point round-trip differences. No missing entries or duplicate non-ID rows found. |
| New generator seed | On 3,000 fresh rows per product, seed 123, accuracy was 0.976667 home and 0.970333 personal. This is still evaluation against the same synthetic rule family. |
| Feature alignment | Saved transformed feature names match each saved product preprocessor's output order. |
| SHAP reconstruction | For the checked prime applicant in each product, sigmoid(expected value + sum of SHAP values) reconstructs the model probability. |

The backend failures are largely outdated expected IDs, old preset endpoints, old CSV sizes, and old Credit_History contracts. The frontend failures concern old batch controls and history fixtures without product fields that the current default filter requires. These failures should be repaired against an agreed current contract; they do not establish that all affected runtime features are broken.

The installed Python environment emitted model-persistence version warnings: saved scikit-learn objects reference 1.7.2 while the installed version is 1.9.1; XGBoost also warns about older pickled models. Neither warning prevented the measured inference checks. PostgreSQL availability, browser layout/accessibility, and real-world lending performance were not verified.

**3. Findings that should precede new feature work**

**P1-01 — Faithfulness is artificially rescaled and loses the direction it claims to test.**

Source: `backend/app/validation/faithfulness.py:61`.

Let p be the original approval probability, p' the masked probability, and p0 the probability of an all-zero transformed vector. The implemented ratio is:

`r = abs(p - p') / max(0.08, abs(p - p0))`

The returned score is:

- If r <= 0.05: `max(0.02, 2r)`.
- Otherwise: `0.74 + 0.17 * (1 - exp(-r))`.
- If there are no supporting contributions: return 0.10.

This is not a calibrated probability that an explanation is correct. No fitting or validation of that interpretation appears in the code. Once the ratio crosses 0.05, the score jumps from about 10% to about 74.83%. The high branch approaches 91%; the 95% cap is unreachable for finite nonnegative r. The docstring's claim of smooth calibration is inconsistent with the discontinuity.

Executable counterexample: with original approval probability 0.8, masking a purported positive contributor to obtain 0.7 returns **0.7882**. Masking it to obtain 0.9 also returns **0.7882**. The latter contradicts the attribution's expected direction but receives exactly the same score.

This finding does not invalidate feature-ablation evaluation as an idea. It invalidates this particular interpretation and score mapping.

**P1-02 — The masking experiment does not preserve valid applicant relationships.**

Sources: `faithfulness.py:30`, `faithfulness.py:51`; both product preprocessing modules.

Zero means a training-set mean for standardized numerical columns, but a reference category for dropped-first one-hot columns. It is not a universal absence or neutral applicant. Independently masking Loan_Amount, Monthly_EMI, FOIR, Property_Value, and LTV can create internally contradictory combinations because these variables are mathematically related. A zero-valued indicator can already carry a nonzero SHAP contribution; replacing it with zero does not remove that evidence.

The all-zero vector's approval probability is approximately **0.3945 home** and **0.7096 personal**, so it is not a common population base probability, nor the TreeSHAP expected value. The procedure can measure a response to an implausible combination rather than reliable behavior around an applicant.

The default salient set has a variable number of features and is selected by an absolute threshold in SHAP log-odds. If `top_k` is supplied, the normal threshold branch slices the existing feature order without sorting by importance. This makes the result sensitive to column ordering. Only the fallback branch sorts.

**P1-03 — The claimed solvency gate is a warning, not an enforced final-decision policy.**

Sources: `prediction.py:319`, `prediction.py:348`; `frontend/src/utils/decisionAdvisory.js:30`; `backend/app/reporting/pdf_generator.py:304`.

The backend sets `isSolvent=False` above 50% FOIR, then independently returns the XGBoost prediction. The officer advisory can recommend decline, while the applicant view and PDF follow the model's Approved label.

This is reproducible on actual saved dataset rows:

| Product | FOIR | Model approval probability | Backend | Officer advisory | PDF |
|---|---:|---:|---|---|---|
| Home | 53.47% | 99.6931% | Approved / INSOLVENT | Decline recommended | Approved |
| Personal | 57.22% | 95.6302% | Approved / INSOLVENT | Decline recommended | Approved |

The personal-loan example also receives **96.53% overall trust**. Its PDF describes 57.2% as well below a 50% threshold. This is a factual contradiction within the generated document.

The training rules use different ceilings: >68% home and >60% personal. The saved datasets contain **304 home** and **54 personal** Approved labels above the API's 50% ceiling. Decide which behavior is intended, then separate model output, policy outcome, and review recommendation in a shared backend contract. Explanations of the model should remain identifiable separately from reasons for a policy override.

**P1-04 — The explanation display has incorrect applicant values.**

Sources: `frontend/src/utils/bankingTerms.js:80`, `bankingTerms.js:96`; `prediction.py:307`.

Direct execution of the actual formatter shows:

- `CIBIL_Score=795` is displayed as **0 (Poor / Derogatory CIBIL)** because any key containing CIBIL is interpreted as legacy binary Credit_History.
- `Existing_EMI=4000` is displayed as the **proposed EMI**, e.g. 16,700/month, because the broad EMI branch always reads `monthlyEMI`.
- LTV_Ratio has no unscaled entry in `orig_values`. The explanation schema therefore carries a standardized value, and the UI can present a value such as **-0.57** as the applicant's LTV.

FOIR and card-utilization values also lack appropriate product-specific formatting. Property value and some newer fields lack dedicated labels/units. These issues directly affect the user's ability to interpret otherwise valid numerical attributions.

**P1-05 — LIME's sampled applicants and retained output need methodological repair.**

Sources: `backend/app/explainability/lime_explainer.py:22`, `lime_explainer.py:71`; product training background export.

LIME receives transformed coordinates, with no supplied grouping or raw categorical semantics. Default continuous-feature discretization and inverse sampling independently perturb the coordinates. On neighborhoods inspected for prime applicants, approximately **99.98% home** and **96.2% personal** of sampled rows had at least one one-hot coordinate outside {0,1}. Engineered features are independently sampled as well, so valid EMI/FOIR/LTV relationships are not guaranteed. These observations concern those sampled neighborhoods, not a universal rate for every applicant.

The wrapper discards LIME's interval descriptions, intercept, local fit score, local approximation, neighborhood/config metadata, and uncertainty. A coefficient for a condition such as a discretized CIBIL interval becomes an unexplained coefficient labeled only CIBIL_Score. Users cannot inspect which condition is being explained.

In diagnostic fits for the two prime cases, weighted local R² was about 0.387 and 0.399. The unconstrained linear surrogates estimated approximately 1.139 and 1.019 at the applicant, compared with actual probabilities near 0.9994 and 0.9987. A linear surrogate exceeding one is possible; the flaw is presenting its output as corroborating evidence without exposing or checking fit quality. Faithfulness and stability are computed only for SHAP, so LIME's own fidelity and repeated-run variability are not evaluated by those pillars.

**P1-06 — Explanation consistency can be perfect despite opposite reasons.**

Source: `backend/app/validation/consistency.py:3`.

Only top-three feature membership is checked. SHAP contributions [3,2,1] and LIME contributions [-3,-2,-1] for the same three names produce **1.0 consistency**. Rank order, signs, magnitudes, local fit, and feature dependence are ignored. For exactly three features per set, Jaccard can take only 0, 0.2, 0.5, or 1.0, making a 30%-weighted pillar coarse.

The frontend separately computes a directional percentage on a truncated union of top-five lists. That percentage measures a different thing from the backend pillar and can omit LIME-selected features when the union is truncated. The UI should identify both definitions and avoid calling feature overlap consensus across underwriting checks.

**P1-07 — Fairness failure becomes perfect fairness.**

Source: `backend/app/validation/fairness.py:61`.

The exception handler in individual fairness returns **1.0**. A failed evaluation therefore contributes the maximum fairness credit. This was reproduced by invoking the current function with a failing preprocessing path. An unavailable score needs an explicit unavailable/error state, distinct from a measured value.

The unused global equal-opportunity function also returns 1.0 when no eligible examples exist or fewer than two eligible groups are present. Those cases do not provide enough evidence to conclude parity.

**P1-08 — The fairness pillar has a narrower meaning than the UI claims.**

Sources: `fairness.py:39`; `frontend/src/components/BankOfficerAudit.jsx:397`.

The actual property is sensitivity of approval probability to replacing Gender while holding everything else fixed. It does not establish group fairness, fair lending compliance, absence of proxy effects, or causal counterfactual fairness. The latter requires explicit causal assumptions; no structural causal model is implemented here.

The scalar also hides decision-boundary effects: probabilities 0.501 and 0.499 yield 99.8% under this formula despite reversing the decision. In the reproduced 600-row holdouts, changing Gender alone changed the predicted decision for **34 home** and **18 personal** profiles. The group approval-rate ratios were approximately 0.906 and 0.865. These are different measurements and should be reported separately with group sample sizes and uncertainty.

The generators deliberately penalize Female applicants. That can be a useful controlled audit experiment, provided the biased scenario is explicitly described and compared with an unbiased control. A high aggregate trust score does not remove the discrimination learned from those labels.

**P1-09 — Trust is a heuristic index, but the product presents stronger guarantees.**

Sources: `backend/app/trust/trust_score.py`; `BankOfficerAudit.jsx:434`; `pdf_generator.py:397`.

The weighted sum has no demonstrated calibration against independently evaluated explanation quality or decision correctness. High values of some pillars can compensate for a serious failure of another. With faithfulness near its implemented 0.91 ceiling, stability=1, consistency=1, and fairness=0, the composite is **0.8685**, above the High Trust threshold.

Phrases such as causal truth, fair lending compliance, independent verification, and High Trust (Auto-Sanction) are unsupported by these measurements. SHAP and LIME explain the same classifier; they are not independent credit-risk models. The scalar needs a precise project-specific interpretation, validated thresholds, and explicit treatment of missing or failed measurements. Its score must not be presented as a probability that an applicant will repay or that a decision is safe.

**P1-10 — The named ablation experiment is hardcoded arithmetic, not an ablation.**

Source: `backend/tests/test_xai_and_ablation.py:46`.

`test_deliberate_ablation_trust_score_collapse` passes manually assigned faithfulness, stability, consistency, and fairness numbers into the weighted sum. It does not alter a model, corrupt explanations, or calculate those four quantities from predictions. Printed accuracy and comparative baseline values are also literals. The test verifies aggregation of supplied numbers, not the engine's ability to detect degraded explanations or models.

`test_shortcut_learning.py` similarly prints a historical baseline approval and an enforced override even though the actual asserted raw classifier already rejects that profile. Passing tests cannot validate those printed experimental claims. Controlled experiments must compute the claims they report.

**P1-11 — Required product weights are absent from the tracked repository.**

Sources: `.gitignore:114` onward; `backend/app/ml/registry.py:46`, `registry.py:169`; `prediction.py:549`.

`git ls-files models` includes the legacy model and preprocessor, but excludes both product `model.pkl` and `preprocessor.pkl` files. `git check-ignore` confirms all four product files are ignored. They exist in this workspace, which is why the measured product inference succeeds.

A checkout containing only tracked files cannot immediately load the two current products without training or an external artifact step. Worse, the registry can route both requested products to legacy when only legacy is available. An isolated legacy-only registry reproduced that fallback. The API also gates prediction on a separately loaded legacy global `model`, even if the requested modern pipeline is healthy. Missing products should not silently change the model used for a financial assessment.

**P1-12 — Invalid single-application data can be scored successfully.**

Sources: `backend/app/api/schemas.py:6`; `backend/app/ml/registry.py:176`; `ApplicantForm.jsx:159`.

The request fields lack numerical bounds and categorical/product enums. Invalid CIBIL strings become 720; invalid utilization becomes zero; invalid optional numeric values often become zero. Unknown categories are encoded through `handle_unknown='ignore'`, potentially becoming the reference category. Missing property value is invented from a 75% LTV assumption, and missing credit behavior can be inferred from CIBIL without being marked as estimated.

Actual API probes submitted negative income, negative principal, negative tenure, unknown gender, and invalid CIBIL, and received **HTTP 200** for each product. An unknown product also resolves to home rather than an invalid-product response.

Batch validation applies a different policy and limits, so an equivalent record may be accepted, rejected, or filled differently depending on submission route. The frontend also replaces valid zero work experience with five years via `Number(value) || 5`. Establish one validated normalized contract, preserve submitted values, and make defaults/imputations explicit.

**P1-13 — Batch persistence can report success after losing every record.**

Source: `prediction.py:478` through `prediction.py:543`.

Each row is flushed into a shared transaction. If one flush fails, its exception is recorded as a flawed row without a savepoint or session rollback. The final batch commit then fails, rolls back all writes, and its exception is swallowed.

An isolated uniqueness-failure experiment reproduced a response reporting **1 valid record**, with an evaluation ID and a batch ID, while the database contained **zero associated evaluations and zero associated batch records**. Single prediction also suppresses commit errors and returns a normal result without a reliable persisted-audit status.

Audit persistence should be a visible part of the API outcome. If partial batch success is intended, transaction boundaries must actually support it.

**4. Other substantive issues**

**P2-01 — Stability is a single SHAP sensitivity check, not broad robustness.**

Sources: `prediction.py:368`; `validation/stability.py:20`.

Gaussian standard deviation 0.01 in transformed space is not 1% of each applicant input. Noise is added to categorical indicators and derived values without reconstructing valid applicants. Only one neighboring point is tested; prediction preservation is not checked. Spearman is computed on signed contributions, so it measures signed ordering rather than absolute importance ranking. Zero correlation maps to 0.5, which should not be labeled 50% of explanations stable. Constant vectors map to zero even when identical. Repeated, domain-valid neighbors and distributions of outcomes would support a clearer interpretation. Fixing a seed gives repeatability, not evidence of stability.

**P2-02 — SHAP and LIME scales and reference semantics are not disclosed.**

Sources: both explainer modules; `explainability/schemas.py`; `BankOfficerAudit.jsx:236`.

The local horizontal bars, absolute-importance sorting, and approval-oriented sign convention are reasonable. Positive means pushes the approval output up, including for rejected applicants. The display does not need to reverse these signs for rejected applicants.

However, SHAP log-odds and LIME probability-surrogate coefficients are shown with the same generic numeric presentation, without their units or different references. Their magnitudes are not directly comparable. The shared schema omits target class, output space, SHAP expected value, probability reconstruction, LIME intercept/condition and fit. Seven-feature plots also omit the remainder without a residual term. These plots are useful local driver summaries, not complete decompositions of the displayed probability. Preserve that distinction.

TreeSHAP's implicit tree-path reference is valid as a choice; it does not use the exported 100-row background. Correlated and derived inputs still affect how credit is distributed among features. No global SHAP summary over a defined evaluation cohort is implemented.

**P2-03 — The target is synthetic approval, not default or repayment.**

Sources: both generator label formulas; `frontend/src/utils/decisionAdvisory.js:44`, `decisionAdvisory.js:71`.

The synthetic latent score is thresholded deterministically to generate approval labels; repayment outcomes are not sampled or observed. XGBoost's probability is an estimate for that approval class. The frontend describes it as default risk or repayment probability, which changes its meaning. The reported 97% results demonstrate learning the simulated rules. They do not establish real lending performance. No simple interpretable predictive baseline, calibration evaluation in the training exports, subgroup uncertainty intervals, or independent real-data evaluation is implemented. These are research-scope limitations, not a reason to discard synthetic data.

The home generator's >92% LTV rejection region is absent from the generated support: the inspected LTV range is about 64.04–89.87%. The classifier therefore cannot demonstrate learned behavior beyond that boundary from this dataset. Out-of-distribution and boundary stress tests deserve separate reporting.

**P2-04 — Report reasons are largely templates, not the actual explained decision.**

Sources: `pdf_generator.py:304`; `ApplicantPortalView.jsx:252`; `CustomerNoticeModal.jsx`.

Approval text asserts affordability and clean credit history because the model said Approved. The PDF can claim zero delinquencies when CIBIL>=750 without checking the actual missed-payment count. Rejection reasons use hand-written thresholds and may omit the actual main model factors. Personal-loan reapplication guidance includes 180–240-month terms and adding co-borrower income, while the current personal-loan model/calculator uses 6–60 months and applicant income. These are separate factual issues from the model's explanation quality.

The PDF endpoint accepts applicant data and the complete prediction result from the client. It does not fetch a saved evaluation or verify that the submitted scores, decision, applicant, and dossier belong together. A formal report can therefore be generated from client-edited results.

The code calls a fixed 50% ceiling regulatory and uses statutory/compliance language without an identified rule source or versioned product policy. This review does not establish the legal status of that threshold; the implementation does not substantiate those legal claims. The PDF also calls high trust Auto-Sanction even for a reliable rejection.

**P2-05 — Reproducibility is narrower than the seeded-request tests suggest.**

Sources: `prediction.py:72`; `lime_explainer.py:58`; `prediction.py:388`; `db/models.py`.

The seed hashes the submitted dictionary rather than only canonical model inputs. Changing an unused legacy Credit_History field leaves product prediction unchanged but changes LIME and the stability probe. In the prime examples, maximum LIME coefficient changes were about 0.0373 home and 0.0569 personal; overall trust also moved. Semantically equivalent requests and different ingress defaults therefore need not receive identical reliability estimates.

Each globally shared LIME explainer has mutable random-state fields, and the wrapper calls process-global `np.random.seed`. Concurrent use from synchronous batch routes can race; this is a source-level concurrency risk, not a race reproduced in this review.

Versions are hardcoded as home_loan_v2/personal_loan_v2, with no persisted artifact hash, training-data hash, explainer/metric configuration version, runtime package lock, or evaluation seed in the audit record. Retraining can change the weights while keeping the same modelVersion. Stored responses are useful snapshots, but not sufficient for exact reconstruction of how an evaluation was produced. `raw_input_data` contains normalized/defaulted data rather than a separately preserved original submission.

**P2-06 — The officer/applicant roles are presentation state only.**

Sources: `frontend/src/App.jsx:15`; all history/delete/PDF routes; `backend/app/main.py:44`.

There is no server-side authentication, record ownership, or authorization for reading/deleting evaluations and batches. Selecting the officer portal is enough to access its UI, and the API endpoints do not check the selected role. CORS allows all origins. This is a concrete missing boundary if the project claims protected institutional/applicant access; it should not be described as a secured role-based implementation.

**P2-07 — Database fallback and health can hide operational failure.**

Sources: `backend/app/db/session.py:117`; `backend/app/main.py:12`, `main.py:56`.

The app can silently write to a separate local SQLite ledger when PostgreSQL is unavailable. When the primary recovers, records written locally are not automatically part of the primary history. `init_db` suppresses errors; startup can continue after initialization failures; `/health` always returns healthy without checking loaded products or database readiness. Even a non-default SQLite URL is ignored in favor of the hardcoded fallback engine. These behaviors need explicit operational status if persistence matters to the audit feature.

**P2-08 — API work and batch size are unbounded.**

Sources: `prediction.py:547`, `prediction.py:573`, `prediction.py:583`, `prediction.py:596`.

CPU-heavy prediction/explanation and synchronous database operations run directly inside async routes. Uploads are fully read into memory, rows are processed serially, and there are no server-side row/file limits or request job progress. Large batches can occupy the server for long periods. History returns only the latest 50 records by default, with no offset/cursor UI; older records become inaccessible through the current history screen. Limits are not bounded at the API schema level.

**P2-09 — Cached PDF preview can show a previous applicant's report.**

Source: `frontend/src/App.jsx:123`.

The global PDF blob URL is reused whenever it exists, and is not invalidated when a new result is loaded or submitted. The current customer notice can therefore open an old PDF preview after the application changes. Component-local applicant preview caches have a similar dependency issue when a mounted component receives a different historical result.

**P2-10 — Audit metadata and batch summaries can become inconsistent.**

Sources: `prediction.py:650`, `prediction.py:823`, `prediction.py:855`; `db/models.py`.

Batch detail creates EvaluationSummaryItem without supplying loanType or cibilScore, so personal rows inherit the schema's default home_loan label. Individual deletion of a batch child does not update the stored parent summary/counts. Batch linkage is a string rather than a foreign key. Dossier suffixes use 24 random bits and batch suffixes use 16 random bits per daily product namespace, with no collision retry. These choices also expose the transaction failure described in P1-13. Legacy history reconstruction uses expressions such as `probability or 0.5`, which turn a valid zero into 0.5.

**P2-11 — Deployment configuration and artifact packaging need cleanup.**

Sources: `frontend/src/services/api.js:3`; `.env.example`; `requirements.txt`; registry initialization.

The frontend API URL is hardcoded to localhost despite the supplied VITE_API_BASE_URL setting. Model/data paths depend on the process working directory. Backend requirements use open-ended lower bounds and no lockfile; pickle portability warnings already occur. The legacy model/explainers are loaded twice, including unnecessary work at module import. Legacy registry accuracy is hardcoded to 0.82, conflicting with the saved legacy metadata. These are straightforward reproducibility and maintainability issues.

**5. What is already sound and worth retaining**

- Product-specific engineering uses amortization and includes existing monthly debt. Preprocessors are fitted after the training/test split; no preprocessing-fit leakage was found in the two current product trainers.
- Saved feature names line up with the saved preprocessors and model input dimensions. Local TreeSHAP contributions reconstruct the actual prediction in the checked cases.
- SHAP and LIME are kept out of the frontend and exposed as structured feature contributions. The standardized interface is a useful foundation, although its metadata needs extending.
- Audit snapshots avoid recomputing historical explanations when retrieving modern records. Timestamp serialization explicitly marks UTC.
- Batch ingestion already distinguishes invalid rows from scored rows, and the UI exposes invalid-row reasons. The transaction behavior needs repair, but the feature itself is implemented.
- The active what-if component is explicitly labeled an illustrative affordability calculator and states that it does not rerun the model. Its arithmetic is useful; it should not be promoted as a model-verified counterfactual recourse method.
- Existing tests exercise prediction, persistence, batch upload, PDF byte generation, request determinism, and product routing. Their current assertions need modernization and deeper methodology coverage.

**6. A defensible next design for faithfulness — proposal only**

The property to measure is whether an explanation correctly identifies model-sensitive information for a specified output, under a specified intervention distribution. It is different from whether the classifier is accurate, fair, or suitable for lending.

A candidate evaluation can define f_c(x) as the probability of the originally selected class c, select the top-k supporting *raw feature groups*, create a plausible replacement x^(S,b) for group set S using reference b, and recompute all derived inputs. Report the signed deletion effect:

`D_k(x,b) = f_c(x) - f_c(x^(S_k,b))`.

Average across explicitly chosen references and cases, with dispersion/intervals. A positive value supports the chosen features under that intervention; zero means no detected removal effect; a negative value contradicts the expected direction. This is an interpretable probability-point change, not a percentage of truth. Compare its curves across k with random-feature, least-important-feature, and deliberately corrupted-explanation controls. Do not map results into a preferred display band.

Important limitations: results depend on the replacement distribution, correlated inputs and feature grouping; several plausible replacements should be studied. Deletion is primarily a ranking/set test and does not validate every attribution magnitude. Recomputing descendants changes the evaluated question to removing a raw group and its consequences, which must be stated. A SHAP log-odds magnitude should not be silently compared with a probability change.

Reasonable alternatives include insertion/deletion curves, prediction-gap versus attribution-sum correlation over subsets, and an infidelity objective with compatible attribution units and perturbations. For LIME, also report the surrogate's weighted local fit and applicant-point approximation error. None of these measures alone provides a calibrated global trust probability. Choosing the metric, reference scheme, grouping, target output, and aggregation is a research-method decision to settle before changing implementation.

Primary references checked for this review:

- [SHAP TreeExplainer documentation](https://shap.readthedocs.io/en/latest/generated/shap.TreeExplainer.html): output units, reference data, and feature-dependence assumptions.
- [Ribeiro, Singh, and Guestrin, 2016 — LIME](https://arxiv.org/abs/1602.04938): locally fitted interpretable explanations.
- [Petsiuk, Das, and Saenko, 2018 — RISE](https://arxiv.org/abs/1806.07421): deletion/insertion evaluation in image explanations; this does not validate TrustFin's custom score transformation.
- [Yeh et al., 2019 — On the (In)fidelity and Sensitivity for Explanations](https://arxiv.org/abs/1901.09392): distinct fidelity and sensitivity objectives and dependence on the perturbation distribution.
- [Kusner et al., 2017 — Counterfactual Fairness](https://arxiv.org/abs/1703.06856): fairness formulated with causal assumptions, beyond simply switching a protected column.

**7. Suggested order of work**

1. Agree on the distinction between model prediction, policy outcome, officer recommendation, and explanation reliability. Correct the contradictory approval/PDF behavior and wrong displayed applicant values.
2. Define the faithfulness measurement protocol and output interpretation. Establish valid raw-input/group perturbations for both validation and LIME, exposing surrogate fit and attribution metadata.
3. Refine consistency and stability claims, report fairness sensitivity/decision flips/group metrics separately, and define missing-score behavior. Revisit composite weights and thresholds after these measurements have evidence.
4. Implement genuine controlled explanation-degradation experiments and cohort-level evaluations. Keep independently generated stress cohorts separate from the ordinary holdout.
5. Repair input validation, artifact delivery/product routing, and transaction/audit status. Update existing tests to the chosen current contract and add targeted checks for the reproduced failures.
6. Address runtime configuration, versioned reproducibility metadata, access controls, pagination, and batch execution according to the final project's intended deployment scope.

The strongest near-term improvement is a scientifically clear explanation-evaluation pipeline with honest limits and internally consistent results. It does not require adding more dashboard features first.

**8. Evidence and review boundaries**

`scratch/repository_audit/probe_results.json` records model checks, neighborhoods, seed effects, and metric counterexamples. `additional_results.json` records real conflicting-decision cases, invalid API requests, the missing-product fallback, and a simulated uniqueness failure against the isolated database. `frontend_probe_results.json` records execution of the actual formatter and advisory helpers. Diagnostic PDFs demonstrate contradictory report content; their visual layout was not assessed.

The helpers reproduce existing behavior; they do not implement replacement application metrics. Synthetic generator equality was checked numerically after an initial strict DataFrame equality check identified harmless CSV float/dtype differences. Neighborhood fit figures describe diagnostic runs, not population estimates. The uniqueness failure was deliberately injected to exercise an actual persistence failure path; no claim is made that a collision occurred naturally during this review.

This is an end-to-end source review plus targeted local execution, not a proof that no further defects exist. No remote database changes, credential inspection, live browser testing, regulatory certification, or real applicant outcome evaluation were performed. Existing user edits remain intact.
