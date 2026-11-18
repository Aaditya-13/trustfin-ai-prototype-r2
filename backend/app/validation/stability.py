import numpy as np
import pandas as pd
from pydantic import BaseModel, Field
from scipy.stats import rankdata, spearmanr
from backend.app.explainability.schemas import StandardExplanation


def calculate_stability(
    exp1: StandardExplanation,
    exp2: StandardExplanation,
    top_k: int = 5,
) -> float:
    """
    Measure how similar feature importance and contribution direction remain
    across two explanations of the original and a slightly perturbed input.

    The score combines:
      - 70% rank stability of absolute contribution magnitudes (Spearman).
      - 30% direction agreement on the union of each explanation's top-k
        features. A contribution disappearing to zero counts as disagreement.

    Missing features are treated as having zero contribution. The result is
    in [0, 1]. Empty/all-zero explanations receive no agreement evidence here;
    the multi-neighbour evaluator reports an uninformative reference as unavailable.
    This compares rankings and signs, not raw contribution magnitudes.
    """
    if top_k < 1:
        raise ValueError("top_k must be a positive integer.")

    dict1 = {
        item.feature: float(item.contribution)
        for item in exp1.features
        if np.isfinite(float(item.contribution))
    }
    dict2 = {
        item.feature: float(item.contribution)
        for item in exp2.features
        if np.isfinite(float(item.contribution))
    }

    features = sorted(set(dict1) | set(dict2))
    if not features:
        return 0.0

    values1 = np.array([dict1.get(name, 0.0) for name in features], dtype=float)
    values2 = np.array([dict2.get(name, 0.0) for name in features], dtype=float)

    if np.allclose(values1, 0.0) or np.allclose(values2, 0.0):
        return 0.0

    # Compare importance rankings, not raw magnitudes, because the scale of
    # local explanations can vary between runs.
    ranks1 = rankdata(-np.abs(values1), method="average")
    ranks2 = rankdata(-np.abs(values2), method="average")

    if len(features) == 1:
        rank_score = 1.0  # A single meaningful feature always has rank one.
    else:
        correlation = spearmanr(ranks1, ranks2).statistic
        if not np.isfinite(correlation):
            correlation = 1.0 if np.allclose(ranks1, ranks2) else 0.0
        rank_score = float(np.clip(correlation, 0.0, 1.0))

    # Evaluate direction on the union of the top-k important features.
    top_indices = set(np.argsort(-np.abs(values1), kind='stable')[:top_k]) | set(np.argsort(-np.abs(values2), kind='stable')[:top_k])
    direction_indices = [
        idx for idx in top_indices
        if not np.isclose(values1[idx], 0.0) or not np.isclose(values2[idx], 0.0)
    ]

    if direction_indices:
        direction_score = float(np.mean([
            np.sign(values1[idx]) == np.sign(values2[idx])
            for idx in direction_indices
        ]))
    else:
        # If both explanations contain no directional evidence, do not award
        # perfect direction agreement by default.
        direction_score = 0.0

    return float(np.clip(0.70 * rank_score + 0.30 * direction_score, 0.0, 1.0))


STABILITY_PROTOCOL = 'shap-financial-neighbours-v1'


class StabilityNotEvaluable(ValueError):
    """The requested check cannot produce an evidence-based stability score."""


class StabilityComparison(BaseModel):
    changedField: str
    originalValue: float
    changedValue: float
    score: float = Field(ge=0, le=1)
    predictionChanged: bool
    approvalProbability: float = Field(ge=0, le=1)
    probabilityChange: float = Field(ge=0, le=1)


class StabilityEvaluation(BaseModel):
    protocol: str = STABILITY_PROTOCOL
    method: str = 'SHAP'
    score: float = Field(ge=0, le=1)
    requestedSamples: int
    testedSamples: int
    minimumScore: float = Field(ge=0, le=1)
    predictionChanges: int
    predictionChangeRate: float = Field(ge=0, le=1)
    maximumProbabilityChange: float = Field(ge=0, le=1)
    testedFields: list[str]
    comparisons: list[StabilityComparison]


def make_stability_neighbours(raw_instance: dict, predictive_raw_features: list[str], max_samples: int = 20):
    """Fixed one-field changes; zero-valued amounts stay unchanged, not invented.

    Money: up to 2%; CIBIL: up to 5 integer points; card utilization: up to
    0.01 (one percentage point). Finer steps fill the budget when fields are
    zero or at a bound. Categories, counts, age, experience and term stay fixed.
    """
    if max_samples < 1:
        raise ValueError('max_samples must be positive')
    money = ['Applicant_Income', 'Loan_Amount', 'Existing_EMI', 'Coapplicant_Income', 'Property_Value']
    allowed = set(predictive_raw_features)
    fields = [f for f in ['Applicant_Income', 'Loan_Amount', 'CIBIL_Score', 'Existing_EMI', 'Credit_Card_Utilization', 'Coapplicant_Income', 'Property_Value'] if f in allowed and raw_instance.get(f) is not None]
    levels = [
        {'money': [-.01, .01, -.02, .02], 'credit': [-5, 5, -2, 2], 'card': [-.01, .01, -.005, .005]},
        {'money': [-.005, .005, -.015, .015], 'credit': [-4, 4, -1, 1], 'card': [-.0025, .0025, -.0075, .0075]},
        {'money': [-.0025, .0025, -.0075, .0075], 'credit': [-3, 3], 'card': [-.001, .001, -.009, .009]},
    ]
    candidates, seen = [], set()
    for level in levels:
        for step in range(4):
            for field in fields:
                value = float(raw_instance[field])
                kind = 'money' if field in money else ('credit' if field == 'CIBIL_Score' else 'card')
                if step >= len(level[kind]) or not np.isfinite(value):
                    continue
                delta = level[kind][step]
                changed = round(value*(1+delta), 2) if kind == 'money' else (value+delta if kind == 'credit' else round(value+delta, 6))
                if changed == value or (field, changed) in seen:
                    continue
                if kind == 'money' and changed < (0 if field in ['Existing_EMI', 'Coapplicant_Income'] else .01):
                    continue
                # Currency rounding must not turn a small adjustment into a
                # larger-than-2% change for very small valid input amounts.
                if kind == 'money' and abs(changed-value) > abs(value)*.02 + 1e-9:
                    continue
                if kind == 'credit' and (not changed.is_integer() or not 300 <= changed <= 900):
                    continue
                if kind == 'card' and not 0 <= changed <= 1:
                    continue
                neighbour = {**raw_instance, field: changed}
                if float(neighbour.get('Applicant_Income', 0)) <= 0 or float(neighbour.get('Loan_Amount', 0)) <= 0 or float(neighbour.get('Loan_Term', 0)) <= 0:
                    continue
                seen.add((field, changed))
                candidates.append((neighbour, field, value, changed))
                if len(candidates) == max_samples:
                    return candidates
    return candidates


def evaluate_shap_stability(pipeline, raw_instance: dict, original_explanation: StandardExplanation,
                            *, original_prediction=None, original_probability=None, n_samples: int = 20) -> StabilityEvaluation:
    """Average the fixed local comparisons and retain worst/decision-change data.

    References: Alvarez-Melis & Jaakkola (2018), explanation robustness; Yeh et
    al. (2019), sensitivity. The financial grid, 70/30 similarity, and average
    aggregation are project adaptations, not those papers' exact metrics.
    """
    contributions = np.array([f.contribution for f in original_explanation.features], dtype=float)
    if original_explanation.method != 'SHAP' or not len(contributions) or not np.isfinite(contributions).all() or np.allclose(contributions, 0):
        raise StabilityNotEvaluable('No meaningful finite SHAP contributions are available for the stability comparison.')
    candidates = make_stability_neighbours(raw_instance, pipeline.raw_features, n_samples)
    if not candidates:
        raise StabilityNotEvaluable('No valid nearby financial applications can be constructed.')
    frame = pd.DataFrame([c[0] for c in candidates])
    # Financial feature engineering runs on raw values before preprocessing.
    transformed = np.asarray(pipeline.preprocessor.transform(pipeline.feature_fn(frame)), dtype=float)
    original = np.asarray(pipeline.preprocessor.transform(pipeline.feature_fn(pd.DataFrame([raw_instance]))), dtype=float)
    if not np.isfinite(transformed).all() or not np.isfinite(original).all():
        raise StabilityNotEvaluable('Financial preprocessing produced non-finite stability inputs.')
    # Never count an unchanged/duplicate processed input as additional evidence.
    indices, seen = [], {original[0].tobytes()}
    for i, vector in enumerate(transformed):
        key = vector.tobytes()
        if key not in seen:
            seen.add(key)
            indices.append(i)
    if len(indices) < 2:
        raise StabilityNotEvaluable('Fewer than two distinct nearby model inputs are available.')
    transformed = transformed[indices]
    selected = [candidates[i] for i in indices]
    explanations = pipeline.shap_explainer.explain_batch(transformed)
    if len(explanations) != len(selected):
        raise StabilityNotEvaluable('SHAP returned an incomplete neighbour batch.')
    predictions = pipeline.model.predict(transformed)
    probabilities = pipeline.model.predict_proba(transformed)[:, 1]
    if original_prediction is None:
        original_prediction = int(pipeline.model.predict(original)[0])
    if original_probability is None:
        original_probability = float(pipeline.model.predict_proba(original)[0, 1])
    comparisons = []
    for (_, field, old, new), explanation, prediction, probability in zip(selected, explanations, predictions, probabilities):
        comparisons.append(StabilityComparison(
            changedField=field, originalValue=old, changedValue=new,
            score=calculate_stability(original_explanation, explanation),
            predictionChanged=bool(prediction != original_prediction), approvalProbability=float(probability),
            probabilityChange=abs(float(probability)-float(original_probability)),
        ))
    scores = [c.score for c in comparisons]
    flips = sum(c.predictionChanged for c in comparisons)
    return StabilityEvaluation(
        score=float(np.mean(scores)), minimumScore=min(scores), requestedSamples=n_samples,
        testedSamples=len(scores), predictionChanges=flips, predictionChangeRate=flips/len(scores),
        maximumProbabilityChange=max(c.probabilityChange for c in comparisons),
        testedFields=list(dict.fromkeys(c.changedField for c in comparisons)), comparisons=comparisons,
    )
