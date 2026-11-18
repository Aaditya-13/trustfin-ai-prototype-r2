import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import PolicyCheckNotice from '../components/PolicyCheckNotice';
import { getUnderwritingAction } from '../utils/decisionAdvisory';

afterEach(cleanup);

describe('Recorded policy assessments', () => {
  it('does not invent policy checks for older records', () => {
    const { container } = render(<PolicyCheckNotice result={{ prediction: 'Approved' }} />);
    expect(container).toBeEmptyDOMElement();
  });
  it('shows a policy rejection separately from the model approval', () => {
    const result = { prediction: 'Approved', policyCheck: { passed: false, decision: 'Rejected', reasons: ['Three missed payments fail the project rule.'] } };
    render(<PolicyCheckNotice result={result} />);
    expect(screen.getByText('Project policy checks: Failed')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText(/The model predicts Approved/)).toBeInTheDocument();
    expect(screen.getByText(result.policyCheck.reasons[0])).toBeInTheDocument();
    expect(getUnderwritingAction(result, {}).badgeText).toBe('PROJECT POLICY: REJECTED');
  });
  it('does not turn passed mandatory checks into model approval', () => {
    render(<PolicyCheckNotice result={{ prediction: 'Rejected', policyCheck: { passed: true, decision: 'Rejected', reasons: [] } }} />);
    expect(screen.getByText('Project policy checks: Passed')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });
});
