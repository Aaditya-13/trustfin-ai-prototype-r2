"""Isolated report regressions; run with unittest without loading live models."""
import unittest

import pymupdf

from backend.app.reporting.pdf_generator import generate_loan_report_pdf


class PdfAssessmentWordingTests(unittest.TestCase):
    def report_text(self, *, product='personal_loan', prediction='Approved', ratio=.5722):
        applicant = {
            'loan_type': product, 'Applicant_Income': 50000, 'Existing_EMI': 10000,
            'Loan_Amount': 600000, 'Loan_Term': 36, 'CIBIL_Score': 780,
            'Missed_Payments_12M': 2,
        }
        result = {
            'prediction': prediction, 'dossierId': 'P-WORDING-TEST',
            'confidenceScore': .95, 'probability': .95 if prediction == 'Approved' else .05,
            'solvencyCheck': {
                'totalIncome': 50000, 'monthlyEMI': ratio * 50000 - 10000, 'existingEMI': 10000,
                'totalMonthlyObligation': ratio * 50000, 'netDisposableIncome': 50000 * (1 - ratio),
                'dtiRatio': ratio, 'dtiPercent': f'{ratio * 100:.1f}%',
                'isSolvent': ratio <= .5, 'status': 'INSOLVENT' if ratio > .5 else 'OPTIMAL',
            },
            'trustScore': {'overallTrustScore': .92, 'faithfulness': .9, 'stability': .9, 'consistency': 1, 'fairness': 1},
            'shap': {'features': [{'feature': 'CIBIL_Score', 'contribution': .8}]},
        }
        pdf = pymupdf.open(stream=generate_loan_report_pdf(applicant, result), filetype='pdf')
        return '\n'.join(page.get_text() for page in pdf)

    def test_approved_model_does_not_hide_failed_affordability(self):
        for product in ('home_loan', 'personal_loan'):
            with self.subTest(product=product):
                text = self.report_text(product=product)
                self.assertIn('Model prediction: APPROVED', text)
                self.assertIn('AFFORDABILITY REVIEW REQUIRED', text)
                self.assertIn('57.2%', text)
                self.assertNotIn('well below', text)
                self.assertNotIn('Auto-Sanction', text)

    def test_no_fabricated_clean_credit_or_repayment_claims(self):
        text = self.report_text()
        self.assertNotIn('zero delinquencies', text)
        self.assertNotIn('no active defaults', text)
        self.assertNotIn('Statutory Lending Compliance', text)

    def test_personal_loan_guidance_does_not_offer_mortgage_terms(self):
        text = self.report_text(prediction='Rejected')
        self.assertNotIn('180 to 240', text)
        self.assertNotIn('Add an Earning Co-Borrower', text)

    def test_approved_affordable_result_is_still_subject_to_lender_review(self):
        text = self.report_text(ratio=.3)
        self.assertIn('Model prediction: APPROVED', text)
        self.assertIn('lender review', text)
        self.assertNotIn('Agreement & Disbursement', text)
