import React, { useEffect, useState } from 'react';
import { Sliders, RefreshCw, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';

const formatCurrency = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`;

const calculateEmi = (principal, annualRate, months) => {
    const monthlyRate = annualRate / 12;
    const factor = (1 + monthlyRate) ** months;
    return Math.round(principal * (monthlyRate * factor) / (factor - 1));
};

const RecourseSimulator = ({ applicantData, result }) => {
    const isPersonalLoan = applicantData?.loan_type === 'personal_loan' || Boolean(applicantData?.Loan_Purpose);
    const minimumAmount = isPersonalLoan ? 30000 : 300000;
    const initialAmount = Math.max(minimumAmount, Number(applicantData?.Loan_Amount) || minimumAmount);
    const initialTerm = Math.max(1, Number(applicantData?.Loan_Term) || (isPersonalLoan ? 36 : 240));
    const applicantIncome = Math.max(1, Number(applicantData?.Applicant_Income) || 1);
    const coapplicantIncome = Number(applicantData?.Coapplicant_Income) || 0;
    const householdIncome = applicantIncome + coapplicantIncome;
    const initialExistingEmi = Number(applicantData?.Existing_EMI) || 0;
    const initialPropertyValue = Math.max(1, Number(applicantData?.Property_Value) || initialAmount / 0.75);
    const annualRate = isPersonalLoan ? 0.135 : 0.085;
    const incomeForFoir = isPersonalLoan ? applicantIncome : householdIncome;
    const initialEmi = calculateEmi(initialAmount, annualRate, initialTerm);
    const originalEmi = Number(result?.solvencyCheck?.monthlyEMI) || initialEmi;
    const originalFoir = Number(result?.solvencyCheck?.dtiRatio) || ((initialExistingEmi + initialEmi) / incomeForFoir);

    const [revisedAmount, setRevisedAmount] = useState(initialAmount);
    const [revisedTerm, setRevisedTerm] = useState(initialTerm);
    const [revisedPropertyValue, setRevisedPropertyValue] = useState(initialPropertyValue);
    const [revisedExistingEmi, setRevisedExistingEmi] = useState(initialExistingEmi);

    useEffect(() => {
        setRevisedAmount(initialAmount);
        setRevisedTerm(initialTerm);
        setRevisedPropertyValue(initialPropertyValue);
        setRevisedExistingEmi(initialExistingEmi);
    }, [applicantData, result, initialAmount, initialTerm, initialPropertyValue, initialExistingEmi]);

    const revisedMonthlyEmi = calculateEmi(revisedAmount, annualRate, revisedTerm);
    const totalObligation = revisedMonthlyEmi + (isPersonalLoan ? revisedExistingEmi : initialExistingEmi);
    const revisedFoir = (totalObligation / incomeForFoir) * 100;
    const monthlySurplus = incomeForFoir - totalObligation;
    const ltv = isPersonalLoan ? null : (revisedAmount / Math.max(1, revisedPropertyValue)) * 100;
    const emiDelta = originalEmi - revisedMonthlyEmi;
    const originalFoirPercent = originalFoir * 100;
    const dtiDelta = originalFoirPercent - revisedFoir;

    let statusConfig = {
        label: 'WITHIN THE 35% FOIR GUIDE',
        sublabel: 'The estimated monthly debt obligation is within the lower-risk affordability range.',
        barColor: 'bg-green-600',
        icon: <CheckCircle className="w-4 h-4 text-green-700 shrink-0" />,
        boxClass: 'bg-green-50 border-green-200'
    };
    if (revisedFoir > 50) {
        statusConfig = {
            label: 'ABOVE THE 50% FOIR LIMIT',
            sublabel: 'Estimated monthly debt obligations exceed half of the income used for this product.',
            barColor: 'bg-red-600',
            icon: <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />,
            boxClass: 'bg-red-50 border-red-200'
        };
    } else if (revisedFoir > 35) {
        statusConfig = {
            label: 'BETWEEN 35% AND 50% FOIR',
            sublabel: 'The scenario is within the 50% limit, with a higher share of income committed to debt.',
            barColor: 'bg-amber-500',
            icon: <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />,
            boxClass: 'bg-amber-50 border-amber-200'
        };
    }

    const resetScenario = () => {
        setRevisedAmount(initialAmount);
        setRevisedTerm(initialTerm);
        setRevisedPropertyValue(initialPropertyValue);
        setRevisedExistingEmi(initialExistingEmi);
    };

    const amountStep = isPersonalLoan ? 10000 : 50000;
    const maxAmount = Math.max(initialAmount * 1.5, minimumAmount + amountStep);
    const minTerm = isPersonalLoan ? 6 : 60;
    const maxTerm = isPersonalLoan ? 60 : 360;
    const termStep = isPersonalLoan ? 6 : 12;
    const maxPropertyValue = Math.max(initialPropertyValue * 1.5, revisedAmount / 0.5);
    const maxExistingEmi = Math.max(initialExistingEmi * 1.5, 100000);

    const controls = [
        {
            key: 'amount', label: 'Requested loan amount', value: revisedAmount, min: minimumAmount, max: maxAmount, step: amountStep,
            display: formatCurrency(revisedAmount), onChange: setRevisedAmount,
            bounds: `${formatCurrency(minimumAmount)} – ${formatCurrency(maxAmount)}`
        },
        {
            key: 'term', label: 'Loan term', value: revisedTerm, min: minTerm, max: maxTerm, step: termStep,
            display: `${revisedTerm} months (${(revisedTerm / 12).toFixed(1)} years)`, onChange: setRevisedTerm,
            bounds: `${minTerm} – ${maxTerm} months`
        },
        isPersonalLoan ? {
            key: 'existingEmi', label: 'Existing monthly EMI', value: revisedExistingEmi, min: 0, max: maxExistingEmi, step: 1000,
            display: formatCurrency(revisedExistingEmi), onChange: setRevisedExistingEmi,
            bounds: `${formatCurrency(0)} – ${formatCurrency(maxExistingEmi)}`
        } : {
            key: 'propertyValue', label: 'Property market value', value: revisedPropertyValue, min: 1, max: maxPropertyValue, step: 50000,
            display: formatCurrency(revisedPropertyValue), onChange: setRevisedPropertyValue,
            bounds: `${formatCurrency(1)} – ${formatCurrency(maxPropertyValue)}`
        }
    ];

    return (
        <div className="bg-white border border-gray-300 rounded-sm shadow-sm overflow-hidden mt-6">
            <div className="px-5 py-4 bg-slate-50 border-b border-gray-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-100 border border-blue-200 text-gov-blue rounded-sm"><Sliders className="w-5 h-5" /></div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                            {isPersonalLoan ? 'Personal Loan' : 'Home Loan'} What-If Calculator
                        </h3>
                        <p className="text-xs text-gray-600 mt-0.5">Adjust three scenario inputs to compare estimated affordability.</p>
                    </div>
                </div>
                <button type="button" onClick={resetScenario} className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-sm border border-gray-300 flex items-center gap-1 cursor-pointer transition-colors" title="Reset to submitted values">
                    <RefreshCw className="w-3.5 h-3.5" /> Reset
                </button>
            </div>

            <div className="p-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-4 bg-gray-50 border border-gray-200 rounded-sm">
                    {controls.map((control) => (
                        <div key={control.key} className="space-y-2">
                            <div className="flex justify-between items-center gap-2 text-xs">
                                <label htmlFor={`what-if-${control.key}`} className="font-bold text-gray-800 uppercase">{control.label}</label>
                                <span className="font-mono font-bold text-gov-blue text-right">{control.display}</span>
                            </div>
                            <input id={`what-if-${control.key}`} type="range" min={control.min} max={control.max} step={control.step} value={Math.min(control.value, control.max)} onChange={(event) => control.onChange(Number(event.target.value))} className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-gov-blue" />
                            <div className="flex justify-between text-[10px] text-gray-500 font-mono"><span>{control.bounds.split(' – ')[0]}</span><span>{control.bounds.split(' – ')[1]}</span></div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-gray-600">
                    <span>Income used: <strong className="text-gray-800">{formatCurrency(incomeForFoir)}/mo</strong>{isPersonalLoan ? ' (applicant)' : ' (household)'}</span>
                    <span>Existing EMI: <strong className="text-gray-800">{formatCurrency(isPersonalLoan ? revisedExistingEmi : initialExistingEmi)}/mo</strong></span>
                    {isPersonalLoan && applicantData?.Credit_Card_Utilization != null && <span>Submitted card utilization: <strong className="text-gray-800">{(Number(applicantData.Credit_Card_Utilization) * 100).toFixed(0)}%</strong></span>}
                    <span>Illustrative rate: <strong className="text-gray-800">{(annualRate * 100).toFixed(1)}% p.a.</strong></span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-white border border-gray-200 rounded-sm text-center"><span className="text-[11px] font-semibold text-gray-500 uppercase">Estimated monthly EMI</span><p className="text-base font-bold text-gray-900 font-mono mt-1">{formatCurrency(revisedMonthlyEmi)}</p>{emiDelta > 0 && <span className="text-[10px] font-semibold text-green-700">Saves {formatCurrency(emiDelta)}/mo</span>}</div>
                    <div className="p-3 bg-white border border-gray-200 rounded-sm text-center"><span className="text-[11px] font-semibold text-gray-500 uppercase">Revised FOIR</span><p className={`text-base font-bold font-mono mt-1 ${revisedFoir <= 50 ? 'text-green-700' : 'text-red-700'}`}>{revisedFoir.toFixed(1)}%</p>{dtiDelta > 0 && <span className="text-[10px] font-semibold text-green-700">Dropped by {dtiDelta.toFixed(1)} pts</span>}</div>
                    <div className="p-3 bg-white border border-gray-200 rounded-sm text-center"><span className="text-[11px] font-semibold text-gray-500 uppercase">Monthly surplus</span><p className={`text-base font-bold font-mono mt-1 ${monthlySurplus >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(monthlySurplus)}</p><span className="text-[10px] text-gray-500">After proposed and existing EMIs</span></div>
                    <div className="p-3 bg-white border border-gray-200 rounded-sm text-center"><span className="text-[11px] font-semibold text-gray-500 uppercase">{isPersonalLoan ? 'Card utilization' : 'Loan-to-value'}</span><p className="text-base font-bold text-gray-900 font-mono mt-1">{isPersonalLoan ? `${(Number(applicantData?.Credit_Card_Utilization || 0) * 100).toFixed(0)}%` : `${ltv.toFixed(1)}%`}</p><span className="text-[10px] text-gray-500">{isPersonalLoan ? 'Submitted profile; unchanged' : 'Loan amount ÷ property value'}</span></div>
                </div>

                <div className={`p-4 border rounded-sm ${statusConfig.boxClass} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3`}>
                    <div className="flex items-start gap-2.5">{statusConfig.icon}<div><h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">{statusConfig.label}</h4><p className="text-xs text-gray-700 mt-0.5">{statusConfig.sublabel}</p></div></div>
                    <div className="w-full sm:w-48 shrink-0"><div className="flex justify-between text-[11px] font-semibold text-gray-700 mb-1"><span>FOIR: {revisedFoir.toFixed(1)}%</span><span>Limit: 50%</span></div><div className="w-full bg-gray-200 h-2.5 rounded-xs overflow-hidden"><div className={`h-full transition-all duration-300 ${statusConfig.barColor}`} style={{ width: `${Math.min(100, revisedFoir)}%` }} /></div></div>
                </div>
                <p className="text-[10px] text-gray-500">Illustrative estimate based on the product rate and declared income/debt. This scenario does not rerun the credit model or change the application decision.</p>
            </div>
        </div>
    );
};

export default RecourseSimulator;
