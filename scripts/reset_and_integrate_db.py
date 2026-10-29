import os
import sys
import json
from datetime import datetime, timezone
from sqlalchemy import text

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.app.db.session import engine, sqlite_fallback_engine, Base, init_db
from backend.app.db.models import PredictionLog, BatchUpload
from backend.app.ml.registry import registry
from backend.app.api.routes.prediction import evaluate_single_record

def reset_database(target_engine, engine_name="Database"):
    print(f"\n==========================================")
    print(f"Purging & Resetting: {engine_name}")
    print(f"URL: {target_engine.url}")
    print(f"==========================================")
    
    try:
        # 1. Drop existing tables
        with target_engine.connect() as conn:
            print("Dropping old prediction_logs and batch_uploads tables...")
            conn.execute(text("DROP TABLE IF EXISTS prediction_logs CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS batch_uploads CASCADE"))
            conn.commit()
            print("[OK] Dropped successfully.")
    except Exception as e:
        # SQLite doesn't support CASCADE, try simple DROP
        try:
            with target_engine.connect() as conn:
                conn.execute(text("DROP TABLE IF EXISTS prediction_logs"))
                conn.execute(text("DROP TABLE IF EXISTS batch_uploads"))
                conn.commit()
                print("[OK] Dropped tables (SQLite mode).")
        except Exception as e2:
            print(f"Notice while dropping tables: {e2}")

    # 2. Re-create tables with updated schema
    print("Re-creating fresh tables from SQLAlchemy metadata...")
    Base.metadata.create_all(bind=target_engine)
    init_db(target_engine)
    print("[OK] Schema initialized with new columns (loan_type, cibil_score).")

    # 3. Verify clean state
    with target_engine.connect() as conn:
        count = conn.execute(text("SELECT count(*) FROM prediction_logs")).scalar()
        print(f"Current prediction_logs count: {count} (Clean & Empty)")

def seed_sample_evaluations(target_engine, engine_name="Database"):
    """
    Seeds one showcase Home Loan and one Personal Loan into the fresh database.
    """
    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=target_engine)
    db = SessionLocal()
    
    print(f"\nSeeding showcase multi-product records into {engine_name}...")
    
    # 1. Home Loan Prime Record
    hl_sample = {
        "loan_type": "home_loan",
        "Gender": "Female",
        "Married": "Yes",
        "Dependents": 0,
        "Education": "Graduate",
        "Employment_Status": "Salaried",
        "Applicant_Income": 85000.0,
        "Coapplicant_Income": 35000.0,
        "Loan_Amount": 3500000.0,
        "Loan_Term": 240,
        "Property_Value": 5000000.0,
        "Property_Area": "Urban",
        "Age": 35.0,
        "CIBIL_Score": 810,
        "Missed_Payments_12M": 0,
        "Existing_EMI": 6000.0
    }
    
    # 2. Personal Loan Record
    pl_sample = {
        "loan_type": "personal_loan",
        "Gender": "Male",
        "Married": "No",
        "Dependents": 0,
        "Education": "Graduate",
        "Employment_Status": "Salaried",
        "Applicant_Income": 75000.0,
        "Loan_Amount": 350000.0,
        "Loan_Term": 24,
        "Age": 29.0,
        "CIBIL_Score": 770,
        "Missed_Payments_12M": 0,
        "Existing_EMI": 4000.0,
        "Loan_Purpose": "Medical_Emergency",
        "Credit_Card_Utilization": 0.22
    }
    
    for sample in [hl_sample, pl_sample]:
        resp_obj, db_fields = evaluate_single_record(sample)
        entry = PredictionLog(**db_fields)
        db.add(entry)
        
    db.commit()
    db.close()
    print("[OK] Seeded 1 Home Loan and 1 Personal Loan into fresh database.")

if __name__ == '__main__':
    # 1. Reset Primary Engine (Neon / Cloud PostgreSQL)
    try:
        reset_database(engine, "Primary Database (Neon PostgreSQL)")
        seed_sample_evaluations(engine, "Primary Database")
    except Exception as e:
        print(f"Error resetting Primary database: {e}")

    # 2. Reset Local SQLite Fallback Engine
    try:
        reset_database(sqlite_fallback_engine, "Local SQLite Fallback (trustfin_local.db)")
        seed_sample_evaluations(sqlite_fallback_engine, "Local SQLite Fallback")
    except Exception as e:
        print(f"Error resetting Local SQLite database: {e}")

    print("\nDatabase purge & integration completed successfully.")
