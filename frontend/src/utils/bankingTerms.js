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

/**
 * Extracts and formats the real applicant input value for a given feature key.
 * Used in tooltips and concordance tables to display actual dossier amounts.
 */
export const getFeatureActualValue = (featureKey, applicantData, result, featureValue) => {
    if (!applicantData && !result) {
        if (featureValue !== undefined && featureValue !== null) {
            return typeof featureValue === 'number' ? featureValue.toLocaleString('en-IN') : String(featureValue);
        }
        return 'N/A';
    }

    const key = String(featureKey || '');

    // Currency values
    if (key.includes('Applicant_Income') || key === 'Applicant Monthly Income') {
        const val = applicantData?.Applicant_Income ?? featureValue;
        return val !== undefined && val !== null ? `₹ ${Number(val).toLocaleString('en-IN')}` : 'N/A';
    }
    if (key.includes('Coapplicant_Income') || key === 'Co-Applicant Monthly Income') {
        const val = applicantData?.Coapplicant_Income ?? featureValue;
        return val !== undefined && val !== null ? `₹ ${Number(val).toLocaleString('en-IN')}` : 'N/A';
    }
    if (key.includes('Loan_Amount') || key === 'Loan Amount') {
        const val = applicantData?.Loan_Amount ?? featureValue;
        return val !== undefined && val !== null ? `₹ ${Number(val).toLocaleString('en-IN')}` : 'N/A';
    }
    if (key.includes('Monthly_EMI') || key.includes('EMI')) {
        const emi = result?.solvencyCheck?.monthlyEMI ?? (applicantData?.Loan_Amount && applicantData?.Loan_Term ? (applicantData.Loan_Amount / applicantData.Loan_Term) : featureValue);
        return emi !== undefined && emi !== null ? `₹ ${Math.round(Number(emi)).toLocaleString('en-IN')}/mo` : 'N/A';
    }
    if (key.includes('DTI_Ratio') || key.includes('Debt-to-Income')) {
        if (result?.solvencyCheck?.dtiPercent) return result.solvencyCheck.dtiPercent;
        if (result?.solvencyCheck?.dtiRatio !== undefined) return `${(result.solvencyCheck.dtiRatio * 100).toFixed(1)}%`;
        if (featureValue !== undefined) return `${(Number(featureValue) * 100).toFixed(1)}%`;
        return 'N/A';
    }
    if (key.includes('Loan_Term') || key.includes('Term')) {
        const val = applicantData?.Loan_Term ?? featureValue;
        return val !== undefined && val !== null ? `${val} Months` : 'N/A';
    }

    // Credit History
    if (key.includes('Credit_History') || key.includes('Credit History') || key.includes('CIBIL')) {
        const val = applicantData?.Credit_History ?? featureValue;
        return (val === 1 || val === '1') ? '1 (Clean / 750+ CIBIL)' : '0 (Poor / Derogatory CIBIL)';
    }

    // Demographics & Categoricals
    if (key.includes('Education')) {
        return applicantData?.Education || (key.includes('Not Graduate') ? (featureValue === 1 ? 'Not Graduate' : 'Graduate') : 'Graduate');
    }
    if (key.includes('Employment_Status') || key.includes('Employment Status')) {
        return applicantData?.Employment_Status || (key.includes('Self-Employed') ? 'Self-Employed' : (key.includes('Unemployed') ? 'Unemployed' : 'Salaried'));
    }
    if (key.includes('Property_Area') || key.includes('Property Area')) {
        return applicantData?.Property_Area || (key.includes('Semiurban') ? 'Semiurban' : (key.includes('Rural') ? 'Rural' : 'Urban'));
    }
    if (key.includes('Married') || key.includes('Marital Status')) {
        return applicantData?.Married === 'Yes' ? 'Married' : 'Single / Unmarried';
    }
    if (key.includes('Gender')) {
        return applicantData?.Gender || 'Male';
    }
    if (key.includes('Dependents')) {
        const val = applicantData?.Dependents ?? featureValue;
        return val !== undefined && val !== null ? `${val} Dependents` : '0 Dependents';
    }
    if (key.includes('Age')) {
        const val = applicantData?.Age ?? featureValue;
        return val !== undefined && val !== null ? `${val} Years` : 'N/A';
    }

    // Fallback
    if (featureValue !== undefined && featureValue !== null) {
        return typeof featureValue === 'number' ? featureValue.toLocaleString('en-IN') : String(featureValue);
    }
    return 'N/A';
};


