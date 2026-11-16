# Proposed TrustFin evaluation protocol v1 — approval pending

**17 November update:** this is a pending discussion draft, not an approved implementation. The owner has since chosen to include Gender in prediction, so its earlier assumption of Gender-blind serving models is superseded. The score rewrite remains pending review, including the distinction between decision fairness and fairness of explanation quality. See [the retained discussion](docs/FAIRNESS_FINDINGS_AND_FUTURE_XAI_DIRECTION.md). No formula below was implemented as part of that input-feature choice.

The four pillars remain. This document makes the remaining choices concrete before code changes. The owner's approval of the overall remediation plan is recorded in the conversation; the group definitions and aggregate scale below are more specific choices for confirmation under `.agents/skills/validation/SKILL.md`.

## Shared conditions

- Explain the approval output. SHAP retains log-odds units, LIME uses conditions in a local probability surrogate. Compare signs/ranks rather than their numerical magnitudes.
- Use training-only reference applicants, deterministic seeds derived from canonical predictive inputs, and explicit configs persisted with each evaluation. Gender, IDs, timestamps and legacy fields ignored by the predictor do not seed random samples.
- Every altered applicant must have valid categorical values, positive principal/income/property value, nonnegative debt, sensible age/experience and permitted tenure. Recompute EMI, FOIR and LTV from raw inputs. A policy breach (e.g. FOIR >50%) is still a legitimate hypothetical application, not a malformed row.
- Failure produces an unavailable metric and an assessment-review flag, not a fabricated score. Store raw measurements with any index component.

## Faithfulness: group deletion comprehensiveness

Property: how much probability support for the original predicted class is lost when selected explanatory information is replaced under a declared reference protocol.

The model has dependent raw/derived inputs. Use six non-overlapping explanatory groups: bureau (CIBIL and missed payments); financing (income, co-income, debt, principal, tenure, property value and their derived EMI/FOIR/LTV coordinates); employment/life stage (employment category, age, experience); household (marital status and dependents); education; location for home loans or purpose for personal loans. Sum SHAP contributions within each group to rank supporting groups. For LIME, group its coefficients for the same test, retaining the distinction between coefficient and attribution semantics.

For original class c, fix c throughout the experiment. Write p_c(x) = p_approval(x) when c=Approved, otherwise 1-p_approval(x). For k=1,2,3 (up to the number of available supporting groups), replace those groups from 20 training-reference applicants, rejecting invalid combinations and recomputing all derived features. The reference group replaces its entire raw bundle; other groups stay fixed.

`D(k,b) = p_c(x) - p_c(replace(x, selected_groups(k), reference_b))`

Store D values, their mean, standard deviation and the number of valid references per k. The faithfulness diagnostic is the signed mean across tested k/reference pairs. Positive means removal reduced class support; negative contradicts the expected direction. For the bounded composite only, use `max(0, mean(D))`; a negative raw effect remains visible and is flagged. No high-score band or division by an asserted neutral population probability is used.

Interpretation: probability-point support removed under this protocol, not the probability that an explanation is true. The bounded component is conservative and can be low even for a valid explanation. The broad financing group is necessary to avoid treating formula descendants as independently mutable facts. Limitations include grouping sensitivity, cancellation when aggregating signed contributions, reference dependence and interactions. References are empirical replacements, not causal interventions or a universal neutral applicant. No adequate supporting groups/references means unavailable.

Primary basis: [DeYoung et al., ERASER (ACL 2020), comprehensiveness and perturbation curves](https://aclanthology.org/2020.acl-main.408.pdf). The tabular groups, donor replacement and aggregation are TrustFin adaptations, not claimed to be the original paper's exact implementation. Alternatives: probability deletion curves over model coordinates (simpler but can be off-manifold), and [Yeh et al. infidelity](https://arxiv.org/abs/1901.09392) (also tests magnitude, but needs compatible units and perturbation semantics). Experiments must compare the selected ranking to random/group-shuffled rankings and retain all measured results.

## Consistency: signed top-five agreement

Property: cross-method agreement on important feature coordinates and contribution direction.

For SHAP/LIME lists A and B, each containing the five largest meaningful absolute contributions, use:

`C = count(features shared by A and B with matching nonzero signs) / k`

Here k=min(5, number of usable coordinates common to the representation), with zero/tied selections handled deterministically and the config persisted. Non-selected and effectively-zero features do not earn agreement. No meaningful explanation means unavailable. Compare at the same transformed feature representation, with correct categorical conditions disclosed. LIME must be built from valid raw applicant neighborhoods; fit score and applicant-point approximation error remain separate diagnostics.

Interpretation: overlapping signed selected reasons, not proof of truth. Opposite signs receive no credit. Rank order within the selected set and attribution magnitude are not measured; rank agreement can be reported separately. Alternatives: unsigned Jaccard (fails to detect opposite directions), and signed rank agreement (stricter and sensitive to ties).

Primary basis: [Krishna et al., The Disagreement Problem, sign agreement definition](https://arxiv.org/html/2202.01602v6).

## Stability: repeated local signed agreement

Property: similarity of explanations for nearby valid inputs, conditional on the predicted class remaining unchanged.

Generate 20 raw neighbors with independently sampled bounded changes up to 2% in declared mutable financial quantities (income, existing EMI, principal and property valuation where applicable). Keep categories, Gender, age, experience and tenure fixed; recompute derived features. Zero debt stays nonnegative. Log the actual changes.

`S = mean(C_k(explanation(x), explanation(neighbor)))`

Compute S on same-decision neighbors with k=5 and the consistency sign-overlap rule. Separately report total neighbors, same-decision count and prediction-flip fraction. Zero same-decision neighbors gives unavailable, not a stable score. Evaluate both SHAP and LIME separately; use the lower available method score for the composite so a stable SHAP explanation cannot conceal unstable LIME. For cohort experiments, also explain the identical input at five different LIME seeds to measure sampling variability separately.

Interpretation: local top-reason retention under this neighborhood, not complete robustness. It does not detect every magnitude change; boundary cases can legitimately be sensitive. Alternatives: rank correlation (can ignore magnitude/direction issues), normalized attribution distance, and local Lipschitz estimates (require extra scaling/optimization assumptions).

Primary basis for local robustness: [Alvarez-Melis and Jaakkola, On the Robustness of Interpretability Methods](https://arxiv.org/abs/1806.08049). The sample size, perturbation radius and signed-agreement summary are explicit project adaptations.

## Fairness: individual invariance plus cohort context

Preserve the existing individual measurement `F_ind = 1 - abs(p_approval(x_male) - p_approval(x_female))`, but always expose the raw probability gap and whether the class changed. A decision flip is a review flag regardless of a high F_ind. Missing computation is unavailable. The Gender-blind main products should pass by design; label this as direct Gender invariance, not complete fairness.

Group cohort context separately reports sample sizes, approval rates, true/false positive rates and their gaps, using the unbiased synthetic labels. These are descriptive diagnostics with uncertainty; no automatic legal threshold is asserted. Biased-control experiments are optional research demonstrations, clearly distinguished from the serving products. No new live loan model is introduced solely to make this pillar vary.

Alternatives: group demographic-parity or equal-opportunity scalars in the composite (model/cohort-level values, not applicant-level), and causal counterfactual fairness (requires a causal model absent here). Sources: [Hardt et al. equal opportunity](https://arxiv.org/abs/1610.02413), [Fairlearn metric assumptions](https://fairlearn.org/main/user_guide/assessment/common_fairness_metrics.html).

## Composite and assessment boundaries

Retain the existing 0.35 faithfulness / 0.30 consistency / 0.25 stability / 0.10 individual-invariance weights as disclosed design choices for the initial revision. `T = 0.35*max(0,D_mean) + 0.30*C + 0.25*S + 0.10*F_ind`. Display T as an experimental index, never repayment probability, calibrated explanation correctness or permission to sanction.

Any unavailable component makes T unavailable (no implicit perfect replacement or reweighting). Preserve raw negative faithfulness, model disagreement, policy breaches and Gender decision flips as explicit flags. Approval is constrained independently by the configured underwriting policy. Index bands, if displayed, are heuristic labels and must not be described as empirically validated thresholds. Expect scores to change substantially; do not alter definitions to recover previous high values. Sensitivity comparisons of weights belong in the final experiments.
