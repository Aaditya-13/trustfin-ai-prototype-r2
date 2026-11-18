from pydantic import BaseModel
from typing import Optional
from math import isclose, isfinite


DEFAULT_TRUST_WEIGHTS = {
    "faithfulness": 1 / 3,
    "stability": 1 / 3,
    "consistency": 1 / 3,
}

class TrustEvaluation(BaseModel):
    faithfulness: float
    stability: float
    consistency: float
    fairness: Optional[float] = None
    overallTrustScore: float
    weights: Optional[dict[str, float]] = None

def calculate_trust_score(faithfulness: float, stability: float, consistency: float, fairness: Optional[float] = None, weights: dict = None) -> TrustEvaluation:
    """Average three diagnostics by default and carry the separate fairness audit.

    Equal weights are a project convention, not an empirically calibrated
    probability of explanation correctness. Saved results retain their weights.
    """
    weights = DEFAULT_TRUST_WEIGHTS.copy() if weights is None else dict(weights)
    if set(weights) != set(DEFAULT_TRUST_WEIGHTS):
        raise ValueError("Trust weights must contain faithfulness, stability and consistency.")
    if any(not isfinite(value) or value < 0 for value in weights.values()):
        raise ValueError("Trust weights must be finite and non-negative.")
    if not isclose(sum(weights.values()), 1.0, abs_tol=1e-9):
        raise ValueError("Trust weights must sum to 1.")
    
    score = (
        (faithfulness * weights["faithfulness"]) +
        (stability * weights["stability"]) +
        (consistency * weights["consistency"])
    )
    
    return TrustEvaluation(
        faithfulness=faithfulness,
        stability=stability,
        consistency=consistency,
        fairness=fairness,
        overallTrustScore=score,
        weights=weights,
    )
