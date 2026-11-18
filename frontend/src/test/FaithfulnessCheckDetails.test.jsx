import React from 'react';
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import FaithfulnessCheckDetails from '../components/FaithfulnessCheckDetails';

afterEach(cleanup);

const check = {
  method: 'local_concordance', topK: 5, weights: { shap: .6, lime: .4 },
  shap: { score: .99, approximation: .79 }, lime: { score: .7, approximation: .5 },
};

it('does not apply the new method to saved results without metadata', () => {
  render(<FaithfulnessCheckDetails result={{ trustScore: { faithfulness: .9 } }} />);
  expect(screen.getByText(/method was not recorded/)).toBeInTheDocument();
  expect(screen.queryByLabelText('Faithfulness local concordance details')).not.toBeInTheDocument();
});

it('shows each recorded component, its weight and the limited interpretation', () => {
  render(<FaithfulnessCheckDetails result={{ faithfulnessCheck: check }} />);
  expect(screen.getByText('99.0%')).toBeInTheDocument();
  expect(screen.getByText('70.0%')).toBeInTheDocument();
  expect(screen.getByText(/weight 60%/)).toBeInTheDocument();
  expect(screen.getByText(/weight 40%/)).toBeInTheDocument();
  expect(screen.getByText(/does not verify each feature contribution/)).toBeInTheDocument();
});

it('explains an out-of-range linear LIME estimate without changing its score', () => {
  render(<FaithfulnessCheckDetails result={{ faithfulnessCheck: { ...check, lime: { score: .6, approximation: 1.2 } } }} />);
  expect(screen.getByText(/Its full error is included/)).toBeInTheDocument();
  expect(screen.getByText('60.0%')).toBeInTheDocument();
});
