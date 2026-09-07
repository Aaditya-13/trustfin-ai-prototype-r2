// Official Commercial Banking & Credit Underwriting Terminology Dictionary

export const BANKING_FEATURE_LABELS = {
    'Applicant_Income': 'Primary Monthly Income',
    'Coapplicant_Income': 'Co-Borrower Monthly Income',
    'Loan_Amount': 'Requested Loan Principal',
    'Loan_Term': 'Facility Tenor (Horizon)',
    'Credit_History': 'Credit Bureau Rating (CIBIL Proxy)',
    'Monthly_EMI': 'Monthly Debt Service (EMI)',
    'DTI_Ratio': 'Debt-to-Income Ratio (FOIR)',
    'Property_Area': 'Collateral Location Zone',
    'Dependents': 'Household Dependents',
    'Education': 'Educational Qualification',
    'Employment_Status': 'Employment / Enterprise Sector',
    'Married': 'Marital Status',
    'Gender': 'Demographic Profile',
    'Age': 'Borrower Age'
};

export const getBankingLabel = (featureKey) => {
    return BANKING_FEATURE_LABELS[featureKey] || featureKey.replace(/_/g, ' ');
};

export const getBankingDescription = (featureKey) => {
    switch (featureKey) {
        case 'Applicant_Income':
            return 'Verified net monthly cash inflow of the primary borrower.';
        case 'Coapplicant_Income':
            return 'Secondary household earnings contributing to debt service capacity.';
        case 'Loan_Amount':
            return 'Gross credit facility requested for sanction.';
        case 'Loan_Term':
            return 'Amortization period in calendar months.';
        case 'Credit_History':
            return 'Historical repayment record registered with credit bureaus (CIBIL/Experian). 1 = Clean, 0 = Derogatory.';
        case 'Monthly_EMI':
            return 'Estimated monthly principal and interest repayment obligation.';
        case 'DTI_Ratio':
            return 'Fixed Obligation to Income Ratio (FOIR). Regulatory prudential cap is 50.0%.';
        case 'Property_Area':
            return 'Geographical jurisdiction and marketability tier of the mortgaged collateral.';
        case 'Dependents':
            return 'Number of financial dependents supported by household cashflow.';
        case 'Education':
            return 'Formally verified academic qualification reflecting earning trajectory.';
        case 'Employment_Status':
            return 'Livelihood stability classification (Salaried corporate vs. Self-Employed).';
        default:
            return 'Credit underwriting evaluation parameter.';
    }
};
