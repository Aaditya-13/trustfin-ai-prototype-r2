import os
import sys
import json
import joblib
import pandas as pd
import numpy as np

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.app.explainability.shap_explainer import SHAPExplainer
from backend.app.explainability.lime_explainer import LIMEExplainer
from backend.app.validation.faithfulness import calculate_faithfulness
from backend.app.validation.stability import calculate_stability
from backend.app.validation.consistency import calculate_consistency
from backend.app.validation.fairness import calculate_equal_opportunity_ratio

def main():
    print("Loading models and data...")
    model = joblib.load('models/loan_prediction_model.pkl')
    preprocessor = joblib.load('models/preprocessor.pkl')
    
    with open('models/feature_config.json', 'r') as f:
        config = json.load(f)
    feature_names = config["transformed_features"]
    
    df_clean = pd.read_csv('data/processed/train_clean.csv')
    X_raw = df_clean[config["raw_features"]]
    y_raw = df_clean['Loan_Status'].map({'Approved': 1, 'Rejected': 0}).values
    X_transformed = preprocessor.transform(X_raw)
    
    # Pick a single test instance (e.g., index 0)
    test_instance_raw = X_raw.iloc[0:1]
    test_instance_transformed = X_transformed[0]
    
    print("Initializing Explainers...")
    shap_explainer = SHAPExplainer(model, feature_names)
    lime_explainer = LIMEExplainer(X_transformed, feature_names)
    
    print("Generating Explanations...")
    shap_exp = shap_explainer.explain_instance(test_instance_transformed)
    lime_exp = lime_explainer.explain_instance(model.predict_proba, test_instance_transformed)
    
    print("\n=== Validation Metrics ===")
    
    # 1. Faithfulness
    # Original-input reconstruction using the existing explanations, without refitting.
    approval_probability = float(model.predict_proba(test_instance_transformed.reshape(1, -1))[0, 1])
    faithfulness_score = calculate_faithfulness(approval_probability, shap_exp, lime_exp)
    print(f"Faithfulness Score: {faithfulness_score:.4f} (60% SHAP + 40% LIME top-five local concordance)")
    
    # 2. Stability
    # Add 1% Gaussian noise
    noise = np.random.normal(0, 0.01, size=test_instance_transformed.shape)
    perturbed_instance = test_instance_transformed + noise
    shap_exp_perturbed = shap_explainer.explain_instance(perturbed_instance)
    
    stability_score = calculate_stability(shap_exp, shap_exp_perturbed)
    print(f"Stability Score:    {stability_score:.4f} (70% rank similarity and 30% direction agreement after 1% noise)")
    
    # 3. Consistency
    # Compare top-five feature overlap and shared-feature directions.
    consistency_score = calculate_consistency(shap_exp, lime_exp)
    print(f"Consistency Score:  {consistency_score:.4f} (60% Top 5 overlap and 40% shared-feature direction agreement)")
    
    # 4. Fairness (Global metric, calculated over the whole dataset for demonstration)
    print("\nCalculating Global Fairness on training set...")
    y_pred = model.predict(X_transformed)
    # Using 'Gender_Male' as the sensitive attribute. (Assuming 1=Male, 0=Female)
    gender_idx = feature_names.index('Gender_Male') if 'Gender_Male' in feature_names else -1
    
    if gender_idx != -1:
        sensitive_features = X_transformed[:, gender_idx]
        fairness_score = calculate_equal_opportunity_ratio(y_raw, y_pred, sensitive_features)
        print(f"Fairness Score:     {fairness_score:.4f} (Equal Opportunity Ratio for Gender)")
    else:
        print("Gender_Male not found in transformed features.")

if __name__ == "__main__":
    main()
