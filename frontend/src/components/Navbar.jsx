import React from 'react';
import { Landmark, Building2, User, Home, ArrowLeft } from 'lucide-react';

const Navbar = ({ currentScreen, userRole, onNavigateHome, onNavigateBack, selectedLoanType }) => {
    return (
        <header className="bg-gov-blue text-white p-3.5 shadow-sm border-b-4 border-yellow-500 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
                
                {/* Brand & Crest */}
                <div 
                    onClick={onNavigateHome}
                    className="flex items-center gap-3 cursor-pointer group select-none"
                    title="Return to TrustFin Home"
                >
                    <div className="p-2 bg-blue-900 border border-blue-400 rounded-sm text-yellow-400 shrink-0 group-hover:bg-blue-800 transition-colors">
                        <Landmark className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-bold tracking-tight">TrustFin AI</h1>
                            <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 bg-blue-900 border border-blue-400 text-yellow-300 rounded-xs">
                                Credit Intelligence
                            </span>
                        </div>
                        <p className="text-[11px] uppercase tracking-wider text-blue-200">
                            Explainable Loan Decisions & Trust Evaluation System
                        </p>
                    </div>
                </div>

                {/* Right Side: Role Badge & Quick Navigation */}
                <div className="flex items-center gap-2">
                    {userRole && currentScreen !== 'LANDING' && (
                        <div className="flex items-center gap-2">
                            {/* Role Badge */}
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-blue-900 border border-blue-400 text-white rounded-sm uppercase tracking-wider">
                                {userRole === 'bank_officer' ? (
                                    <>
                                        <Building2 className="w-3.5 h-3.5 text-yellow-400" />
                                        <span>Bank Officer Portal</span>
                                    </>
                                ) : (
                                    <>
                                        <User className="w-3.5 h-3.5 text-yellow-400" />
                                        <span>Applicant Portal</span>
                                    </>
                                )}
                            </span>

                            {/* Return / Back Button */}
                            <button
                                type="button"
                                onClick={onNavigateHome}
                                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white border border-blue-400 rounded-sm text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                title="Switch Portal or Return to Landing Page"
                            >
                                <Home className="w-3.5 h-3.5" />
                                <span className="hidden md:inline">Exit to Home</span>
                            </button>
                        </div>
                    )}

                    {currentScreen === 'LANDING' && (
                        <div className="text-[11px] font-semibold border border-blue-400 px-3 py-1 bg-blue-900 text-blue-100 rounded-sm tracking-wider uppercase hidden sm:block">
                            Retail Loan Evaluation Portal
                        </div>
                    )}
                </div>

            </div>
        </header>
    );
};

export default Navbar;
