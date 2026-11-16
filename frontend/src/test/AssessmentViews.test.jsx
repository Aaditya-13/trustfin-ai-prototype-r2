import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ApplicantPortalView from '../components/ApplicantPortalView';
import BankOfficerSummary from '../components/BankOfficerSummary';
import CustomerNoticeModal from '../components/CustomerNoticeModal';
import { fetchLoanReportPdfBlob } from '../services/api';

vi.mock('../components/RecourseSimulator', () => ({ default: () => null }));
vi.mock('../services/api', () => ({
  downloadLoanReportPdf: vi.fn(),
  fetchLoanReportPdfBlob: vi.fn(),
}));

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); });

const applicantData = {
  loan_type: 'personal_loan', Applicant_Income: 50000, Existing_EMI: 10000,
  Loan_Amount: 600000, Loan_Term: 36, CIBIL_Score: 780, Missed_Payments_12M: 2,
};
const makeResult = (overrides = {}) => ({
  prediction: 'Approved', probability: 0.9563, confidenceScore: 0.9563,
  dossierId: 'P-TEST',
  trustScore: { overallTrustScore: 0.92, faithfulness: 0.9, stability: 0.9, consistency: 1, fairness: 1 },
  shap: { features: [{ feature: 'CIBIL_Score', contribution: 0.8 }] },
  lime: { features: [] },
  solvencyCheck: {
    totalIncome: 50000, monthlyEMI: 18610, existingEMI: 10000,
    totalMonthlyObligation: 28610, netDisposableIncome: 21390,
    dtiRatio: 0.5722, dtiPercent: '57.2%', status: 'INSOLVENT', isSolvent: false,
  },
  ...overrides,
});

describe('Assessment wording across officer and applicant views', () => {
  it.each([['officer view', BankOfficerSummary], ['applicant view', ApplicantPortalView]])(
    'keeps an approved model result separate from a failed affordability check in %s',
    (_name, View) => {
      render(<View result={makeResult()} applicantData={applicantData} />);
      expect(screen.getByText('Model prediction: Approved')).toBeInTheDocument();
      expect(screen.getByText('AFFORDABILITY REVIEW REQUIRED')).toBeInTheDocument();
      expect(screen.queryByText(/meets the configured eligibility criteria/)).not.toBeInTheDocument();
      expect(screen.queryByText(/clear credit bureau record/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/high repayment probability/i)).not.toBeInTheDocument();
    },
  );

  it('previews the actual applicant notice with existing debt included', () => {
    render(<CustomerNoticeModal isOpen onClose={vi.fn()} result={makeResult()} applicantData={applicantData} />);
    expect(screen.getByText('Model prediction: Approved')).toBeInTheDocument();
    expect(screen.getByText('AFFORDABILITY REVIEW REQUIRED')).toBeInTheDocument();
    expect(screen.getByText('₹28,610')).toBeInTheDocument();
    expect(screen.queryByText(/residential mortgage/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sanction advice letter/i)).not.toBeInTheDocument();
  });

  it('shows the rejected model class even when the affordability check passes', () => {
    const result = makeResult({ prediction: 'Rejected', probability: 0.1, confidenceScore: 0.9 });
    result.solvencyCheck = { ...result.solvencyCheck, dtiRatio: 0.3, dtiPercent: '30.0%', status: 'OPTIMAL', isSolvent: true };
    render(<ApplicantPortalView result={result} applicantData={applicantData} />);
    expect(screen.getByText('Model prediction: Rejected')).toBeInTheDocument();
    expect(screen.queryByText(/past defaults/i)).not.toBeInTheDocument();
  });

  it('does not describe an affordable approved prediction as a sanction or repayment guarantee', () => {
    const result = makeResult();
    result.solvencyCheck = { ...result.solvencyCheck, dtiRatio: .3, dtiPercent: '30.0%', isSolvent: true, status: 'OPTIMAL' };
    render(<ApplicantPortalView result={result} applicantData={applicantData} />);
    expect(screen.getByText('MODEL APPROVED: VERIFICATION REQUIRED')).toBeInTheDocument();
    expect(screen.queryByText(/high repayment probability|safe to generate sanction/i)).not.toBeInTheDocument();
  });

  it('fetches a fresh PDF after another saved assessment is loaded', async () => {
    const createUrl = vi.spyOn(window.URL, 'createObjectURL').mockReturnValueOnce('blob:first').mockReturnValueOnce('blob:second');
    fetchLoanReportPdfBlob.mockResolvedValue(new Blob(['assessment']));
    const first = makeResult();
    const second = makeResult({ dossierId: 'P-NEXT' });
    const { rerender } = render(<ApplicantPortalView result={first} applicantData={applicantData} />);
    fireEvent.click(screen.getByRole('button', { name: 'Preview', exact: true }));
    await waitFor(() => expect(screen.getByTitle('Credit Assessment Report PDF')).toHaveAttribute('src', 'blob:first'));
    rerender(<ApplicantPortalView result={second} applicantData={applicantData} />);
    expect(screen.queryByTitle('Credit Assessment Report PDF')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Preview', exact: true }));
    await waitFor(() => expect(screen.getByTitle('Credit Assessment Report PDF')).toHaveAttribute('src', 'blob:second'));
    expect(fetchLoanReportPdfBlob).toHaveBeenLastCalledWith(applicantData, second);
    expect(createUrl).toHaveBeenCalledTimes(2);
  });

  it('ignores an old PDF response that arrives after the assessment changes', async () => {
    let finishOldRequest;
    fetchLoanReportPdfBlob.mockImplementationOnce(() => new Promise(resolve => { finishOldRequest = resolve; }))
      .mockResolvedValueOnce(new Blob(['new assessment']));
    const createUrl = vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:current');
    const { rerender } = render(<ApplicantPortalView result={makeResult()} applicantData={applicantData} />);
    fireEvent.click(screen.getByRole('button', { name: 'Preview', exact: true }));
    rerender(<ApplicantPortalView result={makeResult({ dossierId: 'P-NEXT' })} applicantData={applicantData} />);
    fireEvent.click(screen.getByRole('button', { name: 'Preview', exact: true }));
    await waitFor(() => expect(screen.getByTitle('Credit Assessment Report PDF')).toHaveAttribute('src', 'blob:current'));
    await act(async () => finishOldRequest(new Blob(['old assessment'])));
    expect(createUrl).toHaveBeenCalledTimes(1);
    expect(screen.getByTitle('Credit Assessment Report PDF')).toHaveAttribute('src', 'blob:current');
  });
});
