import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Graceful local SQLite fallback for developers/examiners running without cloud DB
    DATABASE_URL = "sqlite:///./trustfin_local.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # Neon DB / PostgreSQL connection
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5, max_overflow=10)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency for FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
