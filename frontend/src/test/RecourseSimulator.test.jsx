import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import RecourseSimulator from '../components/RecourseSimulator';

afterEach(cleanup);

const applicant = {
  loan_type: 'personal_loan', Applicant_Income: 50000, Coapplicant_Income: 20000,
  Existing_EMI: 5000, Loan_Amount: 300000, Loan_Term: 36, Property_Value: 500000,
};

describe('Applicant affordability calculator', () => {
  it.each([0.42, 42])('formats card utilization %s consistently', utilization => {
    render(<RecourseSimulator applicantData={{ ...applicant, Credit_Card_Utilization: utilization }} result={{}} />);
    expect(screen.getAllByText('42%')).toHaveLength(2);
    expect(screen.queryByText('4200%')).not.toBeInTheDocument();
  });

  it('shows missing card utilization as unavailable', () => {
    render(<RecourseSimulator applicantData={applicant} result={{}} />);
    expect(screen.getAllByText('Unavailable')).toHaveLength(2);
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('uses the explicit home-loan product for calculator controls', () => {
    render(<RecourseSimulator applicantData={{ ...applicant, loan_type: 'home_loan', Loan_Purpose: 'Education' }} result={{}} />);
    expect(screen.getByText('Home Loan What-If Calculator')).toBeInTheDocument();
    expect(screen.getByLabelText('Property market value')).toBeInTheDocument();
    expect(screen.queryByText('Personal Loan What-If Calculator')).not.toBeInTheDocument();
  });
});
