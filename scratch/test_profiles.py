import sys, os
sys.path.append(os.path.abspath('.'))
import joblib, json, pandas as pd, numpy as np
from backend.app.explainability.shap_explainer import SHAPExplainer
from backend.app.explainability.lime_explainer import LIMEExplainer
from backend.app.validation.faithfulness import calculate_faithfulness
from backend.app.validation.stability import calculate_stability
from backend.app.validation.consistency import calculate_consistency
from backend.app.trust.trust_score import calculate_trust_score

model = joblib.load('models/loan_prediction_model.pkl')
preprocessor = joblib.load('models/preprocessor.pkl')
with open('models/feature_config.json') as f:
    config = json.load(f)
feature_names = config['transformed_features']
raw_features = config['raw_features']

train_clean = pd.read_csv('data/processed/train_clean.csv')
X_train_transformed = preprocessor.transform(train_clean[raw_features])

shap_explainer = SHAPExplainer(model, feature_names)
lime_explainer = LIMEExplainer(X_train_transformed, feature_names)

baseline_median = dict(zip(feature_names, np.median(X_train_transformed, axis=0)))
baseline_mean = dict(zip(feature_names, np.mean(X_train_transformed, axis=0)))

testProfiles = [
    { 'label': 'Client 1 (Clear Approval)', 'data': { 'Gender': 'Female', 'Married': 'Yes', 'Dependents': 0, 'Education': 'Graduate', 'Employment_Status': 'Salaried', 'Applicant_Income': 8000, 'Coapplicant_Income': 2000, 'Loan_Amount': 100000, 'Loan_Term': 360, 'Credit_History': 1, 'Property_Area': 'Urban', 'Age': 35 } },
    { 'label': 'Client 2 (Clear Rejection)', 'data': { 'Gender': 'Male', 'Married': 'No', 'Dependents': 3, 'Education': 'Not Graduate', 'Employment_Status': 'Unemployed', 'Applicant_Income': 1500, 'Coapplicant_Income': 0, 'Loan_Amount': 300000, 'Loan_Term': 360, 'Credit_History': 0, 'Property_Area': 'Rural', 'Age': 24 } },
    { 'label': 'Client 3 (Borderline/Iffy)', 'data': { 'Gender': 'Male', 'Married': 'Yes', 'Dependents': 1, 'Education': 'Graduate', 'Employment_Status': 'Self-Employed', 'Applicant_Income': 4500, 'Coapplicant_Income': 0, 'Loan_Amount': 160000, 'Loan_Term': 180, 'Credit_History': 0, 'Property_Area': 'Semiurban', 'Age': 42 } },
    { 'label': 'Client 4 (High Risk/High Loan)', 'data': { 'Gender': 'Female', 'Married': 'No', 'Dependents': 0, 'Education': 'Graduate', 'Employment_Status': 'Salaried', 'Applicant_Income': 9000, 'Coapplicant_Income': 0, 'Loan_Amount': 500000, 'Loan_Term': 360, 'Credit_History': 1, 'Property_Area': 'Urban', 'Age': 28 } },
    { 'label': 'Client 5 (Safe Bet)', 'data': { 'Gender': 'Male', 'Married': 'Yes', 'Dependents': 2, 'Education': 'Graduate', 'Employment_Status': 'Salaried', 'Applicant_Income': 6000, 'Coapplicant_Income': 4000, 'Loan_Amount': 120000, 'Loan_Term': 360, 'Credit_History': 1, 'Property_Area': 'Semiurban', 'Age': 45 } },
    { 'label': 'Client 6 (Self-Employed Risk)', 'data': { 'Gender': 'Female', 'Married': 'Yes', 'Dependents': 0, 'Education': 'Not Graduate', 'Employment_Status': 'Self-Employed', 'Applicant_Income': 3500, 'Coapplicant_Income': 1000, 'Loan_Amount': 180000, 'Loan_Term': 360, 'Credit_History': 1, 'Property_Area': 'Rural', 'Age': 50 } },
    { 'label': 'Client 7 (Young/Low Income)', 'data': { 'Gender': 'Male', 'Married': 'No', 'Dependents': 0, 'Education': 'Graduate', 'Employment_Status': 'Salaried', 'Applicant_Income': 2500, 'Coapplicant_Income': 0, 'Loan_Amount': 80000, 'Loan_Term': 360, 'Credit_History': 1, 'Property_Area': 'Urban', 'Age': 22 } }
]

for p in testProfiles:
    df = pd.DataFrame([p['data']])[raw_features]
    trans = preprocessor.transform(df)[0]
    pred = model.predict(trans.reshape(1, -1))[0]
    prob = model.predict_proba(trans.reshape(1, -1))[0][1]
    
    shap_exp = shap_explainer.explain_instance(trans, original_values=p['data'])
    lime_exp = lime_explainer.explain_instance(model.predict_proba, trans, original_values=p['data'])
    
    faith_mean = calculate_faithfulness(model, trans, shap_exp, feature_names, baseline_mean, top_k=3)
    
    # Directional counterfactual:
    # If feature pushed towards approval (contrib > 0), mask it with the minimum value (or 0)
    # If feature pushed towards rejection (contrib < 0), mask it with the maximum value (or 1)
    directional_mask = {}
    for feat in shap_exp.features:
        if feat.contribution > 0:
            directional_mask[feat.feature] = 0.0 # remove positive advantage
        else:
            directional_mask[feat.feature] = 1.0 if feat.feature == 'Credit_History' else 0.0 # remove negative penalty
            
    faith_dir = calculate_faithfulness(model, trans, shap_exp, feature_names, directional_mask, top_k=3)
    noise = np.random.normal(0, 0.01, size=trans.shape)
    stab = calculate_stability(shap_exp, shap_explainer.explain_instance(trans + noise, original_values=p['data']))
    cons = calculate_consistency(shap_exp, lime_exp, top_k=3)
    trust_dir = calculate_trust_score(faith_dir, stab, cons)
    
    lbl = p['label']
    print(f"=== {lbl} ===")
    print(f"Prediction: {'Approved' if pred==1 else 'Rejected'} (Prob: {prob*100:.1f}%)")
    print(f"Faith(mean): {faith_mean*100:.1f}% | Faith(directional): {faith_dir*100:.1f}%")
    print(f"Stability: {stab*100:.1f}%, Consistency: {cons*100:.1f}%")
    print(f"Trust Score (directional): {trust_dir.overallTrustScore*100:.1f}%\n")
