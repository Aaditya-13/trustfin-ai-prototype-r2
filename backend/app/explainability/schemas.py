from pydantic import BaseModel, ConfigDict
from typing import List, Literal, Optional


class ExplanationReconstruction(BaseModel):
    """Native terms needed to evaluate an explanation at its original input."""
    model_config = ConfigDict(allow_inf_nan=False)

    baseValue: float
    outputSpace: Literal["log_odds", "probability"]
    featureMultipliers: dict[str, float]
    fullPrediction: float
    targetClass: Literal[1] = 1

class FeatureContribution(BaseModel):
    feature: str
    value: float
    contribution: float
    direction: Literal["positive", "negative", "neutral"]

class StandardExplanation(BaseModel):
    method: Literal["SHAP", "LIME"]
    features: List[FeatureContribution]
    reconstruction: Optional[ExplanationReconstruction] = None
