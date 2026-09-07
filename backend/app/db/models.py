from sqlalchemy import Column, Integer, String, Float, DateTime, JSON
from datetime import datetime
from backend.app.db.session import Base

class PredictionLog(Base):
    __tablename__ = "prediction_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Applicant details (basic searchability)
    applicant_age = Column(Float)
    applicant_income = Column(Float)
    loan_amount = Column(Float)
    
    # Full raw input stored as JSON for exact record keeping
    raw_input_data = Column(JSON)
    
    # Model output
    prediction = Column(String)
    probability = Column(Float)
    
    # XAI summaries stored as JSON (StandardExplanation dump)
    shap_explanation = Column(JSON)
    lime_explanation = Column(JSON)
    
    # Validation scores
    faithfulness_score = Column(Float)
    stability_score = Column(Float)
    consistency_score = Column(Float)
    fairness_score = Column(Float, nullable=True)
    
    # Composite
    trust_score = Column(Float)
