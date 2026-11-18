import React from 'react';
import { Building2, User, ShieldCheck, Scale, Sliders, FileText, ArrowRight, CheckCircle, Zap } from 'lucide-react';

const LandingPage = ({ onSelectPortal }) => {
  return (
    <div className="space-y-10 py-6 max-w-6xl mx-auto">

        {/* Hero Section */}
      <div className="text-center space-y-3 px-4 pt-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
          TrustFin AI
        </h1>
        <p className="text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Review loan predictions, understand the contributing factors, and check explanation quality and monthly affordability.
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
                Officer Workspace
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 group-hover:text-gov-blue transition-colors">
                Bank Officer Portal
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                For bank officers reviewing loan applications and model explanations
              </p>
            </div>

            <ul className="space-y-2 text-xs text-gray-700 pt-2 border-t border-gray-200">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                <span><strong>Decision Guidance:</strong> Review the model prediction alongside project policy and affordability checks.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                <span><strong>SHAP and LIME:</strong> Compare the factors highlighted by both explanation methods.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                <span><strong>Four Validation Checks:</strong> Faithfulness, stability and consistency form the Trust Score. Gender sensitivity is shown separately.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                <span><strong>Affordability Check:</strong> Compare existing and proposed EMIs with the project limit of 50% of monthly income.</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 mt-4">
            <button
              type="button"
              onClick={() => onSelectPortal('bank_officer')}
              className="w-full py-3 px-4 bg-gov-blue hover:bg-blue-900 text-white text-xs font-bold uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <span>Open Officer Workspace</span>
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
                Applicant Workspace
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 group-hover:text-gov-blue transition-colors">
                Applicant Portal
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                For applicants viewing a loan assessment and its reasons
              </p>
            </div>

            <ul className="space-y-2 text-xs text-gray-700 pt-2 border-t border-gray-200">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                <span><strong>Loan Assessment:</strong> View the model prediction based on the submitted details.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                <span><strong>Clear Decision Reasons:</strong> See which submitted details contributed to the model prediction.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                <span><strong>"What-If" Loan Calculator:</strong> See how changes to loan details affect estimated monthly repayments.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                <span><strong>Assessment Report:</strong> Preview or download a PDF summary of the assessment.</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 mt-4">
            <button
              type="button"
              onClick={() => onSelectPortal('applicant')}
              className="w-full py-3 px-4 bg-yellow-500 hover:bg-yellow-600 text-blue-950 text-xs font-bold uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <span>Start Loan Assessment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Core Architectural Pillars Feature Strip */}
      <div className="px-4">
        <div className="bg-white border border-gray-300 rounded-sm p-6 shadow-sm">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 text-center">
            Key Capabilities of TrustFin AI
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
              <Scale className="w-5 h-5 text-gov-blue mx-auto mb-1.5" />
              <h4 className="text-xs font-bold text-gray-900 uppercase">Monthly Affordability</h4>
              <p className="text-[11px] text-gray-600 mt-1">
                Compare total monthly EMIs with the project income limit.
              </p>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
              <Zap className="w-5 h-5 text-gov-blue mx-auto mb-1.5" />
              <h4 className="text-xs font-bold text-gray-900 uppercase">SHAP and LIME Comparison</h4>
              <p className="text-[11px] text-gray-600 mt-1">
                Check whether the methods highlight similar factors and directions.
              </p>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
              <ShieldCheck className="w-5 h-5 text-gov-blue mx-auto mb-1.5" />
              <h4 className="text-xs font-bold text-gray-900 uppercase">Four Validation Checks</h4>
              <p className="text-[11px] text-gray-600 mt-1">
                Three explanation scores form the total; Gender sensitivity is a separate check.
              </p>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
              <Sliders className="w-5 h-5 text-gov-blue mx-auto mb-1.5" />
              <h4 className="text-xs font-bold text-gray-900 uppercase">What-If Loan Calculator</h4>
              <p className="text-[11px] text-gray-600 mt-1">
                Estimate how revised loan details affect EMI and monthly debt.
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default LandingPage;
