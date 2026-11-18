import React, { useState, useEffect, useRef } from 'react';
import { 
    CheckCircle, AlertCircle, Wallet, Download, FileText,
    Eye, Loader2, RefreshCw, Printer, AlertTriangle, X
} from 'lucide-react';
import RecourseSimulator from './RecourseSimulator';
import PolicyCheckNotice from './PolicyCheckNotice';
import SubmittedApplicationFormModal from './SubmittedApplicationFormModal';
import { downloadLoanReportPdf, fetchLoanReportPdfBlob } from '../services/api';
import { getUnderwritingAction } from '../utils/decisionAdvisory';
import { getBankingLabel } from '../utils/bankingTerms';

const finiteNumber = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const formatCurrency = (value) => value === null
    ? 'Unavailable'
    : `₹${Math.round(value).toLocaleString('en-IN')}`;

const ApplicantPortalContent = ({ result, applicantData, onNewApplication, onPreviewPdf }) => {
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [downloadError, setDownloadError] = useState(null);
    const [showApplicationForm, setShowApplicationForm] = useState(false);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
    const [loadingPdfPreview, setLoadingPdfPreview] = useState(false);
    const [pdfError, setPdfError] = useState(null);
    const iframeRef = useRef(null);
    const previewButtonRef = useRef(null);
    const applicationButtonRef = useRef(null);
    const pdfRequestId = useRef(0);

    useEffect(() => () => { pdfRequestId.current += 1; }, []);

    // Clean up cached blob URL on unmount
    useEffect(() => {
        return () => {
            if (pdfBlobUrl) {
                window.URL.revokeObjectURL(pdfBlobUrl);
            }
        };
    }, [pdfBlobUrl]);

    if (!result) return null;

    const isApproved = result.prediction === 'Approved';
    const isRejected = result.prediction === 'Rejected';
    const hasPrediction = isApproved || isRejected;
    const isPersonalLoan = applicantData?.loan_type
        ? applicantData.loan_type === 'personal_loan'
        : result.modelVersion?.startsWith('personal_loan') || Boolean(applicantData?.Loan_Purpose);
    const isHomeLoan = applicantData?.loan_type === 'home_loan'
        || result.modelVersion?.startsWith('home_loan')
        || applicantData?.Property_Value != null || applicantData?.Property_Area != null;
    const productName = isPersonalLoan ? 'Personal loan' : isHomeLoan ? 'Home loan' : 'Loan';
    const reference = result.dossierId || result.evaluationId || null;
    const applicantIncome = finiteNumber(applicantData?.Applicant_Income);
    const coapplicantIncome = finiteNumber(applicantData?.Coapplicant_Income);
    const recordedIncome = finiteNumber(result.solvencyCheck?.totalIncome);
    const monthlyIncome = isPersonalLoan
        ? applicantIncome ?? recordedIncome
        : recordedIncome ?? (applicantIncome === null ? null : applicantIncome + (coapplicantIncome ?? 0));
    const incomeSource = isPersonalLoan || !(coapplicantIncome > 0)
        ? 'Applicant income'
        : 'Applicant + co-applicant income';
    const monthlyEMI = finiteNumber(result.solvencyCheck?.monthlyEMI);
    const existingEMI = finiteNumber(result.solvencyCheck?.existingEMI) ?? finiteNumber(applicantData?.Existing_EMI);
    const totalObligation = finiteNumber(result.solvencyCheck?.totalMonthlyObligation)
        ?? (monthlyEMI !== null && existingEMI !== null ? monthlyEMI + existingEMI : null);
    const debtRatio = finiteNumber(result.solvencyCheck?.dtiRatio);
    const hasAffordability = debtRatio !== null && debtRatio >= 0;
    const dtiRatioVal = hasAffordability ? debtRatio * 100 : null;
    const affordabilityFailed = result.solvencyCheck?.isSolvent === false
        || result.solvencyCheck?.status === 'INSOLVENT'
        || (hasAffordability && debtRatio > 0.5);
    const loanAmount = finiteNumber(applicantData?.Loan_Amount);
    const loanTerm = finiteNumber(applicantData?.Loan_Term);
    const creditScore = finiteNumber(applicantData?.CIBIL_Score);
    const canExport = applicantIncome > 0 && loanAmount > 0 && loanTerm > 0;
    const canSimulate = canExport && existingEMI !== null
        && (isPersonalLoan || finiteNumber(applicantData?.Property_Value) > 0);
    const hasApplication = applicantData && Object.keys(applicantData).length > 0;
    const underwritingAction = getUnderwritingAction(result, applicantData);
    const needsReview = !hasAffordability || affordabilityFailed || underwritingAction.tier !== 'AUTO_APPROVE';
    const bannerClass = isRejected ? 'bg-red-50 border-red-300 text-red-900'
        : needsReview || !hasPrediction ? 'bg-amber-50 border-amber-300 text-amber-900'
        : 'bg-green-50 border-green-300 text-green-900';
    const reviewFindings = [];
    if (hasAffordability) {
        reviewFindings.push(`Total monthly repayments use ${dtiRatioVal.toFixed(1)}% of ${isPersonalLoan ? 'the applicant income' : 'the income'} used for this assessment.`);
        if (debtRatio > 0.5) {
            reviewFindings.push('This is above the project’s configured 50% review limit. A bank officer needs to review repayment affordability.');
        } else if (affordabilityFailed) {
            reviewFindings.push('The recorded affordability check requires a bank officer’s review.');
        }
    } else {
        reviewFindings.push('Affordability details are unavailable for this assessment. Ask a bank officer to review the submitted income and repayments.');
    }
    if (existingEMI !== null) {
        reviewFindings.push(`Existing monthly EMIs of ${formatCurrency(existingEMI)} ${existingEMI === 0 ? 'were declared' : 'are included in total repayments'}.`);
    }

    const shapFeatures = Array.isArray(result.shap?.features) ? result.shap.features : [];
    const modelFactors = shapFeatures
        .filter(f => typeof f?.feature === 'string' && Number.isFinite(f.contribution))
        .filter(f => isApproved ? f.contribution > 0 : isRejected && f.contribution < 0)
        .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
        .slice(0, 3);

    const handleOpenPdfPreview = async () => {
        if (onPreviewPdf) return onPreviewPdf();
        setShowPdfModal(true);
        setPdfError(null);
        if (!pdfBlobUrl && !loadingPdfPreview) {
            const requestId = pdfRequestId.current;
            setLoadingPdfPreview(true);
            try {
                const blob = await fetchLoanReportPdfBlob(applicantData, result);
                if (requestId !== pdfRequestId.current) return;
                const url = window.URL.createObjectURL(blob);
                setPdfBlobUrl(url);
            } catch (err) {
                console.error("PDF Preview generation error:", err);
                if (requestId === pdfRequestId.current) setPdfError("The report preview could not be loaded. Try again.");
            } finally {
                if (requestId === pdfRequestId.current) setLoadingPdfPreview(false);
            }
        }
    };

    const handleClosePdfModal = () => {
        setShowPdfModal(false);
        previewButtonRef.current?.focus();
    };

    const handleCloseApplicationForm = () => {
        setShowApplicationForm(false);
        applicationButtonRef.current?.focus();
    };

    const handlePrintPdf = () => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
            try {
                iframeRef.current.contentWindow.focus();
                iframeRef.current.contentWindow.print();
            } catch {
                if (pdfBlobUrl) window.open(pdfBlobUrl, '_blank');
            }
        } else if (pdfBlobUrl) {
            window.open(pdfBlobUrl, '_blank');
        }
    };

    const handleDownloadPdf = async () => {
        if (!canExport || downloadingPdf) return;
        setDownloadingPdf(true);
        setDownloadError(null);
        try {
            await downloadLoanReportPdf(applicantData, result);
        } catch (err) {
            console.error("PDF generation error:", err);
            setDownloadError('The report could not be downloaded. Try again.');
        } finally {
            setDownloadingPdf(false);
        }
    };

    return (
        <div className="space-y-6">
            
            {/* Top Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 border border-gray-300 rounded-sm shadow-sm">
                <div>
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-50 text-gov-blue border border-blue-200 rounded-sm uppercase tracking-wider">
                        Applicant Portal
                    </span>
                    <h2 className="text-base font-bold text-gray-900 mt-1 uppercase tracking-tight">
                        Loan Assessment and Guidance
                    </h2>
                </div>

                {onNewApplication && <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onNewApplication}
                        className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-sm text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors border border-gray-300"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Start New Assessment
                    </button>
                </div>}
            </div>

            {/* Credit Assessment Report Container */}
            <div className="bg-white border border-gray-300 shadow-sm rounded-sm p-6">
                
                {/* Header Letterhead */}
                <div className="border-b-2 border-gray-300 pb-4 mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <span className="text-[11px] uppercase tracking-widest text-gov-blue font-bold">
                            TrustFin AI Credit Assessment
                        </span>
                        <h2 className="text-xl font-extrabold text-gray-900 mt-1 uppercase tracking-tight">
                            Credit Assessment Report
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {productName} assessment
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold bg-gray-100 border border-gray-300 px-2 py-1 rounded-sm text-gray-700">
                            {reference ? `Ref: ${reference}` : 'Reference unavailable'}
                        </span>
                        <button
                            type="button"
                            ref={previewButtonRef}
                            onClick={handleOpenPdfPreview}
                            disabled={!canExport}
                            className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-sm text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Preview Credit Assessment Report"
                        >
                            <Eye className="w-3.5 h-3.5 text-gov-blue" />
                            Preview
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowApplicationForm(true)}
                            ref={applicationButtonRef}
                            disabled={!hasApplication}
                            className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-sm text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                            title="View submitted application form"
                        >
                            <FileText className="w-3.5 h-3.5 text-gov-blue" />
                            View Application Form
                        </button>
                        <button
                            type="button"
                            onClick={handleDownloadPdf}
                            disabled={downloadingPdf || !canExport}
                            className="px-3 py-1 bg-gov-blue hover:bg-blue-900 text-white border border-blue-900 rounded-sm text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50 shadow-xs"
                            title="Download Credit Assessment Report"
                        >
                            {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            Download PDF
                        </button>
                    </div>
                </div>

                {downloadError && !showPdfModal && <p role="alert" className="mb-4 rounded-sm border border-red-300 bg-red-50 p-3 text-sm text-red-800">{downloadError}</p>}
                {!canExport && <p className="mb-4 text-sm text-gray-600">Complete submitted application details are required to generate the PDF report.</p>}

                <dl className="mb-5 grid grid-cols-1 gap-3 rounded-sm border border-gray-200 bg-gray-50 p-3 sm:grid-cols-3">
                    <div><dt className="text-xs text-gray-600">Requested loan amount</dt><dd className="mt-1 font-semibold text-gray-900">{formatCurrency(loanAmount)}</dd></div>
                    <div><dt className="text-xs text-gray-600">Loan term</dt><dd className="mt-1 font-semibold text-gray-900">{loanTerm === null ? 'Unavailable' : `${loanTerm} months`}</dd></div>
                    <div><dt className="text-xs text-gray-600">Submitted CIBIL score</dt><dd className="mt-1 font-semibold text-gray-900">{creditScore ?? 'Unavailable'}</dd></div>
                </dl>

                {/* Determination Header Banner */}
                <div className="mb-5"><PolicyCheckNotice result={result} /></div>
                <div data-testid="applicant-outcome" className={`p-4 rounded-sm border mb-6 flex items-start gap-3 ${bannerClass}`}>
                    {isApproved && !needsReview ? (
                        <CheckCircle className="w-8 h-8 text-green-700 shrink-0 mt-0.5" />
                    ) : isRejected ? (
                        <AlertCircle className="w-8 h-8 text-red-700 shrink-0 mt-0.5" />
                    ) : (
                        <AlertTriangle className="w-8 h-8 text-amber-700 shrink-0 mt-0.5" />
                    )}
                    <div>
                        <h3 className="font-extrabold text-xl uppercase tracking-wide">
                            {hasPrediction ? `Model prediction: ${result.prediction}` : 'Model prediction unavailable'}
                        </h3>
                        <p className="text-sm mt-1 leading-relaxed">
                            This is the model's assessment of the submitted details. The lender must review the application before making a final lending decision.
                        </p>
                        {hasPrediction && <span className={`inline-block mt-3 px-2.5 py-1 text-xs font-bold rounded-sm border ${hasAffordability ? underwritingAction.badgeClass : 'bg-amber-600 text-white border-amber-700'}`}>
                            {hasAffordability ? underwritingAction.badgeText : 'AFFORDABILITY DETAILS UNAVAILABLE'}
                        </span>}
                        {affordabilityFailed && <p className="text-sm font-semibold mt-2">The monthly repayment check requires a bank officer’s review.</p>}
                    </div>
                </div>

                {/* Financial Capacity & Affordability Breakdown */}
                <div className="mb-6">
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Wallet className="w-4 h-4 text-gov-blue" />
                        Monthly Income & EMI Affordability
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
                            <span className="text-[11px] text-gray-500 uppercase font-semibold">Total Monthly Income</span>
                            <p className="text-base font-bold text-gray-900 font-mono mt-1">{formatCurrency(monthlyIncome)}</p>
                            <span className="text-[10px] text-gray-500">{incomeSource}</span>
                        </div>
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
                            <span className="text-[11px] text-gray-500 uppercase font-semibold">Proposed Monthly EMI</span>
                            <p className="text-base font-bold text-gray-900 font-mono mt-1">{formatCurrency(monthlyEMI)}</p>
                            <span className="text-[10px] text-gray-500">New loan installment</span>
                        </div>
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
                            <span className="text-[11px] text-gray-500 uppercase font-semibold">Total Monthly Debt</span>
                            <p className="text-base font-bold text-gray-900 font-mono mt-1">{formatCurrency(totalObligation)}</p>
                            <span className="text-[10px] text-gray-500">{existingEMI === null ? 'Existing EMI unavailable' : existingEMI > 0 ? `Incl. ${formatCurrency(existingEMI)} existing` : 'Existing EMI entered: ₹0'}</span>
                        </div>
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
                            <span className="text-[11px] text-gray-500 uppercase font-semibold">Monthly Debt / Income</span>
                            <p className={`text-base font-bold font-mono mt-1 ${!hasAffordability ? 'text-gray-600' : dtiRatioVal <= 50 ? 'text-green-700' : 'text-red-700'}`}>
                                {hasAffordability ? `${dtiRatioVal.toFixed(1)}%` : 'Unavailable'}
                            </p>
                            <span className="text-[10px] text-gray-500">Configured review limit: 50.0%</span>
                        </div>
                    </div>

                    {/* Visual Affordability Bar */}
                    {hasAffordability && <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-sm">
                        <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                            <span>Total Debt Share of Income: {dtiRatioVal.toFixed(1)}%</span>
                            <span>Limit: 50.0%</span>
                        </div>
                        <div role="progressbar" aria-label="Monthly repayments as a share of income" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, dtiRatioVal)} aria-valuetext={`${dtiRatioVal.toFixed(1)}% of monthly income`} className="w-full bg-gray-200 h-3 rounded-xs relative overflow-hidden">
                            <div 
                                className={`h-full transition-all ${dtiRatioVal <= 35 ? 'bg-green-600' : dtiRatioVal <= 50 ? 'bg-amber-500' : 'bg-red-600'}`} 
                                style={{ width: `${Math.min(100, dtiRatioVal)}%` }}
                            ></div>
                        </div>
                        <div className="flex flex-wrap justify-between gap-2 text-[10px] text-gray-500 mt-1">
                            <span>Up to 35%</span>
                            <span>Above 35% to 50%</span>
                            <span className="font-bold text-red-600">Above 50% — review required</span>
                        </div>
                    </div>}
                </div>

                <div className="space-y-4">
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-sm">
                        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Review Findings</h4>
                        <ul className="list-disc pl-4 text-sm text-gray-700 space-y-2">
                            {reviewFindings.map(reason => <li key={reason}>{reason}</li>)}
                        </ul>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-sm">
                        <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2">Main Model Factors (SHAP)</h4>
                        <ul className="list-disc pl-4 text-sm text-blue-900 space-y-2">
                            {modelFactors.map(f => {
                                const rawField = Object.keys(applicantData || {}).find(field => f.feature === field || f.feature.startsWith(`${field}_`));
                                return <li key={f.feature}>{getBankingLabel(rawField || f.feature)} {f.contribution > 0 ? 'increased' : 'reduced'} the model's approval output.</li>;
                            })}
                        </ul>
                        {!modelFactors.length && <p className="text-sm text-gray-600">No matching explanation factors are available for this result.</p>}
                    </div>
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-sm">
                        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">Recommended Next Steps</h4>
                        <p className="text-sm text-gray-700">Review the submitted details and model factors with a bank officer. Provide updated income, debt or credit details for a fresh assessment when needed.</p>
                    </div>
                    {canSimulate && (!isApproved || underwritingAction.tier !== 'AUTO_APPROVE') && <RecourseSimulator applicantData={applicantData} result={result} />}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center text-[11px] text-gray-500 gap-2">
                    <span>TrustFin AI • Explainable Credit Decision Support</span>
                    <span>Model assessment subject to lender review</span>
                </div>

            </div>

            <SubmittedApplicationFormModal
                isOpen={showApplicationForm}
                onClose={handleCloseApplicationForm}
                applicantData={applicantData}
                applicationReference={reference}
            />

            {/* In-App PDF Preview Modal */}
            {showPdfModal && (
                <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={event => { if (event.target === event.currentTarget) handleClosePdfModal(); }}>
                    <div role="dialog" aria-modal="true" aria-labelledby="applicant-pdf-preview-title" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); handleClosePdfModal(); } }} className="bg-white w-full max-w-4xl h-[88vh] rounded-sm shadow-xl flex flex-col overflow-hidden border border-gray-400">
                        
                        {/* Modal Header */}
                        <div className="px-4 py-3 bg-gov-blue text-white flex items-center justify-between border-b border-blue-900">
                            <div className="flex items-center gap-2">
                                <Eye className="w-4 h-4 text-yellow-400" />
                                <h3 id="applicant-pdf-preview-title" className="text-xs font-bold uppercase tracking-wider">
                                    Credit Assessment Report Preview
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handlePrintPdf}
                                    disabled={!pdfBlobUrl}
                                    className="px-2.5 py-1 bg-blue-900 hover:bg-blue-800 text-white rounded-sm text-xs font-semibold flex items-center gap-1 border border-blue-400 cursor-pointer disabled:opacity-40"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    Print
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDownloadPdf}
                                    disabled={downloadingPdf}
                                    className="px-2.5 py-1 bg-yellow-400 hover:bg-yellow-300 text-blue-950 rounded-sm text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Download
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClosePdfModal}
                                    aria-label="Close PDF preview"
                                    autoFocus
                                    className="p-1 hover:bg-blue-800 text-white rounded-sm text-xs ml-2 cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {downloadError && <p role="alert" className="border-b border-red-300 bg-red-50 p-3 text-sm text-red-800">{downloadError}</p>}
                        {/* Modal Body */}
                        <div className="flex-1 bg-gray-100 flex items-center justify-center overflow-hidden">
                            {loadingPdfPreview ? (
                                <div className="text-center p-8">
                                    <Loader2 className="w-8 h-8 text-gov-blue animate-spin mx-auto mb-2" />
                                    <p className="text-xs font-semibold text-gray-700">Rendering Credit Assessment Report...</p>
                                </div>
                            ) : pdfError ? (
                                <div className="text-center p-8 max-w-md">
                                    <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                                    <p className="text-sm font-bold text-gray-900">Unable to Render Preview</p>
                                    <p className="text-xs text-gray-600 mt-1">{pdfError}</p>
                                    <button type="button" onClick={handleOpenPdfPreview} className="mt-3 rounded-sm bg-gov-blue px-3 py-2 text-xs font-semibold text-white">Try again</button>
                                </div>
                            ) : pdfBlobUrl ? (
                                <iframe
                                    ref={iframeRef}
                                    src={pdfBlobUrl}
                                    title="Credit Assessment Report PDF"
                                    className="w-full h-full border-none"
                                />
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

// A different assessment gets fresh preview state, including for history loads.
const ApplicantPortalView = (props) => (
    <ApplicantPortalContent key={JSON.stringify([props.result, props.applicantData])} {...props} />
);

export default ApplicantPortalView;
