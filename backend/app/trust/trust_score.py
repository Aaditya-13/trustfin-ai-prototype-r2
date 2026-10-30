from pydantic import BaseModel
from typing import Optional

class TrustEvaluation(BaseModel):
    faithfulness: float
    stability: float
    consistency: float
    fairness: Optional[float] = None
    overallTrustScore: float

def calculate_trust_score(faithfulness: float, stability: float, consistency: float, fairness: float = 1.0, weights: dict = None) -> TrustEvaluation:
    if weights is None:
        weights = {
            "faithfulness": 0.35,
            "consistency": 0.30,
            "stability": 0.25,
            "fairness": 0.10
        }
    
    score = (
        (faithfulness * weights["faithfulness"]) +
        (stability * weights["stability"]) +
        (consistency * weights["consistency"]) +
        (fairness * weights["fairness"])
    )
    
    return TrustEvaluation(
        faithfulness=faithfulness,
        stability=stability,
        consistency=consistency,
        fairness=fairness,
        overallTrustScore=score
    )
