import React from 'react';

// Display the recorded backend assessment; do not recalculate lending rules here.
const PolicyCheckNotice = ({ result }) => {
  const check = result?.policyCheck;
  if (!check) return null;
  return (
    <section aria-label="Project policy assessment" className={`rounded-sm border p-4 ${check.passed ? 'border-gray-300 bg-gray-50 text-gray-800' : 'border-red-300 bg-red-50 text-red-900'}`}>
      <p className="font-bold">Project policy checks: {check.passed ? 'Passed' : 'Failed'}</p>
      <p className="mt-1 text-sm">Assessment outcome: <strong>{check.decision}</strong></p>
      {check.reasons?.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{check.reasons.map((reason, i) => <li key={i}>{reason}</li>)}</ul>}
      {check.decision !== result.prediction && <p className="mt-2 text-sm">The model predicts {result.prediction}, but the application fails a mandatory project rule. SHAP and LIME explain the model prediction.</p>}
    </section>
  );
};

export default PolicyCheckNotice;
