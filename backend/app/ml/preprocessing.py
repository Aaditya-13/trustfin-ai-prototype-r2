import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder

def add_financial_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes domain-specific financial features:
    - Monthly_EMI = Loan_Amount / Loan_Term
    - Total_Income = Applicant_Income + Coapplicant_Income
    - DTI_Ratio = Monthly_EMI / Total_Income (Debt-to-Income / Solvency Ratio)
    """
    data = df.copy()
    term_safe = data['Loan_Term'].astype(float).replace(0, 1.0).fillna(1.0)
    data['Monthly_EMI'] = data['Loan_Amount'].astype(float) / term_safe
    
    total_income = data['Applicant_Income'].astype(float) + data['Coapplicant_Income'].astype(float)
    total_income_safe = total_income.replace(0, 1.0).fillna(1.0)
    data['DTI_Ratio'] = data['Monthly_EMI'] / total_income_safe
    return data

def get_feature_names():
    """Returns the lists of categorical, numerical, and passthrough feature names."""
    categorical_cols = ['Gender', 'Married', 'Education', 'Employment_Status', 'Property_Area']
    numerical_cols = [
        'Dependents', 'Applicant_Income', 'Coapplicant_Income',
        'Loan_Amount', 'Loan_Term', 'Age', 'Monthly_EMI', 'DTI_Ratio'
    ]
    passthrough_cols = ['Credit_History']
    
    return categorical_cols, numerical_cols, passthrough_cols

def build_preprocessor():
    """
    Builds and returns the Scikit-Learn ColumnTransformer for preprocessing.
    """
    categorical_cols, numerical_cols, passthrough_cols = get_feature_names()
    
    # Categorical: One-Hot Encoding, dropping the first category to avoid multicollinearity
    categorical_transformer = Pipeline(steps=[
        ('onehot', OneHotEncoder(drop='first', handle_unknown='ignore'))
    ])
    
    # Numerical: Standardization
    numerical_transformer = Pipeline(steps=[
        ('scaler', StandardScaler())
    ])
    
    # Combine transformers
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numerical_transformer, numerical_cols),
            ('cat', categorical_transformer, categorical_cols),
            ('pass', 'passthrough', passthrough_cols)
        ],
        remainder='drop'
    )
    
    return preprocessor
