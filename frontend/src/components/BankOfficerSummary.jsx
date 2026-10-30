import React, { useState } from 'react';
import {
  ShieldCheck, AlertTriangle, ArrowRight,
  Download, Loader2, Eye, FileText, BarChart3,
  TrendingUp, TrendingDown, Wallet, RefreshCw, Sparkles
} from 'lucide-react';
import { getBankingLabel } from '../utils/bankingTerms';
import { getUnderwritingAction } from '../utils/decisionAdvisory';
import { downloadLoanReportPdf } from '../services/api';
import SubmittedApplicationFormModal from './SubmittedApplicationFormModal';

const BankOfficerSummary = ({
  result,
  applicantData,
  onNavigateToAudit,
  onOpenCustomerNoticeModal,
  onNewApplication
}) => {
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);

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
  if (trustPercent < 70) {
    trustLevel = {
      label: 'LOW TRUST: MANUAL REVIEW REQUIRED',
      color: 'text-red-800 bg-red-50 border-red-300',
      badgeColor: 'bg-red-700',
      desc: 'Explanation methods conflict or are unstable. A loan officer must review manually.'
    };
  } else if (trustPercent < 85) {
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

  // Financial calculations
  const monthlyIncome = result.solvencyCheck ? result.solvencyCheck.totalIncome : 0;
  const monthlyEMI = result.solvencyCheck ? result.solvencyCheck.monthlyEMI : 0;
  const existingEMI = result.solvencyCheck?.existingEMI ?? (Number(applicantData?.Existing_EMI) || 0);
  const totalObligation = result.solvencyCheck?.totalMonthlyObligation ?? (monthlyEMI + existingEMI);
  const netSurplus = result.solvencyCheck?.netDisposableIncome ?? (monthlyIncome - totalObligation);
  const dtiRatioVal = result.solvencyCheck ? (result.solvencyCheck.dtiRatio * 100) : 0;
  const dtiProgress = Math.max(0, Math.min(100, dtiRatioVal));

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
            <span className="text-xs font-bold px-2 py-1 bg-blue-50 text-gov-blue border border-blue-200 rounded-sm uppercase tracking-wider">
              Bank Officer Console
            </span>
            <span className="text-sm text-gray-600 font-mono">Application #{result?.dossierId || 'TF-2026-891'}</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mt-1 uppercase tracking-tight">
            Loan Credit Evaluation
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Applicant: {applicantData?.Employment_Status || 'Salaried'} <span className="mx-1 text-gray-400">|</span> Age {applicantData?.Age || '30'} <span className="mx-1 text-gray-400">|</span> Principal Requested: <strong className="font-semibold text-gray-900">&#8377;{(applicantData?.Loan_Amount || 0).toLocaleString('en-IN')}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={onOpenCustomerNoticeModal}
            className="flex-1 md:flex-none px-3.5 py-2.5 bg-white hover:bg-gray-100 text-gray-800 text-sm font-semibold rounded-sm border border-gray-300 flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
          >
            <Eye className="w-4 h-4 text-gov-blue" />
            Preview Customer View
          </button>

          <button
            type="button"
            onClick={() => setShowApplicationForm(true)}
            className="flex-1 md:flex-none px-3.5 py-2.5 bg-white hover:bg-gray-100 text-gray-800 text-sm font-semibold rounded-sm border border-gray-300 flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4 text-gov-blue" />
            View Application Form
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="flex-1 md:flex-none px-3.5 py-2.5 bg-gov-blue hover:bg-blue-900 text-white text-sm font-bold uppercase tracking-wide rounded-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 shadow-sm"
          >
            {downloadingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download Application PDF
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onNewApplication}
            className="px-3 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-sm border border-transparent hover:border-gray-300 transition-colors flex items-center gap-1 cursor-pointer"
            title="Start another evaluation"
          >
            <RefreshCw className="w-4 h-4" />
            <span>New Application</span>
          </button>
        </div>
      </div>

      {/* Primary Determination Hero Banner */}
      <div className={`p-5 border border-gray-300 shadow-sm rounded-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isApproved ? 'bg-green-50/80' : 'bg-red-50/80'}`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-1 bg-white border border-gray-300 text-gray-700 rounded-sm uppercase tracking-wider">
              Loan Decision Assessment
            </span>
            <span className="text-sm text-gray-600">Retail Credit Engine</span>
          </div>
          <h3 className="text-2xl font-extrabold text-gray-900 uppercase tracking-tight mt-2">
            {determinationText}
          </h3>
          <p className="text-base text-gray-700 mt-1">
            Model Confidence Score: <strong className="font-mono">{(result.confidenceScore * 100).toFixed(1)}%</strong>
          </p>
        </div>
        <div className={`px-5 py-2.5 text-xl sm:text-2xl font-extrabold uppercase rounded-sm border ${isApproved ? 'border-green-700' : 'border-red-700'} ${statusColor} tracking-wide text-center shrink-0`}>
          {determinationText}
        </div>
      </div>

      {/* Decision Recommendation & Explanation Check Card */}
      {underwritingAction && (
        <section className={`bg-white border border-gray-300 border-l-4 rounded-sm shadow-sm p-4 sm:p-5 ${underwritingAction.tier === 'HIGH_RISK' ? 'border-l-red-700' : underwritingAction.tier === 'OFFICER_REVIEW' ? 'border-l-amber-500' : 'border-l-gov-blue'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3 mb-4">
            <div className="flex items-center gap-3">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border ${underwritingAction.tier === 'HIGH_RISK' ? 'border-red-200 bg-red-50 text-red-700' : underwritingAction.tier === 'OFFICER_REVIEW' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-blue-200 bg-blue-50 text-gov-blue'}`}>
                {underwritingAction.tier === 'AUTO_APPROVE' ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </span>
              <div>
                <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">Decision Recommendation</h3>
                <p className="text-xs text-gray-600 mt-0.5">Officer guidance based on model and repayment checks</p>
              </div>
            </div>
            <span className={`w-fit px-2.5 py-1.5 text-xs font-extrabold uppercase tracking-wide rounded-sm border ${underwritingAction.badgeClass}`}>
              {underwritingAction.badgeText}
            </span>
          </div>

          <p className="text-base sm:text-lg font-bold leading-relaxed text-gray-950 mb-4">
            {underwritingAction.headline}
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-sm p-3.5 sm:p-4">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2.5">Key findings</p>
            <ul className="text-sm text-gray-800 space-y-2">
              {underwritingAction.reasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                  <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${underwritingAction.indicatorClass}`} aria-hidden="true" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-3 flex items-start gap-2.5 rounded-sm border border-blue-200 bg-blue-50/70 p-3.5 text-sm leading-relaxed">
            <ArrowRight className="w-4 h-4 shrink-0 mt-0.5 text-gov-blue" />
            <div>
              <strong className="text-gray-950 font-bold">Recommended officer action</strong>
              <p className="mt-0.5 text-gray-700">{underwritingAction.nextStep}</p>
            </div>
          </div>
        </section>
      )}

      {/* Income & Debt Repayment Capacity Card */}
      {result.solvencyCheck && (
        <div className={`border border-gray-300 border-l-4 bg-white p-5 shadow-sm rounded-sm ${result.solvencyCheck.isSolvent ? 'border-l-gov-blue' : 'border-l-red-700'}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className={`rounded-sm border p-2 ${result.solvencyCheck.isSolvent ? 'border-blue-200 bg-blue-50 text-gov-blue' : 'border-red-200 bg-red-50 text-red-700'}`}>
                  <Wallet className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Repayment Capacity</p>
                  <h3 className="mt-0.5 text-sm font-bold uppercase tracking-tight text-gray-900">Income & Debt Repayment Capacity Check</h3>
                  <p className="mt-1 text-xs text-gray-600">Combined monthly debt commitments are assessed against a 50% income ceiling.</p>
                </div>
              </div>
              <span className={`inline-flex w-fit items-center gap-2 rounded-sm border px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide ${result.solvencyCheck.status === 'INSOLVENT'
                  ? 'border-red-300 bg-red-50 text-red-800'
                  : result.solvencyCheck.status === 'MODERATE'
                    ? 'border-amber-300 bg-amber-50 text-amber-900'
                    : 'border-green-300 bg-green-50 text-green-900'
                }`}>
                <span className={`h-2 w-2 rounded-full ${result.solvencyCheck.status === 'INSOLVENT' ? 'bg-red-600' : result.solvencyCheck.status === 'MODERATE' ? 'bg-amber-500' : 'bg-green-700'}`} />
                {result.solvencyCheck.status === 'INSOLVENT' ? 'High repayment risk' : result.solvencyCheck.status === 'MODERATE' ? 'Review recommended' : 'Within healthy range'}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
              <div className="rounded-sm border border-gray-200 bg-gray-50 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-600">Monthly income</p>
                <p className="mt-1.5 text-lg font-bold text-gray-900">₹{Math.round(monthlyIncome).toLocaleString('en-IN')}</p>
                <p className="mt-1 text-[11px] text-gray-500">Verified household income</p>
              </div>
              <div className="rounded-sm border border-gray-200 bg-white p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-600">Proposed EMI</p>
                <p className="mt-1.5 text-lg font-bold text-gray-900">₹{Math.round(monthlyEMI).toLocaleString('en-IN')}</p>
                <p className="mt-1 text-[11px] text-gray-500">New facility</p>
              </div>
              <div className="rounded-sm border border-gray-200 bg-white p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-600">Existing EMIs</p>
                <p className="mt-1.5 text-lg font-bold text-gray-900">₹{Math.round(existingEMI).toLocaleString('en-IN')}</p>
                <p className="mt-1 text-[11px] text-gray-500">{existingEMI > 0 ? 'Current monthly debt' : 'No declared debt'}</p>
              </div>
              <div className="rounded-sm border border-blue-200 bg-blue-50/60 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-blue-900">Total monthly debt</p>
                <p className="mt-1.5 text-lg font-bold text-blue-950">₹{Math.round(totalObligation).toLocaleString('en-IN')}</p>
                <p className="mt-1 text-[11px] text-blue-800">Existing + proposed EMIs</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1.45fr_1fr]">
              <div className="rounded-sm border border-gray-300 bg-gray-50 p-4">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-700">Debt-to-income ratio (FOIR)</p>
                    <p className={`mt-1 text-3xl font-bold ${dtiRatioVal > 50 ? 'text-red-700' : dtiRatioVal > 35 ? 'text-amber-700' : 'text-green-800'}`}>
                      {result.solvencyCheck.dtiPercent}
                    </p>
                  </div>
                  <p className="pb-1 text-xs font-semibold text-gray-700">50% maximum</p>
                </div>
                <div className="mt-4">
                  <div className="relative h-3 border border-gray-300 bg-white">
                    <div className="absolute -top-px -bottom-px left-1/2 z-10 w-0.5 bg-gray-700" title="50% maximum" />
                    <div
                      className={`h-full transition-all ${dtiRatioVal > 50 ? 'bg-red-600' : dtiRatioVal > 35 ? 'bg-amber-500' : 'bg-green-700'}`}
                      style={{ width: `${dtiProgress}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[11px] font-medium text-gray-600">
                    <span>0%</span><span>50% limit</span><span>100%+</span>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-gray-700">
                  Combined monthly debt of ₹{Math.round(totalObligation).toLocaleString('en-IN')} against income of ₹{Math.round(monthlyIncome).toLocaleString('en-IN')}.
                </p>
              </div>

              <div className={`rounded-sm border p-4 ${netSurplus >= 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-700">Net monthly cashflow</p>
                <p className={`mt-2 text-2xl font-bold ${netSurplus >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                  {netSurplus >= 0 ? '+' : '-'}₹{Math.abs(Math.round(netSurplus)).toLocaleString('en-IN')}
                </p>
                <p className="mt-1 text-xs text-gray-700">
                  {netSurplus >= 0 ? 'Estimated income remaining after monthly debt' : 'Estimated monthly shortfall after debt'}
                </p>
                <div className={`mt-4 border-t pt-3 text-[11px] font-medium ${netSurplus >= 0 ? 'border-green-300 text-gray-700' : 'border-red-300 text-gray-700'}`}>
                  Income ₹{Math.round(monthlyIncome).toLocaleString('en-IN')} − Total debt ₹{Math.round(totalObligation).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {result.solvencyCheck.overrideWarning && (
              <div className={`mt-4 flex items-start gap-2.5 rounded-sm border p-3 text-xs ${result.solvencyCheck.status === 'MODERATE' ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-red-300 bg-red-50 text-red-950'}`}>
                <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${result.solvencyCheck.status === 'MODERATE' ? 'text-amber-700' : 'text-red-700'}`} />
                <div>
                  <strong className="font-bold">{result.solvencyCheck.status === 'MODERATE' ? 'Review recommended:' : 'Repayment limit exceeded:'}</strong>{' '}
                  {result.solvencyCheck.overrideWarning}
                </div>
              </div>
            )}
          </div>
      )}

      {/* Composite AI Trust Score Snapshot & Key Drivers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Composite Trust Score Snapshot */}
        <section className="bg-white p-5 sm:p-6 border border-gray-300 border-t-4 border-t-gov-blue shadow-sm rounded-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start gap-3 border-b border-gray-200 pb-4 mb-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-blue-200 bg-blue-50 text-gov-blue rounded-sm">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-gray-950 uppercase tracking-tight">AI Decision Trust Score</h3>
                  <p className="text-sm text-gray-600 mt-0.5">Reliability across four verification measures</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-sm border whitespace-nowrap ${trustLevel.color}`}>
                {trustPercent.toFixed(1)}% score
              </span>
            </div>

            <div className="rounded-sm border border-gray-200 bg-gray-50/80 p-4 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                <p className="text-4xl font-black leading-none tracking-tight text-gray-950 font-mono">
                  {trustPercent.toFixed(1)}<span className="text-2xl">%</span>
                </p>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-950">{trustLevel.label}</p>
                  <p className="text-sm text-gray-600 leading-relaxed mt-1">{trustLevel.desc}</p>
                </div>
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-sm border border-gray-300 bg-white" role="progressbar" aria-label="AI decision trust score" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(trustPercent)}>
                <div className={`h-full ${trustPercent < 70 ? 'bg-red-700' : trustPercent < 85 ? 'bg-amber-500' : 'bg-gov-blue'}`} style={{ width: `${trustPercent}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 bg-white border border-gray-200 rounded-sm">
                <span className="text-[11px] text-gray-600 uppercase font-bold tracking-wide block">Faithfulness</span>
                <strong className="mt-1 block text-lg font-mono text-gray-950">{(result.trustScore.faithfulness * 100).toFixed(1)}%</strong>
              </div>
              <div className="p-3 bg-white border border-gray-200 rounded-sm">
                <span className="text-[11px] text-gray-600 uppercase font-bold tracking-wide block">Stability</span>
                <strong className="mt-1 block text-lg font-mono text-gray-950">{(result.trustScore.stability * 100).toFixed(1)}%</strong>
              </div>
              <div className="p-3 bg-white border border-gray-200 rounded-sm">
                <span className="text-[11px] text-gray-600 uppercase font-bold tracking-wide block">Consistency</span>
                <strong className="mt-1 block text-lg font-mono text-gray-950">{(result.trustScore.consistency * 100).toFixed(1)}%</strong>
              </div>
              <div className="p-3 bg-white border border-gray-200 rounded-sm">
                <span className="text-[11px] text-gray-600 uppercase font-bold tracking-wide block">Fairness</span>
                <strong className="mt-1 block text-lg font-mono text-gray-950">{((result.trustScore.fairness ?? 1.0) * 100).toFixed(1)}%</strong>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 text-xs text-gray-600">
            <span className="leading-relaxed">Measure weights: Faithfulness 35% | Consistency 30% | Stability 25% | Fairness 10%</span>
            <button type="button" onClick={onNavigateToAudit} className="text-gov-blue hover:text-blue-900 hover:underline font-bold flex items-center gap-1 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gov-blue shrink-0">
              View verification framework <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* Right: Key Decision Drivers Snapshot */}
        <section className="bg-white p-5 sm:p-6 border border-gray-300 border-t-4 border-t-gov-blue shadow-sm rounded-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start gap-3 border-b border-gray-200 pb-4 mb-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-blue-200 bg-blue-50 text-gov-blue rounded-sm">
                  <BarChart3 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-gray-950 uppercase tracking-tight">Top Decision Drivers</h3>
                  <p className="text-sm text-gray-600 mt-0.5">Factors with the strongest influence on this decision</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-sm whitespace-nowrap">SHAP / Primary model</span>
            </div>

            <div className="space-y-4">
              <div className="rounded-sm border border-green-200 bg-green-50/40 p-3">
                <p className="text-xs font-bold text-green-900 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-700" /> Supports Approval
                </p>
                {topPositive.length > 0 ? (
                  <div className="space-y-1.5">
                    {topPositive.map((feat, idx) => (
                      <div key={idx} className="flex justify-between items-center gap-3 text-sm px-3 py-2 bg-white border border-green-200 rounded-sm">
                        <span className="font-medium text-gray-900">{getBankingLabel(feat.feature)}</span>
                        <span className="font-mono font-bold text-green-800 whitespace-nowrap">+{feat.contribution.toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-gray-600 italic">No significant positive factors identified.</p>}
              </div>

              <div className="rounded-sm border border-red-200 bg-red-50/40 p-3">
                <p className="text-xs font-bold text-red-900 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                  <TrendingDown className="w-4 h-4 text-red-700" /> Elevates Risk
                </p>
                {topNegative.length > 0 ? (
                  <div className="space-y-1.5">
                    {topNegative.map((feat, idx) => (
                      <div key={idx} className="flex justify-between items-center gap-3 text-sm px-3 py-2 bg-white border border-red-200 rounded-sm">
                        <span className="font-medium text-gray-900">{getBankingLabel(feat.feature)}</span>
                        <span className="font-mono font-bold text-red-800 whitespace-nowrap">{feat.contribution.toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-gray-600 italic">No significant risk factors identified.</p>}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-200 text-right">
            <button type="button" onClick={onNavigateToAudit} className="text-sm text-gov-blue hover:text-blue-900 hover:underline font-bold flex items-center gap-1 ml-auto cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gov-blue">
              Compare explanation models <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      </div>

      {/* In-Depth Explanation & Trust Audit CTA Banner */}
      <section className="bg-gradient-to-r from-blue-950 via-blue-900 to-gov-blue text-white p-5 sm:p-6 border border-blue-950 rounded-sm shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
        <div className="flex items-start gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-yellow-400 text-blue-950 rounded-sm">
            <Sparkles className="w-5 h-5" />
          </span>
          <div className="space-y-1.5">
            <h4 className="text-base sm:text-lg font-bold uppercase tracking-wide text-yellow-300">Inspect Detailed AI Reasoning & Explanations</h4>
            <p className="text-sm text-blue-100 max-w-3xl leading-relaxed">
              Review SHAP and LIME explanations, factor agreement, decision stability, and compliance measures.
            </p>
          </div>
        </div>
        <button type="button" onClick={onNavigateToAudit} className="w-full md:w-auto px-5 py-3 bg-yellow-400 hover:bg-yellow-300 text-blue-950 text-sm font-extrabold uppercase tracking-wide rounded-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300">
          <span>Open decision verification</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>

      <SubmittedApplicationFormModal
        isOpen={showApplicationForm}
        onClose={() => setShowApplicationForm(false)}
        applicantData={applicantData}
        applicationReference={result?.dossierId || 'TF-2026-891'}
      />

    </div>
  );
};

export default BankOfficerSummary;
