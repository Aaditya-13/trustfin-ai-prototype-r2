import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.app.db.session import engine, Base
from backend.app.db.models import PredictionLog # Import to register the model

from sqlalchemy import inspect, text

def init_db():
    print(f"Connecting to database using engine: {engine.url}...")
    print("Creating tables if they don't exist...")
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables initialized successfully!")
        
        # Check and migrate missing columns if table already existed
        inspector = inspect(engine)
        if "prediction_logs" in inspector.get_table_names():
            existing_columns = {c["name"] for c in inspector.get_columns("prediction_logs")}
            is_sqlite = engine.url.drivername.startswith("sqlite")
            
            column_definitions = {
                "dossier_id": "VARCHAR(32)",
                "confidence_score": "FLOAT",
                "solvency_status": "VARCHAR(32)",
                "dti_ratio": "FLOAT",
                "monthly_emi": "FLOAT",
                "trust_rating": "VARCHAR(32)",
                "full_response": "JSON"
            }
            
            with engine.connect() as conn:
                for col_name, col_type in column_definitions.items():
                    if col_name not in existing_columns:
                        print(f"Migrating table: adding missing column '{col_name}' ({col_type})...")
                        conn.execute(text(f"ALTER TABLE prediction_logs ADD COLUMN {col_name} {col_type}"))
                conn.commit()
                print("Column synchronization complete.")
    except Exception as e:
        print(f"Failed to create/migrate tables. Error: {e}")

if __name__ == "__main__":
    init_db()
