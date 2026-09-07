---
name: Frontend Development
description: Guidelines for the React dashboard.
---

# Frontend Skill

When working on the frontend React dashboard:

1. **Stack**: Use React, Vite, and Tailwind CSS.
2. **Logic**: The frontend must not contain ML logic, Trust Score calculation, or independent XAI implementation. It is purely for presentation and API consumption.
3. **API Consumption**: Consume the standardized API responses via Axios or fetch. Handle loading and error states gracefully.
4. **Visualization**: Use Recharts (or similar) to display horizontal contribution charts for SHAP and LIME, comparison tables, and the Trust Score indicator.
5. **Component Boundaries**: Keep components modular, focused, and reusable. Ensure the design is rich, premium, and uses modern web design aesthetics.
