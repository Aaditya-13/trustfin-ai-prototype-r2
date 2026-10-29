import pandas as pd
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder

def add_homeloan_financial_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes domain-specific financial features for Home Loan underwriting:
    - Total_Income = Applicant_Income + Coapplicant_Income
    - Monthly_EMI = Standard home loan amortization at 8.5% p.a.
    - FOIR = (Existing_EMI + Monthly_EMI) / Total_Income
    - LTV_Ratio = (Loan_Amount / Property_Value) * 100
    """
    data = df.copy()
    
    # Safe Total Income
    total_inc = data['Applicant_Income'].astype(float) + data['Coapplicant_Income'].astype(float)
    total_inc_safe = total_inc.replace(0, 1.0).fillna(1.0)
    data['Total_Income'] = total_inc
    
    # Amortized Monthly EMI (8.5% p.a.)
    r = 0.085 / 12.0
    terms = data['Loan_Term'].astype(float).replace(0, 1.0).fillna(1.0)
    factor = (1.0 + r) ** terms
    denom = np.where(factor == 1.0, 1.0, factor - 1.0)
    data['Monthly_EMI'] = np.round(data['Loan_Amount'].astype(float) * (r * factor) / denom, 2)
    
    # FOIR
    existing = data['Existing_EMI'].astype(float).fillna(0.0)
    data['FOIR'] = np.round((existing + data['Monthly_EMI']) / total_inc_safe, 4)
    
    # LTV Ratio
    prop_val = data['Property_Value'].astype(float).replace(0, 1.0).fillna(1.0)
    data['LTV_Ratio'] = np.round((data['Loan_Amount'].astype(float) / prop_val) * 100.0, 2)
    
    return data

def get_homeloan_feature_names():
    categorical_cols = ['Gender', 'Married', 'Education', 'Employment_Status', 'Property_Area']
    numerical_cols = [
        'Age', 'Dependents', 'Work_Experience',
        'Applicant_Income', 'Coapplicant_Income', 'Existing_EMI',
        'Loan_Amount', 'Loan_Term', 'Property_Value',
        'CIBIL_Score', 'Missed_Payments_12M',
        'Monthly_EMI', 'FOIR', 'LTV_Ratio'
    ]
    return categorical_cols, numerical_cols

def build_homeloan_preprocessor():
    categorical_cols, numerical_cols = get_homeloan_feature_names()
    
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

