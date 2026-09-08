# Deterministic XAI Evaluation and Auditability in TrustFin AI

---

## 1. Executive Summary & Problem Statement

In regulated financial services (underwriting, risk appraisal, and credit decisioning), **auditability, reproducibility, and legal defensibility** are paramount. 

During initial testing of the TrustFin AI prototype, submitting the **exact same applicant profile multiple times** resulted in slight variations in the **Composite Trust Score** (for example, fluctuating between 82% and 88%). 

While the core machine learning prediction (Probability of Default via XGBoost) and SHAP tree attribution were strictly deterministic, the Trust Score displayed variability due to the stochastic nature of auxiliary explainability algorithms and perturbation-based validation metrics.

This document outlines the **root cause analysis**, the **pros and cons of stochastic vs. deterministic evaluation**, the **architectural solution implemented**, and a **viva/review guide** for explaining these design decisions to academic reviewers and industry auditors.

---

## 2. Root Cause Analysis: Why Did the Trust Score Fluctuate?

The Composite Trust Score aggregates four foundational pillars:
$$\text{Composite Trust Score} = \frac{\text{Faithfulness} + \text{Stability} + \text{Consistency} + \text{Fairness}}{4}$$

An audit of the codebase revealed two specific sources of randomness:

### Source 1: LIME Monte Carlo Neighborhood Sampling
* **File**: [`backend/app/explainability/lime_explainer.py`](file:///d:/Coding/final-yr-project/trustfin-ai-proto/backend/app/explainability/lime_explainer.py)
* **Mechanism**: LIME (`LimeTabularExplainer`) approximates the black-box model locally by sampling thousands of synthetic instances around the applicant’s transformed feature vector using Gaussian perturbations.
* **Flaw**: While an initial `random_state=42` was passed to the constructor, the internal NumPy RandomState object is stateful. Each time `explain_instance()` was called, the pseudo-random generator advanced to the next sequence. Consequently, subsequent clicks on "Evaluate Application" sampled different synthetic points, producing minor shifts in LIME feature weights and altering the Top-3 feature ranking.

### Source 2: Stability Metric's Unseeded Gaussian Perturbation
* **File**: [`backend/app/api/routes/prediction.py`](file:///d:/Coding/final-yr-project/trustfin-ai-proto/backend/app/api/routes/prediction.py)
* **Mechanism**: Stability measures whether an explanation is robust against infinitesimal input noise ($X' = X + \mathcal{N}(0, 0.01)$), comparing original SHAP attributions with perturbed attributions via Spearman Rank Correlation.
* **Flaw**: The noise was generated using `np.random.normal(0, 0.01, size=transformed_instance.shape)` without a fixed or isolated seed. Each evaluation produced a different random noise vector, leading to a varying Spearman correlation coefficient (e.g., 0.91 vs. 0.97).

### Compounding Effect on Consistency & Composite Score
* When LIME's Top-3 features shifted due to RNG progression, the **Consistency Pillar** (Jaccard similarity between SHAP Top-3 and LIME Top-3) fluctuated (e.g., from 67% to 100%).
* Because Stability and Consistency both moved, the overall Composite Trust Score varied by several percentage points on identical inputs.

---

## 3. Comparative Analysis: Stochastic vs. Deterministic Approaches

| Evaluation Criterion | Stochastic / Dynamic Sampling | Deterministic Input-Hashed Seeding (TrustFin AI) |
| :--- | :--- | :--- |
| **Audit Reproducibility** | ❌ **Fails Audits**: Regulators or compliance officers cannot reproduce the exact same score. | ✅ **Audit Compliant**: An application audited a day or year later reproduces identical scores down to 16 decimal places. |
| **Credit Officer Trust** | ❌ **Confusing**: A loan officer clicking "Evaluate" twice sees changing metrics, breeding distrust in the system. | ✅ **Predictable & Stable**: The score reflects the actual applicant data, not random seed drift. |
| **Vulnerability to Gamification** | ❌ **Vulnerable**: An applicant or rogue officer could repeatedly re-submit to catch a higher score by chance. | ✅ **Tamper-Resistant**: The score is mathematically locked to the applicant's input parameters. |
| **Statistical Rigor** | ✅ Measures variance across multiple random Monte Carlo runs. | ✅ Preserves the mathematical validity of LIME and local perturbation without inter-session volatility. |
| **Computational Efficiency** | ❌ Requires running dozens of Monte Carlo passes and averaging them to achieve stability. | ✅ Single pass with zero additional latency; instantaneous response time. |

### Banking & Fintech Regulatory Context
Under **Basel Committee on Banking Supervision (BCBS 239)**, **US Federal Reserve SR 11-7 (Guidance on Model Risk Management)**, and **RBI's Digital Lending Guidelines**:
1. All automated model outputs and explanations must be **verifiable and reproducible**.
2. If two officers evaluate the same file, the system must not generate discrepant compliance artifacts.
3. Therefore, a **deterministic, reproducible scoring architecture is mandatory for production-grade banking systems**.

---

## 4. Implementation Architecture: Cryptographic Profile Seeding

To achieve complete determinism without losing applicant-specific variance, TrustFin AI implements **Cryptographically Derived Seed Generation** with **Local RNG Isolation**.

### 1. Deterministic Seed Generation
Instead of a single global constant seed (which would treat every applicant identically), the system derives a unique 32-bit unsigned integer seed from the SHA-256 hash of the applicant's canonical input parameters:

```python
import hashlib
import json

def generate_applicant_seed(input_data: dict) -> int:
    """
    Derives a deterministic, cryptographically stable 32-bit integer seed
    from the applicant input features.
    Ensures identical inputs always produce identical random sequences for LIME
    sampling and stability perturbations, preventing artificial score drift on re-evaluations.
    """
    serialized = json.dumps(input_data, sort_keys=True, default=str)
    hash_hex = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
    return int(hash_hex[:8], 16) % (2**31 - 1)
```

### 2. Local State Injection for LIME
In [`backend/app/explainability/lime_explainer.py`](file:///d:/Coding/final-yr-project/trustfin-ai-proto/backend/app/explainability/lime_explainer.py):
The `explain_instance()` method now accepts an optional `seed` parameter. Before generating neighborhood samples, the explainer's random state is reset to that exact seed using `check_random_state(seed)`:

```python
if seed is not None:
    from sklearn.utils import check_random_state
    self.explainer.random_state = check_random_state(seed)

exp = self.explainer.explain_instance(
    transformed_instance,
    predict_proba_fn,
    num_features=num_features
)
```

### 3. Isolated Local RNG for Stability Perturbation
In [`backend/app/api/routes/prediction.py`](file:///d:/Coding/final-yr-project/trustfin-ai-proto/backend/app/api/routes/prediction.py):
Instead of mutating the global `np.random` state (which could cause thread-safety side effects), a dedicated, isolated `np.random.RandomState` is instantiated per prediction request:

```python
# Deterministic stability perturbation via local seeded RNG
stability_rng = np.random.RandomState(applicant_seed)
noise = stability_rng.normal(0, 0.01, size=transformed_instance.shape)
perturbed_instance = transformed_instance + noise
shap_exp_perturbed = shap_explainer.explain_instance(perturbed_instance, original_values=orig_values)
stability_score = calculate_stability(shap_exp, shap_exp_perturbed)
```

---

## 5. Verification & Test Evidence

An end-to-end automated verification test was conducted across multiple consecutive evaluations:

```text
=== CALL 1 (Applicant 1: Aarav Patel) ===
=== CALL 2 (Applicant 1 repeated - identical inputs) ===
=== CALL 3 (Applicant 1 repeated - identical inputs) ===
=== CALL 4 (Applicant 2: Different High-Risk Profile) ===

Applicant 1 - Run 1 Trust Score: 0.8622776892746248 | Faithfulness: 0.9934 | Stability: 0.9573 | Consistency: 0.5000 | Fairness: 0.9983
Applicant 1 - Run 2 Trust Score: 0.8622776892746248 | Faithfulness: 0.9934 | Stability: 0.9573 | Consistency: 0.5000 | Fairness: 0.9983
Applicant 1 - Run 3 Trust Score: 0.8622776892746248 | Faithfulness: 0.9934 | Stability: 0.9573 | Consistency: 0.5000 | Fairness: 0.9983

Applicant 2 - Run 1 Trust Score: 0.8064648826315640 | Faithfulness: 0.8288 | Stability: 0.8970 | Consistency: 0.5000 | Fairness: 1.0000

Result:
✓ Repeated evaluations on identical inputs are 100.00% deterministic down to 16 decimals.
✓ Different applicants produce distinct, customized trust scores reflecting their financial profile.
```

---

## 6. Project Review & Viva Defense Guide

When demonstrating TrustFin AI to professors or project evaluators, use the following Q&A guide:

### Q1: "Why did you make the Trust Score deterministic instead of letting LIME run randomly?"
> **Answer**: "In regulated banking, non-deterministic outputs violate Model Risk Management standards (such as US Fed SR 11-7 and RBI Fair Lending guidelines). If a loan officer evaluates an applicant, saves a decision, and reopens it later for an audit, differing trust scores would create legal and regulatory liability. By deriving the RNG seed from a cryptographic hash of the applicant’s input features, we ensure 100% audit reproducibility while preserving local perturbation dynamics."

### Q2: "Does setting a seed invalidate the mathematical purpose of LIME or Stability?"
> **Answer**: "No. LIME still generates thousands of synthetic samples in the local hyper-neighborhood to train its linear surrogate model; stability still introduces genuine Gaussian noise across all feature dimensions. The only difference is that the random walk trajectory is deterministic for that specific applicant, eliminating artificial score drift between UI clicks."

### Q3: "What happens if the applicant changes their income or loan amount?"
> **Answer**: "Because the seed is derived via SHA-256 over the entire applicant input dictionary, modifying any feature (such as income, loan term, or credit history) immediately generates a brand new seed. This ensures that the perturbations and explanations adapt dynamically to each unique applicant profile."
