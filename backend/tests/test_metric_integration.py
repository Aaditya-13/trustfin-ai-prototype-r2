"""Focused metric and API regressions with an isolated in-memory database."""

import json
import os
import unittest
from math import log
from unittest.mock import patch

import numpy as np
import pandas as pd

from backend.app.explainability.schemas import FeatureContribution, StandardExplanation, ExplanationReconstruction
from backend.app.ml.preprocessing_homeloan import add_homeloan_financial_features, build_homeloan_preprocessor
from backend.app.ml.preprocessing_personalloan import add_personalloan_financial_features, build_personalloan_preprocessor
from backend.app.trust.trust_score import DEFAULT_TRUST_WEIGHTS, TrustEvaluation, calculate_trust_score
from backend.app.validation.consistency import calculate_consistency
from backend.app.validation.fairness import calculate_counterfactual_fairness, calculate_equal_opportunity_ratio
from backend.app.validation.faithfulness import calculate_faithfulness
from backend.app.validation.stability import calculate_stability


def explanation(values, method="SHAP", base=None):
    return StandardExplanation(method=method, features=[
        FeatureContribution(
            feature=name, value=0, contribution=value,
            direction="positive" if value > 0 else "negative" if value < 0 else "neutral",
        )
        for name, value in values.items()
    ], reconstruction=None if base is None else ExplanationReconstruction(
        baseValue=base, outputSpace='log_odds' if method == 'SHAP' else 'probability',
        featureMultipliers={name: 1.0 for name in values}, fullPrediction=base + sum(values.values()),
    ))


class LinearProbabilityModel:
    def predict_proba(self, values):
        values = np.atleast_2d(values)
        probability = 0.5 + 0.2 * values[:, 0] - 0.1 * values[:, 1]
        return np.column_stack([1 - probability, probability])

    def predict(self, values):
        return (self.predict_proba(values)[:, 1] > 0.5).astype(int)


class GenderProbabilityModel:
    def __init__(self, gender_index):
        self.gender_index = gender_index

    def predict_proba(self, values):
        probability = 0.45 + 0.1 * values[:, self.gender_index]
        return np.column_stack([1 - probability, probability])


class UploadedMetricTests(unittest.TestCase):
    def test_faithfulness_uses_the_same_probability_scale_for_both_outcomes(self):
        for probability in (0.2, 0.8):
            with self.subTest(probability=probability):
                result = calculate_faithfulness(
                    probability,
                    explanation({'a': log(probability / (1 - probability))}, base=0),
                    explanation({'a': probability - 0.04}, 'LIME', base=0),
                )
                self.assertAlmostEqual(result, 0.984)

    def test_faithfulness_retains_error_of_out_of_range_lime_estimates(self):
        result = calculate_faithfulness(
            0.8, explanation({'a': log(4)}, base=0),
            explanation({'a': 1.2}, 'LIME', base=0),
        )
        self.assertAlmostEqual(result, 0.84)

    def test_stability_and_consistency_respond_to_direction_changes(self):
        original = explanation({"a": 3, "b": 2, "c": 1})
        reversed_direction = explanation({"a": -3, "b": -2, "c": -1})
        self.assertAlmostEqual(calculate_stability(original, original), 1)
        self.assertLess(calculate_stability(original, reversed_direction), 1)
        self.assertAlmostEqual(calculate_consistency(original, original), 1)
        self.assertLess(calculate_consistency(original, reversed_direction), 1)

    def test_consistency_uses_top_five_by_default(self):
        shap = explanation({"a": 5, "b": 4, "c": 3, "d": 2, "e": 1})
        lime = explanation({"a": 5, "b": 4, "c": 3, "f": 2, "g": 1}, "LIME")
        self.assertAlmostEqual(calculate_consistency(shap, lime), 0.6 * 3 / 7 + 0.4)

    def test_empty_explanations(self):
        empty = explanation({})
        self.assertEqual(calculate_stability(empty, empty), 0)
        self.assertEqual(calculate_consistency(empty, empty), 0)

    def test_fairness_preserves_derived_columns_for_both_product_preprocessors(self):
        for product, feature_fn, builder in (
            ("homeloan", add_homeloan_financial_features, build_homeloan_preprocessor),
            ("personalloan", add_personalloan_financial_features, build_personalloan_preprocessor),
        ):
            with self.subTest(product=product):
                raw = pd.read_csv(f"datasets/{product}_train.csv").drop(columns=["Loan_ID", "Loan_Status"])
                sample = raw.groupby("Gender").head(1).copy()
                preprocessor = builder()
                preprocessor.fit(feature_fn(sample))
                names = list(preprocessor.get_feature_names_out())
                gender_index = names.index("cat__Gender_Male")
                result = calculate_counterfactual_fairness(
                    GenderProbabilityModel(gender_index), preprocessor,
                    sample.iloc[0].to_dict(), list(raw.columns), feature_fn=feature_fn,
                )
                self.assertAlmostEqual(result, 0.9)

    def test_missing_gender_does_not_award_perfect_fairness(self):
        self.assertEqual(calculate_counterfactual_fairness(None, None, {}, []), 0)

    def test_equal_opportunity_and_unavailable_groups(self):
        self.assertAlmostEqual(calculate_equal_opportunity_ratio(
            np.ones(4), np.array([1, 1, 1, 0]), np.array(["Male", "Male", "Female", "Female"]),
        ), 0.5)
        self.assertEqual(calculate_equal_opportunity_ratio(
            np.ones(2), np.ones(2), np.array(["Male", "Male"]),
        ), 0)

    def test_fairness_has_no_effect_on_combined_score(self):
        for fairness in (0, 0.5, 1, None):
            result = calculate_trust_score(0.5, 0.8, 0.9, fairness=fairness)
            self.assertAlmostEqual(result.overallTrustScore, 2.2 / 3)
            self.assertEqual(result.fairness, fairness)
            self.assertEqual(result.weights, DEFAULT_TRUST_WEIGHTS)

    def test_weights_are_validated(self):
        with self.assertRaises(ValueError):
            calculate_trust_score(1, 1, 1, weights={"faithfulness": 0.4, "stability": 0.2, "consistency": 0.2})
        with self.assertRaises(ValueError):
            calculate_trust_score(1, 1, 1, weights={**DEFAULT_TRUST_WEIGHTS, "fairness": 0.1})

    def test_old_saved_scores_can_be_loaded_without_weight_metadata(self):
        saved = TrustEvaluation(faithfulness=0.8, stability=0.9, consistency=1, fairness=1, overallTrustScore=0.9)
        self.assertIsNone(saved.weights)


class MetricApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ.setdefault("USE_LOCAL_SQLITE", "1")
        from fastapi.testclient import TestClient
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        from sqlalchemy.pool import StaticPool
        from backend.app.main import app
        from backend.app.db.session import Base, get_db

        cls.app = app
        cls.get_db = get_db
        cls.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(cls.engine)
        cls.sessions = sessionmaker(bind=cls.engine)

        def database():
            with cls.sessions() as session:
                yield session

        cls.app.dependency_overrides[get_db] = database
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        cls.app.dependency_overrides.pop(cls.get_db, None)
        cls.engine.dispose()

    def test_batch_results_keep_new_faithfulness_details(self):
        rows = pd.read_csv('datasets/personalloan_train.csv').drop(columns=['Loan_ID', 'Loan_Status']).head(2)
        response = self.client.post('/api/v1/loan/predict-batch-json', json={
            'filename': 'concordance-test.csv', 'loan_type': 'personal_loan', 'rows': rows.to_dict('records'),
        })
        self.assertEqual(response.status_code, 200, response.text)
        batch = response.json()
        self.assertEqual(batch['validRecords'], 2)
        for result in batch['processedResults']:
            self.assertEqual(result['faithfulnessCheck']['weights'], {'shap': .6, 'lime': .4})
            detail = self.client.get(f"/api/v1/loan/evaluations/{result['evaluationId']}")
            self.assertEqual(detail.json()['predictionResult']['faithfulnessCheck'], result['faithfulnessCheck'])

    def test_missing_reconstruction_reports_unavailable_and_does_not_save_a_score(self):
        from backend.app.ml.registry import registry
        from backend.app.db.models import PredictionLog
        row = pd.read_csv('datasets/personalloan_train.csv').drop(columns=['Loan_ID', 'Loan_Status']).iloc[0].to_dict()
        with self.sessions() as session:
            count_before = session.query(PredictionLog).count()
        pipe = registry.get_pipeline('personal_loan')
        with patch.object(pipe.lime_explainer, 'explain_instance', return_value=explanation({'a': .1}, 'LIME')):
            response = self.client.post('/api/v1/loan/predict', json={**row, 'loan_type': 'personal_loan'})
        self.assertEqual(response.status_code, 422)
        self.assertIn('Faithfulness cannot be evaluated', response.json()['detail'])
        with self.sessions() as session:
            self.assertEqual(session.query(PredictionLog).count(), count_before)

    def test_prediction_history_and_pdf_use_new_weights(self):
        import pymupdf
        from backend.app.db.models import PredictionLog

        for product, loan_type in (("homeloan", "home_loan"), ("personalloan", "personal_loan")):
            with self.subTest(product=product):
                frame = pd.read_csv(f"datasets/{product}_train.csv").drop(columns=["Loan_ID", "Loan_Status"])
                applicant = {**frame.iloc[0].to_dict(), "loan_type": loan_type}
                response = self.client.post("/api/v1/loan/predict", json=applicant)
                self.assertEqual(response.status_code, 200, response.text)
                result = response.json()
                trust = result["trustScore"]
                faithfulness_check = result['faithfulnessCheck']
                self.assertEqual(faithfulness_check['method'], 'local_concordance')
                self.assertEqual(faithfulness_check['weights'], {'shap': 0.6, 'lime': 0.4})
                self.assertAlmostEqual(trust['faithfulness'], 0.6 * faithfulness_check['shap']['score'] + 0.4 * faithfulness_check['lime']['score'])
                self.assertAlmostEqual(faithfulness_check['modelApprovalProbability'], result['probability'])
                for name in ('shap', 'lime'):
                    self.assertEqual(len(faithfulness_check[name]['selectedFeatures']), 5)
                    self.assertIsNotNone(result[name]['reconstruction'])
                stability_check = result['stabilityCheck']
                self.assertEqual(stability_check['method'], 'SHAP')
                self.assertEqual(stability_check['testedSamples'], 20)
                self.assertAlmostEqual(stability_check['score'], trust['stability'])
                self.assertLessEqual(stability_check['minimumScore'], stability_check['score'])
                self.assertEqual(stability_check['predictionChanges'], sum(c['predictionChanged'] for c in stability_check['comparisons']))
                self.assertNotIn('Gender', stability_check['testedFields'])
                self.assertEqual(trust["weights"], DEFAULT_TRUST_WEIGHTS)
                self.assertAlmostEqual(trust["overallTrustScore"], (trust["faithfulness"] + trust["stability"] + trust["consistency"]) / 3)
                for metric in ("faithfulness", "stability", "consistency", "fairness"):
                    self.assertTrue(0 <= trust[metric] <= 1)
                expected_consistency = calculate_consistency(
                    StandardExplanation.model_validate(result["shap"]),
                    StandardExplanation.model_validate(result["lime"]),
                )
                self.assertAlmostEqual(trust["consistency"], expected_consistency)
                detail = self.client.get(f"/api/v1/loan/evaluations/{result['evaluationId']}")
                self.assertEqual(detail.status_code, 200)
                self.assertEqual(detail.json()["predictionResult"]["trustScore"], trust)
                self.assertEqual(detail.json()['predictionResult']['stabilityCheck'], stability_check)
                self.assertEqual(detail.json()['predictionResult']['faithfulnessCheck'], faithfulness_check)

                pdf = self.client.post("/api/v1/loan/generate-pdf", json={"applicantData": applicant, "predictionResult": result})
                self.assertEqual(pdf.status_code, 200)
                with pymupdf.open(stream=pdf.content, filetype="pdf") as document:
                    text = "\n".join(page.get_text() for page in document)
                for label in ("Faithfulness (33.33%)", "Stability (33.33%)", "Consistency (33.33%)", "Fairness (audit)"):
                    self.assertIn(label, text)
                self.assertIn('SHAP stability:', text)
                self.assertIn('20 nearby applications', text)
                self.assertIn('Faithfulness (local concordance)', text)
                self.assertIn('weight 60%', text)
                self.assertIn('weight 40%', text)

                legacy = json.loads(json.dumps(result))
                legacy["trustScore"].pop("weights")
                legacy.pop('stabilityCheck')
                legacy.pop('faithfulnessCheck')
                legacy['shap'].pop('reconstruction')
                legacy['lime'].pop('reconstruction')
                with self.sessions() as session:
                    record = session.get(PredictionLog, result["evaluationId"])
                    record.full_response = legacy
                    session.commit()
                historical = self.client.get(f"/api/v1/loan/evaluations/{result['evaluationId']}").json()
                self.assertIsNone(historical["predictionResult"]["trustScore"]["weights"])
                self.assertIsNone(historical['predictionResult']['stabilityCheck'])
                self.assertIsNone(historical['predictionResult']['faithfulnessCheck'])
                self.assertIsNone(historical['predictionResult']['shap']['reconstruction'])
                self.assertEqual(historical["predictionResult"]["trustScore"]["overallTrustScore"], trust["overallTrustScore"])
