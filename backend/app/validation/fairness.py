import numpy as np
import pandas as pd
from backend.app.ml.preprocessing import add_financial_features


def calculate_equal_opportunity_ratio(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    sensitive_features: np.ndarray,
) -> float:
    """
    Calculate the Equal Opportunity ratio:
        minimum group true-positive rate / maximum group true-positive rate.

    y_true == 1 represents the genuinely eligible/positive class.
    y_pred == 1 represents a positive model decision.

    Returns a value in [0, 1]. A value closer to 1 indicates more similar
    true-positive rates across the observed groups. Returns 0 when the
    comparison cannot be calculated; it does not silently award perfect
    fairness when data or groups are missing.
    """
    try:
        y_true = np.asarray(y_true).reshape(-1)
        y_pred = np.asarray(y_pred).reshape(-1)
        sensitive_features = np.asarray(sensitive_features).reshape(-1)

        if not (len(y_true) == len(y_pred) == len(sensitive_features)):
            raise ValueError("y_true, y_pred and sensitive_features must have equal lengths.")
        if len(y_true) == 0:
            return 0.0

        df = pd.DataFrame({
            "y_true": y_true,
            "y_pred": y_pred,
            "group": sensitive_features,
        }).dropna(subset=["group"])

        eligible = df[df["y_true"] == 1]
        if eligible.empty or eligible["group"].nunique() < 2:
            return 0.0

        tpr_by_group = eligible.groupby("group")["y_pred"].apply(
            lambda values: np.mean(values == 1)
        )

        max_tpr = float(tpr_by_group.max())
        min_tpr = float(tpr_by_group.min())

        # If every group has zero TPR, the ratio is undefined, not evidence
        # of equal opportunity.
        if max_tpr <= 0.0:
            return 0.0

        return float(np.clip(min_tpr / max_tpr, 0.0, 1.0))

    except (TypeError, ValueError, KeyError):
        return 0.0


def calculate_counterfactual_fairness(
    model,
    preprocessor,
    raw_input_dict: dict,
    raw_features: list,
    sensitive_col: str = "Gender",
    feature_fn=None,
) -> float:
    """
    Measure individual sensitivity to changing one protected attribute while
    holding all other supplied applicant fields constant.

    Score = 1 - absolute change in approval probability.

    This is a counterfactual sensitivity diagnostic, not a complete fairness
    audit. It assumes the protected-attribute flip is meaningful and that
    other fields should remain fixed. For intersectional or causal fairness,
    a separate analysis is required.

    Returns 0.0 if the check cannot be performed. A failed check must never
    be reported as a perfect score.
    """
    try:
        if sensitive_col not in raw_input_dict:
            return 0.0

        current_value = str(raw_input_dict[sensitive_col]).strip().lower()
        binary_pairs = {
            "male": "Female",
            "female": "Male",
        }
        if current_value not in binary_pairs:
            # Avoid silently mapping an unknown category to Male.
            return 0.0

        fn = feature_fn if feature_fn is not None else add_financial_features

        original_df = fn(pd.DataFrame([raw_input_dict.copy()]))
        flipped_input = raw_input_dict.copy()
        flipped_input[sensitive_col] = binary_pairs[current_value]
        flipped_df = fn(pd.DataFrame([flipped_input]))

        # Validate after feature engineering. Product preprocessors also require
        # derived columns such as Monthly_EMI, FOIR and LTV_Ratio.
        if raw_features:
            missing_original = set(raw_features) - set(original_df.columns)
            missing_flipped = set(raw_features) - set(flipped_df.columns)
            if missing_original or missing_flipped:
                return 0.0

        original_transformed = preprocessor.transform(original_df)
        flipped_transformed = preprocessor.transform(flipped_df)

        original_probability = float(model.predict_proba(original_transformed)[0][1])
        flipped_probability = float(model.predict_proba(flipped_transformed)[0][1])

        if not (np.isfinite(original_probability) and np.isfinite(flipped_probability)):
            return 0.0

        probability_change = abs(original_probability - flipped_probability)
        return float(np.clip(1.0 - probability_change, 0.0, 1.0))

    except Exception:
        # Fail closed: an error is an unavailable/failed fairness check,
        # never evidence of perfect fairness.
        return 0.0
