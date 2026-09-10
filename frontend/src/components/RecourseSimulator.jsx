import React, { useState, useEffect } from 'react';
import { Sliders, RefreshCw, CheckCircle, AlertTriangle, AlertCircle, ArrowRight, TrendingDown, Clock, Wallet, DollarSign } from 'lucide-react';

const RecourseSimulator = ({ applicantData, result }) => {
    // Base financial figures from original evaluation
    const initialAmount = Number(applicantData?.Loan_Amount || 0);
    const initialTerm = Number(applicantData?.Loan_Term || 1);
    const primaryIncome = Number(applicantData?.Applicant_Income || 0);
    const initialCoapplicantIncome = Number(applicantData?.Coapplicant_Income || 0);

    const originalEMI = result?.solvencyCheck?.monthlyEMI || (initialAmount / Math.max(1, initialTerm));
    const originalDTI = result?.solvencyCheck?.dtiRatio ? (result.solvencyCheck.dtiRatio * 100) : 0;

    // Interactive Slider States
    const [revisedAmount, setRevisedAmount] = useState(initialAmount);
    const [revisedTerm, setRevisedTerm] = useState(initialTerm);
    const [revisedCoapplicantIncome, setRevisedCoapplicantIncome] = useState(initialCoapplicantIncome);

    // Reset sliders when applicant changes
    useEffect(() => {
        setRevisedAmount(initialAmount);
        setRevisedTerm(initialTerm);
        setRevisedCoapplicantIncome(initialCoapplicantIncome);
    }, [applicantData, result]);

    // Live calculations
    const termSafe = Math.max(1, revisedTerm);
    const revisedMonthlyEMI = Math.round(revisedAmount / termSafe);
    const revisedTotalIncome = primaryIncome + Number(revisedCoapplicantIncome);
    const incomeSafe = Math.max(1, revisedTotalIncome);
    const revisedDTIRatio = (revisedMonthlyEMI / incomeSafe) * 100;
    const revisedSurplus = revisedTotalIncome - revisedMonthlyEMI;

    // Deltas (compared to original)
    const emiDelta = originalEMI - revisedMonthlyEMI;
    const dtiDelta = originalDTI - revisedDTIRatio;

    // Solvency status tiering
    let statusConfig = {
        label: 'ELIGIBLE UNDER REVISED TERMS',
        sublabel: 'Debt-to-Income ratio is well within the 35% safe lending limit.',
        badgeClass: 'bg-green-100 text-green-900 border-green-300',
        barColor: 'bg-green-600',
        icon: <CheckCircle className="w-4 h-4 text-green-700 shrink-0" />,
        boxClass: 'bg-green-50 border-green-200'
    };

    if (revisedDTIRatio > 50) {
        statusConfig = {
            label: 'STILL INELIGIBLE: EXCEEDS 50% SAFETY LIMIT',
            sublabel: 'Monthly EMI represents over 50% of income. Adjust sliders further to reduce debt burden.',
            badgeClass: 'bg-red-100 text-red-900 border-red-300',
            barColor: 'bg-red-600',
            icon: <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />,
            boxClass: 'bg-red-50 border-red-200'
        };
    } else if (revisedDTIRatio > 35) {
        statusConfig = {
            label: 'BORDERLINE ELIGIBLE: MODERATE DEBT',
            sublabel: 'Repayment is between 35% and 50% of income. Acceptable with verified income stability.',
            badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
            barColor: 'bg-amber-500',
            icon: <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />,
            boxClass: 'bg-amber-50 border-amber-200'
        };
    }

    // Quick One-Click Presets
    const handlePresetTenure = () => {
        setRevisedTerm(240); // 20 years
    };

    const handlePresetAmount = () => {
        setRevisedAmount(Math.round(initialAmount * 0.75)); // Reduce by 25%
    };

    const handlePresetCoapplicant = () => {
        setRevisedCoapplicantIncome(initialCoapplicantIncome + 20000);
    };

    const handleReset = () => {
        setRevisedAmount(initialAmount);
        setRevisedTerm(initialTerm);
        setRevisedCoapplicantIncome(initialCoapplicantIncome);
    };

    // Calculate maximum limits for sliders
    const maxAmountSlider = Math.max(500000, initialAmount * 1.5);

    return (
        <div className="bg-white border border-gray-300 rounded-sm shadow-sm overflow-hidden mt-6">
            
            {/* Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-gray-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-100 border border-blue-200 text-gov-blue rounded-sm">
                        <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                            Interactive "What-If" Eligibility Sandbox
                        </h3>
                        <p className="text-xs text-gray-600 mt-0.5">
                            Adjust financial levers below to simulate how loan term modifications can restore approval eligibility.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleReset}
                    className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-sm border border-gray-300 flex items-center gap-1 cursor-pointer transition-colors"
                    title="Reset to Original Values"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reset
                </button>
            </div>

            <div className="p-5 space-y-6">

                {/* Quick Fast-Track Preset Buttons */}
                <div>
                    <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-2">
                        Quick Fast-Track Options (One-Click Simulations):
                    </span>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={handlePresetTenure}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-gov-blue border border-blue-200 rounded-sm text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                            <Clock className="w-3.5 h-3.5" />
                            Extend Term to 20 Years (240 Mo)
                        </button>
                        <button
                            type="button"
                            onClick={handlePresetAmount}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-gov-blue border border-blue-200 rounded-sm text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                            <TrendingDown className="w-3.5 h-3.5" />
                            Reduce Loan Amount by 25%
                        </button>
                        <button
                            type="button"
                            onClick={handlePresetCoapplicant}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-gov-blue border border-blue-200 rounded-sm text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                            <Wallet className="w-3.5 h-3.5" />
                            Add Co-Borrower (+₹20,000/mo)
                        </button>
                    </div>
                </div>

                {/* Interactive Sliders Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-4 bg-gray-50 border border-gray-200 rounded-sm">
                    
                    {/* Slider 1: Loan Amount */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-gray-800 uppercase">Requested Loan</span>
                            <span className="font-mono font-bold text-gov-blue text-sm">
                                ₹{Number(revisedAmount).toLocaleString('en-IN')}
                            </span>
                        </div>
                        <input
                            type="range"
                            min={50000}
                            max={maxAmountSlider}
                            step={10000}
                            value={revisedAmount}
                            onChange={(e) => setRevisedAmount(Number(e.target.value))}
                            className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-gov-blue"
                        />
                        <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                            <span>₹50,000</span>
                            <span>₹{Number(maxAmountSlider).toLocaleString('en-IN')}</span>
                        </div>
                    </div>

                    {/* Slider 2: Loan Term */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-gray-800 uppercase">Repayment Duration</span>
                            <span className="font-mono font-bold text-gov-blue text-sm">
                                {revisedTerm} Mo ({(revisedTerm / 12).toFixed(1)} Yrs)
                            </span>
                        </div>
                        <input
                            type="range"
                            min={12}
                            max={360}
                            step={12}
                            value={revisedTerm}
                            onChange={(e) => setRevisedTerm(Number(e.target.value))}
                            className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-gov-blue"
                        />
                        <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                            <span>12 Months (1 Yr)</span>
                            <span>360 Months (30 Yrs)</span>
                        </div>
                    </div>

                    {/* Slider 3: Co-Applicant Income */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-gray-800 uppercase">Co-Applicant Income</span>
                            <span className="font-mono font-bold text-gov-blue text-sm">
                                ₹{Number(revisedCoapplicantIncome).toLocaleString('en-IN')}/mo
                            </span>
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={100000}
                            step={5000}
                            value={revisedCoapplicantIncome}
                            onChange={(e) => setRevisedCoapplicantIncome(Number(e.target.value))}
                            className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-gov-blue"
                        />
                        <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                            <span>₹0</span>
                            <span>₹1,00,000/mo</span>
                        </div>
                    </div>

                </div>

                {/* Real-time Recalculated Financial Health Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-white border border-gray-200 rounded-sm text-center">
                        <span className="text-[11px] font-semibold text-gray-500 uppercase">Revised Monthly EMI</span>
                        <p className="text-base font-bold text-gray-900 font-mono mt-1">
                            ₹{revisedMonthlyEMI.toLocaleString('en-IN')}
                        </p>
                        {emiDelta > 0 && (
                            <span className="text-[10px] font-semibold text-green-700">
                                Saves ₹{Math.round(emiDelta).toLocaleString('en-IN')}/mo
                            </span>
                        )}
                    </div>

                    <div className="p-3 bg-white border border-gray-200 rounded-sm text-center">
                        <span className="text-[11px] font-semibold text-gray-500 uppercase">Household Monthly Income</span>
                        <p className="text-base font-bold text-gray-900 font-mono mt-1">
                            ₹{revisedTotalIncome.toLocaleString('en-IN')}
                        </p>
                        <span className="text-[10px] text-gray-500">Applicant + Co-Borrower</span>
                    </div>

                    <div className="p-3 bg-white border border-gray-200 rounded-sm text-center">
                        <span className="text-[11px] font-semibold text-gray-500 uppercase">Revised Debt-to-Income</span>
                        <p className={`text-base font-bold font-mono mt-1 ${revisedDTIRatio <= 50 ? 'text-green-700' : 'text-red-700'}`}>
                            {revisedDTIRatio.toFixed(1)}%
                        </p>
                        {dtiDelta > 0 && (
                            <span className="text-[10px] font-semibold text-green-700">
                                Dropped by {dtiDelta.toFixed(1)}%
                            </span>
                        )}
                    </div>

                    <div className="p-3 bg-white border border-gray-200 rounded-sm text-center">
                        <span className="text-[11px] font-semibold text-gray-500 uppercase">Monthly Cash Surplus</span>
                        <p className={`text-base font-bold font-mono mt-1 ${revisedSurplus >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            ₹{revisedSurplus.toLocaleString('en-IN')}
                        </p>
                        <span className="text-[10px] text-gray-500">Remaining disposable cash</span>
                    </div>
                </div>

                {/* Dynamic Clearance Status Banner */}
                <div className={`p-4 border rounded-sm ${statusConfig.boxClass} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3`}>
                    <div className="flex items-start gap-2.5">
                        {statusConfig.icon}
                        <div>
                            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                                {statusConfig.label}
                            </h4>
                            <p className="text-xs text-gray-700 mt-0.5">
                                {statusConfig.sublabel}
                            </p>
                        </div>
                    </div>

                    <div className="w-full sm:w-48 shrink-0">
                        <div className="flex justify-between text-[11px] font-semibold text-gray-700 mb-1">
                            <span>Debt Share: {revisedDTIRatio.toFixed(1)}%</span>
                            <span>Limit: 50%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2.5 rounded-xs overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-300 ${statusConfig.barColor}`} 
                                style={{ width: `${Math.min(100, revisedDTIRatio)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

            </div>

        </div>
    );
};

export default RecourseSimulator;
