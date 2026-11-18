import { describe, expect, it } from 'vitest';
import { formatTrustFormula, formatTrustWeight } from '../utils/trustScorePresentation';

describe('Recorded trust score weights', () => {
  const trustScore = { weights: { faithfulness: 0.4, stability: 0.3, consistency: 0.3 } };

  it('shows three weighted components and a fairness audit label', () => {
    expect(formatTrustFormula(trustScore)).toBe('40% × Faithfulness + 30% × Stability + 30% × Consistency');
    expect(formatTrustWeight(trustScore, 'faithfulness')).toBe('Weight 40%');
    expect(formatTrustWeight(trustScore, 'fairness')).toBe('Audit metric');
  });

  it('shows rounded one-third weights without changing historical integer percentages', () => {
    const equalWeights = { weights: { faithfulness: 1 / 3, stability: 1 / 3, consistency: 1 / 3 } };
    expect(formatTrustFormula(equalWeights)).toBe('33.33% × Faithfulness + 33.33% × Stability + 33.33% × Consistency');
    expect(formatTrustWeight(equalWeights, 'faithfulness')).toBe('Weight 33.33%');
    expect(formatTrustWeight(equalWeights, 'fairness')).toBe('Audit metric');
  });

  it('identifies historical assessments without stored weights', () => {
    expect(formatTrustFormula({})).toBe('Weighting was not recorded for this saved assessment.');
    expect(formatTrustWeight({}, 'faithfulness')).toBe('Weight not recorded');
  });

  it('uses the weights supplied with a historical result', () => {
    const saved = { weights: { faithfulness: 0.35, stability: 0.25, consistency: 0.3, fairness: 0.1 } };
    expect(formatTrustFormula(saved)).toContain('10% × Fairness');
    expect(formatTrustWeight(saved, 'stability')).toBe('Weight 25%');
  });
});
