import os
import sys
import json
import time
from datetime import datetime
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
from xgboost import XGBClassifier

# Add the backend path so we can import our modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.app.ml.preprocessing import build_preprocessor, get_feature_names, add_financial_features
import numpy as np

def ensure_directories():
    os.makedirs('models', exist_ok=True)
    os.makedirs('logs', exist_ok=True)
    os.makedirs('data/processed', exist_ok=True)

def write_log(log_content, version="v1"):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = f"logs/run_{version}_{timestamp}.txt"
    with open(log_file, 'w') as f:
        f.write(log_content)
    print(f"Log written to {log_file}")
    return log_file

def main():
    ensure_directories()
    
    log_lines = []
    log_lines.append("=== TrustFin ML Pipeline Training Log ===")
    log_lines.append(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    log_lines.append(f"Model: XGBoost Baseline with Domain Feature Engineering (Monthly_EMI, DTI_Ratio)\n")
    
    # 1. Load Data
    print("Loading data...")
    df = pd.read_csv('datasets/train.csv')
    log_lines.append(f"Original dataset shape: {df.shape}")
    
    # 2. Handle Missing Values & Feature Engineering
    df_clean = df.dropna().copy()
    df_clean = add_financial_features(df_clean)
    log_lines.append(f"Dataset shape after dropping missing values: {df_clean.shape}")
    log_lines.append(f"Rows dropped: {df.shape[0] - df_clean.shape[0]}")
    
    # 2b. Boundary Stress Cases (Insolvency Mitigation)
    # The original dataset contained zero insolvent cases with Credit_History = 1.
    # We add realistic boundary cases where DTI > 0.50 and target = 'Rejected'
    np.random.seed(42)
    synthetic_cases = []
    for _ in range(150):
        income = float(np.random.uniform(2000, 12000))
        term = float(np.random.choice([3, 6, 12, 18, 24]))
        loan = float(np.random.uniform(50000, 200000))
        emi = loan / term
        dti = emi / income
        if dti > 0.50:
            synthetic_cases.append({
                'Gender': np.random.choice(['Male', 'Female']),
                'Married': np.random.choice(['Yes', 'No']),
                'Dependents': int(np.random.choice([0, 1, 2])),
                'Education': np.random.choice(['Graduate', 'Not Graduate']),
                'Employment_Status': np.random.choice(['Salaried', 'Self-Employed']),
                'Applicant_Income': income,
                'Coapplicant_Income': 0.0,
                'Loan_Amount': loan,
                'Loan_Term': term,
                'Credit_History': 1,
                'Property_Area': np.random.choice(['Urban', 'Semiurban', 'Rural']),
                'Age': int(np.random.randint(21, 58)),
                'Monthly_EMI': emi,
                'DTI_Ratio': dti,
                'Loan_Status': 'Rejected'
            })
    synth_df = pd.DataFrame(synthetic_cases)
    df_augmented = pd.concat([df_clean, synth_df], ignore_index=True)
    df_augmented.to_csv('data/processed/train_clean.csv', index=False)
    log_lines.append(f"Injected {len(synth_df)} synthetic boundary stress cases (insolvent loans with DTI > 50% marked Rejected)\n")
    
    # 3. Define X and y
    cat_cols, num_cols, pass_cols = get_feature_names()
    features = cat_cols + num_cols + pass_cols
    
    X = df_augmented[features]
    # Map target: Approved -> 1, Rejected -> 0
    y = df_augmented['Loan_Status'].map({'Approved': 1, 'Rejected': 0})
    
    log_lines.append(f"Target variable mapped: 'Approved' -> 1, 'Rejected' -> 0")
    log_lines.append(f"Features used ({len(features)}): {', '.join(features)}\n")
    
    # 4. Train-Test Split (Reproducible)
    # Important: Stratify to maintain class balance in test set
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    log_lines.append(f"Train/Test split: 80/20")
    log_lines.append(f"Training set size: {X_train.shape[0]}")
    log_lines.append(f"Test set size: {X_test.shape[0]}\n")
    
    # 5. Build Pipeline
    preprocessor = build_preprocessor()
    
    # We fit the preprocessor separately so we can save it for XAI methods later
    # Though often bundled in a Pipeline, separating it makes SHAP/LIME integration easier 
    # since they often require the transformed feature matrix or the preprocessor explicitly.
    print("Fitting preprocessor...")
    X_train_transformed = preprocessor.fit_transform(X_train)
    X_test_transformed = preprocessor.transform(X_test)
    
    # Get transformed feature names
    # Note: scikit-learn OneHotEncoder get_feature_names_out requires setting up
    try:
        cat_features = preprocessor.named_transformers_['cat'].named_steps['onehot'].get_feature_names_out(cat_cols)
        all_feature_names = list(num_cols) + list(cat_features) + list(pass_cols)
    except Exception as e:
        all_feature_names = [f"f{i}" for i in range(X_train_transformed.shape[1])]
    
    log_lines.append(f"Transformed feature count: {len(all_feature_names)}\n")
    
    # 6. Train Model
    print("Training XGBoost...")
    model = XGBClassifier(
        random_state=42,
        eval_metric='logloss',
        use_label_encoder=False
    )
    
    start_time = time.time()
    model.fit(X_train_transformed, y_train)
    training_time = time.time() - start_time
    
    log_lines.append(f"Model Training Time: {training_time:.2f} seconds")
    
    # 7. Evaluate
    print("Evaluating model...")
    y_pred = model.predict(X_test_transformed)
    y_prob = model.predict_proba(X_test_transformed)[:, 1]
    
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_prob)
    cm = confusion_matrix(y_test, y_pred)
    
    log_lines.append("\n=== Evaluation Metrics (Test Set) ===")
    log_lines.append(f"Accuracy:  {acc:.4f}")
    log_lines.append(f"Precision: {prec:.4f}")
    log_lines.append(f"Recall:    {rec:.4f}")
    log_lines.append(f"F1 Score:  {f1:.4f}")
    log_lines.append(f"ROC-AUC:   {auc:.4f}")
    
    log_lines.append("\n=== Confusion Matrix ===")
    log_lines.append(f"True Negatives (Correct Rejections): {cm[0][0]}")
    log_lines.append(f"False Positives (False Approvals)  : {cm[0][1]}")
    log_lines.append(f"False Negatives (False Rejections) : {cm[1][0]}")
    log_lines.append(f"True Positives (Correct Approvals) : {cm[1][1]}\n")
    
    # 7b. Fairness Metrics (Gender: Equal Opportunity & Demographic Parity)
    test_eval_df = X_test.copy()
    test_eval_df['actual'] = y_test
    test_eval_df['pred'] = y_pred
    
    m_eligible = test_eval_df[(test_eval_df['Gender'] == 'Male') & (test_eval_df['actual'] == 1)]
    f_eligible = test_eval_df[(test_eval_df['Gender'] == 'Female') & (test_eval_df['actual'] == 1)]
    
    tpr_male = float((m_eligible['pred'] == 1).mean()) if len(m_eligible) > 0 else 0.0
    tpr_female = float((f_eligible['pred'] == 1).mean()) if len(f_eligible) > 0 else 0.0
    equal_opportunity_ratio = float(min(tpr_male, tpr_female) / max(tpr_male, tpr_female)) if max(tpr_male, tpr_female) > 0 else 1.0
    
    male_approval_rate = float((test_eval_df[test_eval_df['Gender'] == 'Male']['pred'] == 1).mean())
    female_approval_rate = float((test_eval_df[test_eval_df['Gender'] == 'Female']['pred'] == 1).mean())
    demographic_parity_ratio = float(min(male_approval_rate, female_approval_rate) / max(male_approval_rate, female_approval_rate)) if max(male_approval_rate, female_approval_rate) > 0 else 1.0
    
    log_lines.append("\n=== Demographic Fairness Metrics (Gender) ===")
    log_lines.append(f"Male Eligible Count:   {len(m_eligible)}, Male TPR:   {tpr_male:.4f}")
    log_lines.append(f"Female Eligible Count: {len(f_eligible)}, Female TPR: {tpr_female:.4f}")
    log_lines.append(f"Equal Opportunity Ratio (Fairness): {equal_opportunity_ratio:.4f}")
    log_lines.append(f"Male Approval Rate:    {male_approval_rate:.4f}")
    log_lines.append(f"Female Approval Rate:  {female_approval_rate:.4f}")
    log_lines.append(f"Demographic Parity Ratio: {demographic_parity_ratio:.4f}\n")
    
    # 8. Save Artifacts
    print("Saving models and metadata...")
    joblib.dump(preprocessor, 'models/preprocessor.pkl')
    joblib.dump(model, 'models/loan_prediction_model.pkl')
    
    feature_config = {
        "raw_features": features,
        "transformed_features": list(all_feature_names),
        "target_mapping": {"Approved": 1, "Rejected": 0}
    }
    with open('models/feature_config.json', 'w') as f:
        json.dump(feature_config, f, indent=4)
        
    model_metadata = {
        "algorithm": "XGBoost",
        "version": "v1",
        "metrics": {
            "accuracy": acc,
            "precision": prec,
            "recall": rec,
            "f1": f1,
            "roc_auc": auc
        },
        "fairness": {
            "protected_attribute": "Gender",
            "male_tpr": tpr_male,
            "female_tpr": tpr_female,
            "equal_opportunity_ratio": equal_opportunity_ratio,
            "male_approval_rate": male_approval_rate,
            "female_approval_rate": female_approval_rate,
            "demographic_parity_ratio": demographic_parity_ratio
        },
        "confusion_matrix": {
            "tn": int(cm[0][0]),
            "fp": int(cm[0][1]),
            "fn": int(cm[1][0]),
            "tp": int(cm[1][1])
        }
    }
    with open('models/model_metadata.json', 'w') as f:
        json.dump(model_metadata, f, indent=4)
        
    log_lines.append("=== Saved Artifacts ===")
    log_lines.append("- models/preprocessor.pkl")
    log_lines.append("- models/loan_prediction_model.pkl")
    log_lines.append("- models/feature_config.json")
    log_lines.append("- models/model_metadata.json")
    
    # Write Log
    write_log('\n'.join(log_lines), version="v1")
    print("Training complete.")

if __name__ == "__main__":
    main()
