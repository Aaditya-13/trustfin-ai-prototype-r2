import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { 
    ShieldCheck, AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp, 
    CheckCircle, Building2, User, FileText, Check, X, ArrowRight,
    Download, Loader2, Eye, Printer
} from 'lucide-react';
import { getBankingLabel, getBankingDescription, getFeatureActualValue, getContributionLabel } from '../utils/bankingTerms';
import { getUnderwritingAction } from '../utils/decisionAdvisory';
import { formatTrustFormula, formatTrustWeight } from '../utils/trustScorePresentation';
import ApplicantPortalView from './ApplicantPortalView';
import PolicyCheckNotice from './PolicyCheckNotice';
import StabilityCheckDetails from './StabilityCheckDetails';
import FaithfulnessCheckDetails from './FaithfulnessCheckDetails';
import { downloadLoanReportPdf, fetchLoanReportPdfBlob } from '../services/api';

const InsightsDashboard = ({ result, applicantData }) => {
    const [roleView, setRoleView] = useState('bank_official'); // 'bank_official' | 'applicant'
    const [activeExplainerTab, setActiveExplainerTab] = useState('shap');
    const [showFormula, setShowFormula] = useState(false);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    
    // In-App PDF Preview Modal State
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
    const [loadingPdfPreview, setLoadingPdfPreview] = useState(false);
    const [pdfError, setPdfError] = useState(null);
    const iframeRef = useRef(null);

    // Clean up cached blob URL on unmount
    useEffect(() => {
        return () => {
            if (pdfBlobUrl) {
                window.URL.revokeObjectURL(pdfBlobUrl);
            }
        };
    }, [pdfBlobUrl]);

    // Invalidate cached preview when input data changes
    useEffect(() => {
        if (pdfBlobUrl) {
            window.URL.revokeObjectURL(pdfBlobUrl);
            setPdfBlobUrl(null);
        }
    }, [applicantData, result]);

    const handleOpenPdfPreview = async () => {
        setShowPdfModal(true);
        setPdfError(null);
        if (!pdfBlobUrl) {
            setLoadingPdfPreview(true);
            try {
                const blob = await fetchLoanReportPdfBlob(applicantData, result);
                const url = window.URL.createObjectURL(blob);
                setPdfBlobUrl(url);
            } catch (err) {
                console.error("PDF Preview generation error:", err);
                setPdfError("Unable to prepare the PDF preview. Please try again.");
            } finally {
                setLoadingPdfPreview(false);
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
        if (!applicantData || !result) {
            alert("No application data available to generate report.");
            return;
        }
        setDownloadingPdf(true);
        try {
            await downloadLoanReportPdf(applicantData, result);
        } catch (err) {
            console.error("PDF generation error:", err);
            alert("Unable to download the assessment report. Please try again.");
        } finally {
            setDownloadingPdf(false);
        }
    };

    if (!result) return null;

    const isApproved = result.prediction === 'Approved';
    const statusColor = isApproved ? 'bg-gov-green text-white' : 'bg-gov-red text-white';
    const determinationText = isApproved ? 'Model prediction: Approved' : 'Model prediction: Rejected';
    const trustPercent = Math.max(0, Math.min(100, result.trustScore.overallTrustScore * 100));
    const underwritingAction = getUnderwritingAction(result, applicantData);

    // Trust Reliability Classification
    let trustLevel = {
        label: 'HIGH EXPLANATION SCORE',
        color: 'text-green-800 bg-green-50 border-green-300',
        badgeColor: 'bg-green-700',
        desc: 'The combined explanation score is high. Review the individual checks and any nearby decision changes.'
    };
    if (trustPercent < 70) {
        trustLevel = {
            label: 'LOW SCORE: REVIEW REQUIRED',
            color: 'text-red-800 bg-red-50 border-red-300',
            badgeColor: 'bg-red-700',
            desc: 'The combined explanation score is low. Review the individual checks to see which need attention.'
        };
    } else if (trustPercent < 85) {
        trustLevel = {
            label: 'MODERATE SCORE: REVIEW RECOMMENDED',
            color: 'text-amber-800 bg-amber-50 border-amber-300',
            badgeColor: 'bg-amber-600',
            desc: 'The combined explanation score is moderate. Review the individual checks before using the explanation.'
        };
    }

    // Prepare SHAP Data mapped to official banking names and actual input values
    const shapSorted = [...result.shap.features].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
    const shapData = shapSorted.slice(0, 6).map(f => ({
        rawName: f.feature,
        name: getBankingLabel(f.feature),
        contribution: Number(f.contribution.toFixed(3)),
        direction: f.direction,
        actualValue: getFeatureActualValue(f.feature, applicantData, result, f.value)
    }));

    // Prepare LIME Data mapped to official banking names and actual input values
    const limeSorted = [...result.lime.features].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
    const limeData = limeSorted.slice(0, 6).map(f => ({
        rawName: f.feature,
        name: getBankingLabel(f.feature),
        contribution: Number(f.contribution.toFixed(3)),
        direction: f.direction,
        actualValue: getFeatureActualValue(f.feature, applicantData, result, f.value)
    }));

    // Prepare Feature Agreement Comparison Table (Union of top 5 SHAP & LIME features)
    const topShapNames = shapSorted.slice(0, 5).map(f => f.feature);
    const topLimeNames = limeSorted.slice(0, 5).map(f => f.feature);
    const comparisonFeatureNames = Array.from(new Set([...topShapNames, ...topLimeNames])).slice(0, 6);

    const agreementRows = comparisonFeatureNames.map(rawName => {
        const shapFeat = result.shap.features.find(f => f.feature === rawName);
        const limeFeat = result.lime.features.find(f => f.feature === rawName);
        const shapVal = shapFeat ? shapFeat.contribution : 0;
        const limeVal = limeFeat ? limeFeat.contribution : 0;

        let status = 'Explanation Difference';
        let statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200';

        if ((shapVal > 0.001 && limeVal > 0.001) || (shapVal < -0.001 && limeVal < -0.001)) {
            status = shapVal > 0 ? 'Both Support Approval' : 'Both Support Rejection';
            statusBadgeClass = shapVal > 0 ? 'bg-green-50 text-green-800 border-green-300' : 'bg-red-50 text-red-800 border-red-300';
        } else if (Math.abs(shapVal) < 0.001 || Math.abs(limeVal) < 0.001) {
            status = 'Low Impact';
            statusBadgeClass = 'bg-gray-50 text-gray-600 border-gray-200';
        }

        return {
            rawName,
            bankingLabel: getBankingLabel(rawName),
            shapVal,
            limeVal,
            status,
            statusBadgeClass,
            isAgreement: (shapVal * limeVal > 0)
        };
    });

    const agreementCount = agreementRows.filter(r => r.isAgreement).length;
    const directionalConcordance = agreementRows.length > 0 ? ((agreementCount / agreementRows.length) * 100).toFixed(0) : '0';

    // Helper to get color-matched semantic icon for concordance status
    const getStatusIcon = (status) => {
        if (status === 'Both Support Approval') {
            return <CheckCircle className="w-3 h-3 text-green-700 shrink-0" />;
        }
        if (status === 'Both Support Rejection') {
            return <AlertCircle className="w-3 h-3 text-red-600 shrink-0" />;
        }
        if (status === 'Explanation Difference') {
            return <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />;
        }
        return <Info className="w-3 h-3 text-gray-500 shrink-0" />;
    };

    // Financial calculations
    const monthlyIncome = result.solvencyCheck ? result.solvencyCheck.totalIncome : 0;
    const monthlyEMI = result.solvencyCheck ? result.solvencyCheck.monthlyEMI : 0;
    const existingEMI = result.solvencyCheck?.existingEMI ?? (Number(applicantData?.Existing_EMI) || 0);
    const totalObligation = result.solvencyCheck?.totalMonthlyObligation ?? (monthlyEMI + existingEMI);
    const netSurplus = result.solvencyCheck?.netDisposableIncome ?? (monthlyIncome - totalObligation);
    const dtiRatioVal = result.solvencyCheck ? (result.solvencyCheck.dtiRatio * 100) : 0;

    // Dedicated Component: Official Bank PDF Report Card (Clean UIDAI Enterprise Style)
    const renderPdfReportCard = () => (
        <div className="bg-white border border-gray-300 rounded-sm shadow-sm overflow-hidden">
            {/* Top Content Row */}
            <div className="p-4 flex items-start gap-3.5">
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-sm text-gov-blue shrink-0 mt-0.5">
                    <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                            Loan Assessment Report
                        </h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border uppercase tracking-wider ${
                            isApproved ? 'bg-green-50 text-green-800 border-green-300' : 'bg-red-50 text-red-800 border-red-300'
                        }`}>
                            Assessment Summary
                        </span>
                    </div>
                    <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                        PDF summary of the submitted details, model prediction and explanation checks.
                    </p>
                </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
                <span className="text-[11px] text-gray-500 font-medium">
                    A4 report • Preview or download the assessment
                </span>
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <button
                        type="button"
                        onClick={handleOpenPdfPreview}
                        className="flex-1 sm:flex-none px-3.5 py-1.5 bg-white hover:bg-gray-100 text-gray-800 text-xs font-semibold uppercase tracking-wider rounded-sm border border-gray-300 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                        <Eye className="w-3.5 h-3.5 text-gov-blue" />
                        Preview Document
                    </button>
                    <button
                        type="button"
                        onClick={handleDownloadPdf}
                        disabled={downloadingPdf}
                        className="flex-1 sm:flex-none px-4 py-1.5 bg-gov-blue hover:bg-blue-900 text-white text-xs font-bold uppercase tracking-wider rounded-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                    >
                        {downloadingPdf ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Download className="w-3.5 h-3.5" />
                                Download Assessment PDF
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <PolicyCheckNotice result={result} />

            {/* Stakeholder Persona View Switcher */}
            <div className="bg-white border border-gray-300 p-2 rounded-sm shadow-sm flex flex-col sm:flex-row gap-2 justify-between items-center">
                <div className="flex flex-1 w-full gap-2">
                    <button
                        onClick={() => setRoleView('bank_official')}
                        className={`flex-1 py-2 px-3 text-xs font-bold uppercase tracking-wider rounded-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            roleView === 'bank_official'
                                ? 'bg-gov-blue text-white shadow-sm'
                                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 bg-white'
                        }`}
                    >
                        <Building2 className="w-4 h-4" />
                        Bank Officer View
                    </button>
                    <button
                        onClick={() => setRoleView('applicant')}
                        className={`flex-1 py-2 px-3 text-xs font-bold uppercase tracking-wider rounded-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            roleView === 'applicant'
                                ? 'bg-gov-blue text-white shadow-sm'
                                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 bg-white'
                        }`}
                    >
                        <User className="w-4 h-4" />
                        Applicant View
                    </button>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* VIEW 1: BANK OFFICIAL / RISK AUDIT CONSOLE                                */}
            {/* ========================================================================= */}
            {roleView === 'bank_official' && (
                <div className="space-y-6">
                    
                    {/* Primary Determination Banner */}
                    <div className={`p-5 border border-gray-300 shadow-sm rounded-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${isApproved ? 'bg-green-50' : 'bg-red-50'}`}>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold px-2 py-0.5 bg-white border border-gray-300 text-gray-700 rounded-sm uppercase tracking-wider">
                                    Application #{result.dossierId || result.evaluationId || 'Unavailable'}
                                </span>
                                <span className="text-xs text-gray-500">Evaluation Result</span>
                            </div>
                            <h2 className="text-base font-bold text-gray-900 uppercase tracking-tight mt-1">
                                Loan Assessment
                            </h2>
                            <p className="text-xs text-gray-700 mt-0.5">
                                Model probability for this prediction: {(result.confidenceScore * 100).toFixed(1)}%
                            </p>
                        </div>
                        <div className={`px-5 py-2 text-xl font-extrabold uppercase rounded-sm border ${isApproved ? 'border-green-700' : 'border-red-700'} ${statusColor} tracking-wide text-center`}>
                            {determinationText}
                        </div>
                    </div>

                    {/* Operational Underwriting Action Directive Card */}
                    {underwritingAction && (
                        <div className={`p-4 border rounded-sm shadow-sm ${underwritingAction.cardBgClass}`}>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-200/80 pb-2.5 mb-3">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${underwritingAction.indicatorClass}`}></span>
                                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                                        Review Guidance
                                    </span>
                                </div>
                                <span className={`px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider rounded-sm border ${underwritingAction.badgeClass}`}>
                                    {underwritingAction.badgeText}
                                </span>
                            </div>

                            <div className="space-y-2.5">
                                <p className="text-xs font-bold text-gray-900">
                                    {underwritingAction.headline}
                                </p>

                                <div className="bg-white/80 border border-gray-200 rounded-sm p-3">
                                    <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                        Assessment Findings:
                                    </p>
                                    <ul className="text-xs text-gray-800 space-y-1">
                                        {underwritingAction.reasons.map((reason, idx) => (
                                            <li key={idx} className="flex items-start gap-1.5">
                                                <span className={`font-bold ${underwritingAction.accentColor}`}>•</span>
                                                <span>{reason}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="flex items-start gap-2 bg-white/60 border border-gray-200 p-2.5 rounded-sm text-xs">
                                    <ArrowRight className={`w-4 h-4 shrink-0 mt-0.5 ${underwritingAction.accentColor}`} />
                                    <div>
                                        <strong className="text-gray-900 font-bold">Officer Action: </strong>
                                        <span className="text-gray-700">{underwritingAction.nextStep}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Dedicated Official Bank PDF Report Card */}
                    {renderPdfReportCard()}

                    {/* Monthly Affordability Check */}
                    {result.solvencyCheck && (
                        <div className={`p-5 border shadow-sm rounded-sm ${result.solvencyCheck.isSolvent ? 'bg-white border-gray-300' : 'bg-red-50 border-red-300'}`}>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-2 mb-3 gap-2">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 uppercase">
                                        {result.solvencyCheck.isSolvent ? (
                                             <CheckCircle className="w-4 h-4 text-green-700" />
                                        ) : (
                                            <AlertCircle className="w-4 h-4 text-red-700" />
                                        )}
                                        Monthly Affordability Check
                                    </h3>
                                    <p className="text-xs text-gray-600">Project limit: existing and proposed EMIs together should not exceed 50% of monthly income</p>
                                </div>
                                <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-sm border ${
                                    result.solvencyCheck.status === 'INSOLVENT' 
                                        ? 'bg-red-700 text-white border-red-800'
                                        : result.solvencyCheck.status === 'MODERATE'
                                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                                        : 'bg-green-100 text-green-900 border-green-300'
                                }`}>
                                    {result.solvencyCheck.status === 'INSOLVENT' ? 'ABOVE 50% PROJECT LIMIT' : result.solvencyCheck.status === 'MODERATE' ? 'REVIEW RANGE (ABOVE 35% TO 50%)' : 'LOWER DEBT SHARE (UP TO 35%)'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-center mb-3">
                                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-sm">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Proposed EMI</p>
                                    <p className="text-sm font-bold text-gray-900 font-mono mt-0.5">₹{Math.round(monthlyEMI).toLocaleString('en-IN')}</p>
                                    <span className="text-[9px] text-gray-400 font-mono">New loan payment</span>
                                </div>
                                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-sm">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Existing EMIs</p>
                                    <p className="text-sm font-bold text-gray-900 font-mono mt-0.5">₹{Math.round(existingEMI).toLocaleString('en-IN')}</p>
                                    <span className="text-[9px] text-gray-400 font-mono">{existingEMI > 0 ? 'Submitted debt' : 'No existing EMI entered'}</span>
                                </div>
                                <div className="p-2.5 bg-blue-50/60 border border-blue-200 rounded-sm">
                                    <p className="text-[10px] font-bold text-blue-900 uppercase tracking-tight">Total Monthly Debt</p>
                                    <p className="text-sm font-extrabold text-blue-950 font-mono mt-0.5">₹{Math.round(totalObligation).toLocaleString('en-IN')}</p>
                                    <span className="text-[9px] text-blue-700 font-mono">Existing + Proposed</span>
                                </div>
                                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-sm">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Monthly Income</p>
                                    <p className="text-sm font-bold text-gray-900 font-mono mt-0.5">₹{Math.round(monthlyIncome).toLocaleString('en-IN')}</p>
                                    <span className="text-[9px] text-gray-400 font-mono">Income used</span>
                                </div>
                                <div className={`p-2.5 rounded-sm border ${dtiRatioVal > 50 ? 'bg-red-50 border-red-300' : dtiRatioVal > 35 ? 'bg-amber-50 border-amber-300' : 'bg-green-50 border-green-300'}`}>
                                    <p className="text-[10px] font-bold text-gray-700 uppercase tracking-tight">Debt / Income (FOIR)</p>
                                    <p className={`text-sm font-extrabold font-mono mt-0.5 ${dtiRatioVal > 50 ? 'text-red-700' : dtiRatioVal > 35 ? 'text-amber-700' : 'text-green-700'}`}>
                                        {result.solvencyCheck.dtiPercent}
                                    </p>
                                    <span className="text-[9px] font-mono text-gray-500">Max Limit: 50.0%</span>
                                </div>
                                <div className={`p-2.5 rounded-sm border ${netSurplus >= 0 ? 'bg-green-50/80 border-green-300' : 'bg-red-50/80 border-red-300'}`}>
                                    <p className="text-[10px] font-bold text-gray-700 uppercase tracking-tight">Income Left After EMIs</p>
                                    <p className={`text-sm font-extrabold font-mono mt-0.5 ${netSurplus >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                        {netSurplus >= 0 ? `+₹${Math.round(netSurplus).toLocaleString('en-IN')}` : `-₹${Math.abs(Math.round(netSurplus)).toLocaleString('en-IN')}`}
                                    </p>
                                    <span className={`text-[9px] font-bold uppercase font-mono ${netSurplus >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                        {netSurplus >= 0 ? 'Surplus' : 'Deficit'}
                                    </span>
                                </div>
                            </div>

                            <div className="p-2.5 bg-blue-50/40 border border-blue-200 rounded-sm mb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center text-[11px] gap-1 font-mono text-gray-700">
                                <span>Monthly debt / income: FOIR = (Existing ₹{Math.round(existingEMI).toLocaleString('en-IN')} + Proposed ₹{Math.round(monthlyEMI).toLocaleString('en-IN')}) / Income ₹{Math.round(monthlyIncome).toLocaleString('en-IN')} = <strong>{result.solvencyCheck.dtiPercent}</strong></span>
                                <span className={`font-semibold text-[10px] px-1.5 py-0.5 rounded-xs border ${netSurplus >= 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'}`}>
                                    {netSurplus >= 0 ? `Surplus: +₹${Math.round(netSurplus).toLocaleString('en-IN')}` : `Shortfall: -₹${Math.abs(Math.round(netSurplus)).toLocaleString('en-IN')}`}
                                </span>
                            </div>

                            {result.solvencyCheck.overrideWarning && (
                                <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-sm text-xs text-red-900 flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                                    <div>
                                        <strong className="font-bold">Repayment Alert:</strong> {result.solvencyCheck.overrideWarning}
                                        <span className="block text-[11px] text-red-800 mt-1 font-medium">
                                            Project rule: total monthly EMIs above 50% of income fail the affordability check, even when the model predicts approval.
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Explanation Trust Score */}
                    <div className="bg-white p-6 border border-gray-300 shadow-sm rounded-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-300 pb-3 mb-4 gap-2">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase">
                                    <ShieldCheck className="w-5 h-5 text-gov-blue" />
                                    Explanation Trust Score
                                </h3>
                                <p className="text-xs text-gray-600">Three explanation checks form the score; Gender sensitivity is shown separately.</p>
                            </div>
                            <div className={`px-3 py-1 text-xs font-bold uppercase rounded-sm border flex items-center gap-1.5 ${trustLevel.color}`}>
                                <span className={`w-2 h-2 rounded-full ${trustLevel.badgeColor}`}></span>
                                {trustLevel.label}
                            </div>
                        </div>
                        
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <div className="flex-1 w-full">
                                <div className="flex justify-between text-sm text-gray-800 mb-1.5 font-semibold">
                                    <span>Overall Explanation Trust Score</span>
                                    <span className="font-mono">{trustPercent.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 h-5 rounded-sm border border-gray-300 relative overflow-hidden">
                                    <div 
                                        className="bg-gov-blue h-full transition-all duration-500" 
                                        style={{ width: `${trustPercent}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-gray-600 mt-2">{trustLevel.desc}</p>
                            </div>
                            <div className="text-4xl font-extrabold text-gray-900 px-4 py-2 bg-gray-50 border border-gray-200 rounded-sm font-mono">
                                {trustPercent.toFixed(1)}%
                            </div>
                        </div>

                        {/* Three weighted explanation diagnostics and a fairness audit */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm text-center">
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Faithfulness</p>
                                <p className="text-xl font-bold text-gray-900 mt-0.5 font-mono">{(result.trustScore.faithfulness * 100).toFixed(1)}%</p>
                                <p className="text-[11px] text-gray-500 mt-1">{formatTrustWeight(result.trustScore, 'faithfulness')}</p>
                                <FaithfulnessCheckDetails result={result} />
                            </div>
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm text-center">
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Stability</p>
                                <p className="text-xl font-bold text-gray-900 mt-0.5 font-mono">{(result.trustScore.stability * 100).toFixed(1)}%</p>
                                <StabilityCheckDetails result={result} />
                                <p className="text-[11px] text-gray-500 mt-1">{formatTrustWeight(result.trustScore, 'stability')} • Rank and direction similarity</p>
                            </div>
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm text-center">
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Consistency</p>
                                <p className="text-xl font-bold text-gray-900 mt-0.5 font-mono">{(result.trustScore.consistency * 100).toFixed(1)}%</p>
                                <p className="text-[11px] text-gray-500 mt-1">{formatTrustWeight(result.trustScore, 'consistency')} • Feature and direction agreement</p>
                            </div>
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm text-center">
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Fairness</p>
                                <p className="text-xl font-bold text-gray-900 mt-0.5 font-mono">{result.trustScore.fairness == null ? 'N/A' : `${(result.trustScore.fairness * 100).toFixed(1)}%`}</p>
                                <p className="text-[11px] text-gray-500 mt-1">{formatTrustWeight(result.trustScore, 'fairness')} • Gender sensitivity</p>
                            </div>
                        </div>

                        {/* Formula Transparency Drawer */}
                        <div className="mt-4 pt-3 border-t border-gray-200">
                            <button 
                                onClick={() => setShowFormula(!showFormula)}
                                className="text-xs font-semibold text-gov-blue hover:underline flex items-center gap-1 focus:outline-none cursor-pointer"
                            >
                                <Info className="w-3.5 h-3.5" />
                                {showFormula ? 'Hide Trust Score Formula & Explanation' : 'View Trust Score Formula & Explanation'}
                                {showFormula ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                            {showFormula && (
                                <div className="mt-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-sm text-xs text-gray-700 space-y-2">
                                    <p className="font-bold text-gray-900 font-sans uppercase tracking-wider">Explanation Trust Score Formula</p>
                                    <p className="bg-white p-2 border border-gray-300 rounded-sm font-mono text-gray-900">
                                        {formatTrustFormula(result.trustScore)}
                                    </p>
                                    <div className="text-gray-600 space-y-1 pt-1">
                                        <p>• <strong>Faithfulness</strong> {result.faithfulnessCheck?.method === 'local_concordance'
                                            ? 'uses 60% SHAP and 40% LIME local concordance with up to five features each. It checks reconstruction of this prediction, not correct feature assignment or behavior on other applicants.'
                                            : 'was saved without method details. The original score is preserved.'}</p>
                                        <p>• <strong>Stability</strong> combines importance-rank similarity (70%) and contribution-direction agreement (30%). New assessments average SHAP comparisons across valid nearby financial changes.</p>
                                        <p>• <strong>Consistency</strong> combines top-five feature overlap (60%) and shared-feature direction agreement (40%).</p>
                                        <p>• <strong>Fairness</strong> checks how much approval probability changes when only Gender changes. It is shown separately and does not establish fairness across groups.</p>
                                        <p className="text-[11px] text-gray-500 italic pt-1 border-t border-gray-200">
                                            New assessments give faithfulness, stability and consistency one-third each. Displayed percentages are rounded. Fairness is shown separately.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Underwriting Decision Drivers (Local Attribution) */}
                    <div className="bg-white p-6 border border-gray-300 shadow-sm rounded-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-300 pb-3 mb-4 gap-2">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 uppercase">Factors Behind the Model Prediction</h3>
                                <p className="text-xs text-gray-600">Compare the features highlighted by SHAP and LIME. Contribution values use different scales.</p>
                            </div>
                            {/* Explainer Tab Switcher */}
                            <div className="flex border border-gray-300 rounded-sm overflow-hidden text-xs font-semibold">
                                <button
                                    onClick={() => setActiveExplainerTab('shap')}
                                    className={`px-3 py-1.5 transition-colors cursor-pointer ${activeExplainerTab === 'shap' ? 'bg-gov-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    SHAP Explanation
                                </button>
                                <button
                                    onClick={() => setActiveExplainerTab('lime')}
                                    className={`px-3 py-1.5 transition-colors cursor-pointer ${activeExplainerTab === 'lime' ? 'bg-gov-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    LIME Explanation
                                </button>
                            </div>
                        </div>

                        <p className="text-xs text-gray-600 mb-3">
                            {activeExplainerTab === 'shap' ? (
                                <span><strong>SHAP Explanation</strong>: Shows how each feature contributes to this model output, in log-odds rather than approval percentage points.</span>
                            ) : (
                                <span><strong>LIME Explanation</strong>: Approximates model behaviour near this application. Its contribution values use a different scale from SHAP.</span>
                            )}
                        </p>

                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    layout="vertical"
                                    data={activeExplainerTab === 'shap' ? shapData : limeData}
                                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                                    <XAxis type="number" tick={{fill: '#4b5563', fontSize: 11}} />
                                    <YAxis dataKey="name" type="category" width={180} tick={{fontSize: 11, fill: '#1f2937'}} />
                                    <Tooltip 
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                const isPositive = data.contribution > 0;
                                                return (
                                                    <div className="bg-white p-3 border border-gray-300 shadow-lg rounded-sm text-xs min-w-[240px] z-50">
                                                        <div className="flex items-center justify-between border-b border-gray-200 pb-1.5 mb-2">
                                                            <span className="font-bold text-gray-900 text-[12px]">{data.name}</span>
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-xs uppercase tracking-wider ${
                                                                isPositive ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
                                                            }`}>
                                                                {getContributionLabel(data.contribution)}
                                                            </span>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <div className="flex justify-between items-center gap-3">
                                                                <span className="text-gray-600 font-medium">Applicant's Value:</span>
                                                                <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-xs border border-gray-200">
                                                                    {data.actualValue || 'N/A'}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-center gap-3">
                                                                <span className="text-gray-600 font-medium">
                                                                    {activeExplainerTab === 'shap' ? 'SHAP Contribution:' : 'LIME Contribution:'}
                                                                </span>
                                                                <span className={`font-mono font-bold text-[12px] ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
                                                                    {data.contribution > 0 ? `+${data.contribution.toFixed(4)}` : data.contribution.toFixed(4)}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-center gap-3 text-[11px] pt-1.5 border-t border-gray-100">
                                                                <span className="text-gray-500">Effect on Model Prediction:</span>
                                                                <span className={`font-semibold ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
                                                                    {getContributionLabel(data.contribution)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                        cursor={{ fill: 'rgba(0, 86, 179, 0.05)' }}
                                    />
                                    <Bar dataKey="contribution" isAnimationActive={false}>
                                        {(activeExplainerTab === 'shap' ? shapData : limeData).map((entry, index) => (
                                             <Cell key={`cell-${index}`} fill={entry.contribution > 0 ? '#28a745' : '#dc3545'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-6 mt-2 text-xs font-semibold text-gray-700">
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 bg-green-600 inline-block rounded-xs"></span> Positive Contribution (Supports Approval)
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 bg-red-600 inline-block rounded-xs"></span> Negative Contribution (Supports Rejection)
                            </span>
                        </div>
                    </div>

                    {/* SHAP and LIME Comparison */}
                    <div className="bg-white p-6 border border-gray-300 shadow-sm rounded-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-300 pb-3 mb-4 gap-2">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 uppercase">SHAP and LIME Comparison</h3>
                                <p className="text-xs text-gray-600">Compare important features and their directions. Agreement alone does not prove correctness.</p>
                            </div>
                            <div className="flex gap-2">
                                <span className="px-2.5 py-1 text-xs bg-slate-100 border border-slate-300 text-slate-800 font-semibold rounded-sm">
                                    Displayed Direction Agreement: <strong>{directionalConcordance}%</strong>
                                </span>
                                <span className="px-2.5 py-1 text-xs bg-slate-100 border border-slate-300 text-slate-800 font-semibold rounded-sm">
                                    Consistency Score: <strong>{(result.trustScore.consistency * 100).toFixed(0)}%</strong>
                                </span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 border-b border-gray-300 text-gray-800 uppercase tracking-wider font-semibold">
                                        <th className="py-2.5 px-3">Feature / Parameter</th>
                                        <th className="py-2.5 px-3 text-right">SHAP Impact</th>
                                        <th className="py-2.5 px-3 text-right">LIME Impact</th>
                                        <th className="py-2.5 px-3 text-center">Agreement Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {agreementRows.map((row, idx) => (
                                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                            <td className="py-2 px-3 font-semibold text-gray-900">
                                                {row.bankingLabel}
                                                <span className="block text-[10px] text-gray-500 font-normal">{getBankingDescription(row.rawName)}</span>
                                            </td>
                                            <td className={`py-2 px-3 text-right font-mono font-medium ${row.shapVal > 0 ? 'text-green-700' : row.shapVal < 0 ? 'text-red-700' : 'text-gray-500'}`}>
                                                {row.shapVal > 0 ? `+${row.shapVal.toFixed(3)}` : row.shapVal.toFixed(3)}
                                            </td>
                                            <td className={`py-2 px-3 text-right font-mono font-medium ${row.limeVal > 0 ? 'text-green-700' : row.limeVal < 0 ? 'text-red-700' : 'text-gray-500'}`}>
                                                {row.limeVal > 0 ? `+${row.limeVal.toFixed(3)}` : row.limeVal.toFixed(3)}
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-sm border ${row.statusBadgeClass}`}>
                                                    {getStatusIcon(row.status)}
                                                    {row.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-sm text-xs text-blue-900 flex items-start gap-2">
                            <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                            <span>
                                <strong>Why Compare Both?</strong> Agreement shows whether the methods highlight similar factors and directions. It is one check of explanation quality, alongside faithfulness and stability.
                            </span>
                        </div>
                    </div>

                </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW 2: APPLICANT SANCTION & ADVERSE ACTION NOTICE                        */}
            {/* ========================================================================= */}
            {roleView === 'applicant' && <ApplicantPortalView result={result} applicantData={applicantData} />}

            {/* ========================================================================= */}
            {/* CLEAN IN-APP PDF PREVIEW MODAL                                            */}
            {/* ========================================================================= */}
            {showPdfModal && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl h-[88vh] rounded-sm shadow-xl flex flex-col overflow-hidden border border-gray-400">
                        
                        {/* Modal Header */}
                        <div className="px-4 py-3 bg-gov-blue text-white flex items-center justify-between border-b border-blue-900">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider">
                                        Assessment PDF Preview
                                    </h3>
                                    <p className="text-[10px] text-blue-200">
                                        Loan Assessment Report
                                    </p>
                                </div>
                            </div>

                            {/* Modal Header Actions */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePrintPdf}
                                    className="p-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-sm text-xs font-bold flex items-center gap-1 cursor-pointer border border-blue-700"
                                    title="Print Document"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Print</span>
                                </button>
                                <button
                                    onClick={handleDownloadPdf}
                                    disabled={downloadingPdf}
                                    className="p-1.5 bg-yellow-500 hover:bg-yellow-600 text-blue-950 rounded-sm text-xs font-bold flex items-center gap-1 cursor-pointer border border-yellow-600 disabled:opacity-50"
                                    title="Download PDF"
                                >
                                    {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                    <span className="hidden sm:inline">Download</span>
                                </button>
                                <button
                                    onClick={handleClosePdfModal}
                                    className="p-1.5 bg-blue-900 hover:bg-red-700 text-white rounded-sm text-xs cursor-pointer border border-blue-700 ml-1"
                                    title="Close Preview"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 bg-gray-200 relative overflow-hidden flex items-center justify-center">
                            {loadingPdfPreview ? (
                                <div className="text-center p-8 bg-white border border-gray-300 rounded-sm shadow-sm flex flex-col items-center">
                                    <Loader2 className="w-8 h-8 text-gov-blue animate-spin mb-3" />
                                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Preparing Assessment Report...</h4>
                                    <p className="text-[11px] text-gray-500 mt-1 max-w-xs">
                                        Preparing the application summary, affordability details and explanation checks...
                                    </p>
                                </div>
                            ) : pdfError ? (
                                <div className="text-center p-6 bg-white border border-red-300 rounded-sm text-red-700 flex flex-col items-center">
                                    <AlertCircle className="w-8 h-8 mb-2" />
                                    <p className="text-xs font-bold">{pdfError}</p>
                                </div>
                            ) : pdfBlobUrl ? (
                                <iframe 
                                    ref={iframeRef}
                                    src={pdfBlobUrl} 
                                    className="w-full h-full border-0" 
                                    title="Assessment Report PDF Preview"
                                />
                            ) : null}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-4 py-2 bg-gray-100 border-t border-gray-300 flex items-center justify-between text-[11px] text-gray-600">
                            <span>A4 Loan Assessment Report</span>
                            <button
                                onClick={handleClosePdfModal}
                                className="px-3 py-1 bg-white hover:bg-gray-200 text-gray-800 font-semibold border border-gray-300 rounded-sm cursor-pointer"
                            >
                                Close Window
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
};

export default InsightsDashboard;
