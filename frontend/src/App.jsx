import React, { useState } from 'react';
import { Landmark } from 'lucide-react';
import ApplicantForm from './components/ApplicantForm';
import InsightsDashboard from './components/InsightsDashboard';
import { predictLoan } from './services/api';

function App() {
  const [result, setResult] = useState(null);
  const [currentApplicantData, setCurrentApplicantData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleEvaluate = async (formData) => {
    setLoading(true);
    setError(null);
    setCurrentApplicantData(formData);
    try {
      const data = await predictLoan(formData);
      setResult(data);
    } catch (err) {
      setError("Failed to reach the credit underwriting engine. Please verify that the backend service is running on port 8000.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gov-gray flex flex-col font-sans">
      {/* Enterprise Banking & Regulatory Header */}
      <header className="bg-gov-blue text-white p-4 shadow-sm border-b-4 border-yellow-500">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900 border border-blue-400 rounded-sm text-yellow-400 shrink-0">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">TrustFin Credit Decision & Audit System</h1>
              <p className="text-xs uppercase tracking-widest text-blue-200">Institutional Credit Underwriting & Explainability Governance Portal</p>
            </div>
          </div>
          <div className="text-xs font-semibold border border-blue-400 px-3 py-1.5 rounded-sm bg-blue-900 tracking-wider uppercase">
            Credit Risk & Underwriting Division
          </div>
        </div>
      </header>

      {/* Main Underwriting Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 mt-2">
        
        {/* Left Column: Loan Application Dossier */}
        <div className="xl:col-span-6">
          <ApplicantForm onSubmit={handleEvaluate} isLoading={loading} />
          {error && (
            <div className="bg-red-50 text-red-800 p-4 border border-red-300 rounded-sm mt-4 shadow-sm text-sm">
              <strong>Underwriting System Error:</strong> {error}
            </div>
          )}
        </div>

        {/* Right Column: Underwriting Determination & Audit Insights */}
        <div className="xl:col-span-6">
          {result ? (
            <InsightsDashboard result={result} applicantData={currentApplicantData} />
          ) : (
            <div className="bg-white border border-gray-300 shadow-sm rounded-sm p-12 flex flex-col items-center justify-center min-h-[480px] text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-base font-bold text-gray-700">Awaiting Loan Application Appraisal</p>
              <p className="text-xs text-gray-500 mt-2 text-center max-w-sm">
                Select a standard underwriting case benchmark on the left or enter applicant financial parameters, then click <strong>Execute Credit Underwriting & Solvency Appraisal</strong> to generate the credit determination, statutory debt-service compliance check, and explainability audit.
              </p>
            </div>
          )}
        </div>

      </main>

      {/* Institutional Compliance Footer */}
      <footer className="bg-white border-t border-gray-300 p-4 text-center text-xs text-gray-500 mt-auto">
        <p>&copy; 2026 TrustFin Institutional Credit Framework. Designed for statutory compliance with automated lending governance guidelines. All algorithmic determinations are subject to designated credit officer sign-off.</p>
      </footer>
    </div>
  );
}

export default App;
