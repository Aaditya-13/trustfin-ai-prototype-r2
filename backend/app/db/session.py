import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./trustfin_local.db")

# Resolve local SQLite database path relative to project root
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
local_sqlite_path = os.path.join(project_root, "trustfin_local.db").replace("\\", "/")
LOCAL_SQLITE_URL = f"sqlite:///{local_sqlite_path}"

if DATABASE_URL.startswith("sqlite:///./") or DATABASE_URL == "sqlite:///trustfin_local.db":
    DATABASE_URL = LOCAL_SQLITE_URL

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # Neon DB / PostgreSQL connection
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5, max_overflow=10)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Local SQLite fallback engine if PostgreSQL is unreachable/offline
sqlite_fallback_engine = create_engine(LOCAL_SQLITE_URL, connect_args={"check_same_thread": False})
SqliteSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sqlite_fallback_engine)

Base = declarative_base()

# Dependency for FastAPI routes
def get_db():
    try:
        db = SessionLocal()
        db.connection()
        try:
            yield db
        finally:
            db.close()
    except Exception as e:
        # Graceful fallback to local SQLite if cloud DB fails
        print(f"[DB Notice] Primary DB unavailable ({e}). Falling back to local SQLite.")
        Base.metadata.create_all(bind=sqlite_fallback_engine)
        db = SqliteSessionLocal()
        try:
            yield db
        finally:
            db.close()

