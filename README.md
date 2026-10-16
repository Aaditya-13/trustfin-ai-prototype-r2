# TrustFin AI • Institutional Credit Decision & Audit System

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/Frontend-React%2019-61DAFB.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC.svg)](https://tailwindcss.com/)
[![XGBoost](https://img.shields.io/badge/ML-XGBoost-EB5424.svg)](https://xgboost.readthedocs.io/)
[![XAI](https://img.shields.io/badge/Explainability-SHAP%20%7C%20LIME-FF6F00.svg)](https://github.com/shap/shap)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An explainable, audit-ready AI credit underwriting platform for retail lending. **TrustFin AI** combines machine learning (XGBoost) with deterministic solvency guardrails (FOIR / DTI checks), real-time dual-explainer verification (SHAP & LIME), a 4-pillar Composite Trust Engine, and institutional PDF sanction/rejection reporting.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                TrustFin AI Architecture                                 │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                         │
        ┌────────────────────────────────┴────────────────────────────────┐
        ▼                                                                 ▼
 ┌───────────────┐                                                ┌───────────────┐
 │ React 19 UI   │  ◄─── HTTP / REST APIs (Port 8000) ──────────► │ FastAPI Core  │
 │ • Dossier Form│                                                │ • Validation  │
 │ • Bank Audit  │                                                │ • Prediction  │
 │ • Recourse    │                                                │ • Explainers  │
 │ • PDF Viewer  │                                                │ • PDF Engine  │
 └───────────────┘                                                └───────┬───────┘
                                                                          │
                        ┌─────────────────────────────────────────────────┼─────────────────────────┐
                        ▼                                                 ▼                         ▼
                 ┌───────────────┐                                 ┌───────────────┐         ┌───────────────┐
                 │ XGBoost Model │                                 │ Dual XAI Hub  │         │ Database Layer│
                 │ 99.17% Acc    │                                 │ • TreeSHAP    │         │ SQLite (local)│
                 │ 0.9997 AUC    │                                 │ • TabularLIME │         │ PostgreSQL    │
                 └───────────────┘                                 └───────────────┘         └───────────────┘
```

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, Recharts (Institutional UIDAI-inspired UI).
- **Backend API**: FastAPI, Pydantic v2, Uvicorn (Asynchronous high-performance REST engine).
- **Machine Learning**: Extreme Gradient Boosting (XGBoost) with engineered financial debt-service ratios.
- **Explainable AI (XAI)**: Concurrent TreeSHAP & TabularLIME with 4-pillar trust validation (Faithfulness, Stability, Consistency, Fairness).
- **Database**: SQLAlchemy ORM with dual-mode support (Zero-config local SQLite or Cloud PostgreSQL / Neon DB).
- **Audit Reporting**: ReportLab PDF generator rendering cryptographic audit hashes and Indian Rupee (`₹`) typography.

---

## System Prerequisites

Before setting up the project, make sure the following runtimes are installed:

| Tool | Required Version | Verification Command | Download Link |
| :--- | :--- | :--- | :--- |
| **Python** | `3.10` or higher | `python --version` | [python.org](https://www.python.org/downloads/) |
| **Node.js** | `18.0.0` or higher | `node -v` | [nodejs.org](https://nodejs.org/) |
| **npm** | `9.0.0` or higher | `npm -v` | Included with Node.js |
| **Git** | `2.x` or higher | `git --version` | [git-scm.com](https://git-scm.com/) |

---

## Complete Setup & Installation Guide

Setting up TrustFin AI requires two terminals: **Terminal 1** for the Python FastAPI backend and **Terminal 2** for the React Vite frontend.

```
trustfin-ai-proto/
├── Terminal 1: Backend API (Python venv + FastAPI on Port 8000)
└── Terminal 2: Frontend Client (Node.js + Vite on Port 5173)
```

### Step 1: Clone the Repository

Open your terminal (PowerShell on Windows, or Bash on macOS/Linux):

```powershell
git clone https://github.com/Aaditya-13/trustfin-ai-prototype-r2.git
cd trustfin-ai-prototype-r2
```

---

### Step 2: Backend Setup (Python Virtual Environment)

In **Terminal 1**, navigate to the project root directory:

#### 1. Create a Python Virtual Environment (`venv`)
```powershell
python -m venv venv
```

#### 2. Activate the Virtual Environment

* **On Windows (PowerShell)**:
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
  > **Note for Windows Users**: If PowerShell gives an execution policy error (`File Activate.ps1 cannot be loaded because running scripts is disabled`):
  > ```powershell
  > Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  > .\venv\Scripts\Activate.ps1
  > ```

* **On Windows (Command Prompt - CMD)**:
  ```cmd
  venv\Scripts\activate.bat
  ```

* **On macOS / Linux**:
  ```bash
  source venv/bin/activate
  ```

*(Once activated, you will see `(venv)` prefixed in your terminal prompt).*

#### 3. Upgrade `pip` & Install Python Dependencies
```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

#### 4. Configure Environment Variables
Copy the `.env.example` template to `.env`:

* **Windows (PowerShell / CMD)**:
  ```powershell
  copy .env.example .env
  ```
* **macOS / Linux**:
  ```bash
  cp .env.example .env
  ```

*(By default, `.env` is pre-configured to use **SQLite** (`sqlite:///./trustfin_local.db`), so zero external database configuration is required).*

#### 5. Initialize the Database Schema
Run the database initialization script to create all required tables:
```powershell
python scripts/init_db.py
```
*Expected output: `Database initialized successfully.`*

#### 6. Start the FastAPI Backend Server
```powershell
uvicorn backend.app.main:app --reload --port 8000
```

* **Backend API Base**: `http://127.0.0.1:8000`
* **Swagger API Documentation**: `http://127.0.0.1:8000/docs`
* **Alternative ReDoc UI**: `http://127.0.0.1:8000/redoc`

Keep this terminal running.

---

### Step 3: Frontend Setup (React & Vite)

Open a **second terminal** (Terminal 2) and navigate to the `frontend/` directory:

```powershell
cd frontend
```

#### 1. Install Node Dependencies
```powershell
npm install
```

#### 2. Start the Frontend Development Server
```powershell
npm run dev
```

* **Frontend Dashboard**: `http://localhost:5173`

Open `http://localhost:5173` in your web browser to access the TrustFin AI system!

---

## Verifying the Setup

To verify that your Python virtual environment, ML pipeline, and validation engines are functioning properly, run the test suite in your activated `venv`:

```powershell
# 1. Test XAI dual-explainer feature attribution (SHAP & LIME)
python scripts/test_xai.py

# 2. Test 4-pillar trust validation engine & solvency guardrails
python scripts/test_validation.py
```

Both tests should complete with all assertions passing.

---

## Pre-trained Models & Model Retraining

This repository ships with pre-trained models and datasets so you can run the application immediately without retraining:

- `models/loan_prediction_model.pkl`: Calibrated XGBoost credit model (99.17% test accuracy, 0.9997 ROC-AUC).
- `models/preprocessor.pkl`: One-Hot encoder, median imputer, and feature pipeline.
- `models/feature_config.json`: Feature registry and input validation boundaries.
- `datasets/train.csv`: Retail banking training records (3,192 dossiers).

If you wish to retrain or fine-tune the model pipeline from scratch:
```powershell
python scripts/train_model.py
```
The script will log evaluation metrics, recompute cross-validation scores, and export new artifacts to `models/`.

---

## Environment Variables Configuration

The `.env` file located in the project root supports the following configurations:

| Variable | Description | Default Value | Notes |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | SQLAlchemy connection string | `sqlite:///./trustfin_local.db` | Use default for local runs, or supply PostgreSQL / Neon DB URI for production |
| `PORT` | FastAPI backend port | `8000` | Port for the API server |
| `HOST` | FastAPI bind address | `127.0.0.1` | Local loopback address |
| `VITE_API_BASE_URL` | API endpoint called by React | `http://127.0.0.1:8000/api/v1/loan` | Update if deploying to a remote host or changing port |

---

## Project Directory Structure

```
trustfin-ai-proto/
├── backend/                        # FastAPI Application
│   ├── app/
│   │   ├── api/v1/                 # REST Route Handlers (loan, audit, pdf)
│   │   ├── core/                   # App Configuration & Settings
│   │   ├── db/                     # SQLAlchemy Database Session & Models
│   │   ├── ml/                     # ML Preprocessing & Feature Engineering
│   │   ├── services/               # Prediction, XAI (SHAP/LIME), & PDF Generator
│   │   └── main.py                 # FastAPI Application Entrypoint
│   └── tests/                      # Backend Unit & Integration Tests
├── datasets/                       # Historical Retail Loan Records
│   └── train.csv                   # 3,192 Raw Loan Applications
├── docs/                           # Academic Research Papers & Documentation
│   ├── TRUSTFIN_IEEE_PAPER.tex     # Complete IEEE Conference Paper (LaTeX for Overleaf)
│   ├── TRUSTFIN_RESEARCH_JOURNAL_PAPER.md # Comprehensive Markdown Research Paper
│   ├── methodology.png             # 7-Stage Pipeline Diagram
│   ├── roc_curve.png               # Multi-Model ROC Discrimination Plot
│   └── shap_lime.png               # Dual-Explainer Attribution Concordance Plot
├── frontend/                       # React 19 + Vite Web Application
│   ├── src/
│   │   ├── components/             # UI Components (Dossier Form, Audit, Recourse)
│   │   ├── App.jsx                 # Application Shell & Header
│   │   └── main.jsx                # React Entrypoint
│   ├── package.json                # Frontend Dependencies & Scripts
│   ├── tailwind.config.js          # Enterprise Styling Tokens
│   └── README.md                   # Dedicated Frontend Architecture Guide
├── models/                         # Serialized Model Artifacts
│   ├── loan_prediction_model.pkl   # Calibrated XGBoost Classifier
│   ├── preprocessor.pkl            # Preprocessing Pipeline
│   └── feature_config.json         # Feature Schema & Bounds
├── scripts/                        # Utility & Automation Scripts
│   ├── init_db.py                  # Database Schema Initialization
│   ├── train_model.py              # ML Training & Cross-Validation Pipeline
│   ├── test_xai.py                 # SHAP & LIME Verification Script
│   ├── test_validation.py          # 4-Pillar Trust Score Audit Script
│   └── generate_paper_figures.py   # Publication-Grade Figure Generator
├── .env.example                    # Environment Variables Template
├── requirements.txt                # Python Backend Dependencies
└── README.md                       # Main Repository Documentation
```

---

## Troubleshooting & FAQ

### 1. PowerShell Script Execution Policy Error
**Problem**: When running `.\venv\Scripts\Activate.ps1`, PowerShell outputs:
> `File ...\Activate.ps1 cannot be loaded because running scripts is disabled on this system.`

**Solution**: Run this command in your PowerShell terminal to allow local scripts for the current session:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\venv\Scripts\Activate.ps1
```

---

### 2. Port Conflict (Port 8000 or 5173 Already in Use)
**Problem**: FastAPI fails to start because port 8000 is occupied.

**Solution**:
* On Windows, identify and terminate the process holding port 8000:
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process
  ```
* Or specify an alternative port when launching Uvicorn:
  ```powershell
  uvicorn backend.app.main:app --reload --port 8080
  ```
  *(Remember to update `VITE_API_BASE_URL` in `.env` and `frontend/src/` accordingly).*

---

### 3. Missing C++ Compiler or Build Tools for `xgboost` / `shap`
**Problem**: `pip install` attempts to build from source and fails.

**Solution**: Ensure your `pip` is upgraded to the latest version so it fetches pre-compiled binary wheels:
```powershell
python -m pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

---

### 4. PDF Generation & Indian Rupee (`₹`) Symbol Rendering
**Problem**: In some environments, the currency symbol displays as a square or question mark.

**Solution**: TrustFin AI includes automated font fallbacks. On Windows, it binds to system TrueType fonts (`Segoe UI` or `Arial`). If running on headless Linux, install standard font packages:
```bash
sudo apt-get install fonts-dejavu-core fonts-freefont-ttf
```

---

## Research & Academic Publication

TrustFin AI is documented as a publication-ready academic conference paper formatted for Overleaf and IEEE conferences:

* **LaTeX Paper Source**: [`docs/TRUSTFIN_IEEE_PAPER.tex`](docs/TRUSTFIN_IEEE_PAPER.tex)
* **Comprehensive Research Paper**: [`docs/TRUSTFIN_RESEARCH_JOURNAL_PAPER.md`](docs/TRUSTFIN_RESEARCH_JOURNAL_PAPER.md)
* **High-Res Figures**: All 3 publication figures are available in `docs/` (`methodology.png`, `roc_curve.png`, `shap_lime.png`) or can be re-generated using `python scripts/generate_paper_figures.py`.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
