import os
import sys
import json
import joblib
import pandas as pd

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.app.explainability.shap_explainer import SHAPExplainer
from backend.app.explainability.lime_explainer import LIMEExplainer

def main():
    print("Loading models and data...")
    model = joblib.load('models/loan_prediction_model.pkl')
    preprocessor = joblib.load('models/preprocessor.pkl')
    
    with open('models/feature_config.json', 'r') as f:
        config = json.load(f)
    feature_names = config["transformed_features"]
    
    print("Loading test data...")
    df_clean = pd.read_csv('data/processed/train_clean.csv')
    X_raw = df_clean[config["raw_features"]]
    # We need the full training set transformed to initialize LIME's neighborhood
    X_transformed = preprocessor.transform(X_raw)
    
    # Pick a single test instance (e.g., the first one)
    test_instance_transformed = X_transformed[0]
    
    print("Initializing Explainers...")
    shap_explainer = SHAPExplainer(model, feature_names)
    lime_explainer = LIMEExplainer(X_transformed, feature_names)
    
    print("\n--- SHAP Standardized Explanation ---")
    shap_exp = shap_explainer.explain_instance(test_instance_transformed)
    print(shap_exp.model_dump_json(indent=2))
    
    print("\n--- LIME Standardized Explanation ---")
    lime_exp = lime_explainer.explain_instance(model.predict_proba, test_instance_transformed)
    print(lime_exp.model_dump_json(indent=2))

if __name__ == "__main__":
    main()
