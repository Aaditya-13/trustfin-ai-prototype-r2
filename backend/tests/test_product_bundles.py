"""Model/reference consistency and policy handling with an in-memory database."""
import json
import os
from pathlib import Path
import unittest
from unittest.mock import patch

import numpy as np
import pandas as pd

from backend.app.ml.bundle import ROOT, fingerprint, load_product_bundle
from backend.app.ml.policy_assessment import assess_policy
from backend.app.ml.preprocessing_homeloan import add_homeloan_financial_features
from backend.app.ml.preprocessing_personalloan import add_personalloan_financial_features
from backend.app.ml.product_policy import rejection_flags

PRODUCTS = [('home_loan', 'homeloan', add_homeloan_financial_features),
            ('personal_loan', 'personalloan', add_personalloan_financial_features)]


class BundleTests(unittest.TestCase):
    def test_complete_bundles_and_backgrounds_load(self):
        for product, suffix, features in PRODUCTS:
            with self.subTest(product=product):
                model, pre, names, metrics, bg, meta = load_product_bundle(ROOT/'models'/suffix, product, features)
                self.assertIn('Gender_Male', names)
                self.assertEqual(bg.shape, (200, len(names)))
                self.assertEqual(metrics['model_version'], meta['model_version'])
                self.assertTrue(metrics['evaluation']['independent']['accuracy_before_policy_overrides'])

    def test_changed_reference_file_is_rejected(self):
        def damaged(path):
            return 'corrupt' if Path(path).name == 'background_data.npy' else fingerprint(path)
        with patch('backend.app.ml.bundle.fingerprint', side_effect=damaged):
            with self.assertRaisesRegex(ValueError, 'background_data.npy'):
                load_product_bundle(ROOT/'models/homeloan', 'home_loan', add_homeloan_financial_features)

    def test_changed_dataset_is_rejected(self):
        def damaged(path):
            return 'corrupt' if Path(path).name == 'homeloan_train.csv' else fingerprint(path)
        with patch('backend.app.ml.bundle.fingerprint', side_effect=damaged):
            with self.assertRaisesRegex(ValueError, 'dataset fingerprint'):
                load_product_bundle(ROOT/'models/homeloan', 'home_loan', add_homeloan_financial_features)

    def test_policy_blocks_every_failed_boundary_rule(self):
        for product, suffix, _ in PRODUCTS:
            df = pd.read_csv(ROOT/f'datasets/evaluation/{suffix}_boundary.csv')
            flags = rejection_flags(df, product)
            for i in np.flatnonzero(flags.any(axis=1).to_numpy()):
                outcome = assess_policy(df.iloc[[i]], product, 'Approved')
                self.assertFalse(outcome['passed'])
                self.assertEqual(outcome['decision'], 'Rejected')
                self.assertTrue(outcome['reasons'])

    def test_unavailable_personal_product_does_not_fall_back_to_home(self):
        from backend.app.ml.registry import ModelRegistry
        registry = ModelRegistry.__new__(ModelRegistry)
        registry.pipelines = {'home_loan': object()}
        with self.assertRaises(ValueError):
            registry.get_pipeline('personal_loan')


class ProductApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ.setdefault('USE_LOCAL_SQLITE', '1')
        from fastapi.testclient import TestClient
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        from sqlalchemy.pool import StaticPool
        from backend.app.main import app
        from backend.app.db.session import Base, get_db
        cls.app, cls.get_db = app, get_db
        cls.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
        Base.metadata.create_all(cls.engine)
        cls.sessions = sessionmaker(bind=cls.engine)
        def database():
            with cls.sessions() as session:
                yield session
        app.dependency_overrides[get_db] = database
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        cls.app.dependency_overrides.pop(cls.get_db, None)
        cls.engine.dispose()

    def test_model_policy_history_and_pdf_are_distinct(self):
        import pymupdf
        for product, suffix, _ in PRODUCTS:
            info = json.loads((ROOT/f'models/{suffix}/metrics.json').read_text())
            violations = info['evaluation']['independent']['policy_violation_ids']
            self.assertTrue(violations, 'This regression expects an observed raw-model policy violation')
            frame = pd.read_csv(ROOT/f'datasets/evaluation/{suffix}_independent.csv')
            raw = frame[frame.Loan_ID == violations[0]].iloc[0].drop(labels=['Loan_ID', 'Loan_Status']).to_dict()
            raw['loan_type'] = product
            response = self.client.post('/api/v1/loan/predict', json=raw)
            self.assertEqual(response.status_code, 200, response.text)
            result = response.json()
            self.assertEqual(result['modelVersion'], info['model_version'])
            self.assertEqual(result['prediction'], 'Approved')
            self.assertEqual(result['policyCheck']['decision'], 'Rejected')
            self.assertFalse(result['policyCheck']['passed'])
            history = self.client.get(f"/api/v1/loan/evaluations/{result['evaluationId']}").json()
            self.assertEqual(history['predictionResult']['policyCheck'], result['policyCheck'])
            pdf = self.client.post('/api/v1/loan/generate-pdf', json={'applicantData': raw, 'predictionResult': result})
            self.assertEqual(pdf.status_code, 200, pdf.text if pdf.status_code != 200 else '')
            with pymupdf.open(stream=pdf.content, filetype='pdf') as document:
                text = '\n'.join(p.get_text() for p in document)
            self.assertIn('Project policy checks: FAILED', text)
            self.assertIn('Assessment outcome: Rejected', text)

    def test_personal_income_does_not_include_coapplicant(self):
        raw = pd.read_csv(ROOT/'datasets/personalloan_train.csv').iloc[0].drop(labels=['Loan_ID','Loan_Status']).to_dict()
        raw.update(loan_type='personal_loan', Coapplicant_Income=1000000)
        response = self.client.post('/api/v1/loan/predict', json=raw)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()['solvencyCheck']['totalIncome'], raw['Applicant_Income'])

    def test_missing_product_returns_unavailable(self):
        from backend.app.api.routes import prediction
        raw = pd.read_csv(ROOT/'datasets/personalloan_train.csv').iloc[0].drop(labels=['Loan_ID','Loan_Status']).to_dict()
        raw['loan_type'] = 'personal_loan'
        with patch.object(prediction.registry, 'get_pipeline', side_effect=ValueError('broken bundle')):
            response = self.client.post('/api/v1/loan/predict', json=raw)
            batch = self.client.post('/api/v1/loan/predict-batch-json', json={'loan_type': 'personal_loan', 'rows': [raw], 'filename': 'unavailable.csv'})
        self.assertEqual(response.status_code, 503)
        self.assertEqual(batch.status_code, 503)


if __name__ == '__main__':
    unittest.main()
