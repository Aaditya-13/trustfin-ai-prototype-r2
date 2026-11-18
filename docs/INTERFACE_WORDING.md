# TrustFin interface wording

Use simple banking terms with enough technical detail to explain the project during a review. These labels describe the current code; they do not change the model, lending rules or scores.

## Consistent terms

| Earlier wording | Current wording |
| --- | --- |
| Algorithmic underwriting / credit intelligence | Loan assessment |
| Solvency / repayment safety | Monthly affordability check |
| Default probability / elevated risk in explanation charts | Supports rejection |
| Sanction letter / official bank document | Loan assessment report |
| Four-pillar Trust Score | Four validation checks; three form the Trust Score |
| Compliance verification | Explanation review and project policy checks |
| Surrogate weight / credit weight | LIME contribution / SHAP contribution |
| Prime / subprime / delinquency | Higher or lower credit score / missed payments |
| Trashed applications | Invalid rows that could not be assessed |

## Meanings to preserve

- **Model prediction:** Approved or Rejected is the model output. Its probability is not the measured chance of repayment or failure to repay.
- **Project policy check:** Applies the configured project lending rules separately. A model approval can still fail these checks. Passing mandatory checks can also leave a model rejection unchanged.
- **EMI:** Estimated monthly loan payment. The affordability check compares existing and proposed EMIs with the income used for the selected product. The 50% limit is a project rule, rather than a claim about every bank.
- **FOIR:** Monthly loan repayments divided by monthly income. Explain it as “Monthly Debt / Income” alongside the abbreviation.
- **LTV:** Loan amount divided by property value, shown as a percentage.
- **Explanation Trust Score:** New assessments average faithfulness, stability and consistency with exactly one-third each. Displayed weights are rounded to 33.33%; saved assessments show their recorded weights. Describe the individual checks; a high total does not establish that every check is strong.
- **Faithfulness (local concordance):** New assessments use 60% SHAP and 40% LIME local concordance, retaining up to five features from each existing explanation. Each component compares its approximation with the original model probability. Show both components and their weights. This checks reconstruction, not correct assignment of contributions to features or behavior on other applicants. Saved assessments without method metadata retain their original scores and are labelled accordingly.
- **Stability:** New assessments average SHAP rank/direction similarity over valid small financial changes. Show the actual test count, lowest comparison and model decision flips.
- **Consistency:** Compares SHAP/LIME top-five feature sets and directions. Their contribution values use different scales. Agreement does not prove correctness.
- **Fairness:** The current individual check changes only Gender and measures the difference in approval probability. It is displayed separately from the total and does not establish fairness across groups.

## Display values accurately

Numeric CIBIL scores must stay separate from the legacy binary credit-history flag. Existing EMI and proposed EMI must be labelled and formatted separately. Show card use, FOIR and LTV as percentages. Explain categorical indicator features against the submitted category. Show missing input values as unavailable rather than substituting a scaled model input or an assumed applicant profile.

Do not label a zero contribution as supporting rejection. Use the applicant view shared by the current portal and the older dashboard so the wording and findings stay consistent.

## Scope and verification

This pass covers the application landing and loan-selection pages, forms, officer summary and explanation views, applicant views, tooltips, history, batch results, download filenames, affordability warnings and generated assessment PDFs. It does not rewrite the separate LaTeX academic report.

Local review evidence is saved under the ignored `experiments/wording_update_2026-11-18/` directory: original source copies, phrase changes, encoding repairs, test logs, integrity checks, and rendered approved/rejected report samples for both loan products. Scientific artifacts and Trust Score weights were checked against the previous run.

Verification: 69 backend tests with 30 subtests, 65 frontend tests, and the production frontend build pass. The four rendered report samples fit on one page each. Tests also cover the tooltip formatting corrections and the shared applicant view.
