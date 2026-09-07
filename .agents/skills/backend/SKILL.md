---
name: Backend Development
description: Guidelines for the FastAPI backend and database integration.
---

# Backend Skill

When working on the backend API and database:

1. **Framework**: Use FastAPI.
2. **Validation**: Use Pydantic schemas for all API contracts (requests and responses).
3. **Service Boundaries**: Maintain strict separation between API routes, ML logic, validation logic, and database operations.
4. **Database**: Use PostgreSQL with SQLAlchemy (or similar ORM). Use parameterized queries to prevent SQL injection.
5. **Error Handling**: Implement centralized error handling. Do not expose internal stack traces. If an explanation or validation fails, report it clearly; do not return fabricated default scores.
