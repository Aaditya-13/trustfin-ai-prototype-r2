import pandas as pd
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from backend.app.ml.product_policy import add_product_financial_features

def add_personalloan_financial_features(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate financial inputs using the shared project policy."""
    return add_product_financial_features(df, "personal_loan")

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

