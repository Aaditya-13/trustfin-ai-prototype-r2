import shap
import numpy as np
from typing import List
from backend.app.explainability.schemas import StandardExplanation, FeatureContribution, ExplanationReconstruction

class SHAPExplainer:
    def __init__(self, model, feature_names: List[str]):
        """
        Initializes the SHAP TreeExplainer.
        Args:
            model: The trained XGBoost model.
            feature_names: List of feature names matching the model's input.
        """
        self.model = model
        self.feature_names = feature_names
        # TreeExplainer is highly optimized for XGBoost
        self.explainer = shap.TreeExplainer(model)
        
    def explain_instance(self, transformed_instance: np.ndarray, original_values: dict = None) -> StandardExplanation:
        """Generate a single standardized explanation using the shared batch path."""
        instances = np.atleast_2d(np.asarray(transformed_instance, dtype=float))
        if instances.ndim != 2 or len(instances) != 1:
            raise ValueError('explain_instance requires exactly one applicant')
        return self.explain_batch(instances, [original_values])[0]

    def explain_batch(self, transformed_instances: np.ndarray, original_values: list[dict] = None) -> list[StandardExplanation]:
        """Reuse one TreeExplainer call for multiple financial neighbours.

        Uses the same raw-margin output and implicit tree-path background as
        explain_instance. Batching changes execution only, not attribution units.
        """
        instances = np.asarray(transformed_instances, dtype=float)
        if instances.ndim != 2 or instances.shape[1] != len(self.feature_names):
            raise ValueError('SHAP batch must match the model feature width')
        if not np.isfinite(instances).all():
            raise ValueError('SHAP inputs must be finite')
        if original_values is not None and len(original_values) != len(instances):
            raise ValueError('Original values must match the SHAP batch length')
        if len(instances) == 0:
            return []
        shap_values = self.explainer.shap_values(instances)
        if isinstance(shap_values, list):
            shap_values = shap_values[1] if len(shap_values) > 1 else shap_values[0]
        contributions = np.asarray(shap_values, dtype=float)
        if contributions.ndim == 3:
            contributions = contributions[:, :, 1 if contributions.shape[2] > 1 else 0]
        if contributions.shape != instances.shape or not np.isfinite(contributions).all():
            raise ValueError('SHAP returned invalid attribution dimensions or values')
        output = []
        for row_i, (instance, values) in enumerate(zip(instances, contributions)):
            raw = original_values[row_i] if original_values else None
            features = []
            for i, feature in enumerate(self.feature_names):
                contribution = float(values[i])
                direction = 'positive' if contribution > .0001 else ('negative' if contribution < -.0001 else 'neutral')
                value = float(raw[feature]) if raw and feature in raw else float(instance[i])
                features.append(FeatureContribution(feature=feature, value=value, contribution=contribution, direction=direction))
            base = float(np.asarray(self.explainer.expected_value).item())
            output.append(StandardExplanation(
                method='SHAP', features=features,
                reconstruction=ExplanationReconstruction(
                    baseValue=base, outputSpace='log_odds',
                    featureMultipliers={name: 1.0 for name in self.feature_names},
                    fullPrediction=float(base + values.sum()),
                ),
            ))
        return output
