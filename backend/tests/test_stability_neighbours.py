"""Financial-neighbour invariants, meaningful similarity cases and batching."""
from types import SimpleNamespace
import unittest
from unittest.mock import Mock

import numpy as np
import pandas as pd

from backend.app.explainability.schemas import FeatureContribution, StandardExplanation
from backend.app.ml.product_policy import add_product_financial_features
from backend.app.validation.stability import (
    calculate_stability, evaluate_shap_stability, make_stability_neighbours, StabilityNotEvaluable,
)


def explanation(values):
    return StandardExplanation(method='SHAP', features=[FeatureContribution(feature=f, value=0, contribution=v,
        direction='positive' if v>0 else ('negative' if v<0 else 'neutral')) for f,v in values.items()])


def applicant():
    return dict(Gender='Female', Married='Yes', Education='Graduate', Employment_Status='Salaried',
                Dependents=1, Age=32, Work_Experience=10, Applicant_Income=50000., Existing_EMI=0.,
                Coapplicant_Income=0., Loan_Amount=300000., Loan_Term=36, CIBIL_Score=760,
                Missed_Payments_12M=0, Loan_Purpose='Education', Credit_Card_Utilization=0.)


class RecordingPreprocessor:
    def __init__(self):
        self.frames = []

    def transform(self, frame):
        self.frames.append(frame.copy())
        return frame[['Applicant_Income','Loan_Amount','CIBIL_Score','FOIR','Credit_Card_Utilization']].to_numpy(dtype=float)


class ThresholdModel:
    def predict_proba(self, x):
        p=np.where(x[:,0]>=50000, .51, .49)
        return np.column_stack([1-p,p])

    def predict(self, x):
        return (self.predict_proba(x)[:,1]>=.5).astype(int)


class StabilityNeighbourTests(unittest.TestCase):
    def test_fixed_bounded_changes_preserve_categories_counts_and_term(self):
        raw=applicant()
        candidates=make_stability_neighbours(raw,list(raw))
        self.assertEqual(len(candidates),20)
        self.assertEqual(candidates,make_stability_neighbours(dict(reversed(list(raw.items()))),list(raw)))
        for changed,field,old,new in candidates:
            self.assertEqual({k for k in raw if raw[k]!=changed[k]}, {field})
            self.assertEqual(changed['Gender'],'Female')
            self.assertEqual(changed['Loan_Term'],36)
            self.assertEqual(changed['Missed_Payments_12M'],0)
            if field=='CIBIL_Score':
                self.assertLessEqual(abs(new-old),5)
                self.assertTrue(float(new).is_integer())
            elif field=='Credit_Card_Utilization':
                self.assertTrue(0<=new<=1)
                self.assertLessEqual(abs(new-old),.01)
            else:
                self.assertLessEqual(abs(new/old-1),.0200001)

    def test_zero_debt_is_not_replaced_with_an_invented_amount(self):
        raw=applicant()
        candidates=make_stability_neighbours(raw,list(raw))
        self.assertNotIn('Existing_EMI',[c[1] for c in candidates])
        self.assertNotIn('Coapplicant_Income',[c[1] for c in candidates])
        self.assertTrue(all(c[0]['Existing_EMI']==0 for c in candidates))

    def test_credit_and_card_bounds_without_clipping_duplicates(self):
        raw=applicant()
        raw.update(CIBIL_Score=300,Credit_Card_Utilization=1.)
        cases=make_stability_neighbours(raw,list(raw))
        self.assertEqual(len(cases),20)
        self.assertTrue(all(c[0]['CIBIL_Score']>=300 and c[0]['Credit_Card_Utilization']<=1 for c in cases))
        self.assertEqual(len({(c[1],c[3]) for c in cases}),len(cases))

    def test_unavailable_or_unused_fields_do_not_create_fake_neighbours(self):
        raw=applicant()
        cases=make_stability_neighbours(raw,['Applicant_Income','Loan_Amount'])
        self.assertEqual(len(cases),20)
        self.assertEqual({c[1] for c in cases},{'Applicant_Income','Loan_Amount'})

    def test_currency_rounding_cannot_exceed_the_relative_change_limit(self):
        raw=applicant()
        raw.update(Loan_Amount=.26,Existing_EMI=.51,Coapplicant_Income=.01)
        for _,field,old,new in make_stability_neighbours(raw,list(raw)):
            if field not in ['CIBIL_Score','Credit_Card_Utilization']:
                self.assertLessEqual(abs(new-old),abs(old)*.02+1e-9)

    def test_recalculates_finances_batches_shap_and_retains_prediction_flips(self):
        raw=applicant()
        original=explanation({'income':3,'loan':2,'credit':1})
        pre=RecordingPreprocessor()
        shap=Mock()
        shap.explain_batch.side_effect=lambda x: [original.model_copy(deep=True) for _ in x]
        lime=Mock()
        pipe=SimpleNamespace(raw_features=list(raw),preprocessor=pre,model=ThresholdModel(),
                             feature_fn=lambda df:add_product_financial_features(df,'personal_loan'),
                             shap_explainer=shap,lime_explainer=lime)
        result=evaluate_shap_stability(pipe,raw,original)
        self.assertEqual(result.testedSamples,20)
        self.assertEqual(result.score,1.)
        self.assertGreater(result.predictionChanges,0)
        self.assertEqual(result.predictionChanges,sum(c.predictionChanged for c in result.comparisons))
        self.assertEqual(result.score,np.mean([c.score for c in result.comparisons]))
        shap.explain_batch.assert_called_once()
        lime.explain_instance.assert_not_called()
        neighbours=pre.frames[0]
        r=.135/12
        expected=np.round(neighbours.Loan_Amount*r*(1+r)**neighbours.Loan_Term/((1+r)**neighbours.Loan_Term-1),2)
        np.testing.assert_allclose(neighbours.Monthly_EMI,expected)
        np.testing.assert_allclose(neighbours.FOIR,np.round((neighbours.Existing_EMI+expected)/neighbours.Applicant_Income,4))

    def test_zero_or_missing_explanations_do_not_get_high_scores(self):
        zero=explanation({'a':0,'b':0})
        self.assertEqual(calculate_stability(zero,zero),0)
        with self.assertRaises(StabilityNotEvaluable):
            evaluate_shap_stability(None,applicant(),zero)

    def test_disappearing_contribution_counts_as_direction_disagreement(self):
        self.assertAlmostEqual(calculate_stability(explanation({'a':2,'b':1}),explanation({'a':0,'b':1})),.15)

    def test_single_feature_score_measures_ranking_and_sign_not_magnitude(self):
        self.assertEqual(calculate_stability(explanation({'a':1}),explanation({'a':100})),1)

    def test_minimum_reflects_a_bad_neighbour_not_only_the_average(self):
        raw=applicant()
        reference=explanation({'a':3,'b':2,'c':1})
        changed=explanation({'a':-1,'b':-2,'c':-3})
        pipe=SimpleNamespace(raw_features=list(raw),preprocessor=RecordingPreprocessor(),model=ThresholdModel(),
                             feature_fn=lambda df:add_product_financial_features(df,'personal_loan'),
                             shap_explainer=Mock())
        pipe.shap_explainer.explain_batch.side_effect=lambda x:[changed]+[reference]*(len(x)-1)
        result=evaluate_shap_stability(pipe,raw,reference)
        self.assertLess(result.minimumScore,result.score)
        self.assertLess(result.score,1)

    def test_batched_tree_shap_matches_single_rows_and_reconstructs_model_output(self):
        from backend.app.ml.registry import registry
        for product,suffix in [('home_loan','homeloan'),('personal_loan','personalloan')]:
            pipe=registry.get_pipeline(product)
            raw=pd.read_csv(f'datasets/{suffix}_train.csv').iloc[:3]
            values=pipe.preprocessor.transform(pipe.feature_fn(raw))
            batch=pipe.shap_explainer.explain_batch(values)
            singles=[pipe.shap_explainer.explain_instance(row) for row in values]
            self.assertEqual([b.model_dump() for b in batch],[s.model_dump() for s in singles])
            reconstructed=np.array([sum(f.contribution for f in e.features) for e in batch])+float(pipe.shap_explainer.explainer.expected_value)
            np.testing.assert_allclose(reconstructed,pipe.model.predict(values,output_margin=True),rtol=0,atol=1e-4)


if __name__=='__main__':
    unittest.main()
