"""Approved LEAF-inspired original-input reconstruction, not a deletion test.

LC = max(0, 1 - abs(model approval probability - explanation approximation)).
Faithfulness = 0.6 * LC_SHAP_top5 + 0.4 * LC_LIME_top5.
The weighting is a project convention, not prescribed by LEAF. This measures
local concordance, not correctness of feature assignments or nearby behavior.
Reference: Amparore et al. (2021), https://doi.org/10.7717/peerj-cs.479.
"""
from math import fsum, isclose, isfinite
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from scipy.special import expit

from backend.app.explainability.schemas import StandardExplanation

FAITHFULNESS_PROTOCOL = 'local-concordance-top5-shap60-lime40-v1'
FAITHFULNESS_WEIGHTS = {'shap': 0.6, 'lime': 0.4}


class FaithfulnessNotEvaluable(ValueError):
    """Required reconstruction information is absent or inconsistent."""


class LocalConcordanceEvaluation(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)

    score: float = Field(ge=0, le=1)
    approximation: float  # A linear LIME estimate can be outside [0, 1].
    absoluteGap: float = Field(ge=0)
    selectedFeatures: list[str]


class FaithfulnessEvaluation(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)

    method: Literal['local_concordance'] = 'local_concordance'
    protocolVersion: str = FAITHFULNESS_PROTOCOL
    topK: int = Field(ge=1)
    modelApprovalProbability: float = Field(ge=0, le=1)
    weights: dict[str, float]
    shap: LocalConcordanceEvaluation
    lime: LocalConcordanceEvaluation
    score: float = Field(ge=0, le=1)


def _local_concordance(probability, explanation, expected_method, top_k):
    if explanation.method != expected_method:
        raise FaithfulnessNotEvaluable(f'Expected a {expected_method} explanation.')
    terms = explanation.reconstruction
    if terms is None:
        raise FaithfulnessNotEvaluable(f'{expected_method} reconstruction terms are missing.')
    features = explanation.features
    names = [item.feature for item in features]
    if not names or len(set(names)) != len(names):
        raise FaithfulnessNotEvaluable(f'{expected_method} requires distinct, non-empty features.')
    if set(terms.featureMultipliers) != set(names):
        raise FaithfulnessNotEvaluable(f'{expected_method} reconstruction does not match its features.')
    expected_space = 'log_odds' if expected_method == 'SHAP' else 'probability'
    if terms.outputSpace != expected_space:
        raise FaithfulnessNotEvaluable(f'{expected_method} must use {expected_space} reconstruction terms.')
    numbers = [terms.baseValue, terms.fullPrediction, *terms.featureMultipliers.values(),
               *(item.contribution for item in features)]
    if not all(isfinite(value) for value in numbers):
        raise FaithfulnessNotEvaluable(f'{expected_method} reconstruction terms must be finite.')

    def reconstruct(selected):
        native = terms.baseValue + fsum(item.contribution * terms.featureMultipliers[item.feature]
                                        for item in selected)
        if not isfinite(native):
            raise FaithfulnessNotEvaluable(f'{expected_method} reconstruction is not finite.')
        return native

    full_native = reconstruct(features)
    if not isclose(full_native, terms.fullPrediction, rel_tol=1e-6, abs_tol=1e-6):
        raise FaithfulnessNotEvaluable(f'{expected_method} full reconstruction is inconsistent.')
    if expected_method == 'SHAP' and not isclose(float(expit(full_native)), probability, abs_tol=1e-5):
        raise FaithfulnessNotEvaluable('Full SHAP reconstruction does not match the model probability.')

    # Same absolute-contribution ranking as the existing explanation displays.
    selected = sorted(features, key=lambda item: abs(item.contribution), reverse=True)[:top_k]
    native = reconstruct(selected)
    approximation = float(expit(native)) if expected_method == 'SHAP' else native
    # Keep the full error of an out-of-range linear LIME prediction. Clipping
    # that prediction would artificially improve concordance.
    gap = abs(probability - approximation)
    return LocalConcordanceEvaluation(
        score=max(0., 1. - gap), approximation=approximation,
        absoluteGap=gap, selectedFeatures=[item.feature for item in selected],
    )


def evaluate_faithfulness(
    model_approval_probability: float,
    shap_explanation: StandardExplanation,
    lime_explanation: StandardExplanation,
    top_k: int = 5,
) -> FaithfulnessEvaluation:
    """Evaluate existing explanations without masking, refitting or sampling.

    Keep the existing full-fit intercept when retaining the top five features.
    SHAP uses log-odds; LIME uses its own interpretable coordinates. Missing
    terms are unavailable, never replaced by an invented zero or perfect score.
    """
    if not isfinite(model_approval_probability) or not 0 <= model_approval_probability <= 1:
        raise FaithfulnessNotEvaluable('Model approval probability must be between zero and one.')
    if isinstance(top_k, bool) or not isinstance(top_k, int) or top_k < 1:
        raise FaithfulnessNotEvaluable('top_k must be a positive integer.')
    probability = float(model_approval_probability)
    shap = _local_concordance(probability, shap_explanation, 'SHAP', top_k)
    lime = _local_concordance(probability, lime_explanation, 'LIME', top_k)
    score = FAITHFULNESS_WEIGHTS['shap'] * shap.score + FAITHFULNESS_WEIGHTS['lime'] * lime.score
    return FaithfulnessEvaluation(
        topK=top_k, modelApprovalProbability=probability,
        weights=FAITHFULNESS_WEIGHTS.copy(), shap=shap, lime=lime, score=score,
    )


def calculate_faithfulness(model_approval_probability, shap_explanation, lime_explanation, top_k=5) -> float:
    """Return the combined score; use evaluate_faithfulness for audit details."""
    return evaluate_faithfulness(model_approval_probability, shap_explanation, lime_explanation, top_k).score
