# TrustFin AI • Institutional Credit Decision & Audit System

An explainable, audit-ready AI credit underwriting platform for retail lending. TrustFin AI combines machine learning (XGBoost) with deterministic solvency guardrails (FOIR / DTI checks), real-time explainability (SHAP & LIME), and institutional PDF sanction/rejection reporting.

---

## Architecture Overview

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, Recharts (Enterprise UIDAI-inspired UI)
- **Backend API**: FastAPI, Pydantic v2, Uvicorn
- **Explainable AI (XAI)**: SHAP (TreeExplainer) & LIME (TabularExplainer) with Composite Trust Scoring
- **Database**: SQLAlchemy ORM with dual-mode support (Cloud PostgreSQL / Neon DB or Zero-config local SQLite)
- **Reporting**: ReportLab PDF generator with system font support (₹ symbol rendering)

---

## Prerequisites

Ensure you have the following installed on your machine:
- **Python**: 3.10 or higher ([python.org](https://www.python.org/))
- **Node.js**: 18 or higher & npm ([nodejs.org](https://nodejs.org/))
- **Git**: ([git-scm.com](https://git-scm.com/))

---

## Quick Start Guide

### 1. Backend Setup

Open a terminal (PowerShell on Windows or Bash) in the project root directory:

```powershell
# 1. Create and activate a Python virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1   # On Windows PowerShell
# source venv/bin/activate    # On Linux/macOS

# 2. Install backend dependencies
pip install -r requirements.txt

# 3. Create your local environment file from the template
copy .env.example .env        # On Windows PowerShell
# cp .env.example .env        # On Linux/macOS

# 4. Initialize the database schema (creates local SQLite or connects to PostgreSQL)
python scripts/init_db.py

# 5. Start the FastAPI backend server
uvicorn backend.app.main:app --reload --port 8000
```
> The backend will be available at: **http://127.0.0.1:8000**  
> Interactive OpenAPI documentation: **http://127.0.0.1:8000/docs**

---

### 2. Frontend Setup

Open a **second terminal** in the project root:

```powershell
# 1. Navigate to the frontend directory
cd frontend

# 2. Install frontend dependencies
npm install

# 3. Start the Vite development server
npm run dev
```
> The dashboard will be available at: **http://localhost:5173**

---

## Pre-trained Models & Datasets

This repository includes pre-trained models and required datasets in the `models/` and `datasets/` directories:
- `models/loan_prediction_model.pkl`: Calibrated XGBoost credit model.
- `models/preprocessor.pkl`: Standardized feature encoder and scaler.
- `models/feature_config.json`: Feature definitions and valid input ranges.
- `datasets/train.csv`: Training reference dataset.

You do **not** need to retrain the model to run the application immediately. If you wish to retrain or fine-tune, run:
```powershell
python scripts/train_model.py
```

---

## Environment Variables Configuration

The `.env` file supports the following options:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | SQLAlchemy connection string. Leave as SQLite for local runs or paste your PostgreSQL / Neon DB URI. | `sqlite:///./trustfin_local.db` |
| `PORT` | FastAPI server port | `8000` |
| `HOST` | FastAPI bind host | `127.0.0.1` |
| `VITE_API_BASE_URL` | Base API URL called by the React frontend | `http://127.0.0.1:8000/api/v1/loan` |

---

## Verification & Testing

To test the core components and validation pipeline:
```powershell
# Run XAI and solvency validation tests
python scripts/test_validation.py

# Run XAI feature explanation tests
python scripts/test_xai.py
```
