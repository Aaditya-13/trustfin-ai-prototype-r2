import lime
import lime.lime_tabular
import numpy as np
from typing import List
from backend.app.explainability.schemas import StandardExplanation, FeatureContribution

class LIMEExplainer:
    def __init__(self, training_data: np.ndarray, feature_names: List[str], class_names: List[str] = None):
        """
        Initializes the LIME TabularExplainer.
        Args:
            training_data: 2D numpy array of the PREPROCESSED training data to fit LIME's baseline.
            feature_names: List of feature names.
            class_names: List of target class names.
        """
        if class_names is None:
            class_names = ["Rejected", "Approved"]
            
        self.feature_names = feature_names
        self.explainer = lime.lime_tabular.LimeTabularExplainer(
            training_data,
            feature_names=feature_names,
            class_names=class_names,
            mode='classification',
            random_state=42 # For stability in our baseline
        )
        
    def explain_instance(self, predict_proba_fn, transformed_instance: np.ndarray, original_values: dict = None, num_features: int = None) -> StandardExplanation:
        """
        Generates a standardized LIME explanation for a single instance.
        Args:
            predict_proba_fn: A function that takes a 2D numpy array and returns prediction probabilities (e.g., model.predict_proba).
            transformed_instance: 1D numpy array containing the preprocessed features for one applicant.
            original_values: Optional dict for displaying original values.
            num_features: Maximum number of features to include in explanation.
        """
        if transformed_instance.ndim == 2:
            transformed_instance = transformed_instance[0]
            
        if num_features is None:
            num_features = len(self.feature_names)
            
        # Generate LIME explanation
        exp = self.explainer.explain_instance(
            transformed_instance,
            predict_proba_fn,
            num_features=num_features
        )
        
        # LIME returns list of tuples: (feature_idx, contribution) for the predicted class (class 1)
        lime_contributions = exp.as_map()[1] 
        
        # Convert to dictionary {feature_idx: contribution}
        contrib_dict = dict(lime_contributions)
        
        features_list = []
        for i, feature in enumerate(self.feature_names):
            contrib = float(contrib_dict.get(i, 0.0))
            
            if contrib > 0.0001:
                direction = "positive"
            elif contrib < -0.0001:
                direction = "negative"
            else:
                direction = "neutral"
                
            val = float(transformed_instance[i])
            if original_values and feature in original_values:
                val = float(original_values[feature])
                
            features_list.append(FeatureContribution(
                feature=feature,
                value=val,
                contribution=contrib,
                direction=direction
            ))
            
        return StandardExplanation(
            method="LIME",
            features=features_list
        )
