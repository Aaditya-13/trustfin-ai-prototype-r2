from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api.routes import prediction

app = FastAPI(
    title="TrustFin API",
    description="Explainable AI Decision-Support System API",
    version="1.0.0"
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
