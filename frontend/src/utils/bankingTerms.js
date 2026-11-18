// Shared display labels and formatting; model inputs and scores are unchanged.
export const BANKING_FEATURE_LABELS = {
    Applicant_Income: 'Applicant Monthly Income',
    Coapplicant_Income: 'Co-Applicant Monthly Income',
    Existing_EMI: 'Existing Monthly EMIs',
    Loan_Amount: 'Requested Loan Amount',
    Loan_Term: 'Loan Term (Months)',
    Credit_History: 'Credit History',
    CIBIL_Score: 'CIBIL Score',
    Credit_Card_Utilization: 'Credit Card Use',
    Missed_Payments_12M: 'Missed Payments in the Last 12 Months',
    Monthly_EMI: 'Estimated Monthly EMI',
    DTI_Ratio: 'Monthly Debt / Income',
    FOIR: 'Monthly Debt / Income (FOIR)',
    LTV_Ratio: 'Loan / Property Value (LTV)',
    Property_Value: 'Property Market Value',
    Property_Area: 'Property Area',
    Loan_Purpose: 'Loan Purpose',
    Dependents: 'Dependents', Education: 'Education',
    Employment_Status: 'Employment Status', Married: 'Marital Status',
    Gender: 'Gender', Age: 'Age (Years)', Work_Experience: 'Work Experience (Years)',
};

const categoricalKeys = ['Employment_Status', 'Property_Area', 'Loan_Purpose', 'Education', 'Married', 'Gender'];
const categoryOf = (key) => categoricalKeys.find((field) => key.startsWith(`${field}_`));
const readable = (value) => String(value).replace(/_/g, ' ');
const finite = (value) => value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value));
const currency = (value) => finite(value) ? `₹ ${Number(value).toLocaleString('en-IN')}` : 'Unavailable';

export const getBankingLabel = (featureKey) => {
    const key = String(featureKey || '');
    const category = categoryOf(key);
    if (category) return `${BANKING_FEATURE_LABELS[category]}: ${readable(key.slice(category.length + 1))}`;
    return BANKING_FEATURE_LABELS[key] || readable(key);
};

const descriptions = {
    Applicant_Income: 'Monthly income entered for the applicant.',
    Coapplicant_Income: 'Monthly income entered for the co-applicant.',
    Existing_EMI: 'Monthly EMIs already being paid, as entered in the application.',
    Loan_Amount: 'Total loan amount requested.',
    Loan_Term: 'Number of months over which the loan would be repaid.',
    Credit_History: 'Submitted credit-history flag: 1 means good history; 0 means poor history. It is separate from the numeric CIBIL score.',
    CIBIL_Score: 'Credit score entered for this application, on a scale from 300 to 900.',
    Credit_Card_Utilization: 'Share of the available credit-card limit being used.',
    Missed_Payments_12M: 'Number of missed payments entered for the last 12 months.',
    Monthly_EMI: 'Estimated monthly payment for the requested loan, using the project interest-rate assumption.',
    FOIR: 'Existing monthly EMIs plus the proposed EMI, divided by monthly income. This project uses a 50% upper limit.',
    DTI_Ratio: 'Monthly loan repayments as a share of income. The affordability check includes existing and proposed EMIs and uses a 50% project limit.',
    LTV_Ratio: 'Requested loan amount as a percentage of the property value.',
    Property_Value: 'Property market value entered for this application.',
    Property_Area: 'Submitted property location: urban, semi-urban or rural.',
    Loan_Purpose: 'Reason given for requesting the loan.',
    Dependents: 'Number of people financially dependent on the applicant.',
    Education: 'Education level entered for the applicant.',
    Employment_Status: 'Employment type entered for the applicant.',
    Married: 'Marital status entered for the applicant.',
    Gender: 'Used by the current model and in the separate Gender sensitivity check.',
    Age: 'Age entered for the applicant, in years.',
    Work_Experience: 'Work experience entered for the applicant, in years.',
};

export const getBankingDescription = (featureKey) => {
    const key = String(featureKey || '');
    const category = categoryOf(key);
    if (category) return `Whether the submitted ${BANKING_FEATURE_LABELS[category].toLowerCase()} matches ${readable(key.slice(category.length + 1))}.`;
    return descriptions[key] || 'An input feature used by the loan model.';
};

export const formatAffordabilityStatus = (status) => ({
    OPTIMAL: 'Lower debt share', MODERATE: 'Review recommended', INSOLVENT: 'Above 50% limit',
}[status] || 'Unavailable');

export const getContributionLabel = (value) => {
    if (!finite(value)) return 'Contribution Unavailable';
    return Number(value) > 0 ? 'Supports Approval' : Number(value) < 0 ? 'Supports Rejection' : 'No Contribution Shown';
};

export const getFeatureActualValue = (featureKey, applicantData, result, featureValue) => {
    const key = String(featureKey || '');
    const category = categoryOf(key);
    const raw = applicantData?.[category || key];
    if (category) {
        if (raw === undefined || raw === null || raw === '') return 'Unavailable';
        const matches = String(raw) === key.slice(category.length + 1);
        return `${matches ? 'Yes' : 'No'} (${readable(raw)})`;
    }
    if (['Applicant_Income', 'Coapplicant_Income', 'Loan_Amount', 'Property_Value'].includes(key)) return currency(raw);
    if (key === 'Existing_EMI') return currency(applicantData?.Existing_EMI ?? result?.solvencyCheck?.existingEMI);
    if (key === 'Monthly_EMI') return currency(result?.solvencyCheck?.monthlyEMI ?? raw);
    if (['FOIR', 'DTI_Ratio'].includes(key)) {
        const ratio = result?.solvencyCheck?.dtiRatio ?? raw;
        return finite(ratio) ? `${(Number(ratio) * 100).toFixed(1)}%` : 'Unavailable';
    }
    if (key === 'LTV_Ratio') {
        if (finite(raw)) return `${Number(raw).toFixed(1)}%`;
        if (finite(applicantData?.Loan_Amount) && finite(applicantData?.Property_Value) && Number(applicantData.Property_Value) > 0) {
            return `${(Number(applicantData.Loan_Amount) / Number(applicantData.Property_Value) * 100).toFixed(1)}%`;
        }
        return 'Unavailable';
    }
    if (key === 'Credit_Card_Utilization') return finite(raw) ? `${(Number(raw) * 100).toFixed(1)}%` : 'Unavailable';
    if (key === 'Loan_Term') return finite(raw) ? `${raw} months` : 'Unavailable';
    if (key === 'Age' || key === 'Work_Experience') return finite(raw) ? `${raw} years` : 'Unavailable';
    if (key === 'Credit_History') return Number(raw) === 1 && finite(raw) ? '1 (Good history)' : Number(raw) === 0 && finite(raw) ? '0 (Poor history)' : 'Unavailable';
    if (raw !== undefined && raw !== null && raw !== '') return typeof raw === 'number' ? raw.toLocaleString('en-IN') : readable(raw);
    // Processed/scaled explanation values are not evidence of submitted values.
    if (BANKING_FEATURE_LABELS[key]) return 'Unavailable';
    return featureValue !== undefined && featureValue !== null ? readable(featureValue) : 'Unavailable';
};
