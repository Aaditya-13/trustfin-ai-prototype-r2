from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Any
from backend.app.explainability.schemas import StandardExplanation
from backend.app.trust.trust_score import TrustEvaluation

class LoanApplicationRequest(BaseModel):
    loan_type: Optional[str] = Field(None, description="Product identifier (home_loan | personal_loan)")
    Gender: str = Field("Male", description="Applicant gender (Male/Female)")
    Married: str = Field("No", description="Marital status (Yes/No)")
    Dependents: Optional[int] = Field(0, description="Number of dependents")
    Education: str = Field("Graduate", description="Educational background (Graduate/Not Graduate)")
    Employment_Status: str = Field("Salaried", description="Employment type (Salaried/Self-Employed/Unemployed)")
    Applicant_Income: float = Field(..., description="Monthly income of the primary applicant")
    Coapplicant_Income: Optional[float] = Field(0.0, description="Monthly income of coapplicant")
    Loan_Amount: float = Field(..., description="Requested loan amount")
    Loan_Term: int = Field(..., description="Loan term in months")
    Credit_History: Optional[int] = Field(None, description="Legacy credit history indicator (1/0)")
    Property_Area: Optional[str] = Field("Urban", description="Type of property location (Urban/Semiurban/Rural)")
    Age: float = Field(30.0, description="Age of applicant")
    
    # Multi-Product & CIBIL Bureau Fields
    CIBIL_Score: Optional[int] = Field(None, description="Continuous CIBIL Score (300 to 900)")
    Missed_Payments_12M: Optional[int] = Field(None, description="Delinquencies in the past 12 months (0 to 4)")
    Existing_EMI: Optional[float] = Field(0.0, description="Existing monthly debt obligations")
    Work_Experience: Optional[int] = Field(None, description="Work experience in years")
    Property_Value: Optional[float] = Field(None, description="Market valuation of residential property (for Home Loans)")
    Loan_Purpose: Optional[str] = Field(None, description="Purpose of unsecured retail credit (for Personal Loans)")
    Credit_Card_Utilization: Optional[float] = Field(None, description="Revolving credit card balance to limit ratio")

    @field_validator('Credit_Card_Utilization', mode='before')
    @classmethod
    def normalize_credit_card_utilization(cls, v: Any):
        if v is None or v == '' or v == 'null':
            return None
        try:
            val = float(v)
            if val > 1.0 and val <= 100.0:
                val = val / 100.0
            return max(0.0, min(1.0, val))
        except (ValueError, TypeError):
            return 0.0

    @field_validator('Coapplicant_Income', 'Existing_EMI', 'Property_Value', mode='before')
    @classmethod
    def normalize_optional_floats(cls, v: Any):
        if v is None or v == '' or v == 'null':
            return 0.0
        try:
            return float(v)
        except (ValueError, TypeError):
            return 0.0

    @field_validator('Dependents', 'Missed_Payments_12M', 'Work_Experience', mode='before')
    @classmethod
    def normalize_optional_ints(cls, v: Any):
        if v is None or v == '' or v == 'null':
            return 0
        try:
            return int(float(v))
        except (ValueError, TypeError):
            return 0

    @field_validator('CIBIL_Score', mode='before')
    @classmethod
    def normalize_cibil_score(cls, v: Any):
        if v is None or v == '' or v == 'null':
            return None
        try:
            return int(float(v))
        except (ValueError, TypeError):
            return 720

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
    evaluationId: Optional[int] = Field(None, description="Database record ID in SQLite")
    dossierId: Optional[str] = Field(None, description="Unique institutional dossier reference code (e.g. TF-20261022-8492)")

class GenerateReportRequest(BaseModel):
    applicantData: LoanApplicationRequest
    predictionResult: LoanPredictionResponse

class EvaluationSummaryItem(BaseModel):
    id: int
    dossierId: Optional[str] = None
    timestamp: str
    loanType: Optional[str] = "home_loan"
    cibilScore: Optional[int] = None
    applicantAge: Optional[float] = None
    applicantIncome: Optional[float] = None
    loanAmount: Optional[float] = None
    prediction: str
    probability: float
    confidenceScore: Optional[float] = None
    solvencyStatus: Optional[str] = None
    dtiRatio: Optional[float] = None
    monthlyEMI: Optional[float] = None
    trustScore: float
    trustRating: Optional[str] = None

class EvaluationDetailResponse(BaseModel):
    id: int
    dossierId: Optional[str] = None
    timestamp: str
    applicantData: dict
    predictionResult: LoanPredictionResponse


class FlawedRecordItem(BaseModel):
    row: int
    rawData: dict
    errorReason: str


class BatchUploadResponse(BaseModel):
    batchId: str
    filename: str
    timestamp: str
    totalRecords: int
    validRecords: int
    flawedRecords: int
    flawedData: List[FlawedRecordItem] = []
    processedResults: List[LoanPredictionResponse] = []
    summary: Optional[dict] = None


class BatchSummaryItem(BaseModel):
    id: int
    batchId: str
    filename: str
    timestamp: str
    totalRecords: int
    validRecords: int
    flawedRecords: int
    approvedCount: int = 0
    rejectedCount: int = 0


class BatchDetailResponse(BaseModel):
    id: int
    batchId: str
    filename: str
    timestamp: str
    totalRecords: int
    validRecords: int
    flawedRecords: int
    flawedData: List[dict] = []
    processedEvaluations: List[EvaluationSummaryItem] = []
    summary: Optional[dict] = None


class BatchUploadJsonRequest(BaseModel):
    filename: Optional[str] = "preset_batch.csv"
    rows: List[dict]



