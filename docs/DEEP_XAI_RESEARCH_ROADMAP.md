# Deep Explainable AI (XAI) Research Roadmap & Scope Demarcation

## 1. Scope Demarcation: TrustFin vs. AegisAI

To preserve research integrity and prevent overlap with other final-year projects (specifically AegisAI), TrustFin is strictly positioned as a **Scientific Machine Learning & Explanation Validation (Meta-XAI)** system, deliberately avoiding enterprise software governance.

### The Clear Boundary

| Dimension | AegisAI (The Other Group) | TrustFin (Our Project) |
| :--- | :--- | :--- |
| **Core Question** | *"Should this AI decision be allowed under bank policy?"* | ***"Can we mathematically trust the explanation behind this AI decision?"*** |
| **Primary System Role** | External governance middleware & policy routing between existing LOS and black-box models. | Full end-to-end calibrated ML pipeline with **Meta-XAI validation**. |
| **Role of XAI** | Input to check bank policies & prompt LLMs. | **Central scientific research problem**: validating whether explanations are faithful, stable, consistent, and fair. |
| **Model Scope** | Assumes third-party model (no training). | Calibrated XGBoost credit model trained on retail loan data (99.17% accuracy). |
| **Domain Jargon** | Governance, Policy Engine, Multi-Tenancy, RBAC, Risk Routing. | **Explanation Reliability, Dual-Explainer Consensus, Algorithmic Recourse, Empirical Validation**. |

---

## 2. The Four Deep XAI Research Frontiers

These four frontiers deepen TrustFin's explainability without touching enterprise governance, policy engines, or multi-tenancy.

---

### Frontier 1: Algorithmic Counterfactual Recourse (Wachter's Formulation)

#### Theoretical Foundation
Traditional loan dashboards only provide manual sliders where rejected applicants guess numbers. Grounded in Wachter et al. (2017) (*"Counterfactual Explanations without Opening the Black Box"*), TrustFin formulates recourse as an optimization problem:

$$\mathbf{x}^* = \arg\min_{\mathbf{x}' \in \mathcal{X}} d(\mathbf{x}, \mathbf{x}') + \lambda \cdot \mathcal{L}(f(\mathbf{x}'), y^*)$$

Where:
* $\mathbf{x}$ is the applicant's original profile (rejected: $f(\mathbf{x}) = 0$).
* $\mathbf{x}^*$ is the counterfactual profile (approved: $f(\mathbf{x}^*) = 1$).
* $d(\mathbf{x}, \mathbf{x}')$ is the weighted $L_1$ distance representing user effort across mutable features.
* Actionable constraints ensure immutable features (e.g., Credit History cannot magically jump overnight, Gender/Age cannot change).

#### Proposed Implementation & Output
Instead of trial-and-error, the system automatically solves for the 3 easiest recourse paths:
1. **Path A (Lowest Effort, $L_1 = 0.12$):** Extend Loan Term by 36 months (reduces monthly EMI into safe solvency threshold).
2. **Path B (Moderate Effort, $L_1 = 0.19$):** Add a co-applicant with verified monthly income $\ge ₹14,500$.
3. **Path C (Financial Adjustment, $L_1 = 0.28$):** Reduce requested principal amount by $₹85,000$.

---

### Frontier 2: Contrastive Explanations ("Why P Rather Than Q?")

#### Theoretical Foundation
Grounded in cognitive science (Miller, 2019: *"Explanation in AI: Insights from the Social Sciences"*), humans don't naturally understand isolated numerical attribution scores; humans reason through **contrastive examples** against real benchmarks.

#### Proposed Implementation & Output
A **"Compare with Nearest Approved Applicant"** module:
1. The algorithm queries the historical credit dataset using normalized distance in feature space:
   $$D(\mathbf{x}, \mathbf{x}_i) = \sqrt{\sum_{j} w_j \left(\frac{x_j - x_{i,j}}{\sigma_j}\right)^2}$$
2. Identifies the closest profile $\mathbf{x}_{\text{nearest}}$ that received an **Approved** decision.
3. Renders a side-by-side delta table in the UI:
   * **Your Profile:** Income ₹35,000 | Loan ₹15,00,000 | Term: 180 mo | Credit: 0 $\implies$ **Rejected**
   * **Nearest Approved Benchmark:** Income ₹36,500 | Loan ₹13,500,00 | Term: 240 mo | Credit: 1 $\implies$ **Approved**
   * **The Exact Gap:** Identifies the precise combination of financial parameters that crossed the acceptance threshold.

---

### Frontier 3: Explainer Diagnostics (Explaining the Explainers)

#### Theoretical Foundation
Current systems treat SHAP and LIME as opaque tools. TrustFin provides a diagnostic explaining *why* they agree or disagree:
* **TreeSHAP:** Calculates exact Shapley values using cooperative game theory through the actual tree splits of the ensemble. It captures exact feature interactions and global structure.
* **LIME:** Generates random synthetic perturbations in an isotropic Gaussian ball around the applicant and fits a sparse linear surrogate model ($g(z) = w \cdot z$) weighted by an exponential distance kernel $\pi_x(z) = \exp(-D(x,z)^2 / \sigma^2)$.

#### Proposed Diagnostic Metrics
When SHAP and LIME diverge, TrustFin detects the mathematical cause:
1. **Local Non-Linearity Detection:** If the decision boundary near $\mathbf{x}$ has high curvature (rugged tree splits), LIME's linear assumption degrades while TreeSHAP stays exact.
2. **Concordance Ratio:**
   $$\text{Concordance} = \frac{\sum_{i=1}^K \mathbb{I}(\text{sign}(\phi_{\text{SHAP}, i}) == \text{sign}(\phi_{\text{LIME}, i}))}{K}$$
3. **Automated Diagnostic Note:** Explains to the loan officer whether the divergence is due to surrogate kernel width or tree leaf discontinuities.

---

### Frontier 4: Tree Ensemble Variance & Epistemic Uncertainty

#### Theoretical Foundation
Instead of reporting a flat confidence score (e.g., "91%"), TrustFin decomposes the ensemble's internal behavior:
* An XGBoost model consists of $M$ decision trees ($M = 100$).
* Let $T_m(\mathbf{x})$ be the leaf output of tree $m$.
* The final raw logit is $\hat{y} = \sum_{m=1}^M T_m(\mathbf{x})$, transformed by the logistic sigmoid $\sigma(\hat{y})$.

#### Proposed Implementation & Output
1. **Tree Voting Consensus:**
   * Approved votes vs. Rejected votes across the 100 individual trees.
2. **Epistemic Uncertainty:**
   $$\sigma_{\text{trees}}^2 = \frac{1}{M} \sum_{m=1}^M \left( T_m(\mathbf{x}) - \bar{T}(\mathbf{x}) \right)^2$$
3. High variance indicates the applicant lies in a sparse region of the feature space (data sparsity), alerting the officer that model confidence is brittle even if the mean prediction is positive.

---

## 3. Examiner / Viva Defense Cheat Sheet

When examiners ask:
1. **"How does your project differ from the other group working on loan XAI?"**
   > *"The other group built an external software middleware to enforce administrative business rules and policy checks on third-party models. TrustFin addresses a deeper Machine Learning research question: **We do not trust XAI blindly.** We built an end-to-end credit model and mathematically validate whether the generated SHAP and LIME explanations are Faithful, Stable, Consistent, and Fair. We also provide algorithmic counterfactual recourse and explainer diagnostic tests."*

2. **"Why do you use both SHAP and LIME?"**
   > *"SHAP provides axiomatic theoretical guarantees via game theory, while LIME provides localized linear interpretability. Because each relies on fundamentally different mathematical assumptions, neither is infallible alone. Measuring their concordance allows us to audit explanation reliability and catch algorithmic artifacts before making credit decisions."*

3. **"What is the mathematical justification of your Trust Score?"**
   > *"The Trust Score is a composite index composed of 4 equally weighted empirical pillars (25% each):*
   > *1. **Faithfulness:** Quantifies prediction drop ($\Delta P$) when top-ranked features are ablated.*
   > *2. **Stability:** Spearman rank correlation ($r_s$) under localized Gaussian input perturbation.*
   > *3. **Consistency:** Jaccard similarity index measuring feature overlap between SHAP and LIME.*
   > *4. **Fairness:** Counterfactual demographic parity ensuring zero outcome deviation across protected attributes."*
