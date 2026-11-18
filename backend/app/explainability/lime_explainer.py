import lime
import lime.lime_tabular
import numpy as np
from typing import List
from backend.app.explainability.schemas import StandardExplanation, FeatureContribution, ExplanationReconstruction

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
        
    def explain_instance(self, predict_proba_fn, transformed_instance: np.ndarray, original_values: dict = None, num_features: int = None, seed: int = None) -> StandardExplanation:
        """
        Generates a standardized LIME explanation for a single instance.
        Args:
            predict_proba_fn: A function that takes a 2D numpy array and returns prediction probabilities (e.g., model.predict_proba).
            transformed_instance: 1D numpy array containing the preprocessed features for one applicant.
            original_values: Optional dict for displaying original values.
            num_features: Maximum number of features to include in explanation.
            seed: Optional integer seed to guarantee deterministic, reproducible sampling for this instance.
        """
        if transformed_instance.ndim == 2:
            transformed_instance = transformed_instance[0]
            
        if num_features is None:
            num_features = len(self.feature_names)
            
        # If seed is provided, reset LIME's internal random state for deterministic sampling
        if seed is not None:
            from sklearn.utils import check_random_state
            rng = check_random_state(seed)
            self.explainer.random_state = check_random_state(seed)
            if hasattr(self.explainer, 'base'):
                self.explainer.base.random_state = check_random_state(seed)
            if hasattr(self.explainer, 'discretizer') and self.explainer.discretizer is not None:
                self.explainer.discretizer.random_state = check_random_state(seed)
            np.random.seed(seed)
            
        # Generate LIME explanation
        exp = self.explainer.explain_instance(
            transformed_instance,
            predict_proba_fn,
            num_features=num_features
        )
        
        # Explain approval (class 1) consistently, including rejected applicants.
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
            
        # These are LIME's interpretable coordinates, not raw financial values.
        interpretable_row = np.asarray(exp.domain_mapper.scaled_row, dtype=float).reshape(-1)
        if len(interpretable_row) != len(self.feature_names):
            raise ValueError('LIME reconstruction must match the feature width')
        return StandardExplanation(
            method="LIME",
            features=features_list,
            reconstruction=ExplanationReconstruction(
                baseValue=float(exp.intercept[1]), outputSpace='probability',
                featureMultipliers=dict(zip(self.feature_names, interpretable_row.tolist())),
                fullPrediction=float(np.asarray(exp.local_pred).item()),
            ),
        )
