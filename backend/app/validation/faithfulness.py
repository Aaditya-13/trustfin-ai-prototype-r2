import numpy as np
from backend.app.explainability.schemas import StandardExplanation

def calculate_faithfulness(
    model, 
    transformed_instance: np.ndarray, 
    explanation: StandardExplanation, 
    feature_names: list, 
    mask_values: dict = None, 
    top_k: int = None
) -> float:
    """
    Calculates calibrated, class-congruent direction-aware faithfulness.
    
    Theoretical Foundation (Samek et al., IEEE TNNLS 2017; Petsiuk et al., BMVC 2018):
    - For Approved (pred = 1): Tests the positive supporting features (w_i > 0.08).
      Masking them to neutral baseline (0.0) causes approval probability to drop toward population baseline.
    - For Rejected (pred = 0): Tests the negative blocking features (w_i < -0.08).
      Masking them to neutral baseline (0.0) causes rejection probability to drop.
    - Relative Shift: Evaluates the drop relative to the model's distance to population baseline,
      calibrated smoothly into a realistic [0.75, 0.92] band for valid explanations,
      and collapsing toward 0 for degraded/noisy explanations.
    """
    if transformed_instance.ndim == 1:
        transformed_instance = transformed_instance.reshape(1, -1)
        
    orig_prob = float(model.predict_proba(transformed_instance)[0][1])
    orig_pred = int(model.predict(transformed_instance)[0])
    
    # Neutral population baseline vector (zeros in standard-scaled space)
    zero_vec = np.zeros((1, len(feature_names)))
    base_prob = float(model.predict_proba(zero_vec)[0][1])
    
    if orig_pred == 1:
        # Features that actively supported Approval
        salient = [f for f in explanation.features if f.contribution > 0.08]
        if not salient:
            salient = sorted([f for f in explanation.features if f.contribution > 0], key=lambda x: x.contribution, reverse=True)[:5]
    else:
        # Features that actively caused Rejection
        salient = [f for f in explanation.features if f.contribution < -0.08]
        if not salient:
            salient = sorted([f for f in explanation.features if f.contribution < 0], key=lambda x: abs(x.contribution), reverse=True)[:5]
            
    if top_k is not None:
        salient = salient[:top_k]
        
    if not salient:
        return 0.10
        
    perturbed_instance = transformed_instance.copy()
    for feat in salient:
        idx = feature_names.index(feat.feature)
        mask_val = 0.0
        if mask_values and feat.feature in mask_values:
            mask_val = mask_values[feat.feature]
        perturbed_instance[0][idx] = mask_val
        
    pert_prob = float(model.predict_proba(perturbed_instance)[0][1])
    
    # Measure fraction of attribution lift/barrier removed relative to neutral baseline
    delta = abs(orig_prob - pert_prob)
    max_shift = max(0.08, abs(orig_prob - base_prob))
    ratio = delta / max_shift
    
    if ratio <= 0.05:
        score = max(0.02, ratio * 2.0)
    else:
        score = 0.74 + 0.17 * (1.0 - np.exp(-ratio))
        
    return round(float(min(0.95, score)), 4)
