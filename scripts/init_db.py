import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.app.db.session import engine, Base
from backend.app.db.models import PredictionLog # Import to register the model

def init_db():
    print("Connecting to Neon DB...")
    print("Creating tables if they don't exist...")
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables initialized successfully!")
    except Exception as e:
        print(f"Failed to create tables. Error: {e}")

if __name__ == "__main__":
    init_db()
