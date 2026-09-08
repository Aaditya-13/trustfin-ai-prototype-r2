// Credit Assessment & Feature Terminology Dictionary

export const BANKING_FEATURE_LABELS = {
    'Applicant_Income': 'Applicant Monthly Income',
    'Coapplicant_Income': 'Co-Applicant Monthly Income',
    'Loan_Amount': 'Loan Amount',
    'Loan_Term': 'Loan Term (Months)',
    'Credit_History': 'Credit History (CIBIL)',
    'Monthly_EMI': 'Estimated Monthly EMI',
    'DTI_Ratio': 'Debt-to-Income (DTI) Ratio',
    'Property_Area': 'Property Area',
    'Dependents': 'Dependents',
    'Education': 'Education',
    'Employment_Status': 'Employment Status',
    'Married': 'Marital Status',
    'Gender': 'Gender',
    'Age': 'Age (Years)'
};

export const getBankingLabel = (featureKey) => {
    return BANKING_FEATURE_LABELS[featureKey] || featureKey.replace(/_/g, ' ');
};

export const getBankingDescription = (featureKey) => {
    switch (featureKey) {
        case 'Applicant_Income':
            return 'Verified monthly income of the primary applicant.';
        case 'Coapplicant_Income':
            return 'Additional monthly income contributed by the co-applicant.';
        case 'Loan_Amount':
            return 'Total loan amount requested by the applicant.';
        case 'Loan_Term':
            return 'Repayment duration in months.';
        case 'Credit_History':
            return 'Repayment track record with credit bureaus. 1 = Good history, 0 = Past default or late payments.';
        case 'Monthly_EMI':
            return 'Estimated monthly installment amount for the requested loan.';
        case 'DTI_Ratio':
            return 'Debt-to-Income ratio (Monthly EMI / Total Monthly Income). Standard banking limit is 50%.';
        case 'Property_Area':
            return 'Location category of the mortgaged property (Urban, Semiurban, Rural).';
        case 'Dependents':
            return 'Number of financially dependent family members.';
        case 'Education':
            return 'Educational qualification of the applicant.';
        case 'Employment_Status':
            return 'Employment type (Salaried or Self-Employed).';
        default:
            return 'Evaluation parameter for credit decisioning.';
    }
};

