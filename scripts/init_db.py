import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.app.db.session import engine, init_db

if __name__ == "__main__":
    print(f"Connecting to database using engine: {engine.url}...")
    print("Creating tables and synchronizing schema...")
    try:
        init_db(engine)
        print("Database tables and columns initialized successfully!")
    except Exception as e:
        print(f"Failed to initialize database: {e}")
