import numpy as np
from backend.app.explainability.schemas import StandardExplanation

def calculate_faithfulness(model, transformed_instance: np.ndarray, explanation: StandardExplanation, feature_names: list, mask_values: dict, top_k: int = 3) -> float:
    """
    Calculates faithfulness by masking the top K features and observing the drop in prediction probability.
    """
    if transformed_instance.ndim == 1:
        transformed_instance = transformed_instance.reshape(1, -1)
        
    # Get original prediction probability for the positive class (Approved)
    original_prob = float(model.predict_proba(transformed_instance)[0][1])
    original_pred = model.predict(transformed_instance)[0]
    
    # Sort features by absolute contribution to find the top K
    sorted_features = sorted(explanation.features, key=lambda x: abs(x.contribution), reverse=True)
    top_k_features = sorted_features[:top_k]
    
    # Create perturbed instance
    perturbed_instance = transformed_instance.copy()
    
    for feat in top_k_features:
        idx = feature_names.index(feat.feature)
        # Mask the feature with its median/mode value (which should be provided mapped to feature name)
        if feat.feature in mask_values:
            perturbed_instance[0][idx] = mask_values[feat.feature]
        else:
            perturbed_instance[0][idx] = 0.0 # fallback to 0 (mean for standard scaled features)
            
    # Get perturbed prediction probability
    perturbed_prob = float(model.predict_proba(perturbed_instance)[0][1])
    
    # If the model originally predicted 1 (Approved), the probability should drop when we remove important features.
    # If the model originally predicted 0 (Rejected), the probability should rise (meaning the probability of rejection drops).
    if original_pred == 1:
        score = original_prob - perturbed_prob
    else:
        score = perturbed_prob - original_prob
        
    return float(score)
