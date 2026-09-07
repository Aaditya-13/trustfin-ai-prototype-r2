# TrustFin Architecture Rules

## Architecture

TrustFin consists of:

React frontend
        ↓
FastAPI backend
        ↓
ML / XAI pipeline
        ↓
PostgreSQL

Core ML/XAI pipeline:

Input
 ↓
Preprocessing
 ↓
Feature Selection
 ↓
ML Model
 ↓
Prediction
 ↓
SHAP + LIME
 ↓
Explanation Validation
 ↓
Trust Score

## Separation of Concerns

Keep these components independent:

- data loading
- preprocessing
- feature selection
- model training
- prediction
- SHAP
- LIME
- validation
- Trust Score
- API
- database
- frontend
- reporting

Frontend must not contain ML logic.

Frontend must not calculate Trust Score.

Frontend must not independently implement SHAP/LIME.

FastAPI should expose the ML/XAI pipeline through clear APIs.

## Dataset Independence

Dataset-specific logic must remain isolated.

The system should allow:

Dataset A
 → preprocessing configuration
 → feature configuration
 → model training

and later:

Dataset B
 → different preprocessing configuration
 → different feature configuration
 → model training

without rewriting the SHAP, LIME, validation, Trust Score, API, and frontend architecture.

## Standardized Explanation

SHAP and LIME should produce a common internal explanation representation.

The frontend should not need to know implementation-specific details of either library.

## Model Independence

Do not tightly couple the application to XGBoost.

The architecture should allow another compatible classifier to be substituted with minimal changes.

## Research vs Application

The research methodology must remain separate from presentation logic.

The dashboard visualizes results.

It does not determine scientific validity.
