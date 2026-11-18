import React from 'react';

const StabilityCheckDetails = ({ result }) => {
  const check = result?.stabilityCheck;
  if (!check) return null;
  return (
    <div aria-label="SHAP stability details" className="mt-2 space-y-1 text-xs text-gray-700">
      <p>SHAP tested on <strong>{check.testedSamples}</strong> nearby applications.</p>
      <p>Lowest comparison: <strong>{(check.minimumScore * 100).toFixed(1)}%</strong>.</p>
      <p>Model decision changed in <strong>{check.predictionChanges} of {check.testedSamples}</strong> tests.</p>
      {check.testedSamples < check.requestedSamples && <p>Only {check.testedSamples} distinct valid changes were available.</p>}
      {check.predictionChanges > 0 && <p>Decision-changing tests are included in the average. Review changes near a decision boundary.</p>}
    </div>
  );
};

export default StabilityCheckDetails;
