"""Scale, truncation, missing-metadata and real-reconstruction regressions."""
from math import log

import pytest
from scipy.special import expit

from backend.app.explainability.schemas import StandardExplanation, FeatureContribution, ExplanationReconstruction
from backend.app.validation.faithfulness import evaluate_faithfulness, FaithfulnessNotEvaluable


def explained(method, values, base=0., multipliers=None):
    multipliers = multipliers or {name: 1. for name in values}
    return StandardExplanation(method=method, features=[
        FeatureContribution(feature=name, value=9999, contribution=value,
                            direction='positive' if value > 0 else 'negative' if value < 0 else 'neutral')
        for name, value in values.items()
    ], reconstruction=ExplanationReconstruction(
        baseValue=base, outputSpace='log_odds' if method == 'SHAP' else 'probability',
        featureMultipliers=multipliers,
        fullPrediction=base + sum(v * multipliers[k] for k, v in values.items()),
    ))


def test_keeps_signed_top_features_and_existing_intercepts_without_refitting():
    shap = explained('SHAP', {'a': 3., 'b': -2., 'c': .5}, base=-.5)
    lime = explained('LIME', {'a': .6, 'b': -.3, 'c': .1}, base=.2)
    p = float(expit(1.))
    result = evaluate_faithfulness(p, shap, lime, top_k=2)
    assert result.shap.selectedFeatures == ['a', 'b']
    assert result.shap.approximation == pytest.approx(expit(.5))
    assert result.lime.approximation == pytest.approx(.5)
    assert result.score == pytest.approx(.6 * (1 - abs(p - expit(.5))) + .4 * (1 - abs(p - .5)))


def test_lime_uses_interpretable_values_instead_of_displayed_financial_values():
    shap = explained('SHAP', {'a': log(4)})
    lime = explained('LIME', {'a': .3, 'b': .4}, base=.2, multipliers={'a': 2., 'b': 0.})
    result = evaluate_faithfulness(.8, shap, lime)
    assert result.lime.approximation == pytest.approx(.8)
    assert result.score == pytest.approx(1.)


@pytest.mark.parametrize('change', ['missing', 'empty', 'duplicate', 'nonfinite', 'wrong_space', 'bad_full_prediction', 'missing_multiplier'])
def test_invalid_explanations_are_unavailable_instead_of_fabricated_scores(change):
    shap = explained('SHAP', {'a': log(4)})
    lime = explained('LIME', {'a': .8})
    if change == 'missing':
        lime.reconstruction = None
    elif change == 'empty':
        lime.features = []
    elif change == 'duplicate':
        lime.features.append(lime.features[0])
    elif change == 'nonfinite':
        lime.features[0].contribution = float('nan')
    elif change == 'wrong_space':
        lime.reconstruction.outputSpace = 'log_odds'
    elif change == 'bad_full_prediction':
        lime.reconstruction.fullPrediction = .1
    else:
        lime.reconstruction.featureMultipliers = {}
    with pytest.raises(FaithfulnessNotEvaluable):
        evaluate_faithfulness(.8, shap, lime)


def test_shap_must_reconstruct_actual_model_probability_and_use_correct_method():
    shap = explained('SHAP', {'a': log(4)})
    lime = explained('LIME', {'a': .8})
    with pytest.raises(FaithfulnessNotEvaluable, match='model probability'):
        evaluate_faithfulness(.6, shap, lime)
    with pytest.raises(FaithfulnessNotEvaluable, match='Expected a SHAP'):
        evaluate_faithfulness(.8, lime, lime)


@pytest.mark.parametrize('k', [0, -1, 1.5, True])
def test_invalid_feature_limit(k):
    with pytest.raises(FaithfulnessNotEvaluable):
        evaluate_faithfulness(.8, explained('SHAP', {'a': log(4)}), explained('LIME', {'a': .8}), top_k=k)


def test_a_large_lime_error_can_genuinely_produce_zero_concordance():
    result = evaluate_faithfulness(.8, explained('SHAP', {'a': log(4)}), explained('LIME', {'a': 2.}))
    assert result.lime.score == 0
    assert result.score == pytest.approx(.6)
