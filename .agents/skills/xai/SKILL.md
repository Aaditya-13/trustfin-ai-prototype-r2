---
name: Explainable AI (XAI)
description: Guidelines for implementing SHAP and LIME explanations.
---

# Explainable AI (XAI) Skill

When working on SHAP, LIME, explanation schemas, local/global explanations, and visualization data:

1. **SHAP**: Implement SHAP for local explanations and global feature importance. Document the explainer type and background data.
2. **LIME**: Implement LIME for local explanations. Document perturbation counts and sampling config.
3. **Standardization**: Both SHAP and LIME MUST output to a `StandardExplanation` internal representation (feature, value, contribution, direction).
4. **Semantics**: Do not describe feature contribution as causal influence. Use phrasing like "contributed to".
5. **Visualization Data**: Provide structured data to the frontend, not pre-formatted strings, allowing the frontend to control the visual presentation.
