import React from 'react';

const FaithfulnessCheckDetails = ({ result }) => {
  const check = result?.faithfulnessCheck;
  if (check?.method !== 'local_concordance') {
    return <p className="mt-2 text-xs text-gray-500">Faithfulness method was not recorded for this assessment.</p>;
  }
  return (
    <div aria-label="Faithfulness local concordance details" className="mt-2 space-y-1 text-xs text-gray-700">
      <p>Local concordance using up to <strong>{check.topK}</strong> features per explanation.</p>
      <p>SHAP: <strong>{(check.shap.score * 100).toFixed(1)}%</strong> (weight {(check.weights.shap * 100).toFixed(0)}%).</p>
      <p>LIME: <strong>{(check.lime.score * 100).toFixed(1)}%</strong> (weight {(check.weights.lime * 100).toFixed(0)}%).</p>
      <p>Checks reconstruction of the original prediction; it does not verify each feature contribution.</p>
      {(check.lime.approximation < 0 || check.lime.approximation > 1) && (
        <p>LIME's linear estimate is outside 0–100%. Its full error is included in this score.</p>
      )}
    </div>
  );
};

export default FaithfulnessCheckDetails;
