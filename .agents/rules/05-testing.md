# Testing Rules

Every major module should have tests.

Required test areas:

- preprocessing
- feature transformation
- prediction
- SHAP
- LIME
- faithfulness
- stability
- consistency
- fairness
- Trust Score
- API
- database operations

## Mathematical Components

Test:
- expected ranges
- boundary conditions
- empty inputs
- invalid inputs
- numerical edge cases

## Integration

At minimum, verify:

Applicant Input
 → preprocessing
 → model
 → prediction
 → SHAP
 → LIME
 → validation
 → Trust Score
 → API response

## Regression

Do not change existing behavior without identifying the reason.

When fixing a bug:
1. reproduce it
2. add a regression test
3. fix it
4. run relevant tests
