import numpy as np
from scipy.stats import spearmanr
from backend.app.explainability.schemas import StandardExplanation

def calculate_stability(exp1: StandardExplanation, exp2: StandardExplanation) -> float:
    """
    Calculates stability given two explanations of slightly perturbed inputs.
    Uses Spearman Rank Correlation.
    """
    # Ensure features are in the same order before extracting contributions
    # StandardExplanation features should ideally be ordered the same, but let's be safe
    dict1 = {f.feature: f.contribution for f in exp1.features}
    dict2 = {f.feature: f.contribution for f in exp2.features}
    
    features = list(dict1.keys())
    
    contributions1 = [dict1[f] for f in features]
    contributions2 = [dict2.get(f, 0.0) for f in features]
    
    correlation, _ = spearmanr(contributions1, contributions2)
    
    # Handle NaN if all contributions are 0 or constant
    if np.isnan(correlation):
        return 0.0
        
    # Scale from [-1, 1] to [0, 1]
    scaled_score = (correlation + 1) / 2.0
    return float(scaled_score)
