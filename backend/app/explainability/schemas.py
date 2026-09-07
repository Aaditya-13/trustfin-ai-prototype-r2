from pydantic import BaseModel
from typing import List, Literal

class FeatureContribution(BaseModel):
    feature: str
    value: float
    contribution: float
    direction: Literal["positive", "negative", "neutral"]

class StandardExplanation(BaseModel):
    method: Literal["SHAP", "LIME"]
    features: List[FeatureContribution]
