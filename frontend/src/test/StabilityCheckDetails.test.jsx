import React from 'react';
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import StabilityCheckDetails from '../components/StabilityCheckDetails';

afterEach(cleanup);

it('does not invent new stability tests for old records', () => {
  const { container } = render(<StabilityCheckDetails result={{ trustScore: { stability: 0.9 } }} />);
  expect(container).toBeEmptyDOMElement();
});

it('shows the sample count, lowest comparison and retained decision changes', () => {
  render(<StabilityCheckDetails result={{ stabilityCheck: { testedSamples: 20, requestedSamples: 20, minimumScore: 0.823, predictionChanges: 2 } }} />);
  expect(screen.getByText('82.3%')).toBeInTheDocument();
  expect(screen.getByText('2 of 20')).toBeInTheDocument();
  expect(screen.getByText(/Decision-changing tests are included/)).toBeInTheDocument();
});

it('reports a smaller valid sample honestly', () => {
  render(<StabilityCheckDetails result={{ stabilityCheck: { testedSamples: 12, requestedSamples: 20, minimumScore: 0.8, predictionChanges: 0 } }} />);
  expect(screen.getByText('Only 12 distinct valid changes were available.')).toBeInTheDocument();
});
