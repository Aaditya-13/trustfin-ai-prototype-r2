import shap
import numpy as np
from typing import List
from backend.app.explainability.schemas import StandardExplanation, FeatureContribution

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
        """
        Generates a standardized SHAP explanation for a single instance.
        Args:
            transformed_instance: 1D or 2D numpy array containing the preprocessed features for one applicant.
            original_values: Optional dict mapping feature_names to their original (unscaled) values for display.
        """
        # Ensure 2D array for SHAP
        if transformed_instance.ndim == 1:
            transformed_instance = transformed_instance.reshape(1, -1)
            
        # Get SHAP values
        shap_values = self.explainer.shap_values(transformed_instance)
        
        # For XGBoost binary classification, shap_values is typically an array of shape (n_samples, n_features) 
        # representing log-odds.
        if isinstance(shap_values, list):
            contributions = shap_values[1][0]
        else:
            contributions = shap_values[0]
            
        features_list = []
        for i, feature in enumerate(self.feature_names):
            contrib = float(contributions[i])
            # Determine direction
            if contrib > 0.0001:
                direction = "positive"
            elif contrib < -0.0001:
                direction = "negative"
            else:
                direction = "neutral"
                
            val = float(transformed_instance[0][i])
            if original_values and feature in original_values:
                val = float(original_values[feature])
                
            features_list.append(FeatureContribution(
                feature=feature,
                value=val,
                contribution=contrib,
                direction=direction
            ))
            
        return StandardExplanation(
            method="SHAP",
            features=features_list
        )
