import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuditHistoryModal from '../components/AuditHistoryModal';
import * as api from '../services/api';

vi.mock('../services/api', () => ({
  fetchEvaluations: vi.fn(),
  fetchEvaluationById: vi.fn(),
  deleteEvaluation: vi.fn(),
  downloadLoanReportPdf: vi.fn(),
  fetchBatches: vi.fn(),
  fetchBatchById: vi.fn(),
  deleteBatch: vi.fn(),
}));

describe('AuditHistoryModal Component (Modular Test)', () => {
  const mockOnClose = vi.fn();
  const mockOnLoadEvaluation = vi.fn();

  const mockEvaluations = [
    {
      id: 101,
      dossierId: 'TF-20261022-AAAA',
      timestamp: '2026-10-22 14:00',
      applicantAge: 32,
      applicantIncome: 75000,
      loanAmount: 150000,
      prediction: 'Approved',
      confidenceScore: 0.98,
      solvencyStatus: 'OPTIMAL',
      dtiRatio: 0.15,
      trustRating: 'HIGH TRUST',
      trustScore: 0.92,
    },
    {
      id: 102,
      dossierId: 'TF-20261022-BBBB',
      timestamp: '2026-10-22 15:00',
      applicantAge: 25,
      applicantIncome: 18000,
      loanAmount: 250000,
      prediction: 'Rejected',
      confidenceScore: 0.94,
      solvencyStatus: 'INSOLVENT',
      dtiRatio: 0.65,
      trustRating: 'MODERATE',
      trustScore: 0.75,
    }
  ];

  const mockBatches = [
    {
      id: 1,
      batchId: 'BATCH-20261022-001',
      filename: 'loan_portfolio_q3.csv',
      timestamp: '2026-10-22 16:00',
      totalRecords: 10,
      validRecords: 7,
      flawedRecords: 3,
      approvedCount: 5,
      rejectedCount: 2
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.fetchEvaluations.mockResolvedValue(mockEvaluations);
    api.fetchBatches.mockResolvedValue(mockBatches);
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <AuditHistoryModal 
        isOpen={false} 
        onClose={mockOnClose} 
        onLoadEvaluation={mockOnLoadEvaluation} 
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders modal with header and tabs when isOpen is true', async () => {
    render(
      <AuditHistoryModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onLoadEvaluation={mockOnLoadEvaluation} 
      />
    );

    expect(screen.getByText(/Application & Batch History/i)).toBeInTheDocument();
    expect(screen.getByText(/Institutional Audit Log/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/TF-20261022-AAAA/i)).toBeInTheDocument();
      expect(screen.getByText(/TF-20261022-BBBB/i)).toBeInTheDocument();
    });
  });

  it('switches to Batch Upload History tab and shows batch records', async () => {
    render(
      <AuditHistoryModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onLoadEvaluation={mockOnLoadEvaluation} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Batch Upload History/i)).toBeInTheDocument();
    });

    const batchTab = screen.getByRole('button', { name: /Batch Upload History/i });
    fireEvent.click(batchTab);

    await waitFor(() => {
      expect(screen.getByText(/BATCH-20261022-001/i)).toBeInTheDocument();
      expect(screen.getByText(/loan_portfolio_q3.csv/i)).toBeInTheDocument();
    });
  });

  it('filters individual applications via search term', async () => {
    render(
      <AuditHistoryModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onLoadEvaluation={mockOnLoadEvaluation} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/TF-20261022-AAAA/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Filter by Application Ref/i);
    fireEvent.change(searchInput, { target: { value: 'BBBB' } });

    expect(screen.queryByText(/TF-20261022-AAAA/i)).not.toBeInTheDocument();
    expect(screen.getByText(/TF-20261022-BBBB/i)).toBeInTheDocument();
  });

  it('clicking inspect on a record loads detail and calls onLoadEvaluation', async () => {
    api.fetchEvaluationById.mockResolvedValueOnce({
      id: 101,
      dossierId: 'TF-20261022-AAAA',
      applicantData: { Applicant_Income: 75000 },
      predictionResult: { prediction: 'Approved', confidenceScore: 0.98 }
    });

    render(
      <AuditHistoryModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onLoadEvaluation={mockOnLoadEvaluation} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/TF-20261022-AAAA/i)).toBeInTheDocument();
    });

    const inspectButtons = screen.getAllByTitle(/Inspect XAI explanations/i);
    fireEvent.click(inspectButtons[0]);

    await waitFor(() => {
      expect(api.fetchEvaluationById).toHaveBeenCalledWith(101);
      expect(mockOnLoadEvaluation).toHaveBeenCalledTimes(1);
    });
  });
});
