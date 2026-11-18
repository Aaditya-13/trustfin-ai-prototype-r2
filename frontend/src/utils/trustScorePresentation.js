const metricNames = {
  faithfulness: 'Faithfulness',
  stability: 'Stability',
  consistency: 'Consistency',
  fairness: 'Fairness',
};

function weightPercentage(weight) {
  return Number((weight * 100).toFixed(2));
}

export function formatTrustWeight(trustScore, metric) {
  const weights = trustScore?.weights;
  if (!weights) return 'Weight not recorded';
  const weight = weights[metric] ?? 0;
  return weight === 0 ? 'Audit metric' : `Weight ${weightPercentage(weight)}%`;
}

export function formatTrustFormula(trustScore) {
  const weights = trustScore?.weights;
  if (!weights) return 'Weighting was not recorded for this saved assessment.';
  return Object.entries(metricNames)
    .filter(([metric]) => weights[metric] > 0)
    .map(([metric, name]) => `${weightPercentage(weights[metric])}% × ${name}`)
    .join(' + ');
}
