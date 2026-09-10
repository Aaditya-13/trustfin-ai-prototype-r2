import React from 'react';
import { Home, Car, CreditCard, Briefcase, ArrowRight, ArrowLeft, CheckCircle, Clock, Lock } from 'lucide-react';

const LoanTypeSelection = ({ userRole, onSelectLoan, onBack }) => {
    const isOfficer = userRole === 'bank_officer';

    return (
        <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
            
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
                    {isOfficer ? 'Underwriting Origination Engine' : 'Retail Borrowing Services'}
                </span>
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                    Select Credit Facility Category
                </h2>
                <p className="text-xs text-gray-600 max-w-xl mx-auto">
                    {isOfficer 
                        ? 'Select the underwriting model pipeline corresponding to the applicant\'s credit facility.'
                        : 'Choose the type of retail credit you wish to apply for today.'}
                </p>
            </div>

            {/* Loan Categories Grid */}
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
                                    Pipeline: XGBoost v1.2 • DTI Guardrail
                                </span>
                            </div>
                        </div>

                        <p className="text-xs text-gray-600 leading-relaxed">
                            Long-term residential mortgage credit with full property area classification, co-borrower pooling, and deterministic 50% Solvency Guardrail.
                        </p>

                        <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-gray-600 pt-1">
                            <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-xs">Tenor: 1 to 30 Years</span>
                            <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-xs">₹50K to ₹10L+</span>
                            <span className="px-2 py-0.5 bg-green-50 border border-green-200 text-green-800 rounded-xs">Dual-XAI Audited</span>
                        </div>
                    </div>

                    <div className="pt-5 border-t border-gray-100 mt-4 flex items-center justify-between">
                        <span className="text-xs font-bold text-gov-blue flex items-center gap-1 group-hover:underline">
                            {isOfficer ? 'Launch Mortgage Underwriting' : 'Continue Application'}
                        </span>
                        <ArrowRight className="w-4 h-4 text-gov-blue group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>

                {/* Product 2: Auto / Vehicle Loan (COMING SOON) */}
                <div className="bg-gray-50 border border-gray-300 rounded-sm p-6 opacity-75 relative flex flex-col justify-between">
                    <div className="absolute top-0 right-0 bg-gray-200 text-gray-700 text-[10px] font-bold px-3 py-0.5 rounded-bl-sm uppercase tracking-wider">
                        Coming Soon (Q3)
                    </div>

                    <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gray-100 border border-gray-300 text-gray-400 rounded-sm">
                                <Car className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-600">
                                    Auto & Vehicle Financing
                                </h3>
                                <span className="text-[11px] text-gray-400 font-mono">
                                    Pipeline: LightGBM • In Training
                                </span>
                            </div>
                        </div>

                        <p className="text-xs text-gray-500 leading-relaxed">
                            Secured asset loans for personal and commercial vehicles with automated residual valuation and credit bureau risk grading.
                        </p>
                    </div>

                    <div className="pt-4 border-t border-gray-200 mt-4 flex items-center gap-1.5 text-xs text-gray-400">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Model training and hyperparameter tuning in progress.</span>
                    </div>
                </div>

                {/* Product 3: Personal Credit Line (COMING SOON) */}
                <div className="bg-gray-50 border border-gray-300 rounded-sm p-6 opacity-75 relative flex flex-col justify-between">
                    <div className="absolute top-0 right-0 bg-gray-200 text-gray-700 text-[10px] font-bold px-3 py-0.5 rounded-bl-sm uppercase tracking-wider">
                        Coming Soon (Q4)
                    </div>

                    <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gray-100 border border-gray-300 text-gray-400 rounded-sm">
                                <CreditCard className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-600">
                                    Personal Credit Line
                                </h3>
                                <span className="text-[11px] text-gray-400 font-mono">
                                    Pipeline: Neural Tabular • Experimental
                                </span>
                            </div>
                        </div>

                        <p className="text-xs text-gray-500 leading-relaxed">
                            Unsecured micro-credit and revolving personal facilities evaluated with alternative cashflow and repayment regularity metrics.
                        </p>
                    </div>

                    <div className="pt-4 border-t border-gray-200 mt-4 flex items-center gap-1.5 text-xs text-gray-400">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Scheduled for Phase 2 integration.</span>
                    </div>
                </div>

                {/* Product 4: SME Working Capital (COMING SOON) */}
                <div className="bg-gray-50 border border-gray-300 rounded-sm p-6 opacity-75 relative flex flex-col justify-between">
                    <div className="absolute top-0 right-0 bg-gray-200 text-gray-700 text-[10px] font-bold px-3 py-0.5 rounded-bl-sm uppercase tracking-wider">
                        Planned 2027
                    </div>

                    <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gray-100 border border-gray-300 text-gray-400 rounded-sm">
                                <Briefcase className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-600">
                                    SME Working Capital Facility
                                </h3>
                                <span className="text-[11px] text-gray-400 font-mono">
                                    Enterprise Model • Pipeline
                                </span>
                            </div>
                        </div>

                        <p className="text-xs text-gray-500 leading-relaxed">
                            Corporate credit lines for small-and-medium enterprises incorporating GST invoice validation and balance sheet ratios.
                        </p>
                    </div>

                    <div className="pt-4 border-t border-gray-200 mt-4 flex items-center gap-1.5 text-xs text-gray-400">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Planned enterprise extension.</span>
                    </div>
                </div>

            </div>

        </div>
    );
};

export default LoanTypeSelection;
