from sqlalchemy import Column, Integer, String, Float, DateTime, JSON
from datetime import datetime, timezone
from backend.app.db.session import Base

class PredictionLog(Base):
    __tablename__ = "prediction_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    dossier_id = Column(String(32), unique=True, index=True, nullable=True) # e.g. "TF-20261022-8492"
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Applicant details (basic searchability & display)
    applicant_age = Column(Float, nullable=True)
    applicant_income = Column(Float, nullable=True)
    loan_amount = Column(Float, nullable=True)
    
    # Full raw input stored as JSON for exact record keeping
    raw_input_data = Column(JSON)
    
    # Model output
    prediction = Column(String) # "Approved" or "Rejected"
    probability = Column(Float)
    confidence_score = Column(Float, nullable=True)
    
    # Deterministic Solvency Guardrail Metrics
    solvency_status = Column(String, nullable=True) # "OPTIMAL", "MODERATE", "INSOLVENT"
    dti_ratio = Column(Float, nullable=True)
    monthly_emi = Column(Float, nullable=True)
    
    # XAI summaries stored as JSON (StandardExplanation dump)
    shap_explanation = Column(JSON)
    lime_explanation = Column(JSON)
    
    # Validation scores (4-Pillar Trust Framework)
    faithfulness_score = Column(Float)
    stability_score = Column(Float)
    consistency_score = Column(Float)
    fairness_score = Column(Float, nullable=True)
    
    # Composite Trust Evaluation
    trust_score = Column(Float)
    trust_rating = Column(String, nullable=True) # e.g. "HIGH TRUST", "MODERATE TRUST", "LOW TRUST"
    
    # Complete response JSON for zero-recompute instant retrieval
    full_response = Column(JSON, nullable=True)

