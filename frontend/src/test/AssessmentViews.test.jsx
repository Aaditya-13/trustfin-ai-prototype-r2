import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ApplicantPortalView from '../components/ApplicantPortalView';
import BankOfficerSummary from '../components/BankOfficerSummary';
import CustomerNoticeModal from '../components/CustomerNoticeModal';
import InsightsDashboard from '../components/InsightsDashboard';
import { downloadLoanReportPdf, fetchLoanReportPdfBlob } from '../services/api';

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
  it('uses the shared applicant assessment in the older dashboard too', () => {
    render(<InsightsDashboard result={makeResult()} applicantData={applicantData} />);
    fireEvent.click(screen.getByRole('button', { name: 'Applicant View' }));
    expect(screen.getByText('Model prediction: Approved')).toBeInTheDocument();
    expect(screen.getByText('AFFORDABILITY REVIEW REQUIRED')).toBeInTheDocument();
    expect(screen.queryByText(/sanction letter|clear credit bureau record/i)).not.toBeInTheDocument();
  });
  it('shows the recorded three-component trust formula', () => {
    const result = makeResult();
    result.trustScore.weights = { faithfulness: 1 / 3, stability: 1 / 3, consistency: 1 / 3 };
    render(<BankOfficerSummary result={result} applicantData={applicantData} />);
    expect(screen.getByText('33.33% × Faithfulness + 33.33% × Stability + 33.33% × Consistency')).toBeInTheDocument();
  });

  it.each([BankOfficerSummary, InsightsDashboard])('shows both recorded faithfulness components in the officer interface', (View) => {
    const result = makeResult({ faithfulnessCheck: {
      method: 'local_concordance', topK: 5, weights: { shap: .6, lime: .4 },
      shap: { score: .99, approximation: .95 }, lime: { score: .7, approximation: .65 },
    } });
    render(<View result={result} applicantData={applicantData} />);
    expect(screen.getByLabelText('Faithfulness local concordance details')).toBeInTheDocument();
    expect(screen.getByText(/weight 60%/)).toBeInTheDocument();
    expect(screen.getByText(/weight 40%/)).toBeInTheDocument();
  });

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

  it('marks missing affordability data as unavailable', () => {
    render(<ApplicantPortalView result={makeResult({ solvencyCheck: null })} applicantData={applicantData} />);
    expect(screen.getByText('AFFORDABILITY DETAILS UNAVAILABLE')).toBeInTheDocument();
    expect(screen.getByText(/Affordability details are unavailable for this assessment/)).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText('0.0%')).not.toBeInTheDocument();
    expect(screen.getByTestId('applicant-outcome')).toHaveClass('bg-amber-50');
  });

  it('uses an amber outcome when an approved prediction needs affordability review', () => {
    render(<ApplicantPortalView result={makeResult()} applicantData={applicantData} />);
    expect(screen.getByTestId('applicant-outcome')).toHaveClass('bg-amber-50');
    expect(screen.getByText('AFFORDABILITY REVIEW REQUIRED')).toBeInTheDocument();
  });

  it('uses applicant income for a personal loan with co-applicant fields present', () => {
    const result = makeResult();
    result.solvencyCheck.totalIncome = 70000;
    render(<ApplicantPortalView result={result} applicantData={{ ...applicantData, Coapplicant_Income: 20000 }} />);
    expect(screen.getByText('Personal loan assessment')).toBeInTheDocument();
    expect(screen.getByText('Applicant income')).toBeInTheDocument();
    expect(screen.getByText('₹50,000')).toBeInTheDocument();
    expect(screen.queryByText('₹70,000')).not.toBeInTheDocument();
    expect(screen.getByText('780')).toBeInTheDocument();
  });

  it('keeps explicit home-loan data ahead of an unrelated loan-purpose field', () => {
    const submitted = { ...applicantData, loan_type: 'home_loan', Loan_Purpose: 'Medical_Emergency', Coapplicant_Income: 20000, Property_Value: 800000 };
    const result = makeResult();
    result.solvencyCheck.totalIncome = 70000;
    render(<ApplicantPortalView result={result} applicantData={submitted} />);
    expect(screen.getByText('Home loan assessment')).toBeInTheDocument();
    expect(screen.getByText('Applicant + co-applicant income')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View Application Form' }));
    expect(screen.getByText('Property market value')).toBeInTheDocument();
    expect(screen.queryByText('Loan purpose')).not.toBeInTheDocument();
  });

  it('handles incomplete historical results without inventing an identifier or date', () => {
    render(<ApplicantPortalView result={makeResult({ dossierId: null, shap: null, trustScore: null })} applicantData={null} />);
    expect(screen.getByText('Reference unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/TF-ASMT-849201|Issued on/)).not.toBeInTheDocument();
    expect(screen.getByText('No matching explanation factors are available for this result.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview', exact: true })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'View Application Form' })).toBeDisabled();
  });

  it('handles an unsupported saved prediction without presenting a rejection', () => {
    render(<ApplicantPortalView result={makeResult({ prediction: 'Unknown' })} applicantData={applicantData} />);
    expect(screen.getByText('Model prediction unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Model prediction: Rejected')).not.toBeInTheDocument();
    expect(screen.getByTestId('applicant-outcome')).toHaveClass('bg-amber-50');
  });

  it('identifies encoded categorical factors by the submitted field', () => {
    const result = makeResult({ shap: { features: [{ feature: 'Employment_Status_Self-Employed', contribution: 0.4 }, null] } });
    render(<ApplicantPortalView result={result} applicantData={{ ...applicantData, Employment_Status: 'Salaried' }} />);
    expect(screen.getByText("Employment Status increased the model's approval output.")).toBeInTheDocument();
    expect(screen.queryByText(/Self-Employed increased/)).not.toBeInTheDocument();
  });

  it('shows download failures inline', async () => {
    downloadLoanReportPdf.mockRejectedValueOnce(new Error('offline'));
    render(<ApplicantPortalView result={makeResult()} applicantData={applicantData} />);
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The report could not be downloaded. Try again.');
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeEnabled();
  });

  it('retries a failed preview and closes it using Escape', async () => {
    fetchLoanReportPdfBlob.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(new Blob(['report']));
    render(<ApplicantPortalView result={makeResult()} applicantData={applicantData} />);
    fireEvent.click(screen.getByRole('button', { name: 'Preview', exact: true }));
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    await screen.findByTitle('Credit Assessment Report PDF');
    expect(fetchLoanReportPdfBlob).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview', exact: true })).toHaveFocus();
  });

  it('closes the submitted form before the surrounding applicant preview', () => {
    const close = vi.fn();
    render(<CustomerNoticeModal isOpen onClose={close} result={makeResult()} applicantData={applicantData} />);
    fireEvent.click(screen.getByRole('button', { name: 'View Application Form' }));
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Submitted Application Form' }), { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Submitted Application Form' })).not.toBeInTheDocument();
    expect(close).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Applicant View Preview' }), { key: 'Escape' });
    expect(close).toHaveBeenCalledOnce();
  });
});
