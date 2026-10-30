// Decision Advisory Engine
// Evaluates credit risk, repayment capacity (DTI), and algorithmic reliability for bank loan officers

/**
 * Evaluates model prediction, repayment safety, and reliability metrics
 * to produce practical, plain-English guidance for the bank loan officer.
 * 
 * @param {Object} result - API response containing prediction, solvencyCheck, trustScore, shap, lime
 * @param {Object} applicantData - Raw applicant profile data
 * @returns {Object} Structured recommendation object
 */
export const getUnderwritingAction = (result, applicantData) => {
    if (!result) return null;

    const isApproved = result.prediction === 'Approved';
    const confidencePercent = Number(((result.confidenceScore || 0) * 100).toFixed(1));
    const trustPercent = Number(((result.trustScore?.overallTrustScore || 0) * 100).toFixed(1));
    const dtiRatio = result.solvencyCheck?.dtiRatio ?? 0;
    const dtiPercent = result.solvencyCheck?.dtiPercent ?? `${(dtiRatio * 100).toFixed(1)}%`;
    const isSolvent = result.solvencyCheck?.isSolvent ?? true;
    const solvencyStatus = result.solvencyCheck?.status ?? 'OPTIMAL';
    const consistencyScore = result.trustScore?.consistency ?? 1.0;
    const existingEMI = result.solvencyCheck?.existingEMI ?? (Number(applicantData?.Existing_EMI) || 0);
    const totalObligation = result.solvencyCheck?.totalMonthlyObligation ?? ((result.solvencyCheck?.monthlyEMI || 0) + existingEMI);

    // =========================================================================
    // CASE 3: DECLINE RECOMMENDED (Red)
    // Triggers if: Unaffordable EMI (DTI > 50%) or Model Rejection
    // =========================================================================
    if (!isSolvent || solvencyStatus === 'INSOLVENT' || (!isApproved && confidencePercent >= 65)) {
        const reasons = [];

        if (!isSolvent || solvencyStatus === 'INSOLVENT') {
            if (existingEMI > 0) {
                reasons.push(`Total monthly debt of ₹${Math.round(totalObligation).toLocaleString('en-IN')} (including ₹${Math.round(existingEMI).toLocaleString('en-IN')} existing EMIs) consumes ${dtiPercent} of income, exceeding the 50% ceiling.`);
            } else {
                reasons.push(`Monthly EMI requires ${dtiPercent} of total income, which exceeds the safe 50% repayment ceiling.`);
            }
        }
        if (!isApproved) {
            if (applicantData?.Credit_History === 0 || applicantData?.Credit_History === '0') {
                reasons.push('Past credit bureau record indicates defaults or irregular repayment history.');
            } else {
                reasons.push(`Credit risk assessment identified elevated default probability (${confidencePercent}% confidence).`);
            }
        }

        return {
            tier: 'HIGH_RISK',
            badgeText: 'DECLINE RECOMMENDED: HIGH RISK',
            badgeClass: 'bg-red-700 text-white border-red-800',
            cardBgClass: 'bg-red-50/70 border-red-300',
            indicatorClass: 'bg-red-600',
            textColor: 'text-red-900',
            accentColor: 'text-red-700',
            headline: isSolvent 
                ? 'Decline Recommended: Credit model flags elevated default risk or irregular bureau track record.'
                : 'Safety Limit Exceeded: Monthly loan repayment is unaffordable on current income.',
            reasons: reasons.length > 0 ? reasons : ['High credit risk identified across repayment capacity and bureau history.'],
            nextStep: 'Issue adverse action notice or consider restructuring with a smaller loan principal.'
        };
    }

    // =========================================================================
    // CASE 1: RECOMMENDED FOR SANCTION (Green)
    // Triggers if: Approved AND High Confidence (>= 70%) AND Safe Solvency (DTI <= 35%) AND High Reliability (>= 70%)
    // =========================================================================
    if (isApproved && confidencePercent >= 70 && trustPercent >= 70 && isSolvent && dtiRatio <= 0.35) {
        const reasons = [
            `Monthly EMI is very comfortable at ${dtiPercent} of income (well within the safe 35% threshold).`,
            `Credit assessment confirms high repayment probability (${confidencePercent}% confidence).`,
            `Key decision factors independently verified with ${(consistencyScore * 100).toFixed(0)}% consensus across underwriting checks.`
        ];

        return {
            tier: 'AUTO_APPROVE',
            badgeText: 'RECOMMENDED FOR SANCTION',
            badgeClass: 'bg-green-700 text-white border-green-800',
            cardBgClass: 'bg-green-50/70 border-green-300',
            indicatorClass: 'bg-green-600',
            textColor: 'text-green-900',
            accentColor: 'text-green-700',
            headline: 'Eligible for Sanction: Strong financial capacity and verified credit standing.',
            reasons,
            nextStep: 'All financial checks and reliability benchmarks passed. Safe to generate sanction letter.'
        };
    }

    // =========================================================================
    // CASE 2: OFFICER REVIEW REQUIRED (Amber / Yellow)
    // Triggers for moderate debt burden (35% to 50%), borderline confidence, or review needed
    // =========================================================================
    const reasons = [];

    if (dtiRatio > 0.35 && dtiRatio <= 0.50) {
        if (existingEMI > 0) {
            reasons.push(`Total monthly debt (₹${Math.round(totalObligation).toLocaleString('en-IN')} including ₹${Math.round(existingEMI).toLocaleString('en-IN')} existing EMIs) takes ${dtiPercent} of income.`);
        } else {
            reasons.push(`Monthly EMI takes ${dtiPercent} of income (moderate debt burden between 35% and 50%).`);
        }
    }
    if (confidencePercent < 70) {
        reasons.push(`Model confidence is moderate at ${confidencePercent}%, indicating a borderline applicant.`);
    }
    if (trustPercent < 70) {
        reasons.push(`Underwriting factors show moderate consensus (${trustPercent}%); loan officer verification advised.`);
    }
    if (reasons.length === 0) {
        reasons.push('Application has balanced parameters requiring standard loan officer verification.');
    }

    return {
        tier: 'OFFICER_REVIEW',
        badgeText: 'OFFICER REVIEW REQUIRED: BORDERLINE CASE',
        badgeClass: 'bg-amber-600 text-white border-amber-700',
        cardBgClass: 'bg-amber-50/70 border-amber-300',
        indicatorClass: 'bg-amber-500',
        textColor: 'text-amber-900',
        accentColor: 'text-amber-700',
        headline: 'Manual Review Suggested: Moderate debt burden or borderline credit profile requires officer approval.',
        reasons,
        nextStep: 'Verify applicant income documents, employer details, and existing liabilities before sanction.'
    };
};
