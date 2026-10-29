import os
import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional

from backend.app.explainability.shap_explainer import SHAPExplainer
from backend.app.explainability.lime_explainer import LIMEExplainer
from backend.app.ml.preprocessing_homeloan import add_homeloan_financial_features
from backend.app.ml.preprocessing_personalloan import add_personalloan_financial_features
from backend.app.ml.preprocessing import add_financial_features as add_legacy_features

class ProductPipeline:
    def __init__(
        self,
        product_id: str,
        title: str,
        model,
        preprocessor,
        feature_names: list,
        shap_explainer: SHAPExplainer,
        lime_explainer: LIMEExplainer,
        feature_fn,
        raw_features: list,
        metrics: dict
    ):
        self.product_id = product_id
        self.title = title
        self.model = model
        self.preprocessor = preprocessor
        self.feature_names = feature_names
        self.shap_explainer = shap_explainer
        self.lime_explainer = lime_explainer
        self.feature_fn = feature_fn
        self.raw_features = raw_features
        self.metrics = metrics

class ModelRegistry:
    def __init__(self):
        self.pipelines: Dict[str, ProductPipeline] = {}
        self._initialize_pipelines()

    def _initialize_pipelines(self):
        # 1. Load Home Loan Pipeline
        hl_dir = 'models/homeloan'
        if os.path.exists(os.path.join(hl_dir, 'model.pkl')):
            try:
                hl_model = joblib.load(os.path.join(hl_dir, 'model.pkl'))
                hl_pre = joblib.load(os.path.join(hl_dir, 'preprocessor.pkl'))
                with open(os.path.join(hl_dir, 'feature_names.json')) as f:
                    hl_feat_names = json.load(f)
                with open(os.path.join(hl_dir, 'metrics.json')) as f:
                    hl_metrics = json.load(f)
                hl_bg = np.load(os.path.join(hl_dir, 'background_data.npy'))
                
                hl_raw = [
                    'Gender', 'Married', 'Dependents', 'Education', 'Employment_Status',
                    'Age', 'Work_Experience', 'Applicant_Income', 'Coapplicant_Income',
                    'Existing_EMI', 'Loan_Amount', 'Loan_Term', 'Property_Value',
                    'Property_Area', 'CIBIL_Score', 'Missed_Payments_12M'
                ]
                
                hl_shap = SHAPExplainer(hl_model, hl_feat_names)
                hl_lime = LIMEExplainer(hl_bg, hl_feat_names)
                
                self.pipelines['home_loan'] = ProductPipeline(
                    product_id='home_loan',
                    title='Residential Home Loan',
                    model=hl_model,
                    preprocessor=hl_pre,
                    feature_names=hl_feat_names,
                    shap_explainer=hl_shap,
                    lime_explainer=hl_lime,
                    feature_fn=add_homeloan_financial_features,
                    raw_features=hl_raw,
                    metrics=hl_metrics
                )
                print("[OK] Home Loan pipeline registered.")
            except Exception as e:
                print(f"Error registering Home Loan pipeline: {e}")

        # 2. Load Personal Loan Pipeline
        pl_dir = 'models/personalloan'
        if os.path.exists(os.path.join(pl_dir, 'model.pkl')):
            try:
                pl_model = joblib.load(os.path.join(pl_dir, 'model.pkl'))
                pl_pre = joblib.load(os.path.join(pl_dir, 'preprocessor.pkl'))
                with open(os.path.join(pl_dir, 'feature_names.json')) as f:
                    pl_feat_names = json.load(f)
                with open(os.path.join(pl_dir, 'metrics.json')) as f:
                    pl_metrics = json.load(f)
                pl_bg = np.load(os.path.join(pl_dir, 'background_data.npy'))
                
                pl_raw = [
                    'Gender', 'Age', 'Married', 'Dependents', 'Education',
                    'Employment_Status', 'Work_Experience', 'Applicant_Income',
                    'Existing_EMI', 'Loan_Amount', 'Loan_Term', 'Loan_Purpose',
                    'Credit_Card_Utilization', 'CIBIL_Score', 'Missed_Payments_12M'
                ]
                
                pl_shap = SHAPExplainer(pl_model, pl_feat_names)
                pl_lime = LIMEExplainer(pl_bg, pl_feat_names)
                
                self.pipelines['personal_loan'] = ProductPipeline(
                    product_id='personal_loan',
                    title='Personal & Retail Credit',
                    model=pl_model,
                    preprocessor=pl_pre,
                    feature_names=pl_feat_names,
                    shap_explainer=pl_shap,
                    lime_explainer=pl_lime,
                    feature_fn=add_personalloan_financial_features,
                    raw_features=pl_raw,
                    metrics=pl_metrics
                )
                print("[OK] Personal Loan pipeline registered.")
            except Exception as e:
                print(f"Error registering Personal Loan pipeline: {e}")

        # 3. Load Legacy Pipeline (for backwards compatibility with existing tests)
        if os.path.exists('models/loan_prediction_model.pkl'):
            try:
                leg_model = joblib.load('models/loan_prediction_model.pkl')
                leg_pre = joblib.load('models/preprocessor.pkl')
                with open('models/feature_config.json') as f:
                    leg_conf = json.load(f)
                leg_feat_names = leg_conf["transformed_features"]
                leg_raw = leg_conf["raw_features"]
                
                # Load training data for LIME baseline
                leg_train = pd.read_csv('data/processed/train_clean.csv')[leg_raw]
                leg_bg = leg_pre.transform(leg_train)
                leg_shap = SHAPExplainer(leg_model, leg_feat_names)
                leg_lime = LIMEExplainer(leg_bg, leg_feat_names)
                
                self.pipelines['legacy'] = ProductPipeline(
                    product_id='legacy',
                    title='Legacy Loan Model',
                    model=leg_model,
                    preprocessor=leg_pre,
                    feature_names=leg_feat_names,
                    shap_explainer=leg_shap,
                    lime_explainer=leg_lime,
                    feature_fn=add_legacy_features,
                    raw_features=leg_raw,
                    metrics={"accuracy": 0.82}
                )
                print("[OK] Legacy loan pipeline registered.")
            except Exception as e:
                print(f"Error registering Legacy pipeline: {e}")

    def get_pipeline(self, product_id: Optional[str] = None) -> ProductPipeline:
        """
        Retrieves the appropriate product pipeline.
        Defaults to 'home_loan' if available, else 'legacy'.
        """
        if not product_id:
            product_id = 'home_loan' if 'home_loan' in self.pipelines else 'legacy'
            
        pid = product_id.lower().replace('-', '_').replace(' ', '_')
        if pid in self.pipelines:
            return self.pipelines[pid]
        if 'home_loan' in pid and 'home_loan' in self.pipelines:
            return self.pipelines['home_loan']
        if 'personal' in pid and 'personal_loan' in self.pipelines:
            return self.pipelines['personal_loan']
            
        # Fallback
        if 'home_loan' in self.pipelines:
            return self.pipelines['home_loan']
        if 'legacy' in self.pipelines:
            return self.pipelines['legacy']
        raise ValueError(f"No pipeline found for product '{product_id}'")

    def normalize_input(self, product_id: str, raw_data: dict) -> dict:
        """
        Normalizes input dictionary, handling CIBIL vs Credit_History conversions,
        defaults for missing fields, and type coercion.
        """
        clean = raw_data.copy()
        
        # Gender
        if 'Gender' not in clean or not clean['Gender']:
            clean['Gender'] = 'Male'
            
        # Married
        if 'Married' not in clean or not clean['Married']:
            clean['Married'] = 'No'
            
        # Dependents
        clean['Dependents'] = int(clean.get('Dependents', 0))
        
        # Education
        clean['Education'] = clean.get('Education', 'Graduate')
        
        # Employment Status
        clean['Employment_Status'] = clean.get('Employment_Status', 'Salaried')
        
        # Age
        clean['Age'] = float(clean.get('Age', 32))
        
        # Work Experience
        if 'Work_Experience' not in clean or clean['Work_Experience'] is None:
            clean['Work_Experience'] = max(1, int(clean['Age'] - 22))
        else:
            clean['Work_Experience'] = int(clean['Work_Experience'])
            
        # Income & EMIs
        clean['Applicant_Income'] = float(clean.get('Applicant_Income', 50000))
        clean['Coapplicant_Income'] = float(clean.get('Coapplicant_Income', 0))
        clean['Existing_EMI'] = float(clean.get('Existing_EMI', 0))
        clean['Loan_Amount'] = float(clean.get('Loan_Amount', 200000))
        clean['Loan_Term'] = int(clean.get('Loan_Term', 240 if 'home' in product_id else 36))
        
        # CIBIL Score handling (converts legacy Credit_History if needed)
        if 'CIBIL_Score' in clean and clean['CIBIL_Score'] is not None:
            clean['CIBIL_Score'] = int(clean['CIBIL_Score'])
        elif 'Credit_History' in clean and clean['Credit_History'] is not None:
            clean['CIBIL_Score'] = 750 if int(clean['Credit_History']) == 1 else 480
        else:
            clean['CIBIL_Score'] = 720
            
        # Missed Payments (12M)
        if 'Missed_Payments_12M' not in clean or clean['Missed_Payments_12M'] is None:
            clean['Missed_Payments_12M'] = 0 if clean['CIBIL_Score'] >= 720 else (1 if clean['CIBIL_Score'] >= 620 else 2)
        else:
            clean['Missed_Payments_12M'] = int(clean['Missed_Payments_12M'])
            
        # Home Loan specific
        if 'home' in product_id:
            clean['Property_Area'] = clean.get('Property_Area', 'Urban')
            if 'Property_Value' not in clean or clean['Property_Value'] is None or float(clean['Property_Value']) <= 0:
                clean['Property_Value'] = float(clean['Loan_Amount']) / 0.75  # default 75% LTV
            else:
                clean['Property_Value'] = float(clean['Property_Value'])
                
        # Personal Loan specific
        if 'personal' in product_id:
            clean['Loan_Purpose'] = clean.get('Loan_Purpose', 'Medical_Emergency')
            cc_val = clean.get('Credit_Card_Utilization')
            if cc_val is None or cc_val == '':
                clean['Credit_Card_Utilization'] = 0.30 if clean['CIBIL_Score'] >= 700 else 0.65
            else:
                try:
                    clean['Credit_Card_Utilization'] = max(0.0, min(1.0, float(cc_val)))
                except (ValueError, TypeError):
                    clean['Credit_Card_Utilization'] = 0.0
                
        return clean

# Singleton instance
registry = ModelRegistry()
