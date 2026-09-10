import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import LoanTypeSelection from './components/LoanTypeSelection';
import ApplicantForm from './components/ApplicantForm';
import BankOfficerSummary from './components/BankOfficerSummary';
import BankOfficerAudit from './components/BankOfficerAudit';
import ApplicantPortalView from './components/ApplicantPortalView';
import CustomerNoticeModal from './components/CustomerNoticeModal';
import { predictLoan } from './services/api';

function App() {
  // Navigation & Role State Machine
  const [currentScreen, setCurrentScreen] = useState('LANDING'); // 'LANDING' | 'LOAN_SELECTION' | 'APPLICATION_FORM' | 'RESULTS'
  const [userRole, setUserRole] = useState(null); // 'bank_officer' | 'applicant'
  const [officerSubView, setOfficerSubView] = useState('SUMMARY'); // 'SUMMARY' (Screen 3A) | 'AUDIT' (Screen 3B)
  const [selectedLoanType, setSelectedLoanType] = useState({
    id: 'home_loan',
    title: 'Residential Home Loan',
    category: 'Retail Secured'
  });

  // Data & API State
  const [result, setResult] = useState(null);
  const [currentApplicantData, setCurrentApplicantData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Bank Officer Customer Notice Preview Modal
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // Step 1: User selects Role on Landing Page
  const handleSelectRole = (role) => {
    setUserRole(role);
    setCurrentScreen('LOAN_SELECTION');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 2: User selects Loan Category
  const handleSelectLoan = (loanTypeId) => {
    setSelectedLoanType({
      id: loanTypeId,
      title: loanTypeId === 'home_loan' ? 'Residential Home Loan' : 'Retail Credit Facility',
      category: 'Retail Secured'
    });
    setCurrentScreen('APPLICATION_FORM');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 3: User submits Application Form
  const handleEvaluate = async (formData) => {
    setLoading(true);
    setError(null);
    setCurrentApplicantData(formData);
    try {
      const data = await predictLoan(formData);
      setResult(data);
      setCurrentScreen('RESULTS');
      setOfficerSubView('SUMMARY');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError("Failed to reach the credit underwriting engine. Please verify that the backend service is running on port 8000.");
      console.error("Prediction API error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Global Navigation Handlers
  const handleNavigateHome = () => {
    setCurrentScreen('LANDING');
    setUserRole(null);
    setResult(null);
    setShowCustomerModal(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToLoanSelection = () => {
    setCurrentScreen('LOAN_SELECTION');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNewApplication = () => {
    setResult(null);
    setCurrentApplicantData(null);
    setCurrentScreen('APPLICATION_FORM');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gov-gray flex flex-col font-sans">
      
      {/* Top Institutional Header */}
      <Navbar 
        currentScreen={currentScreen}
        userRole={userRole}
        onNavigateHome={handleNavigateHome}
        selectedLoanType={selectedLoanType}
      />

      {/* Main Responsive Body Canvas */}
      <div className="flex-1 w-full">
        
        {/* SCREEN 1: LANDING PAGE */}
        {currentScreen === 'LANDING' && (
          <main className="max-w-6xl mx-auto px-4 py-8">
            <LandingPage 
              onSelectPortal={handleSelectRole} 
              onSelectRole={handleSelectRole} 
            />
          </main>
        )}

        {/* SCREEN 2: LOAN PRODUCT SELECTION */}
        {currentScreen === 'LOAN_SELECTION' && (
          <main className="max-w-5xl mx-auto px-4 py-8">
            <LoanTypeSelection 
              userRole={userRole}
              onSelectLoan={handleSelectLoan}
              onBack={handleNavigateHome}
            />
          </main>
        )}

        {/* SCREEN 3: DEDICATED LOAN APPLICATION FORM */}
        {currentScreen === 'APPLICATION_FORM' && (
          <main className="max-w-4xl mx-auto px-4 py-8">
            <ApplicantForm 
              onSubmit={handleEvaluate}
              isLoading={loading}
              onBack={handleBackToLoanSelection}
              userRole={userRole}
              loanProduct={selectedLoanType}
            />
            {error && (
              <div className="bg-red-50 text-red-800 p-4 border border-red-300 rounded-sm mb-6 shadow-sm text-sm">
                <strong>Error:</strong> {error}
              </div>
            )}
          </main>
        )}

        {/* SCREEN 4: RESULTS (ROLE-SEGREGATED) */}
        {currentScreen === 'RESULTS' && result && (
          <main className="max-w-6xl mx-auto px-4 py-8">
            {userRole === 'bank_officer' ? (
              <>
                {/* 4A: Bank Officer Executive Summary & Directive */}
                {officerSubView === 'SUMMARY' && (
                  <BankOfficerSummary 
                    result={result}
                    applicantData={currentApplicantData}
                    onNavigateToAudit={() => {
                      setOfficerSubView('AUDIT');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    onOpenCustomerNoticeModal={() => setShowCustomerModal(true)}
                    onNewApplication={handleNewApplication}
                  />
                )}

                {/* 4B: Bank Officer In-Depth XAI & Mathematical Audit */}
                {officerSubView === 'AUDIT' && (
                  <BankOfficerAudit 
                    result={result}
                    applicantData={currentApplicantData}
                    onBackToSummary={() => {
                      setOfficerSubView('SUMMARY');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                )}

                {/* Bank Officer Customer Notice Preview Modal */}
                <CustomerNoticeModal 
                  isOpen={showCustomerModal}
                  onClose={() => setShowCustomerModal(false)}
                  result={result}
                  applicantData={currentApplicantData}
                />
              </>
            ) : (
              /* 4-App: Applicant Sanction / Adverse Action & Recourse Sandbox */
              <ApplicantPortalView 
                result={result}
                applicantData={currentApplicantData}
                onNewApplication={handleNewApplication}
              />
            )}
          </main>
        )}

      </div>

      {/* Institutional Legal & Regulatory Footer */}
      <footer className="bg-white border-t border-gray-300 py-4 px-6 text-center text-xs text-gray-500 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; 2026 TrustFin AI • Explainable Loan Intelligence & Explanation Reliability Framework.</span>
          <span className="text-[11px] text-gray-400">Strict Separation of Consumer Notice & Model Internal Attributions</span>
        </div>
      </footer>

    </div>
  );
}

export default App;
