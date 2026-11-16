import React, { useState, useEffect, useRef } from 'react';
import { 
    CheckCircle, AlertCircle, Wallet, Download, FileText,
    Eye, Loader2, RefreshCw, Printer
} from 'lucide-react';
import RecourseSimulator from './RecourseSimulator';
import SubmittedApplicationFormModal from './SubmittedApplicationFormModal';
import { downloadLoanReportPdf, fetchLoanReportPdfBlob } from '../services/api';
import { getUnderwritingAction } from '../utils/decisionAdvisory';
import { getBankingLabel } from '../utils/bankingTerms';

const ApplicantPortalContent = ({ result, applicantData, onNewApplication, onPreviewPdf }) => {
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [showApplicationForm, setShowApplicationForm] = useState(false);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
    const [loadingPdfPreview, setLoadingPdfPreview] = useState(false);
    const [pdfError, setPdfError] = useState(null);
    const iframeRef = useRef(null);
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
    const monthlyIncome = result.solvencyCheck ? result.solvencyCheck.totalIncome : 0;
    const monthlyEMI = result.solvencyCheck ? result.solvencyCheck.monthlyEMI : 0;
    const existingEMI = result.solvencyCheck?.existingEMI ?? (Number(applicantData?.Existing_EMI) || 0);
    const totalObligation = result.solvencyCheck?.totalMonthlyObligation ?? (monthlyEMI + existingEMI);
    const dtiRatioVal = result.solvencyCheck ? (result.solvencyCheck.dtiRatio * 100) : 0;
    const underwritingAction = getUnderwritingAction(result, applicantData);

    // SHAP sorted for adverse factors
    const shapSorted = [...result.shap.features].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
    const modelFactors = shapSorted.filter(f => isApproved ? f.contribution > 0 : f.contribution < 0).slice(0, 3);

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
                if (requestId === pdfRequestId.current) setPdfError("Failed to generate credit assessment report preview.");
            } finally {
                if (requestId === pdfRequestId.current) setLoadingPdfPreview(false);
            }
        }
    };

    const handleClosePdfModal = () => {
        setShowPdfModal(false);
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
        if (!applicantData || !result) return;
        setDownloadingPdf(true);
        try {
            await downloadLoanReportPdf(applicantData, result);
        } catch (err) {
            console.error("PDF generation error:", err);
            alert("Failed to download credit assessment report. Please verify service status.");
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
                        Credit Assessment & Guidance
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
                            Loan Application Assessment • Issued on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold bg-gray-100 border border-gray-300 px-2 py-1 rounded-sm text-gray-700">
                            Ref: {result?.dossierId || 'TF-ASMT-849201'}
                        </span>
                        <button
                            type="button"
                            onClick={handleOpenPdfPreview}
                            className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-sm text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                            title="Preview Credit Assessment Report"
                        >
                            <Eye className="w-3.5 h-3.5 text-gov-blue" />
                            Preview
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowApplicationForm(true)}
                            className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-sm text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                            title="View submitted application form"
                        >
                            <FileText className="w-3.5 h-3.5 text-gov-blue" />
                            View Application Form
                        </button>
                        <button
                            type="button"
                            onClick={handleDownloadPdf}
                            disabled={downloadingPdf}
                            className="px-3 py-1 bg-gov-blue hover:bg-blue-900 text-white border border-blue-900 rounded-sm text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50 shadow-xs"
                            title="Download Credit Assessment Report"
                        >
                            {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            Download PDF
                        </button>
                    </div>
                </div>

                {/* Determination Header Banner */}
                <div className={`p-4 rounded-sm border mb-6 flex items-start gap-3 ${
                    isApproved ? 'bg-green-50 border-green-300 text-green-900' : 'bg-red-50 border-red-300 text-red-900'
                }`}>
                    {isApproved ? (
                        <CheckCircle className="w-8 h-8 text-green-700 shrink-0 mt-0.5" />
                    ) : (
                        <AlertCircle className="w-8 h-8 text-red-700 shrink-0 mt-0.5" />
                    )}
                    <div>
                        <h3 className="font-extrabold text-xl uppercase tracking-wide">
                            Model prediction: {result.prediction}
                        </h3>
                        <p className="text-sm mt-1 leading-relaxed">
                            This is the model's assessment of the submitted details. The lender must review the application before making a final lending decision.
                        </p>
                        <span className={`inline-block mt-3 px-2.5 py-1 text-xs font-bold rounded-sm border ${underwritingAction.badgeClass}`}>
                            {underwritingAction.badgeText}
                        </span>
                        <p className="text-sm font-semibold mt-2">{underwritingAction.headline}</p>
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
                            <p className="text-base font-bold text-gray-900 font-mono mt-1">₹{Math.round(monthlyIncome).toLocaleString('en-IN')}</p>
                            <span className="text-[10px] text-gray-500">Applicant + Co-Applicant</span>
                        </div>
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
                            <span className="text-[11px] text-gray-500 uppercase font-semibold">Proposed Monthly EMI</span>
                            <p className="text-base font-bold text-gray-900 font-mono mt-1">₹{Math.round(monthlyEMI).toLocaleString('en-IN')}</p>
                            <span className="text-[10px] text-gray-500">New loan installment</span>
                        </div>
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
                            <span className="text-[11px] text-gray-500 uppercase font-semibold">Total Monthly Debt</span>
                            <p className="text-base font-bold text-gray-900 font-mono mt-1">₹{Math.round(totalObligation).toLocaleString('en-IN')}</p>
                            <span className="text-[10px] text-gray-500">{existingEMI > 0 ? `Incl. ₹${Math.round(existingEMI).toLocaleString('en-IN')} existing` : 'No prior active debt'}</span>
                        </div>
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
                            <span className="text-[11px] text-gray-500 uppercase font-semibold">Debt-to-Income (DTI)</span>
                            <p className={`text-base font-bold font-mono mt-1 ${dtiRatioVal <= 50 ? 'text-green-700' : 'text-red-700'}`}>
                                {dtiRatioVal.toFixed(1)}%
                            </p>
                            <span className="text-[10px] text-gray-500">Configured review limit: 50.0%</span>
                        </div>
                    </div>

                    {/* Visual Affordability Bar */}
                    <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-sm">
                        <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                            <span>Total Debt Share of Income: {dtiRatioVal.toFixed(1)}%</span>
                            <span>Limit: 50.0%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-3 rounded-xs relative overflow-hidden">
                            <div 
                                className={`h-full transition-all ${dtiRatioVal <= 35 ? 'bg-green-600' : dtiRatioVal <= 50 ? 'bg-amber-500' : 'bg-red-600'}`} 
                                style={{ width: `${Math.min(100, dtiRatioVal)}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                            <span>Safe (&lt; 35%)</span>
                            <span>Moderate (35% - 50%)</span>
                            <span className="font-bold text-red-600">High Risk (&gt; 50%)</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-sm">
                        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Review Findings</h4>
                        <ul className="list-disc pl-4 text-sm text-gray-700 space-y-2">
                            {underwritingAction.reasons.map(reason => <li key={reason}>{reason}</li>)}
                        </ul>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-sm">
                        <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2">Main Model Factors (SHAP)</h4>
                        <ul className="list-disc pl-4 text-sm text-blue-900 space-y-2">
                            {modelFactors.map(f => (
                                <li key={f.feature}>{getBankingLabel(f.feature)} {f.contribution > 0 ? 'increased' : 'reduced'} the model's approval output.</li>
                            ))}
                        </ul>
                        {!modelFactors.length && <p className="text-sm text-gray-600">No matching explanation factors are available for this result.</p>}
                    </div>
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-sm">
                        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">Recommended Next Steps</h4>
                        <p className="text-sm text-gray-700">{underwritingAction.nextStep}</p>
                    </div>
                    {(!isApproved || underwritingAction.tier !== 'AUTO_APPROVE') && <RecourseSimulator applicantData={applicantData} result={result} />}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center text-[11px] text-gray-500 gap-2">
                    <span>TrustFin AI • Explainable Credit Decision Support</span>
                    <span>Model assessment subject to lender review</span>
                </div>

            </div>

            <SubmittedApplicationFormModal
                isOpen={showApplicationForm}
                onClose={() => setShowApplicationForm(false)}
                applicantData={applicantData}
                applicationReference={result?.dossierId || 'TF-ASMT-849201'}
            />

            {/* In-App PDF Preview Modal */}
            {showPdfModal && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl h-[88vh] rounded-sm shadow-xl flex flex-col overflow-hidden border border-gray-400">
                        
                        {/* Modal Header */}
                        <div className="px-4 py-3 bg-gov-blue text-white flex items-center justify-between border-b border-blue-900">
                            <div className="flex items-center gap-2">
                                <Eye className="w-4 h-4 text-yellow-400" />
                                <h3 className="text-xs font-bold uppercase tracking-wider">
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
                                    className="p-1 hover:bg-blue-800 text-white rounded-sm text-xs ml-2 cursor-pointer"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

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
