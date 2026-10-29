import React from 'react';
import { Home, CreditCard, ArrowRight, ArrowLeft } from 'lucide-react';

const LoanTypeSelection = ({ userRole, onSelectLoan, onBack }) => {
    const isOfficer = userRole === 'bank_officer';

    return (
        <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
            
            {/* Top Navigation & Breadcrumbs */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <button
                    type="button"
                    onClick={onBack}
                    className="text-xs font-semibold text-gray-600 hover:text-gov-blue flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Portal Selection
                </button>
                <span className="text-xs text-gray-500 font-medium">
                    Step 1 of 3 • Select Loan Category
                </span>
            </div>

            {/* Page Header */}
            <div className="text-center space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gov-blue">
                    {isOfficer ? 'Loan Evaluation System' : 'Retail Loan Services'}
                </span>
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                    Select Loan Type
                </h2>
                <p className="text-xs text-gray-600 max-w-xl mx-auto">
                    {isOfficer 
                        ? 'Select the loan type to proceed with evaluation.'
                        : 'Choose the type of loan you wish to apply for today.'}
                </p>
            </div>

            {/* Loan Categories Grid (2 Columns: Active Home Loan & Coming Soon Vehicle Loan) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                
                {/* Product 1: Residential Home Loan (ACTIVE) */}
                <div 
                    onClick={() => onSelectLoan('home_loan')}
                    className="bg-white border-2 border-gov-blue rounded-sm p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 bg-gov-blue text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-sm uppercase tracking-wider">
                        Active & Deployed
                    </div>

                    <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-50 border border-blue-200 text-gov-blue rounded-sm group-hover:bg-gov-blue group-hover:text-white transition-colors">
                                <Home className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900 group-hover:text-gov-blue transition-colors">
                                    Residential Home Loan
                                </h3>
                                <span className="text-[11px] text-gray-500 font-mono">
                                    Pipeline: XGBoost v1.2 • Repayment Safety Limit
                                </span>
                            </div>
                        </div>

                        <p className="text-xs text-gray-600 leading-relaxed">
                            Long-term residential mortgage credit with full property area classification, co-borrower pooling, and 50% Repayment Safety Check.
                        </p>

                        <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-gray-600 pt-1">
                            <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-xs">Tenor: 1 to 30 Years</span>
                            <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-xs">₹50K to ₹10L+</span>
                            <span className="px-2 py-0.5 bg-green-50 border border-green-200 text-green-800 rounded-xs">Dual-XAI Audited</span>
                        </div>
                    </div>

                    <div className="pt-5 border-t border-gray-100 mt-4 flex items-center justify-between">
                        <span className="text-xs font-bold text-gov-blue flex items-center gap-1 group-hover:underline">
                            Proceed to Application
                        </span>
                        <ArrowRight className="w-4 h-4 text-gov-blue group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>

                {/* Product 2: Personal & Retail Credit (ACTIVE) */}
                <div 
                    onClick={() => onSelectLoan('personal_loan')}
                    className="bg-white border-2 border-gov-blue rounded-sm p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 bg-gov-blue text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-sm uppercase tracking-wider">
                        Active & Deployed
                    </div>

                    <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-50 border border-blue-200 text-gov-blue rounded-sm group-hover:bg-gov-blue group-hover:text-white transition-colors">
                                <CreditCard className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900 group-hover:text-gov-blue transition-colors">
                                    Personal & Retail Credit
                                </h3>
                                <span className="text-[11px] text-gray-500 font-mono">
                                    Pipeline: XGBoost v2.0 • Unsecured FOIR Limit
                                </span>
                            </div>
                        </div>

                        <p className="text-xs text-gray-600 leading-relaxed">
                            Unsecured instant retail credit with purpose risk weighting, credit card utilization monitoring, and cash flow solvency guardrails.
                        </p>

                        <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-gray-600 pt-1">
                            <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-xs">Tenor: 6 to 60 Months</span>
                            <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-xs">₹30K to ₹10L</span>
                            <span className="px-2 py-0.5 bg-green-50 border border-green-200 text-green-800 rounded-xs">CIBIL 300–900</span>
                        </div>
                    </div>

                    <div className="pt-5 border-t border-gray-100 mt-4 flex items-center justify-between">
                        <span className="text-xs font-bold text-gov-blue flex items-center gap-1 group-hover:underline">
                            Proceed to Application
                        </span>
                        <ArrowRight className="w-4 h-4 text-gov-blue group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>

            </div>

        </div>
    );
};

export default LoanTypeSelection;
