import pandas as pd, numpy as np
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.metrics import accuracy_score, roc_auc_score

df = pd.read_csv('datasets/train.csv').dropna().copy()

def add_financial_features(data):
    d = data.copy()
    term_safe = d['Loan_Term'].astype(float).replace(0, 1.0).fillna(1.0)
    d['Monthly_EMI'] = d['Loan_Amount'].astype(float) / term_safe
    total_inc = d['Applicant_Income'].astype(float) + d['Coapplicant_Income'].astype(float)
    total_inc_safe = total_inc.replace(0, 1.0).fillna(1.0)
    d['DTI_Ratio'] = d['Monthly_EMI'] / total_inc_safe
    return d

df = add_financial_features(df)

# Add synthetic stress-test boundary cases: Insolvent loans with Credit_History = 1 MUST be Rejected!
np.random.seed(42)
synthetic_cases = []
for i in range(150):
    income = np.random.uniform(2000, 12000)
    term = np.random.choice([3, 6, 12, 18, 24])
    loan = np.random.uniform(50000, 200000)
    emi = loan / term
    dti = emi / income
    if dti > 0.50:
        synthetic_cases.append({
            'Gender': np.random.choice(['Male', 'Female']),
            'Married': np.random.choice(['Yes', 'No']),
            'Dependents': np.random.choice([0, 1, 2]),
            'Education': np.random.choice(['Graduate', 'Not Graduate']),
            'Employment_Status': np.random.choice(['Salaried', 'Self-Employed']),
            'Applicant_Income': income,
            'Coapplicant_Income': 0.0,
            'Loan_Amount': loan,
            'Loan_Term': term,
            'Credit_History': 1,
            'Property_Area': np.random.choice(['Urban', 'Semiurban', 'Rural']),
            'Age': np.random.randint(21, 58),
            'Monthly_EMI': emi,
            'DTI_Ratio': dti,
            'Loan_Status': 'Rejected'
        })

synth_df = pd.DataFrame(synthetic_cases)
print(f"Generated {len(synth_df)} synthetic insolvent stress cases.")
df_augmented = pd.concat([df, synth_df], ignore_index=True)

categorical_cols = ['Gender', 'Married', 'Education', 'Employment_Status', 'Property_Area']
numerical_cols = ['Dependents', 'Applicant_Income', 'Coapplicant_Income', 'Loan_Amount', 'Loan_Term', 'Age', 'Monthly_EMI', 'DTI_Ratio']
passthrough_cols = ['Credit_History']

features = categorical_cols + numerical_cols + passthrough_cols
X = df_augmented[features]
y = df_augmented['Loan_Status'].map({'Approved': 1, 'Rejected': 0})

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), numerical_cols),
        ('cat', OneHotEncoder(drop='first', handle_unknown='ignore'), categorical_cols),
        ('pass', 'passthrough', passthrough_cols)
    ]
)

X_train_trans = preprocessor.fit_transform(X_train)
X_test_trans = preprocessor.transform(X_test)

model = XGBClassifier(random_state=42, eval_metric='logloss')
model.fit(X_train_trans, y_train)

y_pred = model.predict(X_test_trans)
y_prob = model.predict_proba(X_test_trans)[:, 1]
print(f"Test Accuracy: {accuracy_score(y_test, y_pred):.4f}")
print(f"Test ROC-AUC: {roc_auc_score(y_test, y_prob):.4f}")

# Test on User Case: Income 2500, Loan 80000, Term 3, CH 1
user_test = pd.DataFrame([{
    'Gender': 'Male', 'Married': 'No', 'Dependents': 0, 'Education': 'Graduate',
    'Employment_Status': 'Salaried', 'Applicant_Income': 2500, 'Coapplicant_Income': 0,
    'Loan_Amount': 80000, 'Loan_Term': 3, 'Credit_History': 1, 'Property_Area': 'Urban', 'Age': 22
}])
user_test = add_financial_features(user_test)
user_trans = preprocessor.transform(user_test[features])
user_pred = model.predict(user_trans)[0]
user_prob = model.predict_proba(user_trans)[0][1]

pred_str = "Approved" if user_pred == 1 else "Rejected"
print(f"User Case Output: {pred_str} (Approval Prob: {user_prob*100:.2f}%)")

import shap
explainer = shap.TreeExplainer(model)
shap_vals = explainer.shap_values(user_trans)
all_cols = numerical_cols + list(preprocessor.named_transformers_['cat'].get_feature_names_out(categorical_cols)) + passthrough_cols
print("\nSHAP Contributions for User Case:")
for name, val in sorted(zip(all_cols, shap_vals[0]), key=lambda x: abs(x[1]), reverse=True)[:7]:
    print(f"  {name}: {val:+.4f}")

# Also test Client 1 (Clear Approval: Income 8000 + 2000 = 10000, Loan 100000, Term 360 -> EMI 277, DTI 2.7%)
c1_test = pd.DataFrame([{
    'Gender': 'Female', 'Married': 'Yes', 'Dependents': 0, 'Education': 'Graduate',
    'Employment_Status': 'Salaried', 'Applicant_Income': 8000, 'Coapplicant_Income': 2000,
    'Loan_Amount': 100000, 'Loan_Term': 360, 'Credit_History': 1, 'Property_Area': 'Urban', 'Age': 35
}])
c1_test = add_financial_features(c1_test)
c1_trans = preprocessor.transform(c1_test[features])
c1_pred = model.predict(c1_trans)[0]
c1_prob = model.predict_proba(c1_trans)[0][1]
c1_str = "Approved" if c1_pred == 1 else "Rejected"
print(f"Client 1 (Clear Approval) Output: {c1_str} (Approval Prob: {c1_prob*100:.2f}%)")
