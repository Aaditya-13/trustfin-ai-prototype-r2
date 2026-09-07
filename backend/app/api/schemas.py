from pydantic import BaseModel, Field
from typing import Optional
from backend.app.explainability.schemas import StandardExplanation
from backend.app.trust.trust_score import TrustEvaluation

class LoanApplicationRequest(BaseModel):
    Gender: str = Field(..., description="Applicant gender (Male/Female)")
    Married: str = Field(..., description="Marital status (Yes/No)")
    Dependents: int = Field(..., description="Number of dependents")
    Education: str = Field(..., description="Educational background (Graduate/Not Graduate)")
    Employment_Status: str = Field(..., description="Employment type (Salaried/Self-Employed/Unemployed)")
    Applicant_Income: float = Field(..., description="Monthly income of the primary applicant")
    Coapplicant_Income: float = Field(..., description="Monthly income of coapplicant")
    Loan_Amount: float = Field(..., description="Requested loan amount")
    Loan_Term: int = Field(..., description="Loan term in months")
    Credit_History: int = Field(..., description="Credit history indicator (1/0)")
    Property_Area: str = Field(..., description="Type of property location (Urban/Semiurban/Rural)")
    Age: float = Field(..., description="Age of applicant")

class SolvencyCheckResult(BaseModel):
    monthlyEMI: float = Field(..., description="Estimated monthly debt repayment")
    totalIncome: float = Field(..., description="Combined applicant and coapplicant income")
    dtiRatio: float = Field(..., description="Debt-to-Income numerical ratio")
    dtiPercent: str = Field(..., description="Formatted Debt-to-Income percentage string")
    status: str = Field(..., description="'OPTIMAL', 'MODERATE', or 'INSOLVENT'")
    isSolvent: bool = Field(..., description="Whether DTI is within regulatory threshold (<= 50%)")
    overrideWarning: Optional[str] = Field(None, description="Regulatory solvency breach warning if DTI exceeds threshold")

class LoanPredictionResponse(BaseModel):
    prediction: str = Field(..., description="'Approved' or 'Rejected'")
    probability: float = Field(..., description="Raw model probability")
    confidenceScore: float = Field(..., description="Confidence in the prediction")
    modelVersion: str = Field(..., description="Version of the model used")
    shap: StandardExplanation
    lime: StandardExplanation
    trustScore: TrustEvaluation
    solvencyCheck: Optional[SolvencyCheckResult] = None

class GenerateReportRequest(BaseModel):
    applicantData: LoanApplicationRequest
    predictionResult: LoanPredictionResponse

