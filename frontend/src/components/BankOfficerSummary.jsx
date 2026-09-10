import React, { useState } from 'react';
import { 
    ShieldCheck, AlertTriangle, AlertCircle, CheckCircle, ArrowRight, 
    FileText, Download, Loader2, Eye, ChevronRight, BarChart3, 
    TrendingUp, TrendingDown, Wallet, RefreshCw, Sparkles
} from 'lucide-react';
import { getBankingLabel } from '../utils/bankingTerms';
import { getUnderwritingAction } from '../utils/decisionAdvisory';
import { downloadLoanReportPdf } from '../services/api';

const BankOfficerSummary = ({ 
    result, 
    applicantData, 
    onNavigateToAudit, 
    onOpenCustomerNoticeModal, 
    onNewApplication 
}) => {
    const [downloadingPdf, setDownloadingPdf] = useState(false);

    if (!result) return null;

    const isApproved = result.prediction === 'Approved';
    const statusColor = isApproved ? 'bg-gov-green text-white' : 'bg-gov-red text-white';
    const determinationText = isApproved ? 'ELIGIBLE FOR APPROVAL' : 'RECOMMENDED FOR REJECTION';
    const trustPercent = Math.max(0, Math.min(100, result.trustScore.overallTrustScore * 100));
    const underwritingAction = getUnderwritingAction(result, applicantData);

    // Trust Reliability Classification
    let trustLevel = {
        label: 'HIGH TRUST: RELIABLE EXPLANATION',
        color: 'text-green-800 bg-green-50 border-green-300',
        badgeColor: 'bg-green-700',
        desc: 'Both explanation methods strongly agree and the decision remains stable.'
    };
    if (trustPercent < 50) {
        trustLevel = {
            label: 'LOW TRUST: MANUAL REVIEW REQUIRED',
            color: 'text-red-800 bg-red-50 border-red-300',
            badgeColor: 'bg-red-700',
            desc: 'Explanation methods conflict or are unstable. A loan officer must review manually.'
        };
    } else if (trustPercent < 75) {
        trustLevel = {
            label: 'MODERATE TRUST: REVIEW RECOMMENDED',
            color: 'text-amber-800 bg-amber-50 border-amber-300',
            badgeColor: 'bg-amber-600',
            desc: 'Minor differences found between explanation methods; officer review suggested.'
        };
    }

    // Top SHAP features
    const shapSorted = [...result.shap.features].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
    const topPositive = shapSorted.filter(f => f.contribution > 0).slice(0, 3);
    const topNegative = shapSorted.filter(f => f.contribution < 0).slice(0, 3);

    // Financial surplus calculations
    const monthlyIncome = result.solvencyCheck ? result.solvencyCheck.totalIncome : 0;
    const monthlyEMI = result.solvencyCheck ? result.solvencyCheck.monthlyEMI : 0;
    const netSurplus = monthlyIncome - monthlyEMI;
    const dtiRatioVal = result.solvencyCheck ? (result.solvencyCheck.dtiRatio * 100) : 0;

    const handleDownloadPdf = async () => {
        if (!applicantData || !result) return;
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

    return (
        <div className="space-y-6">
            
            {/* Top Operational Action Bar */}
            <div className="bg-white border border-gray-300 p-4 rounded-sm shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-50 text-gov-blue border border-blue-200 rounded-sm uppercase tracking-wider">
                            Bank Officer Console
                        </span>
                        <span className="text-xs text-gray-500 font-mono">Dossier #TF-2026-891</span>
                    </div>
                    <h2 className="text-base font-bold text-gray-900 mt-1 uppercase tracking-tight">
                        Executive Underwriting Assessment
                    </h2>
                    <p className="text-xs text-gray-600">
                        Applicant: {applicantData?.Employment_Status || 'Salaried'} • Age {applicantData?.Age || '30'} • Principal Requested: ₹{(applicantData?.Loan_Amount || 0).toLocaleString('en-IN')}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <button
                        type="button"
                        onClick={onOpenCustomerNoticeModal}
                        className="flex-1 md:flex-none px-3.5 py-2 bg-white hover:bg-gray-100 text-gray-800 text-xs font-semibold rounded-sm border border-gray-300 flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                    >
                        <Eye className="w-3.5 h-3.5 text-gov-blue" />
                        Preview Customer View
                    </button>
                    
                    <button
                        type="button"
                        onClick={handleDownloadPdf}
                        disabled={downloadingPdf}
                        className="flex-1 md:flex-none px-3.5 py-2 bg-gov-blue hover:bg-blue-900 text-white text-xs font-bold uppercase tracking-wider rounded-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 shadow-xs"
                    >
                        {downloadingPdf ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Download className="w-3.5 h-3.5" />
                                Export Dossier PDF
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={onNewApplication}
                        className="px-3 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-sm border border-transparent hover:border-gray-300 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Start another evaluation"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">New Application</span>
                    </button>
                </div>
            </div>

            {/* Primary Determination Hero Banner */}
            <div className={`p-5 border border-gray-300 shadow-sm rounded-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isApproved ? 'bg-green-50/80' : 'bg-red-50/80'}`}>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 bg-white border border-gray-300 text-gray-700 rounded-sm uppercase tracking-wider">
                            Primary Model Assessment
                        </span>
                        <span className="text-xs text-gray-500">Retail Credit Engine</span>
                    </div>
                    <h3 className="text-2xl font-extrabold text-gray-900 uppercase tracking-tight mt-1.5">
                        {determinationText}
                    </h3>
                    <p className="text-sm text-gray-700 mt-0.5">
                        Model Confidence Score: <strong className="font-mono">{(result.confidenceScore * 100).toFixed(1)}%</strong>
                    </p>
                </div>
                <div className={`px-5 py-2 text-2xl font-extrabold uppercase rounded-sm border ${isApproved ? 'border-green-700' : 'border-red-700'} ${statusColor} tracking-wide text-center shrink-0`}>
                    {determinationText}
                </div>
            </div>

            {/* Decision Recommendation & Explanation Check Card */}
            {underwritingAction && (
                <div className={`p-4 border rounded-sm shadow-sm ${underwritingAction.cardBgClass}`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-200/80 pb-2.5 mb-3">
                        <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${underwritingAction.indicatorClass}`}></span>
                            <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                                Decision Recommendation
                            </span>
                        </div>
                        <span className={`px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider rounded-sm border ${underwritingAction.badgeClass}`}>
                            {underwritingAction.badgeText}
                        </span>
                    </div>

                    <div className="space-y-2.5">
                        <p className="text-sm font-extrabold text-gray-900">
                            {underwritingAction.headline}
                        </p>

                        <div className="bg-white/80 border border-gray-200 rounded-sm p-3">
                            <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                Key Findings from Explanation Checks:
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
                                <strong className="text-gray-900 font-bold">Recommended Action for Officer: </strong>
                                <span className="text-gray-700">{underwritingAction.nextStep}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Income & Debt Repayment Capacity Card */}
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
                                Income & Debt Repayment Capacity Check
                            </h3>
                            <p className="text-xs text-gray-600">Prudential Limit: Proposed monthly EMI must not exceed 50.0% of total income</p>
                        </div>
                        <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-sm border ${
                            result.solvencyCheck.status === 'INSOLVENT' 
                                ? 'bg-red-700 text-white border-red-800'
                                : result.solvencyCheck.status === 'MODERATE'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-green-100 text-green-900 border-green-300'
                        }`}>
                            {result.solvencyCheck.status === 'INSOLVENT' ? 'HIGH RISK: EMI EXCEEDS 50% LIMIT' : result.solvencyCheck.status === 'MODERATE' ? 'MODERATE RATIO (35% - 50%)' : 'HEALTHY RATIO (< 35%)'}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-3">
                        <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-sm">
                            <p className="text-[11px] font-semibold text-gray-500 uppercase">Monthly EMI</p>
                            <p className="text-base font-bold text-gray-900 font-mono">₹{result.solvencyCheck.monthlyEMI.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-sm">
                            <p className="text-[11px] font-semibold text-gray-500 uppercase">Total Monthly Income</p>
                            <p className="text-base font-bold text-gray-900 font-mono">₹{result.solvencyCheck.totalIncome.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-sm">
                            <p className="text-[11px] font-semibold text-gray-500 uppercase">Debt-to-Income (DTI)</p>
                            <p className={`text-base font-bold font-mono ${result.solvencyCheck.isSolvent ? 'text-green-700' : 'text-red-700'}`}>
                                {result.solvencyCheck.dtiPercent}
                            </p>
                        </div>
                        <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-sm">
                            <p className="text-[11px] font-semibold text-gray-500 uppercase">Net Monthly Balance</p>
                            <p className={`text-base font-bold font-mono ${netSurplus >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                ₹{netSurplus.toLocaleString('en-IN')}
                            </p>
                        </div>
                    </div>

                    {/* Visual Affordability Gauge */}
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
                        <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                            <span>EMI Burden: {dtiRatioVal.toFixed(1)}% of Net Income</span>
                            <span>Safe Limit: 50.0%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2.5 rounded-xs overflow-hidden">
                            <div 
                                className={`h-full transition-all ${dtiRatioVal <= 35 ? 'bg-green-600' : dtiRatioVal <= 50 ? 'bg-amber-500' : 'bg-red-600'}`} 
                                style={{ width: `${Math.min(100, dtiRatioVal)}%` }}
                            ></div>
                        </div>
                    </div>

                    {result.solvencyCheck.overrideWarning && (
                        <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-sm text-xs text-red-900 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                            <div>
                                <strong className="font-bold">Repayment Limit Exceeded:</strong> {result.solvencyCheck.overrideWarning}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Composite AI Trust Score Snapshot & Key Drivers Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Left: Composite Trust Score Snapshot */}
                <div className="bg-white p-5 border border-gray-300 shadow-sm rounded-sm flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start border-b border-gray-200 pb-3 mb-3">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 uppercase">
                                    <ShieldCheck className="w-4 h-4 text-gov-blue" />
                                    AI Decision Trust Score
                                </h3>
                                <p className="text-xs text-gray-500">4-Pillar Mathematical Reliability</p>
                            </div>
                            <span className={`px-2 py-0.5 text-[11px] font-bold uppercase rounded-sm border ${trustLevel.color}`}>
                                {trustPercent.toFixed(1)}%
                            </span>
                        </div>

                        <div className="flex items-center gap-4 mb-4">
                            <div className="text-3xl font-black text-gray-900 font-mono px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-sm">
                                {trustPercent.toFixed(1)}%
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-900">{trustLevel.label}</p>
                                <p className="text-[11px] text-gray-600 leading-snug mt-0.5">{trustLevel.desc}</p>
                            </div>
                        </div>

                        {/* 4 Pillars Mini-Pills */}
                        <div className="grid grid-cols-2 gap-2 text-center text-xs">
                            <div className="p-2 bg-gray-50 border border-gray-200 rounded-sm">
                                <span className="text-[10px] text-gray-500 uppercase font-semibold block">Faithfulness</span>
                                <strong className="font-mono text-gray-900">{(result.trustScore.faithfulness * 100).toFixed(1)}%</strong>
                            </div>
                            <div className="p-2 bg-gray-50 border border-gray-200 rounded-sm">
                                <span className="text-[10px] text-gray-500 uppercase font-semibold block">Stability</span>
                                <strong className="font-mono text-gray-900">{(result.trustScore.stability * 100).toFixed(1)}%</strong>
                            </div>
                            <div className="p-2 bg-gray-50 border border-gray-200 rounded-sm">
                                <span className="text-[10px] text-gray-500 uppercase font-semibold block">Consistency</span>
                                <strong className="font-mono text-gray-900">{(result.trustScore.consistency * 100).toFixed(1)}%</strong>
                            </div>
                            <div className="p-2 bg-gray-50 border border-gray-200 rounded-sm">
                                <span className="text-[10px] text-gray-500 uppercase font-semibold block">Fairness</span>
                                <strong className="font-mono text-gray-900">{((result.trustScore.fairness ?? 1.0) * 100).toFixed(1)}%</strong>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-[11px] text-gray-500">
                        <span>Equal Weighting: 25% each</span>
                        <button 
                            type="button"
                            onClick={onNavigateToAudit}
                            className="text-gov-blue hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                        >
                            View Mathematical Formulations →
                        </button>
                    </div>
                </div>

                {/* Right: Key Decision Drivers Snapshot */}
                <div className="bg-white p-5 border border-gray-300 shadow-sm rounded-sm flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start border-b border-gray-200 pb-3 mb-3">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 uppercase">
                                    <BarChart3 className="w-4 h-4 text-gov-blue" />
                                    Top Decision Drivers
                                </h3>
                                <p className="text-xs text-gray-500">Primary Local Attribution Factors</p>
                            </div>
                            <span className="text-[11px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-sm">
                                SHAP Summary
                            </span>
                        </div>

                        <div className="space-y-3">
                            {/* Positive Drivers */}
                            <div>
                                <p className="text-[11px] font-bold text-green-800 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                                    <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                                    Supports Approval
                                </p>
                                {topPositive.length > 0 ? (
                                    <div className="space-y-1">
                                        {topPositive.map((feat, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-xs p-1.5 bg-green-50/50 border border-green-200 rounded-sm">
                                                <span className="font-medium text-gray-800">{getBankingLabel(feat.feature)}</span>
                                                <span className="font-mono font-bold text-green-700">+{feat.contribution.toFixed(3)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-500 italic">No significant positive factors identified.</p>
                                )}
                            </div>

                            {/* Risk Drivers */}
                            <div>
                                <p className="text-[11px] font-bold text-red-800 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                                    <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                                    Elevates Risk
                                </p>
                                {topNegative.length > 0 ? (
                                    <div className="space-y-1">
                                        {topNegative.map((feat, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-xs p-1.5 bg-red-50/50 border border-red-200 rounded-sm">
                                                <span className="font-medium text-gray-800">{getBankingLabel(feat.feature)}</span>
                                                <span className="font-mono font-bold text-red-700">{feat.contribution.toFixed(3)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-500 italic">No significant risk factors identified.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 text-right">
                        <button 
                            type="button"
                            onClick={onNavigateToAudit}
                            className="text-xs text-gov-blue hover:underline font-semibold flex items-center gap-1 ml-auto cursor-pointer"
                        >
                            Compare SHAP vs. LIME Charts →
                        </button>
                    </div>
                </div>

            </div>

            {/* In-Depth Explanation & Trust Audit CTA Banner */}
            <div className="bg-gradient-to-r from-blue-900 to-gov-blue text-white p-5 rounded-sm shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="p-1 bg-yellow-400 text-gov-blue rounded-xs">
                            <Sparkles className="w-4 h-4" />
                        </span>
                        <h4 className="text-sm font-bold uppercase tracking-wider text-yellow-300">
                            Inspect Detailed AI Reasoning & Explanations
                        </h4>
                    </div>
                    <p className="text-xs text-blue-100 max-w-2xl leading-relaxed">
                        Examine full SHAP & LIME vertical bar charts, cross-explainer concordance agreement matrix, noise perturbation stability tests, and detailed multi-pillar mathematical formulas.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onNavigateToAudit}
                    className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-blue-950 text-xs font-extrabold uppercase tracking-wider rounded-sm flex items-center gap-2 cursor-pointer transition-colors shadow-md shrink-0"
                >
                    <span>Open Explanation Audit</span>
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>

        </div>
    );
};

export default BankOfficerSummary;
