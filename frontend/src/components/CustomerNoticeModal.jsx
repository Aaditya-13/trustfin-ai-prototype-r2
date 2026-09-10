import React from 'react';
import { X, User, CheckCircle, AlertCircle, Wallet, FileText } from 'lucide-react';

const CustomerNoticeModal = ({ isOpen, onClose, result, applicantData, onOpenPdfPreview }) => {
    if (!isOpen || !result) return null;

    const isApproved = result.prediction === 'Approved';
    const monthlyIncome = result.solvencyCheck?.totalIncome || 0;
    const monthlyEMI = result.solvencyCheck?.monthlyEMI || 0;
    const dtiRatioVal = result.solvencyCheck ? (result.solvencyCheck.dtiRatio * 100) : 0;
    const netSurplus = monthlyIncome - monthlyEMI;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-3xl rounded-sm shadow-xl flex flex-col overflow-hidden border border-gray-400 my-8">
                
                {/* Modal Top Bar */}
                <div className="px-5 py-3.5 bg-gov-blue text-white flex items-center justify-between border-b border-blue-900">
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-yellow-400" />
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider">
                                Customer Notice Preview (What Applicant Sees)
                            </h3>
                            <p className="text-[10px] text-blue-200">
                                Exact document & guidance presented to the borrower in their applicant portal
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-white hover:bg-blue-800 rounded-sm cursor-pointer"
                        title="Close Preview"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Modal Body: The Exact Applicant Notice */}
                <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                    
                    {/* Official Letterhead Header */}
                    <div className="border-b-2 border-gray-300 pb-3 flex justify-between items-start">
                        <div>
                            <span className="text-[10px] uppercase font-bold text-gov-blue tracking-widest">
                                TrustFin Retail Banking Division
                            </span>
                            <h2 className="text-lg font-bold text-gray-900 mt-0.5 uppercase">
                                {isApproved ? 'Loan Sanction Advice Letter' : 'Credit Decision & Advisory Notice'}
                            </h2>
                            <p className="text-[11px] text-gray-500">
                                Applicant Reference: #TF-2026-891 • Issued on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border uppercase ${
                            isApproved ? 'bg-green-50 text-green-800 border-green-300' : 'bg-red-50 text-red-800 border-red-300'
                        }`}>
                            {isApproved ? 'Approved' : 'Declined'}
                        </span>
                    </div>

                    {/* Notice Banner */}
                    <div className={`p-4 rounded-sm border flex items-start gap-3 ${
                        isApproved ? 'bg-green-50 border-green-300 text-green-900' : 'bg-red-50 border-red-300 text-red-900'
                    }`}>
                        {isApproved ? (
                            <CheckCircle className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
                        )}
                        <div>
                            <h4 className="font-bold text-xs uppercase tracking-wide">
                                {isApproved ? 'Application Approved' : 'Application Not Approved'}
                            </h4>
                            <p className="text-xs mt-0.5 leading-relaxed">
                                {isApproved 
                                    ? 'We are pleased to inform you that your residential mortgage application has been approved based on your income, credit history, and debt-to-income limits.' 
                                    : 'Thank you for your application. Based on statutory solvency limits and credit risk criteria, we are unable to approve the requested terms at this time.'}
                            </p>
                        </div>
                    </div>

                    {/* Financial Terms Breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
                            <span className="text-[10px] font-semibold text-gray-500 uppercase">Monthly Household Income</span>
                            <p className="text-base font-bold text-gray-900 font-mono mt-0.5">₹{monthlyIncome.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
                            <span className="text-[10px] font-semibold text-gray-500 uppercase">Monthly EMI Obligation</span>
                            <p className="text-base font-bold text-gray-900 font-mono mt-0.5">₹{monthlyEMI.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
                            <span className="text-[10px] font-semibold text-gray-500 uppercase">Debt-to-Income (DTI)</span>
                            <p className={`text-base font-bold font-mono mt-0.5 ${dtiRatioVal <= 50 ? 'text-green-700' : 'text-red-700'}`}>
                                {dtiRatioVal.toFixed(1)}%
                            </p>
                            <span className="text-[10px] text-gray-400">Limit: 50%</span>
                        </div>
                    </div>

                    {/* Notice Bottom Note */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm text-xs text-gray-600">
                        <span className="font-bold text-gray-800">Borrower Recourse Availability:</span>
                        <p className="text-[11px] mt-0.5">
                            {isApproved 
                                ? 'The borrower can proceed to download their official Sanction Letter or complete KYC verification.' 
                                : 'In the applicant portal, the borrower has access to the Interactive "What-If" Recourse Simulator to simulate term adjustments and re-qualify.'}
                        </p>
                    </div>

                </div>

                {/* Modal Footer */}
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-300 flex justify-between items-center">
                    <button
                        type="button"
                        onClick={onOpenPdfPreview}
                        className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gov-blue text-xs font-bold border border-gray-300 rounded-sm flex items-center gap-1.5 cursor-pointer"
                    >
                        <FileText className="w-3.5 h-3.5" />
                        Preview Official PDF
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 bg-gov-blue hover:bg-blue-900 text-white text-xs font-bold uppercase tracking-wider rounded-sm cursor-pointer"
                    >
                        Close Preview
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CustomerNoticeModal;
