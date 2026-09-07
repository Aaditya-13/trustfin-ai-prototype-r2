import sys, os
sys.path.append(os.path.abspath('.'))
import joblib, json, pandas as pd, numpy as np
from sklearn.model_selection import train_test_split

model = joblib.load('models/loan_prediction_model.pkl')
preprocessor = joblib.load('models/preprocessor.pkl')
with open('models/feature_config.json') as f:
    config = json.load(f)
raw_features = config['raw_features']

df = pd.read_csv('data/processed/train_clean.csv')
X = df[raw_features]
y = df['Loan_Status'].map({'Approved': 1, 'Rejected': 0})

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
X_test_trans = preprocessor.transform(X_test)
y_pred = model.predict(X_test_trans)

test_df = X_test.copy()
test_df['actual'] = y_test
test_df['predicted'] = y_pred

print("=== Demographic Breakdown on Test Set ===")
for gender in ['Male', 'Female']:
    sub = test_df[test_df['Gender'] == gender]
    actual_pos = sub[sub['actual'] == 1]
    tp = (actual_pos['predicted'] == 1).sum()
    tpr = tp / len(actual_pos) if len(actual_pos) > 0 else 0
    total_app = len(sub)
    approved = (sub['predicted'] == 1).sum()
    app_rate = approved / total_app if total_app > 0 else 0
    print(f"Gender: {gender}")
    print(f"  Count: {total_app}")
    print(f"  Approved Count: {approved} ({app_rate*100:.1f}%)")
    print(f"  True Positive Rate (TPR): {tpr*100:.2f}%\n")

m_tpr = (test_df[(test_df['Gender']=='Male') & (test_df['actual']==1)]['predicted']==1).mean()
f_tpr = (test_df[(test_df['Gender']=='Female') & (test_df['actual']==1)]['predicted']==1).mean()
eq_opp = min(m_tpr, f_tpr) / max(m_tpr, f_tpr)
print(f"Male TPR: {m_tpr*100:.2f}% | Female TPR: {f_tpr*100:.2f}%")
print(f"Equal Opportunity Ratio (Fairness Score): {eq_opp*100:.2f}%")

# Demographic Parity Ratio (Approval Rate comparison)
m_ar = (test_df[test_df['Gender']=='Male']['predicted']==1).mean()
f_ar = (test_df[test_df['Gender']=='Female']['predicted']==1).mean()
dp_ratio = min(m_ar, f_ar) / max(m_ar, f_ar)
print(f"Male Approval Rate: {m_ar*100:.2f}% | Female Approval Rate: {f_ar*100:.2f}%")
print(f"Demographic Parity Ratio: {dp_ratio*100:.2f}%")
