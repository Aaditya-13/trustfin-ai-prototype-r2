import React from 'react';
import { Building2, User, ShieldCheck, Scale, Sliders, FileText, ArrowRight, CheckCircle, Lock, Zap } from 'lucide-react';

const LandingPage = ({ onSelectPortal }) => {
  return (
    <div className="space-y-10 py-6 max-w-6xl mx-auto">

      {/* Hero Section */}
      <div className="text-center space-y-3 px-4 pt-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
          TrustFin AI Credit Intelligence System
        </h1>
        <p className="text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
          A dual-stakeholder framework that combines Machine Learning with mathematical explanation validation and deterministic solvency guardrails for transparent retail credit.
        </p>
      </div>

      {/* Dual Portal Selection Cards (The 2 Main Doors) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">

        {/* Portal 1: Bank Officer Underwriting Console */}
        <div className="bg-white border-2 border-gray-300 hover:border-gov-blue rounded-sm p-6 sm:p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-sm text-gov-blue group-hover:bg-gov-blue group-hover:text-white transition-colors">
                <Building2 className="w-7 h-7" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 bg-blue-100 text-blue-900 rounded-sm">
                Internal Banking Console
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 group-hover:text-gov-blue transition-colors">
                Bank Officer Portal
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                For Credit Underwriters, Branch Risk Officers & Model Auditors
              </p>
            </div>

            <ul className="space-y-2 text-xs text-gray-700 pt-2 border-t border-gray-200">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                <span><strong>Decision Guidance:</strong> Recommended for Sanction, Officer Review, or Decline based on model confidence and explanation trust.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                <span><strong>Dual-XAI Consensus:</strong> Side-by-side SHAP & LIME Concordance Check.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                <span><strong>4-Pillar Trust Score:</strong> Mathematical validation across Faithfulness, Stability, Consistency & Fairness.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                <span><strong>50% Repayment Safety Guardrail:</strong> Monthly EMI capped at 50% of income for borrower affordability.</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 mt-4">
            <button
              type="button"
              onClick={() => onSelectPortal('bank_officer')}
              className="w-full py-3 px-4 bg-gov-blue hover:bg-blue-900 text-white text-xs font-bold uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <span>Access Bank Officer Console</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Portal 2: Applicant Loan Application Portal */}
        <div className="bg-white border-2 border-gray-300 hover:border-gov-blue rounded-sm p-6 sm:p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-sm text-yellow-700 group-hover:bg-yellow-600 group-hover:text-white transition-colors">
                <User className="w-7 h-7" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 bg-yellow-100 text-yellow-900 rounded-sm">
                Consumer Portal
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 group-hover:text-gov-blue transition-colors">
                Applicant Portal
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                For Retail Loan Applicants & Individual Borrowers
              </p>
            </div>

            <ul className="space-y-2 text-xs text-gray-700 pt-2 border-t border-gray-200">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                <span><strong>Instant Credit Eligibility:</strong> Transparent assessment based on income and loan terms.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                <span><strong>Clear Adverse Reasons:</strong> Understand exact financial factors if a loan is declined.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                <span><strong>"What-If" Recourse Simulator:</strong> Interactive sliders showing how term adjustments qualify you.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                <span><strong>Official Bank Documents:</strong> Download formal Sanction Letter or Advisory Notice PDF.</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 mt-4">
            <button
              type="button"
              onClick={() => onSelectPortal('applicant')}
              className="w-full py-3 px-4 bg-yellow-500 hover:bg-yellow-600 text-blue-950 text-xs font-bold uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <span>Apply for Loan Facility</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Core Architectural Pillars Feature Strip */}
      <div className="px-4">
        <div className="bg-white border border-gray-300 rounded-sm p-6 shadow-sm">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 text-center">
            Key Architectural Capabilities of TrustFin AI
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
              <Scale className="w-5 h-5 text-gov-blue mx-auto mb-1.5" />
              <h4 className="text-xs font-bold text-gray-900 uppercase">50% Solvency Guardrail</h4>
              <p className="text-[11px] text-gray-600 mt-1">
                Pre-ML statutory barrier capping monthly EMI to 50% of income.
              </p>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
              <Zap className="w-5 h-5 text-gov-blue mx-auto mb-1.5" />
              <h4 className="text-xs font-bold text-gray-900 uppercase">Dual-XAI Consensus</h4>
              <p className="text-[11px] text-gray-600 mt-1">
                Cross-audits SHAP and LIME to eliminate single-explainer bias.
              </p>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
              <ShieldCheck className="w-5 h-5 text-gov-blue mx-auto mb-1.5" />
              <h4 className="text-xs font-bold text-gray-900 uppercase">4-Pillar Trust Score</h4>
              <p className="text-[11px] text-gray-600 mt-1">
                Mathematical verification: Faithfulness, Stability, Consistency, Fairness.
              </p>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
              <Sliders className="w-5 h-5 text-gov-blue mx-auto mb-1.5" />
              <h4 className="text-xs font-bold text-gray-900 uppercase">Actionable Recourse</h4>
              <p className="text-[11px] text-gray-600 mt-1">
                Counterfactual "What-If" simulator turning denials into approvals.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Regulatory & Institutional Compliance Badges */}
      <div className="text-center text-xs text-gray-500 space-y-1 px-4">
        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-semibold text-gray-600">
          <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5 text-gray-400" /> SR 11-7 Model Risk Management</span>
          <span>•</span>
          <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-gray-400" /> RBI Fair Lending Practice Code</span>
          <span>•</span>
          <span className="flex items-center gap-1"><Scale className="w-3.5 h-3.5 text-gray-400" /> ECOA Adverse Action Compliance</span>
        </div>
        <p className="text-[10px] text-gray-400 pt-1">
          Academic Research Prototype • Built for Automated Credit Transparency & Algorithmic Auditability
        </p>
      </div>

    </div>
  );
};

export default LandingPage;
