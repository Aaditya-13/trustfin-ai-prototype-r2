import numpy as np
from backend.app.explainability.schemas import StandardExplanation


def calculate_consistency(
    shap_exp: StandardExplanation,
    lime_exp: StandardExplanation,
    top_k: int = 5,
) -> float:
    """
    Compare SHAP and LIME explanations for the same application.

    The score combines:
      - 60% Jaccard overlap of the top-k features by absolute contribution.
      - 40% agreement in contribution direction among shared top-k features.

    Raw SHAP and LIME contribution magnitudes are deliberately not compared:
    the methods can use different output scales. A positive contribution
    should mean support for the explained class in both explanation wrappers.
    Confirm that convention in the explainability adapters.
    """
    if top_k < 1:
        raise ValueError("top_k must be a positive integer.")

    shap_items = [
        item for item in shap_exp.features
        if np.isfinite(float(item.contribution))
    ]
    lime_items = [
        item for item in lime_exp.features
        if np.isfinite(float(item.contribution))
    ]

    shap_ranked = sorted(shap_items, key=lambda x: abs(float(x.contribution)), reverse=True)
    lime_ranked = sorted(lime_items, key=lambda x: abs(float(x.contribution)), reverse=True)

    shap_top = shap_ranked[:top_k]
    lime_top = lime_ranked[:top_k]

    shap_names = {item.feature for item in shap_top}
    lime_names = {item.feature for item in lime_top}
    union = shap_names | lime_names
    if not union:
        return 0.0

    jaccard = len(shap_names & lime_names) / len(union)

    shap_map = {item.feature: float(item.contribution) for item in shap_top}
    lime_map = {item.feature: float(item.contribution) for item in lime_top}
    shared = shap_names & lime_names

    if shared:
        direction_agreement = float(np.mean([
            np.sign(shap_map[name]) == np.sign(lime_map[name])
            for name in shared
            if not np.isclose(shap_map[name], 0.0)
            and not np.isclose(lime_map[name], 0.0)
        ])) if any(
            not np.isclose(shap_map[name], 0.0)
            and not np.isclose(lime_map[name], 0.0)
            for name in shared
        ) else 0.0
    else:
        direction_agreement = 0.0

    return float(np.clip(0.60 * jaccard + 0.40 * direction_agreement, 0.0, 1.0))
