import pandas as pd
import numpy as np
from backend.app.ml.preprocessing import add_financial_features

def calculate_equal_opportunity_ratio(y_true: np.ndarray, y_pred: np.ndarray, sensitive_features: np.ndarray) -> float:
    """
    Calculates Equal Opportunity Ratio (TPR for minority / TPR for majority).
    """
    try:
        df = pd.DataFrame({
            'y_true': y_true,
            'y_pred': y_pred,
            'group': sensitive_features
        })
        
        eligible = df[df['y_true'] == 1]
        
        if eligible.empty:
            return 1.0
            
        tpr_by_group = eligible.groupby('group')['y_pred'].mean()
        
        if len(tpr_by_group) < 2:
            return 1.0
            
        min_tpr = tpr_by_group.min()
        max_tpr = tpr_by_group.max()
        
        if max_tpr == 0:
            return 1.0
            
        ratio = min_tpr / max_tpr
        return float(ratio)
        
    except Exception as e:
        print(f"Error calculating fairness: {e}")
        return 0.0

def calculate_counterfactual_fairness(model, preprocessor, raw_input_dict: dict, raw_features: list, sensitive_col: str = 'Gender') -> float:
    """
    Evaluates individual counterfactual fairness by flipping the protected attribute
    and computing 1.0 - |P(original) - P(flipped)|.
    """
    try:
        df_orig = pd.DataFrame([raw_input_dict])
        df_orig = add_financial_features(df_orig)[raw_features]
        prob_orig = float(model.predict_proba(preprocessor.transform(df_orig))[0][1])
        
        flipped_dict = raw_input_dict.copy()
        current_val = raw_input_dict.get(sensitive_col, 'Male')
        flipped_dict[sensitive_col] = 'Female' if current_val == 'Male' else 'Male'
        
        df_flipped = pd.DataFrame([flipped_dict])
        df_flipped = add_financial_features(df_flipped)[raw_features]
        prob_flipped = float(model.predict_proba(preprocessor.transform(df_flipped))[0][1])
        
        delta = abs(prob_orig - prob_flipped)
        score = max(0.0, min(1.0, 1.0 - delta))
        return float(score)
    except Exception as e:
        print(f"Error calculating counterfactual fairness: {e}")
        return 1.0
