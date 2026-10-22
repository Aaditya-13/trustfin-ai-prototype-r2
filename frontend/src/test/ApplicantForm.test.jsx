import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ApplicantForm from '../components/ApplicantForm';

describe('ApplicantForm Component (Modular Test)', () => {
  it('renders Loan Application Form title and input sections', () => {
    render(<ApplicantForm onSubmit={vi.fn()} isLoading={false} userRole="bank_officer" />);
    expect(screen.getByText(/Loan Application Form/i)).toBeInTheDocument();
    expect(screen.getByText(/^Applicant Monthly Income/i)).toBeInTheDocument();
    expect(screen.getByText(/Requested Loan Amount/i)).toBeInTheDocument();
  });

  it('renders Upload Batch of Applications button for bank_officer', () => {
    render(<ApplicantForm onSubmit={vi.fn()} isLoading={false} userRole="bank_officer" />);
    const batchButton = screen.getByRole('button', { name: /Upload Batch of Applications/i });
    expect(batchButton).toBeInTheDocument();
  });

  it('hides Upload Batch of Applications button for applicant role', () => {
    render(<ApplicantForm onSubmit={vi.fn()} isLoading={false} userRole="applicant" />);
    const batchButton = screen.queryByRole('button', { name: /Upload Batch of Applications/i });
    expect(batchButton).not.toBeInTheDocument();
  });

  it('clicking a preset profile populates form data', () => {
    render(<ApplicantForm onSubmit={vi.fn()} isLoading={false} userRole="bank_officer" />);
    
    // Find preset profile button for Jane Doe
    const profileBtn = screen.getByText(/Jane Doe/i);
    expect(profileBtn).toBeInTheDocument();
    fireEvent.click(profileBtn);

    // Jane Doe's income is 80000
    const incomeInput = screen.getByDisplayValue('80000');
    expect(incomeInput).toBeInTheDocument();
  });

  it('submitting the form calls onSubmit callback with structured data', () => {
    const handleSubmit = vi.fn();
    render(<ApplicantForm onSubmit={handleSubmit} isLoading={false} userRole="bank_officer" />);
    
    const submitBtn = screen.getByRole('button', { name: /Evaluate Loan/i });
    fireEvent.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    const submittedData = handleSubmit.mock.calls[0][0];
    expect(submittedData).toHaveProperty('Applicant_Income');
    expect(submittedData).toHaveProperty('Loan_Amount');
    expect(submittedData).toHaveProperty('Credit_History');
  });
});
