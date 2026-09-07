from backend.app.explainability.schemas import StandardExplanation

def calculate_consistency(shap_exp: StandardExplanation, lime_exp: StandardExplanation, top_k: int = 3) -> float:
    """
    Calculates Jaccard similarity of Top-K features between SHAP and LIME.
    """
    shap_sorted = sorted(shap_exp.features, key=lambda x: abs(x.contribution), reverse=True)
    lime_sorted = sorted(lime_exp.features, key=lambda x: abs(x.contribution), reverse=True)
    
    shap_top_k = {f.feature for f in shap_sorted[:top_k]}
    lime_top_k = {f.feature for f in lime_sorted[:top_k]}
    
    intersection = shap_top_k.intersection(lime_top_k)
    union = shap_top_k.union(lime_top_k)
    
    if not union:
        return 0.0
        
    score = len(intersection) / len(union)
    return float(score)
