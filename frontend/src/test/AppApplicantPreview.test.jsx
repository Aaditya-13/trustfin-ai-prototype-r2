import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../App';
import { fetchLoanReportPdfBlob, predictLoan } from '../services/api';

vi.mock('../components/LandingPage', () => ({ default: ({ onSelectPortal }) => <button onClick={() => onSelectPortal('bank_officer')}>Officer</button> }));
vi.mock('../components/LoanTypeSelection', () => ({ default: ({ onSelectLoan }) => <button onClick={() => onSelectLoan('personal_loan')}>Personal loan</button> }));
vi.mock('../components/ApplicantForm', () => ({ default: ({ onSubmit }) => <button onClick={() => onSubmit({ Applicant_Income: 50000, Existing_EMI: 10000, Loan_Amount: 600000, Loan_Term: 36 })}>Assess</button> }));
vi.mock('../components/BankOfficerSummary', () => ({ default: ({ onOpenCustomerNoticeModal }) => <button onClick={onOpenCustomerNoticeModal}>Applicant preview</button> }));
vi.mock('../components/Navbar', () => ({ default: () => null }));
vi.mock('../components/AuditHistoryModal', () => ({ default: () => null }));
vi.mock('../components/RecourseSimulator', () => ({ default: () => null }));
vi.mock('../services/api', () => ({ predictLoan: vi.fn(), fetchLoanReportPdfBlob: vi.fn(), downloadLoanReportPdf: vi.fn() }));

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe('Applicant PDF preview from the officer workflow', () => {
  it('retries a failed report and returns focus to the applicant preview', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    predictLoan.mockResolvedValue({
      prediction: 'Approved', probability: 0.9, confidenceScore: 0.9, dossierId: 'P-FLOW',
      trustScore: { overallTrustScore: 0.8 }, shap: { features: [] },
      solvencyCheck: { totalIncome: 50000, monthlyEMI: 18000, existingEMI: 10000, totalMonthlyObligation: 28000, dtiRatio: 0.56, isSolvent: false },
    });
    fetchLoanReportPdfBlob.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(new Blob(['report']));
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Officer', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Personal loan', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Assess', exact: true }));
    fireEvent.click(await screen.findByRole('button', { name: 'Applicant preview', exact: true }));
    const applicantDialog = screen.getByRole('dialog', { name: 'Applicant View Preview' });
    const previewButton = within(applicantDialog).getByRole('button', { name: 'Preview', exact: true });
    previewButton.focus();
    fireEvent.click(previewButton);
    expect(await screen.findByRole('alert')).toHaveTextContent('The report preview could not be loaded. Try again.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByTitle('Loan assessment report PDF preview')).toHaveAttribute('src', 'blob:mock-url'));
    const pdfDialog = screen.getByRole('dialog', { name: 'Assessment PDF Preview' });
    fireEvent.keyDown(pdfDialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Assessment PDF Preview' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Applicant View Preview' })).toBeInTheDocument();
    expect(previewButton).toHaveFocus();
  });
});
