import pandas as pd
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder

def add_personalloan_financial_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes domain-specific financial features for Personal Loan underwriting:
    - Monthly_EMI = Standard unsecured retail amortization at 13.5% p.a.
    - FOIR = (Existing_EMI + Monthly_EMI) / Applicant_Income
    """
    data = df.copy()
    
    app_inc_safe = data['Applicant_Income'].astype(float).replace(0, 1.0).fillna(1.0)
    
    # Amortized Monthly EMI (13.5% p.a.)
    r = 0.135 / 12.0
    terms = data['Loan_Term'].astype(float).replace(0, 1.0).fillna(1.0)
    factor = (1.0 + r) ** terms
    denom = np.where(factor == 1.0, 1.0, factor - 1.0)
    data['Monthly_EMI'] = np.round(data['Loan_Amount'].astype(float) * (r * factor) / denom, 2)
    
    # FOIR
    existing = data['Existing_EMI'].astype(float).fillna(0.0)
    data['FOIR'] = np.round((existing + data['Monthly_EMI']) / app_inc_safe, 4)
    
    return data

def get_personalloan_feature_names():
    categorical_cols = ['Gender', 'Married', 'Education', 'Employment_Status', 'Loan_Purpose']
    numerical_cols = [
        'Age', 'Dependents', 'Work_Experience',
        'Applicant_Income', 'Existing_EMI',
        'Loan_Amount', 'Loan_Term',
        'Credit_Card_Utilization', 'CIBIL_Score', 'Missed_Payments_12M',
        'Monthly_EMI', 'FOIR'
    ]
    return categorical_cols, numerical_cols

def build_personalloan_preprocessor():
    categorical_cols, numerical_cols = get_personalloan_feature_names()
    
    categorical_transformer = Pipeline(steps=[
        ('onehot', OneHotEncoder(drop='first', sparse_output=False, handle_unknown='ignore'))
    ])
    
    numerical_transformer = Pipeline(steps=[
        ('scaler', StandardScaler())
    ])
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', categorical_transformer, categorical_cols),
            ('num', numerical_transformer, numerical_cols)
        ],
        remainder='drop'
    )
    return preprocessor

