import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import LoanTypeSelection from './components/LoanTypeSelection';
import ApplicantForm from './components/ApplicantForm';
import BankOfficerSummary from './components/BankOfficerSummary';
import BankOfficerAudit from './components/BankOfficerAudit';
import ApplicantPortalView from './components/ApplicantPortalView';
import CustomerNoticeModal from './components/CustomerNoticeModal';
import AuditHistoryModal from './components/AuditHistoryModal';
import { predictLoan, fetchLoanReportPdfBlob } from './services/api';

function App() {
  // Navigation & Role State Machine
  const [currentScreen, setCurrentScreen] = useState('LANDING'); // 'LANDING' | 'LOAN_SELECTION' | 'APPLICATION_FORM' | 'RESULTS'
  const [userRole, setUserRole] = useState(null); // 'bank_officer' | 'applicant'
  const [officerSubView, setOfficerSubView] = useState('SUMMARY'); // 'SUMMARY' (Screen 3A) | 'AUDIT' (Screen 3B)
  const [selectedLoanType, setSelectedLoanType] = useState({
    id: 'home_loan',
    title: 'Home Loan',
    category: 'Retail Secured'
  });

  // Data & API State
  const [result, setResult] = useState(null);
  const [currentApplicantData, setCurrentApplicantData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Bank Officer Customer Notice Preview Modal
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [loadingPdfPreview, setLoadingPdfPreview] = useState(false);
  const [pdfPreviewError, setPdfPreviewError] = useState(null);
  const pdfRequestId = useRef(0);
  const pdfPreviewTriggerRef = useRef(null);

  const clearPdfPreview = () => {
    pdfRequestId.current += 1;
    setPdfPreviewUrl(null);
    setShowPdfPreview(false);
    setLoadingPdfPreview(false);
    setPdfPreviewError(null);
  };

  useEffect(() => () => { pdfRequestId.current += 1; }, []);

  // Persistent Audit History / Stored Ledger Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);


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
      title: loanTypeId === 'home_loan' ? 'Home Loan' : 'Personal Loan',
    });
    setCurrentScreen('APPLICATION_FORM');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 3: User submits Application Form
  const handleEvaluate = async (formData) => {
    clearPdfPreview();
    setLoading(true);
    setError(null);
    const enrichedFormData = {
      ...formData,
      loan_type: selectedLoanType.id
    };
    setCurrentApplicantData(enrichedFormData);
    try {
      const data = await predictLoan(enrichedFormData);
      setResult(data);
      setCurrentScreen('RESULTS');
      setOfficerSubView('SUMMARY');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError("Failed to reach the loan evaluation service. Please verify that the backend service is running on port 8000.");
      console.error("Prediction API error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Global Navigation Handlers
  const handleNavigateHome = () => {
    clearPdfPreview();
    setCurrentScreen('LANDING');
    setUserRole(null);
    setResult(null);
    setShowCustomerModal(false);
    setShowHistoryModal(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToLoanSelection = () => {
    setCurrentScreen('LOAN_SELECTION');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNewApplication = () => {
    clearPdfPreview();
    setResult(null);
    setCurrentApplicantData(null);
    setCurrentScreen('APPLICATION_FORM');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handler to load any stored evaluation from database directly into active dashboard
  const handleLoadEvaluation = (evalDetail) => {
    clearPdfPreview();
    setCurrentApplicantData(evalDetail.applicantData);
    setResult(evalDetail.predictionResult);
    const isPersonalLoan = evalDetail.applicantData?.loan_type === 'personal_loan' || Boolean(evalDetail.applicantData?.Loan_Purpose);
    setSelectedLoanType({
      id: isPersonalLoan ? 'personal_loan' : 'home_loan',
      title: isPersonalLoan ? 'Personal Loan' : 'Home Loan',
      category: isPersonalLoan ? 'Loan without property collateral' : 'Property-backed loan'
    });
    if (!userRole) {
      setUserRole('bank_officer'); // Default to Bank Officer view for full audit visibility
    }
    setCurrentScreen('RESULTS');
    setOfficerSubView('SUMMARY');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) window.URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, [pdfPreviewUrl]);

  const handleOpenPdfPreview = async () => {
    if (!showPdfPreview) pdfPreviewTriggerRef.current = document.activeElement;
    setShowPdfPreview(true);
    setPdfPreviewError(null);
    if (pdfPreviewUrl || loadingPdfPreview) return;

    setLoadingPdfPreview(true);
    const requestId = pdfRequestId.current;
    try {
      const blob = await fetchLoanReportPdfBlob(currentApplicantData, result);
      if (requestId !== pdfRequestId.current) return;
      setPdfPreviewUrl(window.URL.createObjectURL(blob));
    } catch (err) {
      console.error('PDF preview generation error:', err);
      if (requestId === pdfRequestId.current) setPdfPreviewError('The report preview could not be loaded. Try again.');
    } finally {
      if (requestId === pdfRequestId.current) setLoadingPdfPreview(false);
    }
  };

  const handleClosePdfPreview = () => {
    setShowPdfPreview(false);
    pdfPreviewTriggerRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-gov-gray flex flex-col font-sans">
      
      {/* Top Institutional Header */}
      <Navbar 
        currentScreen={currentScreen}
        userRole={userRole}
        onNavigateHome={handleNavigateHome}
        selectedLoanType={selectedLoanType}
        onOpenHistory={() => {
          if (userRole === 'bank_officer') setShowHistoryModal(true);
        }}
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
              onInspectEvaluation={handleLoadEvaluation}
              onOpenHistory={userRole === 'bank_officer' ? () => setShowHistoryModal(true) : undefined}
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
                  onOpenPdfPreview={handleOpenPdfPreview}
                />
                {showPdfPreview && (
                  <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={event => { if (event.target === event.currentTarget) handleClosePdfPreview(); }}>
                    <div role="dialog" aria-modal="true" aria-labelledby="officer-applicant-pdf-title" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); handleClosePdfPreview(); } }} className="bg-white w-full max-w-5xl h-[90vh] flex flex-col border border-gray-400 shadow-xl rounded-sm overflow-hidden">
                      <div className="px-4 py-3 bg-gov-blue text-white flex items-center justify-between">
                        <h3 id="officer-applicant-pdf-title" className="text-xs font-bold uppercase tracking-wider">Assessment PDF Preview</h3>
                        <button
                          type="button"
                          onClick={handleClosePdfPreview}
                          autoFocus
                          className="px-2 py-1 text-xs hover:bg-blue-800 rounded-sm cursor-pointer"
                          aria-label="Close PDF preview"
                        >
                          Close
                        </button>
                      </div>
                      <div className="flex-1 bg-gray-100 flex items-center justify-center">
                        {loadingPdfPreview ? (
                          <p className="text-sm text-gray-700">Generating PDF preview...</p>
                        ) : pdfPreviewError ? (
                          <div className="max-w-md p-6 text-center">
                            <p role="alert" className="text-sm text-red-700">{pdfPreviewError}</p>
                            <button type="button" onClick={handleOpenPdfPreview} className="mt-3 rounded-sm bg-gov-blue px-3 py-2 text-sm font-semibold text-white">Try again</button>
                          </div>
                        ) : pdfPreviewUrl ? (
                          <iframe
                            src={pdfPreviewUrl}
                            title="Loan assessment report PDF preview"
                            className="w-full h-full border-0"
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}
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

      {/* Global Audit Ledger / Stored Evaluations Modal */}
      <AuditHistoryModal 
        isOpen={userRole === 'bank_officer' && showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        onLoadEvaluation={handleLoadEvaluation}
      />

      {/* Institutional Legal & Regulatory Footer */}
      <footer className="bg-white border-t border-gray-300 py-4 px-6 text-center text-xs text-gray-500 mt-auto">

        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; 2026 TrustFin AI • Loan Predictions and Explanation Checks.</span>
          <span className="text-[11px] text-gray-400">Review model predictions, explanations and project policy checks</span>
        </div>
      </footer>

    </div>
  );
}

export default App;
