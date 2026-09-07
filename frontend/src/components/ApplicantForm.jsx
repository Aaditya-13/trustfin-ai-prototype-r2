import React, { useState } from 'react';
import { FileText, UserCheck, Landmark } from 'lucide-react';

const ApplicantForm = ({ onSubmit, isLoading }) => {
    const [formData, setFormData] = useState({
        Gender: 'Male',
        Married: 'No',
        Dependents: 0,
        Education: 'Graduate',
        Employment_Status: 'Salaried',
        Applicant_Income: 50000,
        Coapplicant_Income: 0,
        Loan_Amount: 150000,
        Loan_Term: 360,
        Credit_History: 1,
        Property_Area: 'Urban',
        Age: 30
    });

    const testProfiles = [
        { 
            id: 1, 
            label: "Dossier #101: Prime Salaried Executive", 
            badge: "Low Risk", 
            data: { Gender: 'Female', Married: 'Yes', Dependents: 0, Education: 'Graduate', Employment_Status: 'Salaried', Applicant_Income: 80000, Coapplicant_Income: 20000, Loan_Amount: 100000, Loan_Term: 360, Credit_History: 1, Property_Area: 'Urban', Age: 35 } 
        },
        { 
            id: 2, 
            label: "Dossier #102: Subprime Unemployed Applicant", 
            badge: "Derogatory CIBIL", 
            data: { Gender: 'Male', Married: 'No', Dependents: 3, Education: 'Not Graduate', Employment_Status: 'Unemployed', Applicant_Income: 15000, Coapplicant_Income: 0, Loan_Amount: 300000, Loan_Term: 360, Credit_History: 0, Property_Area: 'Rural', Age: 24 } 
        },
        { 
            id: 3, 
            label: "Dossier #103: Self-Employed Enterprise", 
            badge: "Borderline Bureau", 
            data: { Gender: 'Male', Married: 'Yes', Dependents: 1, Education: 'Graduate', Employment_Status: 'Self-Employed', Applicant_Income: 45000, Coapplicant_Income: 0, Loan_Amount: 160000, Loan_Term: 180, Credit_History: 0, Property_Area: 'Semiurban', Age: 42 } 
        },
        { 
            id: 4, 
            label: "Dossier #104: High-Leverage Salaried", 
            badge: "High Principal", 
            data: { Gender: 'Female', Married: 'No', Dependents: 0, Education: 'Graduate', Employment_Status: 'Salaried', Applicant_Income: 90000, Coapplicant_Income: 0, Loan_Amount: 500000, Loan_Term: 360, Credit_History: 1, Property_Area: 'Urban', Age: 28 } 
        },
        { 
            id: 5, 
            label: "Dossier #105: Dual-Income Prime Household", 
            badge: "Co-Borrower Backed", 
            data: { Gender: 'Male', Married: 'Yes', Dependents: 2, Education: 'Graduate', Employment_Status: 'Salaried', Applicant_Income: 60000, Coapplicant_Income: 40000, Loan_Amount: 120000, Loan_Term: 360, Credit_History: 1, Property_Area: 'Semiurban', Age: 45 } 
        },
        { 
            id: 6, 
            label: "Dossier #106: Rural Micro-Enterprise", 
            badge: "Priority Sector", 
            data: { Gender: 'Female', Married: 'Yes', Dependents: 0, Education: 'Not Graduate', Employment_Status: 'Self-Employed', Applicant_Income: 35000, Coapplicant_Income: 10000, Loan_Amount: 180000, Loan_Term: 360, Credit_History: 1, Property_Area: 'Rural', Age: 50 } 
        },
        { 
            id: 7, 
            label: "Dossier #107: Severe Solvency Stress Test", 
            badge: "FOIR > 1000% (Insolvent)", 
            data: { Gender: 'Male', Married: 'No', Dependents: 0, Education: 'Graduate', Employment_Status: 'Salaried', Applicant_Income: 2500, Coapplicant_Income: 0, Loan_Amount: 80000, Loan_Term: 3, Credit_History: 1, Property_Area: 'Urban', Age: 22 } 
        }
    ];

    const handleLoadProfile = (profileData) => {
        setFormData(profileData);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: e.target.type === 'number' ? Number(value) : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="bg-white p-6 border border-gray-300 rounded-sm mb-6 shadow-sm">
            <div className="border-b border-gray-300 pb-3 mb-5 flex justify-between items-start">
                <div>
                    <h2 className="text-base font-bold text-gray-900 uppercase tracking-tight flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gov-blue" />
                        Borrower Credit Application & Underwriting Dossier
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Official institutional intake portal for credit facility appraisal, cashflow verification, and regulatory scoring
                    </p>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-50 text-gov-blue border border-blue-200 rounded-sm uppercase tracking-wider">
                    Form Form-60A / Retail
                </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Part I: Demographic & Employment */}
                <div>
                    <div className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-1 mb-3 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-gray-500" />
                        Part I: Borrower Demographic & Employment Classification
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="flex flex-col">
                            <label className="text-[11px] font-semibold text-gray-700 mb-1 uppercase">Borrower Gender</label>
                            <select name="Gender" value={formData.Gender} onChange={handleChange} className="border border-gray-300 p-2 text-gray-900 rounded-sm focus:outline-none focus:border-gov-blue text-xs bg-white">
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
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
                            <label className="text-[11px] font-semibold text-gray-700 mb-1 uppercase">Financial Dependents</label>
                            <input type="number" name="Dependents" value={formData.Dependents} onChange={handleChange} className="border border-gray-300 p-2 text-gray-900 rounded-sm focus:outline-none focus:border-gov-blue text-xs" min="0" max="10" />
                        </div>

                        <div className="flex flex-col">
                            <label className="text-[11px] font-semibold text-gray-700 mb-1 uppercase">Educational Qualification</label>
                            <select name="Education" value={formData.Education} onChange={handleChange} className="border border-gray-300 p-2 text-gray-900 rounded-sm focus:outline-none focus:border-gov-blue text-xs bg-white">
                                <option value="Graduate">Graduate / Professional Degree</option>
                                <option value="Not Graduate">Undergraduate / Non-Graduate</option>
                            </select>
                        </div>

                        <div className="flex flex-col">
                            <label className="text-[11px] font-semibold text-gray-700 mb-1 uppercase">Livelihood & Sector</label>
                            <select name="Employment_Status" value={formData.Employment_Status} onChange={handleChange} className="border border-gray-300 p-2 text-gray-900 rounded-sm focus:outline-none focus:border-gov-blue text-xs bg-white">
                                <option value="Salaried">Salaried (Organized Sector)</option>
                                <option value="Self-Employed">Self-Employed / Business Enterprise</option>
                                <option value="Unemployed">Unemployed / Nil Regular Wage</option>
                            </select>
                        </div>

                        <div className="flex flex-col">
                            <label className="text-[11px] font-semibold text-gray-700 mb-1 uppercase">Borrower Age (Years)</label>
                            <input type="number" name="Age" value={formData.Age} onChange={handleChange} className="border border-gray-300 p-2 text-gray-900 rounded-sm focus:outline-none focus:border-gov-blue text-xs" min="18" max="100" />
                        </div>
                    </div>
                </div>

                {/* Part II: Cashflow & Proposed Credit Facility */}
                <div className="pt-2">
                    <div className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-1 mb-3 flex items-center gap-1.5">
                        <Landmark className="w-3.5 h-3.5 text-gray-500" />
                        Part II: Household Cashflow & Proposed Credit Facility
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="flex flex-col">
                            <label className="text-[11px] font-semibold text-gray-700 mb-1 uppercase">Primary Net Monthly Income (₹)</label>
                            <input type="number" name="Applicant_Income" value={formData.Applicant_Income} onChange={handleChange} className="border border-gray-300 p-2 text-gray-900 rounded-sm focus:outline-none focus:border-gov-blue text-xs font-mono font-medium" />
                        </div>

                        <div className="flex flex-col">
                            <label className="text-[11px] font-semibold text-gray-700 mb-1 uppercase">Co-Borrower Monthly Income (₹)</label>
                            <input type="number" name="Coapplicant_Income" value={formData.Coapplicant_Income} onChange={handleChange} className="border border-gray-300 p-2 text-gray-900 rounded-sm focus:outline-none focus:border-gov-blue text-xs font-mono font-medium" />
                        </div>

                        <div className="flex flex-col">
                            <label className="text-[11px] font-semibold text-gray-700 mb-1 uppercase">Requested Facility Principal (₹)</label>
                            <input type="number" name="Loan_Amount" value={formData.Loan_Amount} onChange={handleChange} className="border border-gray-300 p-2 text-gray-900 rounded-sm focus:outline-none focus:border-gov-blue text-xs font-mono font-medium" />
                        </div>

                        <div className="flex flex-col">
                            <label className="text-[11px] font-semibold text-gray-700 mb-1 uppercase">Repayment Horizon / Tenor (Months)</label>
                            <input type="number" name="Loan_Term" value={formData.Loan_Term} onChange={handleChange} className="border border-gray-300 p-2 text-gray-900 rounded-sm focus:outline-none focus:border-gov-blue text-xs font-mono font-medium" min="1" max="480" />
                        </div>

                        <div className="flex flex-col">
                            <label className="text-[11px] font-semibold text-gray-700 mb-1 uppercase">Credit Bureau Rating (CIBIL Proxy)</label>
                            <select name="Credit_History" value={formData.Credit_History} onChange={handleChange} className="border border-gray-300 p-2 text-gray-900 rounded-sm focus:outline-none focus:border-gov-blue text-xs bg-white">
                                <option value={1}>1 - Prime / Regular (No Past Default)</option>
                                <option value={0}>0 - Adverse / Delinquent (Prior Default)</option>
                            </select>
                        </div>

                        <div className="flex flex-col">
                            <label className="text-[11px] font-semibold text-gray-700 mb-1 uppercase">Collateral Jurisdiction Zone</label>
                            <select name="Property_Area" value={formData.Property_Area} onChange={handleChange} className="border border-gray-300 p-2 text-gray-900 rounded-sm focus:outline-none focus:border-gov-blue text-xs bg-white">
                                <option value="Urban">Urban (Tier 1/2 Metropolitan)</option>
                                <option value="Semiurban">Semiurban (Tier 3/4 Centers)</option>
                                <option value="Rural">Rural (Non-Metropolitan)</option>
                            </select>
                        </div>
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
                        {isLoading ? 'Executing Underwriting & Solvency Appraisal...' : 'Execute Credit Underwriting & Solvency Appraisal'}
                    </button>
                </div>
            </form>

            {/* Standard Underwriting Benchmarks */}
            <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center mb-2.5">
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-gray-600" />
                        Standard Underwriting Case Benchmarks
                    </span>
                    <span className="text-[11px] text-gray-500">Quick-load calibrated test portfolios</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {testProfiles.map(profile => (
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
        </div>
    );
};

export default ApplicantForm;
