import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, classification_report
from xgboost import XGBClassifier

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.app.ml.preprocessing_personalloan import (
    add_personalloan_financial_features,
    build_personalloan_preprocessor,
    get_personalloan_feature_names
)

def train_personalloan_model():
    output_dir = 'models/personalloan'
    os.makedirs(output_dir, exist_ok=True)
    
    data_path = 'datasets/personalloan_train.csv'
    print(f"Loading Personal Loan dataset from {data_path}...")
    df = pd.read_csv(data_path)
    print(f"Loaded shape: {df.shape}")
    
    # 1. Feature Engineering (Derived financial features)
    df_engineered = add_personalloan_financial_features(df)
    
    # 2. Separate Target and Features
    target_col = 'Loan_Status'
    id_col = 'Loan_ID'
    
    X = df_engineered.drop(columns=[id_col, target_col])
    y = (df_engineered[target_col] == 'Approved').astype(int)
    
    # 3. Stratified Train-Test Split (80/20)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    
    # 4. Fit Preprocessor
    print("Fitting ColumnTransformer preprocessor...")
    preprocessor = build_personalloan_preprocessor()
    X_train_trans = preprocessor.fit_transform(X_train)
    X_test_trans = preprocessor.transform(X_test)
    
    # Get transformed feature names
    cat_cols, num_cols = get_personalloan_feature_names()
    cat_feature_names = preprocessor.named_transformers_['cat'].named_steps['onehot'].get_feature_names_out(cat_cols)
    transformed_feature_names = list(cat_feature_names) + list(num_cols)
    
    # 5. Train XGBoost Classifier
    print("Training XGBoost classifier...")
    model = XGBClassifier(
        n_estimators=120,
        max_depth=4,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42,
        eval_metric='logloss'
    )
    model.fit(X_train_trans, y_train)
    
    # 6. Evaluate Model
    y_pred = model.predict(X_test_trans)
    y_prob = model.predict_proba(X_test_trans)[:, 1]
    
    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred))
    rec = float(recall_score(y_test, y_pred))
    f1 = float(f1_score(y_test, y_pred))
    auc = float(roc_auc_score(y_test, y_prob))
    
    print("\n=== PERSONAL LOAN MODEL EVALUATION ===")
    print(f"Accuracy:  {acc:.4f}")
    print(f"ROC-AUC:   {auc:.4f}")
    print(f"F1-Score:  {f1:.4f}")
    print("\nClassification Report:\n", classification_report(y_test, y_pred))
    
    # 7. Fairness Evaluation (Disparate Impact on Test Set)
    gender_test = X_test['Gender'].values
    male_mask = (gender_test == 'Male')
    female_mask = (gender_test == 'Female')
    male_approval = float(np.mean(y_pred[male_mask])) if np.sum(male_mask) > 0 else 0.0
    female_approval = float(np.mean(y_pred[female_mask])) if np.sum(female_mask) > 0 else 0.0
    disparate_impact = float(female_approval / male_approval) if male_approval > 0 else 1.0
    
    print(f"Fairness Audit (Test Set):")
    print(f"  Male Approval Rate:   {male_approval:.4f}")
    print(f"  Female Approval Rate: {female_approval:.4f}")
    print(f"  Disparate Impact:     {disparate_impact:.4f}")
    
    # 8. Save Artifacts
    joblib.dump(model, os.path.join(output_dir, 'model.pkl'))
    joblib.dump(preprocessor, os.path.join(output_dir, 'preprocessor.pkl'))
    
    with open(os.path.join(output_dir, 'feature_names.json'), 'w') as f:
        json.dump(transformed_feature_names, f, indent=2)
        
    np.save(os.path.join(output_dir, 'background_data.npy'), X_train_trans[:100])
    
    metrics = {
        'model_type': 'XGBClassifier',
        'product': 'Personal Loan',
        'n_samples': len(df),
        'accuracy': acc,
        'roc_auc': auc,
        'precision': prec,
        'recall': rec,
        'f1': f1,
        'disparate_impact': disparate_impact,
        'feature_count': len(transformed_feature_names)
    }
    with open(os.path.join(output_dir, 'metrics.json'), 'w') as f:
        json.dump(metrics, f, indent=2)
        
    print(f"\nAll artifacts successfully saved to {output_dir}/")

if __name__ == '__main__':
    train_personalloan_model()

