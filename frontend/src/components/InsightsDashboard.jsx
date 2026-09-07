import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { 
    ShieldCheck, AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp, 
    CheckCircle, Building2, User, FileText, Check, X, ArrowRight, Wallet,
    Download, Loader2, Eye, Printer
} from 'lucide-react';
import { getBankingLabel, getBankingDescription } from '../utils/bankingTerms';
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
                setPdfError("Failed to generate PDF preview from underwriting service.");
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
            alert("No applicant dossier available to generate report.");
            return;
        }
        setDownloadingPdf(true);
        try {
            await downloadLoanReportPdf(applicantData, result);
        } catch (err) {
            console.error("PDF generation error:", err);
            alert("Failed to download PDF report. Please verify that the backend service is running on port 8000.");
        } finally {
            setDownloadingPdf(false);
        }
    };

    if (!result) return null;

    const isApproved = result.prediction === 'Approved';
    const statusColor = isApproved ? 'bg-gov-green text-white' : 'bg-gov-red text-white';
    const determinationText = isApproved ? 'ELIGIBLE FOR APPROVAL' : 'RECOMMENDED FOR REJECTION';
    const trustPercent = Math.max(0, Math.min(100, result.trustScore.overallTrustScore * 100));

    // Institutional Audit Reliability Classification
    let trustLevel = {
        label: 'AUDIT VERIFIED: HIGH RELIABILITY',
        color: 'text-green-800 bg-green-50 border-green-300',
        badgeColor: 'bg-green-700',
        desc: 'Explanations demonstrate high mathematical fidelity, input robustness, and cross-algorithmic consensus.'
    };
    if (trustPercent < 50) {
        trustLevel = {
            label: 'AUDIT ALERT: UNRELIABLE EXPLANATION / ANOMALY',
            color: 'text-red-800 bg-red-50 border-red-300',
            badgeColor: 'bg-red-700',
            desc: 'Underwriting drivers fail statutory audit criteria. Mandatory manual credit underwriter review required.'
        };
    } else if (trustPercent < 75) {
        trustLevel = {
            label: 'AUDIT ADVISORY: SECONDARY REVIEW REQUIRED',
            color: 'text-amber-800 bg-amber-50 border-amber-300',
            badgeColor: 'bg-amber-600',
            desc: 'Explanations exhibit minor methodological divergence between auditing algorithms. Secondary review advised.'
        };
    }

    // Prepare SHAP Data mapped to official banking names
    const shapSorted = [...result.shap.features].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
    const shapData = shapSorted.slice(0, 6).map(f => ({
        rawName: f.feature,
        name: getBankingLabel(f.feature),
        contribution: Number(f.contribution.toFixed(3)),
        direction: f.direction
    }));

    // Prepare LIME Data mapped to official banking names
    const limeSorted = [...result.lime.features].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
    const limeData = limeSorted.slice(0, 6).map(f => ({
        rawName: f.feature,
        name: getBankingLabel(f.feature),
        contribution: Number(f.contribution.toFixed(3)),
        direction: f.direction
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

        let status = 'Methodology Divergence';
        let statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200';

        if ((shapVal > 0.001 && limeVal > 0.001) || (shapVal < -0.001 && limeVal < -0.001)) {
            status = shapVal > 0 ? 'Consensus: Favorable' : 'Consensus: Adverse Risk';
            statusBadgeClass = shapVal > 0 ? 'bg-green-50 text-green-800 border-green-300' : 'bg-red-50 text-red-800 border-red-300';
        } else if (Math.abs(shapVal) < 0.001 || Math.abs(limeVal) < 0.001) {
            status = 'Marginal Influence';
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

    // Financial surplus calculations
    const monthlyIncome = result.solvencyCheck ? result.solvencyCheck.totalIncome : 0;
    const monthlyEMI = result.solvencyCheck ? result.solvencyCheck.monthlyEMI : 0;
    const netSurplus = monthlyIncome - monthlyEMI;
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
                            Official Credit Appraisal Dossier & A4 Memorandum
                        </h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border uppercase tracking-wider ${
                            isApproved ? 'bg-green-50 text-green-800 border-green-300' : 'bg-red-50 text-red-800 border-red-300'
                        }`}>
                            {isApproved ? 'Sanction Advice' : 'Adverse Notice'}
                        </span>
                    </div>
                    <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                        Commercial bank memorandum with institutional letterhead, statutory debt-service compliance, and credit officer signature block.
                    </p>
                </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
                <span className="text-[11px] text-gray-500 font-medium">
                    Standard A4 Format • Verified for branch submission and customer copy
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
                                Download Official PDF
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">

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
                        Bank Underwriting & Risk Audit Console
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
                        Applicant Sanction & Adverse Action Notice
                    </button>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* VIEW 1: BANK UNDERWRITING & REGULATORY RISK AUDIT CONSOLE                 */}
            {/* ========================================================================= */}
            {roleView === 'bank_official' && (
                <div className="space-y-6">
                    
                    {/* Primary Underwriting Determination Banner */}
                    <div className={`p-5 border border-gray-300 shadow-sm rounded-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${isApproved ? 'bg-green-50' : 'bg-red-50'}`}>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold px-2 py-0.5 bg-white border border-gray-300 text-gray-700 rounded-sm uppercase tracking-wider">
                                    Dossier Ref #TF-2026-891
                                </span>
                                <span className="text-xs text-gray-500">Underwriting Determination</span>
                            </div>
                            <h2 className="text-base font-bold text-gray-900 uppercase tracking-tight mt-1">
                                Credit Underwriting Determination
                            </h2>
                            <p className="text-xs text-gray-700 mt-0.5">
                                Algorithmic Risk Appraisal (Statistical Confidence: {(result.confidenceScore * 100).toFixed(1)}%)
                            </p>
                        </div>
                        <div className={`px-5 py-2 text-xl font-extrabold uppercase rounded-sm border ${isApproved ? 'border-green-700' : 'border-red-700'} ${statusColor} tracking-wide text-center`}>
                            {determinationText}
                        </div>
                    </div>

                    {/* Dedicated Official Bank PDF Report Card */}
                    {renderPdfReportCard()}

                    {/* Statutory Solvency & Debt-Service Compliance Gate (FOIR / DTI) */}
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
                                        Statutory Solvency & Debt-Service Compliance Gate (FOIR / DTI)
                                    </h3>
                                    <p className="text-xs text-gray-600">Prudential lending guidelines: Fixed Obligation to Income Ratio capped at 50.0%</p>
                                </div>
                                <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-sm border ${
                                    result.solvencyCheck.status === 'INSOLVENT' 
                                        ? 'bg-red-700 text-white border-red-800'
                                        : result.solvencyCheck.status === 'MODERATE'
                                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                                        : 'bg-green-100 text-green-900 border-green-300'
                                }`}>
                                    {result.solvencyCheck.status === 'INSOLVENT' ? 'STATUTORY BREACH: INSOLVENT (FOIR EXCEEDED)' : result.solvencyCheck.status === 'MODERATE' ? 'ACCEPTABLE DEBT SERVICE (35-50%)' : 'PRUDENTIAL CLEARANCE: OPTIMAL (FOIR < 35%)'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-1">
                                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-sm">
                                    <p className="text-[11px] font-semibold text-gray-500 uppercase">Monthly Debt Service (EMI)</p>
                                    <p className="text-base font-bold text-gray-900 font-mono">₹{result.solvencyCheck.monthlyEMI.toLocaleString('en-IN')}</p>
                                </div>
                                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-sm">
                                    <p className="text-[11px] font-semibold text-gray-500 uppercase">Total Household Net Income</p>
                                    <p className="text-base font-bold text-gray-900 font-mono">₹{result.solvencyCheck.totalIncome.toLocaleString('en-IN')}</p>
                                </div>
                                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-sm">
                                    <p className="text-[11px] font-semibold text-gray-500 uppercase">Fixed Obligation (FOIR)</p>
                                    <p className={`text-base font-bold font-mono ${result.solvencyCheck.isSolvent ? 'text-green-700' : 'text-red-700'}`}>
                                        {result.solvencyCheck.dtiPercent}
                                    </p>
                                </div>
                                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-sm">
                                    <p className="text-[11px] font-semibold text-gray-500 uppercase">Net Monthly Cash Surplus</p>
                                    <p className={`text-base font-bold font-mono ${netSurplus >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                        ₹{netSurplus.toLocaleString('en-IN')}
                                    </p>
                                </div>
                            </div>

                            {result.solvencyCheck.overrideWarning && (
                                <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-sm text-xs text-red-900 flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                                    <div>
                                        <strong className="font-bold">Statutory Credit Policy Violation:</strong> {result.solvencyCheck.overrideWarning}
                                        <span className="block text-[11px] text-red-800 mt-1 font-medium">
                                            Institutional Mandate: Facility disbursement is legally prohibited under credit risk policy regardless of pure statistical score.
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Decision Explainability & Model Governance Audit Index */}
                    <div className="bg-white p-6 border border-gray-300 shadow-sm rounded-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-300 pb-3 mb-4 gap-2">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase">
                                    <ShieldCheck className="w-5 h-5 text-gov-blue" />
                                    Decision Explainability & Model Governance Audit Index
                                </h3>
                                <p className="text-xs text-gray-600">Independent mathematical validation of algorithmic credit decision drivers</p>
                            </div>
                            <div className={`px-3 py-1 text-xs font-bold uppercase rounded-sm border flex items-center gap-1.5 ${trustLevel.color}`}>
                                <span className={`w-2 h-2 rounded-full ${trustLevel.badgeColor}`}></span>
                                {trustLevel.label}
                            </div>
                        </div>
                        
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <div className="flex-1 w-full">
                                <div className="flex justify-between text-sm text-gray-800 mb-1.5 font-semibold">
                                    <span>Composite Audit Index (4 Co-Equal Pillars: 25% each)</span>
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

                        {/* 4 Component Breakdown Cards (Equal Weighting: 25% each) */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm text-center">
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Fidelity</p>
                                <p className="text-xl font-bold text-gray-900 mt-0.5 font-mono">{(result.trustScore.faithfulness * 100).toFixed(1)}%</p>
                                <p className="text-[11px] text-gray-500 mt-1">Weight: 25% • Counterfactual Feature Masking</p>
                            </div>
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm text-center">
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Robustness</p>
                                <p className="text-xl font-bold text-gray-900 mt-0.5 font-mono">{(result.trustScore.stability * 100).toFixed(1)}%</p>
                                <p className="text-[11px] text-gray-500 mt-1">Weight: 25% • 1% Financial Noise Invariance</p>
                            </div>
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm text-center">
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Consensus</p>
                                <p className="text-xl font-bold text-gray-900 mt-0.5 font-mono">{(result.trustScore.consistency * 100).toFixed(1)}%</p>
                                <p className="text-[11px] text-gray-500 mt-1">Weight: 25% • SHAP/LIME Inter-Auditor Jaccard</p>
                            </div>
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm text-center">
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Parity</p>
                                <p className="text-xl font-bold text-gray-900 mt-0.5 font-mono">{((result.trustScore.fairness ?? 1.0) * 100).toFixed(1)}%</p>
                                <p className="text-[11px] text-gray-500 mt-1">Weight: 25% • Counterfactual Demographic Invariance</p>
                            </div>
                        </div>

                        {/* Formula Transparency Drawer */}
                        <div className="mt-4 pt-3 border-t border-gray-200">
                            <button 
                                onClick={() => setShowFormula(!showFormula)}
                                className="text-xs font-semibold text-gov-blue hover:underline flex items-center gap-1 focus:outline-none cursor-pointer"
                            >
                                <Info className="w-3.5 h-3.5" />
                                {showFormula ? 'Hide Model Governance Weighting Rationale & Regulatory Basis' : 'View Model Governance Weighting Rationale & Regulatory Basis'}
                                {showFormula ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                            {showFormula && (
                                <div className="mt-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-sm text-xs text-gray-700 space-y-2">
                                    <p className="font-bold text-gray-900 font-sans uppercase tracking-wider">Institutional Model Governance Weighting Formula:</p>
                                    <p className="bg-white p-2 border border-gray-300 rounded-sm font-mono text-gray-900">
                                        <strong>Trust Audit Index (T)</strong> = (0.25 × Fidelity) + (0.25 × Robustness) + (0.25 × Consensus) + (0.25 × Parity)
                                    </p>
                                    <div className="text-gray-600 space-y-1 pt-1">
                                        <p>• <strong>Fidelity (25%)</strong>: Verifies that identified risk drivers genuinely govern model behavior via counterfactual feature ablation.</p>
                                        <p>• <strong>Robustness (25%)</strong>: Computes rank correlation of credit drivers under 1% Gaussian input variation to guarantee stability.</p>
                                        <p>• <strong>Consensus (25%)</strong>: Computes Jaccard driver agreement between independent attribution paradigms (Shapley Values vs. Local Surrogates).</p>
                                        <p>• <strong>Parity (25%)</strong>: Measures counterfactual invariance across protected demographic classes to enforce non-discriminatory lending.</p>
                                        <p className="text-[11px] text-gray-500 italic pt-1 border-t border-gray-200">
                                            * Academic & Policy Proof for Equal Weighting (EW): Supported by Dawes (1979, American Psychologist) and the OECD Handbook on Constructing Composite Indicators (2008), confirming that equal weighting prevents statistical overfitting and eliminates subjective researcher bias.
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
                                <h3 className="text-sm font-bold text-gray-900 uppercase">Underwriting Scorecard Drivers (Local Attribution)</h3>
                                <p className="text-xs text-gray-600">Empirical risk and eligibility factors derived via dual independent audit algorithms</p>
                            </div>
                            {/* Explainer Tab Switcher */}
                            <div className="flex border border-gray-300 rounded-sm overflow-hidden text-xs font-semibold">
                                <button
                                    onClick={() => setActiveExplainerTab('shap')}
                                    className={`px-3 py-1.5 transition-colors cursor-pointer ${activeExplainerTab === 'shap' ? 'bg-gov-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    Ensemble TreeSHAP (Game Theory)
                                </button>
                                <button
                                    onClick={() => setActiveExplainerTab('lime')}
                                    className={`px-3 py-1.5 transition-colors cursor-pointer ${activeExplainerTab === 'lime' ? 'bg-gov-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    Independent LIME (Surrogate)
                                </button>
                            </div>
                        </div>

                        <p className="text-xs text-gray-600 mb-3">
                            {activeExplainerTab === 'shap' ? (
                                <span><strong>Ensemble TreeSHAP (Shapley Additive Explanations)</strong>: Computes mathematically exact marginal contributions across all decision trees.</span>
                            ) : (
                                <span><strong>Independent LIME (Local Interpretable Model-agnostic Explanations)</strong>: Fits a localized linear surrogate model around the applicant's profile.</span>
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
                                        formatter={(val) => [Number(val).toFixed(4), 'Attribution Weight']}
                                        contentStyle={{ borderRadius: '2px', border: '1px solid #d1d5db', fontSize: '12px' }} 
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
                                <span className="w-3 h-3 bg-green-600 inline-block rounded-xs"></span> Favorable Factor (Enhances Credit Eligibility)
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 bg-red-600 inline-block rounded-xs"></span> Adverse Factor (Increases Default Risk / Penalty)
                            </span>
                        </div>
                    </div>

                    {/* Cross-Auditor Concordance Matrix (SHAP vs. LIME) */}
                    <div className="bg-white p-6 border border-gray-300 shadow-sm rounded-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-300 pb-3 mb-4 gap-2">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 uppercase">Cross-Auditor Concordance Matrix (SHAP vs. LIME)</h3>
                                <p className="text-xs text-gray-600">Cross-validating underwriting factors to eliminate single-explainer methodology bias</p>
                            </div>
                            <div className="flex gap-2">
                                <span className="px-2.5 py-1 text-xs bg-slate-100 border border-slate-300 text-slate-800 font-semibold rounded-sm">
                                    Directional Consensus: <strong>{directionalConcordance}%</strong>
                                </span>
                                <span className="px-2.5 py-1 text-xs bg-slate-100 border border-slate-300 text-slate-800 font-semibold rounded-sm">
                                    Top-3 Driver Overlap: <strong>{(result.trustScore.consistency * 100).toFixed(0)}%</strong>
                                </span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 border-b border-gray-300 text-gray-800 uppercase tracking-wider font-semibold">
                                        <th className="py-2.5 px-3">Underwriting Parameter</th>
                                        <th className="py-2.5 px-3 text-right">SHAP Impact (Log-Odds)</th>
                                        <th className="py-2.5 px-3 text-right">LIME Local Weight</th>
                                        <th className="py-2.5 px-3 text-center">Auditor Alignment Status</th>
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
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-sm border ${row.statusBadgeClass}`}>
                                                    {row.isAgreement ? (
                                                        <CheckCircle className="w-3 h-3 text-green-700" />
                                                    ) : (
                                                        <AlertTriangle className="w-3 h-3 text-amber-700" />
                                                    )}
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
                                <strong>Institutional Audit Standard:</strong> Concordance between independent attribution methodologies confirms that highlighted credit drivers are robust empirical factors rather than algorithmic artifacts of a single explainer framework.
                            </span>
                        </div>
                    </div>

                </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW 2: APPLICANT SANCTION & ADVERSE ACTION NOTICE                        */}
            {/* ========================================================================= */}
            {roleView === 'applicant' && (
                <div className="space-y-6">

                    {/* Official Bank Memorandum Letterhead */}
                    <div className="bg-white border border-gray-300 shadow-sm rounded-sm p-6">
                        
                        <div className="border-b-2 border-gray-300 pb-4 mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div>
                                <span className="text-[11px] uppercase tracking-widest text-gov-blue font-bold">
                                    TrustFin National Retail Banking Division
                                </span>
                                <h2 className="text-xl font-extrabold text-gray-900 mt-1 uppercase tracking-tight">
                                    {isApproved ? 'Provisional Facility Sanction Advice' : 'Notice of Adverse Credit Determination'}
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Statutory Credit Appraisal Communication • Generated on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-mono font-bold bg-gray-100 border border-gray-300 px-2 py-1 rounded-sm text-gray-700">
                                    Ref: TF-SANCT-849201
                                </span>
                                <button
                                    type="button"
                                    onClick={handleOpenPdfPreview}
                                    className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-sm text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                    title="Preview Official Document"
                                >
                                    <Eye className="w-3.5 h-3.5 text-gov-blue" />
                                    Preview
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDownloadPdf}
                                    disabled={downloadingPdf}
                                    className="px-3 py-1 bg-gov-blue hover:bg-blue-900 text-white border border-blue-900 rounded-sm text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                                    title="Download Official PDF Memorandum"
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
                                <CheckCircle className="w-6 h-6 text-green-700 shrink-0 mt-0.5" />
                            ) : (
                                <AlertCircle className="w-6 h-6 text-red-700 shrink-0 mt-0.5" />
                            )}
                            <div>
                                <h3 className="font-bold text-sm uppercase tracking-wide">
                                    {isApproved ? 'Application Provisionally Approved' : 'Application Ineligible Under Current Parameters'}
                                </h3>
                                <p className="text-xs mt-1 leading-relaxed">
                                    {isApproved 
                                        ? 'We are pleased to inform you that your retail credit facility has successfully cleared our credit underwriting and solvency criteria. Below is the summary of your facility terms and cashflow commitments.' 
                                        : 'Thank you for your application. Following our credit assessment and debt-servicing evaluation, we regret to inform you that we are unable to sanction your credit facility under the requested terms at this time.'}
                                </p>
                            </div>
                        </div>

                        {/* Financial Capacity & Affordability Breakdown */}
                        <div className="mb-6">
                            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <Wallet className="w-4 h-4 text-gov-blue" />
                                Household Monthly Cashflow & Debt Servicing Capacity
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
                                    <span className="text-[11px] text-gray-500 uppercase font-semibold">Total Verified Income</span>
                                    <p className="text-lg font-bold text-gray-900 font-mono mt-1">₹{monthlyIncome.toLocaleString('en-IN')}</p>
                                    <span className="text-[10px] text-gray-500">Applicant + Co-Borrower</span>
                                </div>
                                <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
                                    <span className="text-[11px] text-gray-500 uppercase font-semibold">Estimated Monthly Installment (EMI)</span>
                                    <p className="text-lg font-bold text-gray-900 font-mono mt-1">₹{monthlyEMI.toLocaleString('en-IN')}</p>
                                    <span className="text-[10px] text-gray-500">Proposed monthly repayment</span>
                                </div>
                                <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
                                    <span className="text-[11px] text-gray-500 uppercase font-semibold">Debt-to-Income (FOIR) Burden</span>
                                    <p className={`text-lg font-bold font-mono mt-1 ${dtiRatioVal <= 50 ? 'text-green-700' : 'text-red-700'}`}>
                                        {dtiRatioVal.toFixed(1)}%
                                    </p>
                                    <span className="text-[10px] text-gray-500">Regulatory limit: 50.0% max</span>
                                </div>
                            </div>

                            {/* Visual Affordability Bar */}
                            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-sm">
                                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                                    <span>EMI Share of Income: {dtiRatioVal.toFixed(1)}%</span>
                                    <span>Statutory Cap: 50.0%</span>
                                </div>
                                <div className="w-full bg-gray-200 h-3 rounded-xs relative overflow-hidden">
                                    <div 
                                        className={`h-full transition-all ${dtiRatioVal <= 35 ? 'bg-green-600' : dtiRatioVal <= 50 ? 'bg-amber-500' : 'bg-red-600'}`} 
                                        style={{ width: `${Math.min(100, dtiRatioVal)}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                                    <span>Safe (0% - 35%)</span>
                                    <span>Manageable (35% - 50%)</span>
                                    <span className="font-bold text-red-600">Insolvent (&gt; 50%)</span>
                                </div>
                            </div>
                        </div>

                        {/* Specific Determination Breakdown */}
                        {isApproved ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-green-50 border border-green-200 rounded-sm">
                                    <h4 className="text-xs font-bold text-green-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Check className="w-4 h-4 text-green-700" />
                                        Key Eligibility Strengths Identified
                                    </h4>
                                    <ul className="text-xs text-green-800 space-y-1.5">
                                        <li className="flex items-start gap-1.5">
                                            <span className="text-green-600 font-bold">•</span>
                                            <span><strong>Affordable Debt Servicing:</strong> Your monthly EMI of ₹{monthlyEMI.toLocaleString('en-IN')} leaves a comfortable surplus of ₹{netSurplus.toLocaleString('en-IN')} each month.</span>
                                        </li>
                                        <li className="flex items-start gap-1.5">
                                            <span className="text-green-600 font-bold">•</span>
                                            <span><strong>Satisfactory Credit History:</strong> Clean credit bureau record demonstrating consistent past debt servicing.</span>
                                        </li>
                                        <li className="flex items-start gap-1.5">
                                            <span className="text-green-600 font-bold">•</span>
                                            <span><strong>Stable Household Cashflow:</strong> Steady income base sufficient to absorb potential financial volatility.</span>
                                        </li>
                                    </ul>
                                </div>

                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-sm">
                                    <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">
                                        Next Steps for Facility Disbursement
                                    </h4>
                                    <ol className="text-xs text-blue-800 list-decimal list-inside space-y-1 mt-2">
                                        <li>Submit self-attested copies of primary income statements (last 6 months bank statements).</li>
                                        <li>Complete biometric or video KYC verification at your nearest designated branch.</li>
                                        <li>Execute electronic loan agreement and auto-debit (NACH / e-Mandate) instructions.</li>
                                    </ol>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                
                                {/* Adverse Action Reasons */}
                                <div className="p-4 bg-red-50 border border-red-200 rounded-sm">
                                    <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <X className="w-4 h-4 text-red-700" />
                                        Primary Reasons for Adverse Credit Determination
                                    </h4>
                                    <p className="text-[11px] text-gray-600 mb-2">
                                        Pursuant to statutory Fair Lending Regulations, the following factors contributed materially to this decision:
                                    </p>
                                    <ul className="text-xs text-red-800 space-y-2">
                                        {dtiRatioVal > 50 && (
                                            <li className="flex items-start gap-1.5">
                                                <span className="text-red-600 font-bold">1.</span>
                                                <span>
                                                    <strong>Excessive Debt Burden (FOIR Exceeded):</strong> Your proposed monthly installment of ₹{monthlyEMI.toLocaleString('en-IN')} represents {dtiRatioVal.toFixed(1)}% of your verified income. Banking regulations restrict monthly debt commitments to a maximum of 50.0% to protect borrowers from insolvency.
                                                </span>
                                            </li>
                                        )}
                                        {shapSorted.some(f => f.feature === 'Credit_History' && f.contribution < 0) && (
                                            <li className="flex items-start gap-1.5">
                                                <span className="text-red-600 font-bold">2.</span>
                                                <span>
                                                    <strong>Adverse Credit Bureau History:</strong> Credit information reports indicate prior delinquencies, default records, or an inadequate credit score.
                                                </span>
                                            </li>
                                        )}
                                        {shapSorted.some(f => f.feature === 'Applicant_Income' && f.contribution < 0) && (
                                            <li className="flex items-start gap-1.5">
                                                <span className="text-red-600 font-bold">3.</span>
                                                <span>
                                                    <strong>Income-to-Loan Disproportion:</strong> The requested loan principal is disproportionately large relative to your primary net monthly earnings.
                                                </span>
                                            </li>
                                        )}
                                    </ul>
                                </div>

                                {/* Actionable Remediation Guidance */}
                                <div className="p-4 bg-slate-50 border border-slate-300 rounded-sm">
                                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <ArrowRight className="w-4 h-4 text-gov-blue" />
                                        Actionable Steps to Improve Credit Eligibility for Reapplication
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mt-3">
                                        <div className="p-2.5 bg-white border border-gray-200 rounded-sm">
                                            <strong className="text-gray-900 block mb-1">🕒 Increase Repayment Tenor:</strong>
                                            <p className="text-gray-600 text-[11px]">
                                                Selecting a longer repayment horizon (e.g. 120 to 240 months) substantially reduces your monthly EMI, bringing your FOIR under 50%.
                                            </p>
                                        </div>
                                        <div className="p-2.5 bg-white border border-gray-200 rounded-sm">
                                            <strong className="text-gray-900 block mb-1">👥 Add an Earning Co-Borrower:</strong>
                                            <p className="text-gray-600 text-[11px]">
                                                Including a spouse or family member with verified monthly salary increases total household income and expands repayment capacity.
                                            </p>
                                        </div>
                                        <div className="p-2.5 bg-white border border-gray-200 rounded-sm">
                                            <strong className="text-gray-900 block mb-1">📉 Reduce Requested Principal:</strong>
                                            <p className="text-gray-600 text-[11px]">
                                                Applying for a lower facility principal lowers your monthly obligation and fits comfortably within your disposable surplus.
                                            </p>
                                        </div>
                                        <div className="p-2.5 bg-white border border-gray-200 rounded-sm">
                                            <strong className="text-gray-900 block mb-1">💳 Rebuild Credit Bureau Score:</strong>
                                            <p className="text-gray-600 text-[11px]">
                                                Regularize past due balances and maintain prompt on-time payments across all existing credit lines for at least 6 consecutive months.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        )}

                        <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center text-[11px] text-gray-500">
                            <span>TrustFin Automated Lending & Governance Platform</span>
                            <span>Equal Credit Opportunity & Fair Practice Code Compliant</span>
                        </div>

                    </div>

                </div>
            )}

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
                                        Official Bank Document Preview • TrustFin National Bank
                                    </h3>
                                    <p className="text-[10px] text-blue-200">
                                        {isApproved ? 'Provisional Loan Sanction Advice (Form-SANCT-A4)' : 'Adverse Status & Advisory Notice (Form-ADV-A4)'}
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
                                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Generating Official Document...</h4>
                                    <p className="text-[11px] text-gray-500 mt-1 max-w-xs">
                                        Compiling institutional letterhead, solvency calculations, and digital underwriting seal...
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
                                    title="Bank Document PDF Preview"
                                />
                            ) : null}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-4 py-2 bg-gray-100 border-t border-gray-300 flex items-center justify-between text-[11px] text-gray-600">
                            <span>Standard A4 Single-Page Formal Bank Memorandum</span>
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
