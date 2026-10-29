from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api.routes import prediction

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure database tables are created & synced across primary & local SQLite engines
    from backend.app.db.session import init_db, sqlite_fallback_engine
    try:
        init_db()
    except Exception as e:
        print(f"[DB Startup Notice] Primary DB init notice: {e}")
    try:
        init_db(sqlite_fallback_engine)
    except Exception:
        pass
    yield

app = FastAPI(
    title="TrustFin API",
    description="Explainable AI Decision-Support System API",
    version="1.0.0",
    lifespan=lifespan
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print("\n" + "=" * 60)
    print(f"[FASTAPI 422 VALIDATION ERROR on {request.url.path}]")
    for err in exc.errors():
        field = " -> ".join(str(loc) for loc in err.get("loc", []))
        msg = err.get("msg")
        val = err.get("input")
        print(f"  Field: {field} | Error: {msg} | Value: {repr(val)}")
    print("=" * 60 + "\n")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()}
    )

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(prediction.router, prefix="/api/v1/loan", tags=["Loan Prediction"])

@app.get("/health")
def health_check():
    return {"status": "healthy"}
