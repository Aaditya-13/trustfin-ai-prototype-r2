import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BatchUploadModal from '../components/BatchUploadModal';
import * as api from '../services/api';

vi.mock('../services/api', () => ({
  uploadBatchFile: vi.fn(),
  submitBatchJson: vi.fn(),
  fetchBatchPreset: vi.fn(),
  downloadSampleBatchCsv: vi.fn(),
  fetchEvaluationById: vi.fn(),
}));

describe('BatchUploadModal Component (Modular Test)', () => {
  const mockOnClose = vi.fn();
  const mockOnInspect = vi.fn();
  const mockOnViewHistory = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <BatchUploadModal 
        isOpen={false} 
        onClose={mockOnClose} 
        onInspectEvaluation={mockOnInspect} 
        onViewInHistory={mockOnViewHistory} 
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders modal header, presets, and upload zone when isOpen is true', () => {
    render(
      <BatchUploadModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onInspectEvaluation={mockOnInspect} 
        onViewInHistory={mockOnViewHistory} 
      />
    );

    expect(screen.getByText(/Batch Application Processing/i)).toBeInTheDocument();
    expect(screen.getByText(/Demo Batch 1 \(10 Records\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Demo Batch 2 \(30 Records\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download Sample Batch \(20 Records\)/i })).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <BatchUploadModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onInspectEvaluation={mockOnInspect} 
        onViewInHistory={mockOnViewHistory} 
      />
    );

    const closeBtn = screen.getByTitle(/Close Window/i);
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls downloadSampleBatchCsv when download button is clicked', async () => {
    api.downloadSampleBatchCsv.mockResolvedValueOnce();

    render(
      <BatchUploadModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onInspectEvaluation={mockOnInspect} 
        onViewInHistory={mockOnViewHistory} 
      />
    );

    const downloadBtn = screen.getByRole('button', { name: /Download Sample Batch \(20 Records\)/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(api.downloadSampleBatchCsv).toHaveBeenCalledTimes(1);
    });
  });

  it('runs preset batch and displays processed results and trashed records', async () => {
    api.fetchBatchPreset.mockResolvedValueOnce({
      preset_id: 'batch_1',
      name: 'Demo Batch 1 (10 Records)',
      total: 10,
      rows: [{ Applicant_Income: 50000 }]
    });

    api.submitBatchJson.mockResolvedValueOnce({
      batchId: 'BATCH-20261022-TEST',
      filename: 'demo_batch_1.csv',
      timestamp: '2026-10-22 22:00:00',
      totalRecords: 10,
      validRecords: 7,
      flawedRecords: 3,
      flawedData: [
        { row: 3, rawData: {}, errorReason: 'Credit_History is required' }
      ],
      processedResults: [
        {
          dossierId: 'TF-20261022-0001',
          prediction: 'Approved',
          confidenceScore: 0.95,
          trustRating: 'HIGH TRUST',
          trustScore: 0.88,
          solvencyCheck: { status: 'OPTIMAL', dtiPercent: '12%' },
          inputData: { Gender: 'Female', Applicant_Income: 50000 }
        }
      ],
      summary: { approved: 5, rejected: 2, total: 7 }
    });

    render(
      <BatchUploadModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onInspectEvaluation={mockOnInspect} 
        onViewInHistory={mockOnViewHistory} 
      />
    );

    const runBatch1Btn = screen.getByText(/Demo Batch 1 \(10 Records\)/i);
    fireEvent.click(runBatch1Btn);

    await waitFor(() => {
      expect(screen.getByText(/BATCH-20261022-TEST/i)).toBeInTheDocument();
      expect(screen.getByText(/Processed Applications \(7\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Trashed Incomplete Records \(3\)/i)).toBeInTheDocument();
    });

    // Test sub-tab switching
    const flawedTab = screen.getByRole('button', { name: /Trashed Incomplete Records/i });
    fireEvent.click(flawedTab);
    expect(screen.getByText(/Credit_History is required/i)).toBeInTheDocument();
  });
});
