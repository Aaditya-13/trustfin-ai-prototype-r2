import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

# Resolve local SQLite database path relative to project root
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
local_sqlite_path = os.path.join(project_root, "trustfin_local.db").replace("\\", "/")
LOCAL_SQLITE_URL = f"sqlite:///{local_sqlite_path}"

# Ensure matplotlib has a local writable cache in the workspace for fast sandboxed execution
os.environ.setdefault("MPLCONFIGDIR", os.path.join(project_root, ".matplotlib_cache"))

# During automated test runs or offline work, isolate with local SQLite to avoid remote network latency
is_test_env = any("pytest" in a.lower() for a in sys.argv) or "PYTEST_CURRENT_TEST" in os.environ or os.getenv("TESTING") == "1" or os.getenv("USE_LOCAL_SQLITE") == "1"
if is_test_env:
    DATABASE_URL = LOCAL_SQLITE_URL
else:
    DATABASE_URL = os.getenv("DATABASE_URL", LOCAL_SQLITE_URL)

if DATABASE_URL.startswith("sqlite:///./") or DATABASE_URL == "sqlite:///trustfin_local.db":
    DATABASE_URL = LOCAL_SQLITE_URL

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # Neon DB / PostgreSQL connection with fast 3s failover to local SQLite if offline
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5, max_overflow=10, connect_args={"connect_timeout": 3})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Local SQLite fallback engine if PostgreSQL is unreachable/offline
sqlite_fallback_engine = create_engine(LOCAL_SQLITE_URL, connect_args={"check_same_thread": False})
SqliteSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sqlite_fallback_engine)

Base = declarative_base()

def init_db(target_engine=None):
    """
    Initializes database tables and migrates schema if needed.
    Can be run automatically on startup or manually via scripts.
    """
    from backend.app.db import models  # Ensures models are registered with Base.metadata
    from sqlalchemy import inspect, text

    eng = target_engine or engine
    try:
        Base.metadata.create_all(bind=eng)
        inspector = inspect(eng)
        table_columns = {
            "prediction_logs": {
                "dossier_id": "VARCHAR(32)",
                "loan_type": "VARCHAR(32)",
                "cibil_score": "INTEGER",
                "confidence_score": "FLOAT",
                "solvency_status": "VARCHAR(32)",
                "dti_ratio": "FLOAT",
                "monthly_emi": "FLOAT",
                "trust_rating": "VARCHAR(32)",
                "full_response": "JSON",
                "batch_id": "VARCHAR(32)"
            },
            "batch_uploads": {
                "loan_type": "VARCHAR(32)"
            }
        }
        for table_name, column_definitions in table_columns.items():
            if table_name not in inspector.get_table_names():
                continue
            existing_columns = {c["name"] for c in inspector.get_columns(table_name)}
            with eng.connect() as conn:
                for col_name, col_type in column_definitions.items():
                    if col_name not in existing_columns:
                        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}"))
                conn.commit()
    except Exception as e:
        print(f"[DB Notice] init_db warning for {eng.url}: {e}")

# Dependency for FastAPI routes
def get_db():
    try:
        db = SessionLocal()
        db.connection()
    except Exception as e:
        # Graceful fallback to local SQLite if cloud DB fails or is offline
        print(f"[DB Notice] Primary DB unavailable ({e}). Falling back to local SQLite.")
        init_db(sqlite_fallback_engine)
        db = SqliteSessionLocal()

    try:
        yield db
    finally:
        db.close()

