import React, { useState, useEffect } from 'react';
import { FileText, UserCheck, Landmark, ArrowLeft, ShieldAlert, Upload, CreditCard, Home, Info } from 'lucide-react';
import BatchUploadModal from './BatchUploadModal';

const ApplicantForm = ({ 
    onSubmit, 
    isLoading, 
    onBack, 
    userRole = 'bank_officer', 
    loanProduct,
    onInspectEvaluation,
    onOpenHistory 
}) => {
    const [showBatchModal, setShowBatchModal] = useState(false);
    const isHomeLoan = (loanProduct?.id || 'home_loan') === 'home_loan';

    // Dynamic initial state depending on product
    const getInitialState = (isHome) => {
        if (isHome) {
            return {
                loan_type: 'home_loan',
                Gender: 'Female',
                Married: 'Yes',
                Dependents: 1,
                Education: 'Graduate',
                Employment_Status: 'Salaried',
                Age: 32,
                Work_Experience: 8,
                Applicant_Income: 75000,
                Coapplicant_Income: 25000,
                Existing_EMI: 5000,
                Loan_Amount: 3500000,
                Loan_Term: 240,
                Property_Value: 4800000,
                Property_Area: 'Urban',
                CIBIL_Score: 780,
                Missed_Payments_12M: 0
            };
        } else {
            return {
                loan_type: 'personal_loan',
                Gender: 'Male',
                Married: 'No',
                Dependents: 0,
                Education: 'Graduate',
                Employment_Status: 'Salaried',
                Age: 28,
                Work_Experience: 5,
                Applicant_Income: 65000,
                Coapplicant_Income: 0,
                Existing_EMI: 4000,
                Loan_Amount: 350000,
                Loan_Term: 36,
                Loan_Purpose: 'Medical_Emergency',
                Credit_Card_Utilization: 0.25,
                CIBIL_Score: 760,
                Missed_Payments_12M: 0
            };
        }
    };

    const [formData, setFormData] = useState(() => getInitialState(isHomeLoan));

    useEffect(() => {
        setFormData(getInitialState(isHomeLoan));
    }, [loanProduct?.id]);

    // Curated Test Profiles
    const homeLoanProfiles = [
        { 
            id: 1, 
            label: "Profile 1: Jane Doe (Prime Executive)", 
            badge: "Prime 70% LTV", 
            data: { loan_type: 'home_loan', Gender: 'Female', Married: 'Yes', Dependents: 0, Education: 'Graduate', Employment_Status: 'Salaried', Age: 35, Work_Experience: 10, Applicant_Income: 80000, Coapplicant_Income: 20000, Existing_EMI: 6000, Loan_Amount: 3500000, Loan_Term: 240, Property_Value: 5000000, Property_Area: 'Urban', CIBIL_Score: 810, Credit_History: 1, Missed_Payments_12M: 0 } 
        },
        { 
            id: 2, 
            label: "Profile 2: Amit Sharma (Subprime Delinquent)", 
            badge: "Deep Subprime", 
            data: { loan_type: 'home_loan', Gender: 'Male', Married: 'No', Dependents: 2, Education: 'Not Graduate', Employment_Status: 'Self-Employed', Age: 42, Work_Experience: 6, Applicant_Income: 40000, Coapplicant_Income: 0, Existing_EMI: 8000, Loan_Amount: 2200000, Loan_Term: 240, Property_Value: 2800000, Property_Area: 'Rural', CIBIL_Score: 535, Missed_Payments_12M: 2 } 
        },
        { 
            id: 3, 
            label: "Profile 3: Rahul Verma (High FOIR Solvency Breach)", 
            badge: "FOIR 78% Breach", 
            data: { loan_type: 'home_loan', Gender: 'Male', Married: 'Yes', Dependents: 1, Education: 'Graduate', Employment_Status: 'Salaried', Age: 30, Work_Experience: 7, Applicant_Income: 38000, Coapplicant_Income: 0, Existing_EMI: 7000, Loan_Amount: 3200000, Loan_Term: 180, Property_Value: 4200000, Property_Area: 'Semiurban', CIBIL_Score: 785, Missed_Payments_12M: 0 } 
        },
        { 
            id: 4, 
            label: "Profile 4: Priya Patel (Borderline Demographic Audit)", 
            badge: "Fairness Audit", 
            data: { loan_type: 'home_loan', Gender: 'Female', Married: 'Yes', Dependents: 1, Education: 'Graduate', Employment_Status: 'Salaried', Age: 31, Work_Experience: 6, Applicant_Income: 62000, Coapplicant_Income: 18000, Existing_EMI: 5000, Loan_Amount: 2800000, Loan_Term: 240, Property_Value: 3800000, Property_Area: 'Urban', CIBIL_Score: 665, Missed_Payments_12M: 1 } 
        }
    ];

    const personalLoanProfiles = [
        { 
            id: 1, 
            label: "Profile 1: Ananya Rao (Emergency Medical Credit - Zero Card Debt)", 
            badge: "Low Risk Approval", 
            data: { loan_type: 'personal_loan', Gender: 'Female', Married: 'No', Dependents: 0, Education: 'Graduate', Employment_Status: 'Salaried', Age: 29, Work_Experience: 6, Applicant_Income: 85000, Existing_EMI: 4000, Loan_Amount: 350000, Loan_Term: 24, Loan_Purpose: 'Medical_Emergency', Credit_Card_Utilization: 0.0, CIBIL_Score: 795, Missed_Payments_12M: 0 } 
        },
        { 
            id: 2, 
            label: "Profile 2: Vikram Singh (Maxed Cards & Delinquencies)", 
            badge: "High Default Risk", 
            data: { loan_type: 'personal_loan', Gender: 'Male', Married: 'Yes', Dependents: 2, Education: 'Not Graduate', Employment_Status: 'Self-Employed', Age: 44, Work_Experience: 12, Applicant_Income: 38000, Existing_EMI: 11000, Loan_Amount: 450000, Loan_Term: 36, Loan_Purpose: 'Debt_Consolidation', Credit_Card_Utilization: 0.89, CIBIL_Score: 565, Missed_Payments_12M: 3 } 
        },
        { 
            id: 3, 
            label: "Profile 3: Kavita Nair (Borderline Retail Audit)", 
            badge: "Fairness Test", 
            data: { loan_type: 'personal_loan', Gender: 'Female', Married: 'No', Dependents: 0, Education: 'Graduate', Employment_Status: 'Salaried', Age: 27, Work_Experience: 4, Applicant_Income: 52000, Existing_EMI: 3500, Loan_Amount: 250000, Loan_Term: 36, Loan_Purpose: 'Home_Renovation', Credit_Card_Utilization: 0.42, CIBIL_Score: 675, Missed_Payments_12M: 0 } 
        },
        { 
            id: 4, 
            label: "Profile 4: Suresh Kumar (Higher Education Loan)", 
            badge: "Salaried Prime", 
            data: { loan_type: 'personal_loan', Gender: 'Male', Married: 'Yes', Dependents: 1, Education: 'Graduate', Employment_Status: 'Salaried', Age: 36, Work_Experience: 11, Applicant_Income: 110000, Existing_EMI: 8000, Loan_Amount: 700000, Loan_Term: 48, Loan_Purpose: 'Education', Credit_Card_Utilization: 0.28, CIBIL_Score: 770, Missed_Payments_12M: 0 } 
        }
    ];

    const activeProfiles = isHomeLoan ? homeLoanProfiles : personalLoanProfiles;

    const handleFocus = (e) => {
        e.target.select();
    };

    const formatInputValue = (val) => (val === undefined || val === null ? '' : val);

    const handleLoadProfile = (profileData) => {
        setFormData(profileData);
    };

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' 
                ? (value === '' ? '' : (isNaN(Number(value)) ? value : Number(value)))
                : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const rawLoan = Number(formData.Loan_Amount);
        const minLoan = isHomeLoan ? 300000 : 30000;
        const validLoanAmount = (!rawLoan || rawLoan < minLoan)
            ? (rawLoan > 0 ? minLoan : (isHomeLoan ? 3000000 : 250000))
            : rawLoan;

        if (rawLoan > 0 && rawLoan < minLoan) {
            setFormData(prev => ({ ...prev, Loan_Amount: validLoanAmount }));
        }

        const payload = {
            ...formData,
            loan_type: isHomeLoan ? 'home_loan' : 'personal_loan',
            Applicant_Income: Number(formData.Applicant_Income) || 50000,
            Coapplicant_Income: isHomeLoan ? (Number(formData.Coapplicant_Income) || 0) : 0,
            Loan_Amount: validLoanAmount,
            Loan_Term: Number(formData.Loan_Term) || (isHomeLoan ? 240 : 36),
            Age: Number(formData.Age) || 30,
            Dependents: Number(formData.Dependents) || 0,
            Work_Experience: Number(formData.Work_Experience) || 5,
            Existing_EMI: Number(formData.Existing_EMI) || 0,
            CIBIL_Score: Number(formData.CIBIL_Score) || 750,
            Missed_Payments_12M: Number(formData.Missed_Payments_12M) || 0,
            Credit_History: (Number(formData.CIBIL_Score) || 750) >= 650 ? 1 : 0
        };

        if (isHomeLoan) {
            payload.Property_Value = Number(formData.Property_Value) || Math.round(payload.Loan_Amount / 0.75);
            payload.Property_Area = formData.Property_Area || 'Urban';
        } else {
            payload.Credit_Card_Utilization = Number(formData.Credit_Card_Utilization ?? 0.25);
            payload.Loan_Purpose = formData.Loan_Purpose || 'Medical_Emergency';
            payload.Property_Area = 'Urban';
        }

        onSubmit(payload);
    };

    const cibilScore = Number(formData.CIBIL_Score) || 300;
    const getCibilBadge = (score) => {
        if (score >= 750) return { label: 'Prime Credit', color: 'bg-emerald-50 text-emerald-800 border-emerald-300' };
        if (score >= 650) return { label: 'Near Prime', color: 'bg-amber-50 text-amber-800 border-amber-300' };
        return { label: 'Subprime Risk', color: 'bg-rose-50 text-rose-800 border-rose-300' };
    };
    const cibilBadge = getCibilBadge(cibilScore);

    const productName = loanProduct?.title || (isHomeLoan ? 'Residential Home Loan' : 'Personal & Retail Credit');

    return (
        <div className="bg-white p-6 border border-gray-300 rounded-sm mb-6 shadow-sm">
            {/* Top Navigation & Context */}
            {onBack && (
                <div className="mb-4 pb-3 border-b border-gray-200 flex justify-between items-center">
                    <button
                        type="button"
                        onClick={onBack}
                        className="text-xs font-semibold text-gray-700 hover:text-gov-blue flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Loan Selection
                    </button>
                    <div className="flex items-center gap-2">
                        {isHomeLoan ? <Home className="w-4 h-4 text-gov-blue" /> : <CreditCard className="w-4 h-4 text-gov-blue" />}
                        <span className="text-[11px] font-mono text-gray-600">
                            Product: <strong className="text-gray-900">{productName}</strong>
                        </span>
                    </div>
                </div>
            )}

            <div className="border-b border-gray-300 pb-3 mb-5 flex justify-between items-start">
                <div>
                    <h2 className="text-base font-bold text-gray-900 uppercase tracking-tight flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gov-blue" />
                        Loan Application Form ({isHomeLoan ? 'Home Loan Mortgage' : 'Personal Credit'})
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {userRole === 'bank_officer' 
                            ? 'Enter verified applicant financials, bureau CIBIL score, and loan terms for algorithmic underwriting'
                            : 'Enter your financial details to evaluate loan eligibility and instant credit decision'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {userRole === 'bank_officer' && (
                        <button
                            type="button"
                            onClick={() => setShowBatchModal(true)}
                            className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-blue-950 font-bold text-xs uppercase tracking-wider rounded-sm flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                            title="Upload and evaluate bulk CSV portfolios"
                        >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Batch of Applications</span>
                        </button>
                    )}
                    <span className="text-[11px] font-bold px-2 py-1 bg-blue-50 text-gov-blue border border-blue-200 rounded-sm uppercase tracking-wider">
                        {userRole === 'bank_officer' ? 'Officer Entry' : 'Direct Portal'}
                    </span>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Part I: Applicant & Employment Details */}
                <div>
                    <div className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-1 mb-3 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-gray-500" />
                        Part I: Applicant Demographic & Employment Profile
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="flex flex-col">
                            <label className="text-[11px] font-semibold text-gray-700 mb-1 uppercase">Gender (Fairness Audit)</label>
                            <select name="Gender" value={formData.Gender} onChange={handleChange} className="border border-gray-300 p-2 text-gray-900 rounded-sm focus:outline-none focus:border-gov-blue text-xs bg-white">
                                <option value="Female">Female</option>
                                <option value="Male">Male</option>
                            </select>
                        </div>

                        <div className="flex flex-col">
                            <label className="text-[11px] font-semibold text-gray-700 mb-1 uppercase">Marital Status</label>
                            <select name="Married" value={formData.Married} onChange={handleChange} className="border border-gray-300 p-2 text-gray-900 rounded-sm focus:outline-none focus:border-gov-blue text-xs bg-white">
                                <option value="Yes">Married</option>
                                <option value="No">Single / Unmarried</option>
                            </select>
                        </div>

                        <div className="flex flex-col">
                            <label className="text-[11px] font-semibold text-gray-700 mb-1 uppercase">Dependents</label>
                            <input 
                                type="number" 
                                name="Dependents" 
                                value={formatInputValue(formData.Dependents)} 
                                onChange={handleChange} 
                                onFocus={handleFocus}
                                className="border border-gray-300 p-2 text-gray-900 rounded-sm focus:outline-none focus:border-gov-blue text-xs font-mono" 
                                min="0" 
                                max="8" 
                            />
                        </div>

                        <div className="flex flex-col">
                            <label className="text-[11px] font-semibold text-gray-700 mb-1 uppercase">Age (Years)</label>
                            <input 
                                type="number" 
                                name="Age" 
                                value={formatInputValue(formData.Age)} 
                                onChange={handleChange} 
                                onFocus={handleFocus}
                                className="border border-gray-300 p-2 text-gray-900 rounded-sm focus:outline-none focus:border-gov-blue text-xs font-mono" 
                                min="18" 
                                max="75" 
                            />
                        </div>

                        <div className="flex flex-col">
                            <label className="text-[11px] font-semibold text-gray-700 mb-1 uppercase">Education</label>
                            <select name="Education" value={formData.Education} onChange={handleChange} className="border border-gray-300 p-2 text-gray-900 rounded-sm focus:outline-none focus:border-gov-blue text-xs bg-white">
                                <option value="Graduate">Graduate</option>
                                <option value="Not Graduate">Undergraduate / Non-Graduate</option>
                            </select>
                        </div>

                        <div className="flex flex-col">
                            <label className="text-[11px] font-semibold text-gray-700 mb-1 uppercase">Employment Status</label>
                            <select name="Employment_Status" value={formData.Employment_Status} onChange={handleChange} className="border border-gray-300 p-2 text-gray-900 rounded-sm focus:outline-none focus:border-gov-blue text-xs bg-white">
                                <option value="Salaried">Salaried Corporate / Govt</option>
                                <option value="Self-Employed">Self-Employed Business / Professional</option>
                            </select>
                        </div>

                        <div className="flex flex-col">
                            <label className="text-[11px] font-semibold text-gray-700 mb-1 uppercase">Work Experience (Years)</label>
                            <input 
                                type="number" 
                                name="Work_Experience" 
                                value={formatInputValue(formData.Work_Experience)} 
                                onChange={handleChange} 
                                onFocus={handleFocus}
                                className="border border-gray-300 p-2 text-gray-900 rounded-sm focus:outline-none focus:border-gov-blue text-xs font-mono" 
                                min="0" 
                                max="45" 
                            />
                        </div>

                        {/* Product Specific Field */}
                        {isHomeLoan ? (
                            <div className="flex flex-col">
                                <label className="text-[11px] font-semibold text-gray-700 mb-1 uppercase">Property Area Location</label>
                                <select name="Property_Area" value={formData.Property_Area} onChange={handleChange} className="border border-gray-300 p-2 text-gray-900 rounded-sm focus:outline-none focus:border-gov-blue text-xs bg-white">
                                    <option value="Urban">Urban Metro</option>
                                    <option value="Semiurban">Semi-Urban</option>
                                    <option value="Rural">Rural</option>
                                </select>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                <label className="text-[11px] font-semibold text-gray-700 mb-1 uppercase">Loan Purpose</label>
                                <select name="Loan_Purpose" value={formData.Loan_Purpose || 'Medical_Emergency'} onChange={handleChange} className="border border-gray-300 p-2 text-gray-900 rounded-sm focus:outline-none focus:border-gov-blue text-xs bg-white font-medium">
                                    <option value="Medical_Emergency">Medical Emergency</option>
                                    <option value="Education">Higher Education</option>
                                    <option value="Home_Renovation">Home Renovation</option>
                                    <option value="Wedding">Wedding Expense</option>
                                    <option value="Debt_Consolidation">Debt Consolidation</option>
                                    <option value="Travel">Travel / Discretionary</option>
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {/* Part II: Income & Existing Debt Obligations */}
                <div className="pt-1">
                    <div className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-1 mb-3 flex items-center gap-1.5">
                        <Landmark className="w-3.5 h-3.5 text-gray-500" />
                        Part II: Income, Existing Debt Obligations & Solvency
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="flex flex-col">
                            <label className="text-[11px] font-semibold text-gray-700 mb-1 uppercase">Applicant Monthly Income (₹)</label>
                            <input 
                                type="number" 
                                name="Applicant_Income" 
                                value={formatInputValue(formData.Applicant_Income)} 
                                onChange={handleChange} 
                                onFocus={handleFocus}
                                className="border border-gray-300 p-2 text-gray-900 rounded-sm focus:outline-none focus:border-gov-blue text-xs font-mono font-medium" 
                                min="1000" 
                            />
                        </div>

                        {isHomeLoan ? (
                            <div className="flex flex-col">
                                <label className="text-[11px] font-semibold text-gray-700 mb-1 uppercase">Co-Applicant Monthly Income (₹)</label>
                                <input 
                                    type="number" 
                                    name="Coapplicant_Income" 
                                    value={formatInputValue(formData.Coapplicant_Income)} 
                                    onChange={handleChange} 
                                    onFocus={handleFocus}
                                    className="border border-gray-300 p-2 text-gray-900 rounded-sm focus:outline-none focus:border-gov-blue text-xs font-mono font-medium" 
                                    min="0" 
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[11px] font-semibold text-gray-700 uppercase">
                                        Credit Card Utilization
                                    </label>
                                    <div className="flex items-center gap-1">
                                        <input 
                                            type="number" 
                                            name="Credit_Card_Utilization_Percent" 
                                            value={formData.Credit_Card_Utilization === '' ? '' : Math.round((formData.Credit_Card_Utilization ?? 0) * 100)} 
                                            onChange={(e) => {
                                                const val = e.target.value === '' ? '' : Number(e.target.value);
                                                if (val === '') {
                                                    setFormData(prev => ({ ...prev, Credit_Card_Utilization: '' }));
                                                } else {
                                                    const pct = Math.max(0, Math.min(100, val));
                                                    setFormData(prev => ({ ...prev, Credit_Card_Utilization: Math.round(pct) / 100 }));
                                                }
                                            }}
                                            onFocus={handleFocus}
                                            min="0" 
                                            max="100" 
                                            step="1"
                                            className="w-14 text-center font-mono font-bold text-xs border border-gray-300 rounded-xs py-0.5 bg-white text-gray-900 focus:outline-none focus:border-gov-blue"
                                        />
                                        <span className="text-[11px] font-mono text-gray-600 font-bold">%</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-0.5">
                                    <input 
                                        type="range" 
                                        name="Credit_Card_Utilization" 
                                        value={formData.Credit_Card_Utilization ?? 0} 
                                        onChange={(e) => setFormData(prev => ({ ...prev, Credit_Card_Utilization: Math.round(Number(e.target.value) * 100) / 100 }))} 
                                        min="0" 
                                        max="1.0" 
                                        step="0.01" 
                                        className="w-full accent-gov-blue cursor-pointer h-2 bg-gray-200 rounded-lg"
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] font-mono text-gray-400 mt-1">
                                    <span className="text-emerald-700 font-semibold">0% (Zero Revolving Debt)</span>
                                    <span>30% (Standard)</span>
                                    <span className="text-rose-600 font-semibold">100% (Maxed Out)</span>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col">
                            <label className="text-[11px] font-semibold text-gray-700 mb-1 uppercase">Existing Running EMIs (₹/Month)</label>
                            <input 
                                type="number" 
                                name="Existing_EMI" 
                                value={formatInputValue(formData.Existing_EMI)} 
                                onChange={handleChange} 
                                onFocus={handleFocus}
                                className="border border-gray-300 p-2 text-gray-900 rounded-sm focus:outline-none focus:border-gov-blue text-xs font-mono font-medium" 
                                min="0" 
                            />
                        </div>
                    </div>
                </div>

                {/* Part III: Credit Bureau (CIBIL) & Risk Parameters */}
                <div className="pt-1">
                    <div className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-1 mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-gray-500" />
                            <span>Part III: Credit Bureau (CIBIL Score & Delinquencies)</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-xs ${cibilBadge.color}`}>
                            {cibilBadge.label}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-3.5 border border-gray-200 rounded-sm">
                        
                        {/* CIBIL Score Slider */}
                        <div className="md:col-span-2 flex flex-col justify-center">
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="text-[11px] font-bold text-gray-800 uppercase flex items-center gap-1.5">
                                    <span>Continuous CIBIL Score (300 to 900)</span>
                                </label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        name="CIBIL_Score" 
                                        value={formatInputValue(formData.CIBIL_Score)} 
                                        onChange={handleChange} 
                                        onFocus={handleFocus}
                                        min="300" 
                                        max="900" 
                                        className="w-20 text-center font-mono font-extrabold text-sm border border-gray-300 rounded-xs py-0.5 bg-white text-gray-900 focus:outline-none focus:border-gov-blue"
                                    />
                                    <span className="text-[11px] text-gray-500 font-mono">/ 900</span>
                                </div>
                            </div>

                            <input 
                                type="range" 
                                name="CIBIL_Score" 
                                value={formData.CIBIL_Score ?? 750} 
                                onChange={handleChange} 
                                min="300" 
                                max="900" 
                                step="5"
                                className="w-full accent-gov-blue cursor-pointer h-2 bg-gray-200 rounded-lg"
                            />

                            <div className="flex justify-between text-[10px] font-mono text-gray-500 mt-1">
                                <span className="text-rose-600 font-semibold">300 (Subprime Default)</span>
                                <span className="text-amber-600 font-semibold">650 (Near Prime)</span>
                                <span className="text-emerald-700 font-semibold">750+ (Prime Credit)</span>
                                <span className="text-emerald-800 font-bold">900 (Super-Prime)</span>
                            </div>
                        </div>

                        {/* Missed Payments */}
                        <div className="flex flex-col justify-center">
                            <label className="text-[11px] font-semibold text-gray-700 mb-1 uppercase">Missed Payments in Past 12M</label>
                            <select 
                                name="Missed_Payments_12M" 
                                value={formData.Missed_Payments_12M || 0} 
                                onChange={handleChange} 
                                className="border border-gray-300 p-2 text-gray-900 rounded-sm focus:outline-none focus:border-gov-blue text-xs bg-white font-mono font-semibold"
                            >
                                <option value={0}>0 Delinquencies (Clean Track Record)</option>
                                <option value={1}>1 Missed Payment (Minor Delay)</option>
                                <option value={2}>2 Missed Payments (Elevated Risk)</option>
                                <option value={3}>3+ Missed Payments (Chronic Default)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Part IV: Requested Loan Terms & Collateral */}
                <div className="pt-1">
                    <div className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-1 mb-3 flex items-center gap-1.5">
                        <Landmark className="w-3.5 h-3.5 text-gray-500" />
                        Part IV: Requested Loan Principal & Terms
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="flex flex-col">
                            <label className="text-[11px] font-semibold text-gray-700 mb-1 uppercase">Requested Loan Amount (₹)</label>
                            <input 
                                type="number" 
                                name="Loan_Amount" 
                                value={formatInputValue(formData.Loan_Amount)} 
                                onChange={handleChange} 
                                onFocus={handleFocus}
                                className={`border p-2 text-gray-900 rounded-sm focus:outline-none text-xs font-mono font-medium ${
                                    isHomeLoan && formData.Loan_Amount !== '' && Number(formData.Loan_Amount) < 300000 
                                        ? 'border-amber-500 bg-amber-50/50 focus:border-amber-600' 
                                        : 'border-gray-300 focus:border-gov-blue'
                                }`} 
                                min={isHomeLoan ? 300000 : 30000} 
                                max={isHomeLoan ? 15000000 : 1500000} 
                                step={isHomeLoan ? 50000 : 10000}
                            />
                            {isHomeLoan && formData.Loan_Amount !== '' && Number(formData.Loan_Amount) < 300000 ? (
                                <span className="text-[10px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
                                    <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    Indian banking norms mandate a minimum Home Loan of ₹3,00,000 (3 Lakhs). Below this, use Personal Credit.
                                </span>
                            ) : (
                                <span className="text-[10px] text-gray-400 mt-0.5 font-mono">
                                    {isHomeLoan ? 'Range: ₹3 Lakhs to ₹1.5 Crore (Min: ₹3,00,000)' : 'Range: ₹30,000 to ₹15 Lakhs (Min: ₹30,000)'}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-col">
                            <label className="text-[11px] font-semibold text-gray-700 mb-1 uppercase">Loan Tenure (Months)</label>
                            {isHomeLoan ? (
                                <select 
                                    name="Loan_Term" 
                                    value={formData.Loan_Term} 
                                    onChange={handleChange} 
                                    className="border border-gray-300 p-2 text-gray-900 rounded-sm focus:outline-none focus:border-gov-blue text-xs bg-white font-mono"
                                >
                                    <option value={60}>60 Months (5 Years)</option>
                                    <option value={120}>120 Months (10 Years)</option>
                                    <option value={180}>180 Months (15 Years)</option>
                                    <option value={240}>240 Months (20 Years)</option>
                                    <option value={300}>300 Months (25 Years)</option>
                                    <option value={360}>360 Months (30 Years)</option>
                                </select>
                            ) : (
                                <select 
                                    name="Loan_Term" 
                                    value={formData.Loan_Term} 
                                    onChange={handleChange} 
                                    className="border border-gray-300 p-2 text-gray-900 rounded-sm focus:outline-none focus:border-gov-blue text-xs bg-white font-mono"
                                >
                                    <option value={6}>6 Months (Fast Track)</option>
                                    <option value={12}>12 Months (1 Year)</option>
                                    <option value={24}>24 Months (2 Years)</option>
                                    <option value={36}>36 Months (3 Years)</option>
                                    <option value={48}>48 Months (4 Years)</option>
                                    <option value={60}>60 Months (5 Years)</option>
                                </select>
                            )}
                        </div>

                        {isHomeLoan && (
                            <div className="flex flex-col">
                                <label className="text-[11px] font-semibold text-gray-700 mb-1 uppercase">Property Market Valuation (₹)</label>
                                <input 
                                    type="number" 
                                    name="Property_Value" 
                                    value={formatInputValue(formData.Property_Value)} 
                                    onChange={handleChange} 
                                    onFocus={handleFocus}
                                    className="border border-gray-300 p-2 text-gray-900 rounded-sm focus:outline-none focus:border-gov-blue text-xs font-mono font-medium" 
                                    min="300000" 
                                />
                                <span className="text-[10px] text-gray-400 mt-0.5 font-mono">
                                    LTV: {formData.Property_Value ? Math.round(((Number(formData.Loan_Amount) || 0) / Number(formData.Property_Value)) * 100) : 75}% (RBI ceiling: 80–85%)
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-3">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-2.5 px-4 font-bold text-xs uppercase tracking-wider text-white transition-colors duration-150 rounded-sm shadow-sm flex items-center justify-center gap-2 ${
                            isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gov-blue hover:bg-blue-900 cursor-pointer'
                        }`}
                    >
                        {isLoading ? 'Evaluating Application with Explainable AI...' : 'Evaluate Loan Application'}
                    </button>
                </div>
            </form>

            {/* Standard Underwriting Benchmarks */}
            <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center mb-2.5">
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-gray-600" />
                        Sample Test Profiles ({isHomeLoan ? 'Home Loan Mortgage' : 'Personal Credit'})
                    </span>
                    <span className="text-[11px] text-gray-500">Click any profile to load calibrated test values</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeProfiles.map(profile => (
                        <button
                            key={profile.id}
                            type="button"
                            onClick={() => handleLoadProfile(profile.data)}
                            className="text-xs bg-gray-50 hover:bg-gov-blue hover:text-white text-gray-800 border border-gray-300 p-2 rounded-sm transition-colors cursor-pointer text-left flex justify-between items-center group"
                        >
                            <span className="font-semibold text-[11px] group-hover:text-white truncate mr-2">{profile.label}</span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-white group-hover:bg-blue-900 group-hover:text-white text-gray-600 border border-gray-200 group-hover:border-blue-700 rounded-xs shrink-0">
                                {profile.badge}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Batch Application Upload Modal */}
            <BatchUploadModal 
                isOpen={showBatchModal}
                onClose={() => setShowBatchModal(false)}
                onInspectEvaluation={onInspectEvaluation}
                onViewInHistory={onOpenHistory}
            />
        </div>
    );
};

export default ApplicantForm;
