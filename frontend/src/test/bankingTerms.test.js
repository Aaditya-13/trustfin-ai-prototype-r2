import { describe, expect, it } from 'vitest';
import { formatAffordabilityStatus, getBankingDescription, getBankingLabel, getFeatureActualValue, getContributionLabel } from '../utils/bankingTerms';

describe('Actual applicant values in explanation tooltips', () => {
  const applicant = { CIBIL_Score: 780, Credit_History: 0, Existing_EMI: 0, Credit_Card_Utilization: .42, Loan_Amount: 300000, Property_Value: 400000, Gender: 'Female' };
  const result = { solvencyCheck: { monthlyEMI: 10000, existingEMI: 0, dtiRatio: .3 } };

  it('keeps numeric CIBIL separate from binary credit history', () => {
    expect(getFeatureActualValue('CIBIL_Score', applicant, result, -.3)).toBe('780');
    expect(getFeatureActualValue('Credit_History', applicant, result)).toBe('0 (Poor history)');
  });
  it('does not display the proposed EMI as an existing EMI', () => {
    expect(getFeatureActualValue('Existing_EMI', applicant, result)).toBe('₹ 0');
    expect(getFeatureActualValue('Monthly_EMI', applicant, result)).toBe('₹ 10,000');
  });
  it('formats the units of card use, FOIR and LTV correctly', () => {
    expect(getFeatureActualValue('Credit_Card_Utilization', applicant, result)).toBe('42.0%');
    expect(getFeatureActualValue('FOIR', applicant, result)).toBe('30.0%');
    expect(getFeatureActualValue('LTV_Ratio', applicant, result)).toBe('75.0%');
  });
  it('does not invent an input value from a scaled explanation value', () => {
    expect(getFeatureActualValue('CIBIL_Score', {}, {}, -.3)).toBe('Unavailable');
    expect(getFeatureActualValue('Gender', {}, {}, 0)).toBe('Unavailable');
    expect(getFeatureActualValue('Monthly_EMI', { Loan_Amount: 300000, Loan_Term: 36 }, {})).toBe('Unavailable');
  });
  it('labels categorical features as checks against the submitted category', () => {
    expect(getBankingLabel('Gender_Male')).toBe('Gender: Male');
    expect(getFeatureActualValue('Gender_Male', applicant, result)).toBe('No (Female)');
    expect(getFeatureActualValue('Gender_Male', { Gender: 'Male' }, result)).toBe('Yes (Male)');
  });
  it('describes the affordability threshold as a project assumption', () => {
    expect(getBankingDescription('FOIR')).toContain('project');
    expect(formatAffordabilityStatus('INSOLVENT')).toBe('Above 50% limit');
    expect(formatAffordabilityStatus(undefined)).toBe('Unavailable');
  });
  it('does not label zero or missing contributions as rejection factors', () => {
    expect(getContributionLabel(0)).toBe('No Contribution Shown');
    expect(getContributionLabel(undefined)).toBe('Contribution Unavailable');
    expect(getContributionLabel(-.2)).toBe('Supports Rejection');
    expect(getContributionLabel(.2)).toBe('Supports Approval');
  });
});
