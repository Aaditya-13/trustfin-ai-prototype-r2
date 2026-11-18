// Presentation guidance shared by the officer and applicant views.
// These labels do not change the model prediction or issue a lending decision.

/**
 * Formats model output, configured affordability checks and explanation metrics
 * as plain-English review guidance for both portal views.
 * 
 * @param {Object} result - API response containing prediction, solvencyCheck, trustScore, shap, lime
 * @param {Object} applicantData - Raw applicant profile data
 * @returns {Object} Structured recommendation object
 */
export const getUnderwritingAction = (result, applicantData) => {
    if (!result) return null;

    if (result.policyCheck?.passed === false) {
        return {
            tier: 'HIGH_RISK', badgeText: 'PROJECT POLICY: REJECTED',
            badgeClass: 'bg-red-700 text-white border-red-800',
            cardBgClass: 'bg-red-50/70 border-red-300', indicatorClass: 'bg-red-600',
            textColor: 'text-red-900', accentColor: 'text-red-700',
            headline: 'The application does not meet one or more project lending rules. Review the reasons below.',
            reasons: result.policyCheck.reasons || [],
            nextStep: 'Review the recorded policy reasons and verify the submitted details before reassessment.',
        };
    }

    const isApproved = result.prediction === 'Approved';
    const confidencePercent = Number(((result.confidenceScore || 0) * 100).toFixed(1));
    const trustPercent = Number(((result.trustScore?.overallTrustScore || 0) * 100).toFixed(1));
    const dtiRatio = result.solvencyCheck?.dtiRatio ?? 0;
    const dtiPercent = result.solvencyCheck?.dtiPercent ?? `${(dtiRatio * 100).toFixed(1)}%`;
    const isSolvent = result.solvencyCheck?.isSolvent ?? true;
    const solvencyStatus = result.solvencyCheck?.status ?? 'OPTIMAL';
    const existingEMI = result.solvencyCheck?.existingEMI ?? (Number(applicantData?.Existing_EMI) || 0);
    const totalObligation = result.solvencyCheck?.totalMonthlyObligation ?? ((result.solvencyCheck?.monthlyEMI || 0) + existingEMI);

    // =========================================================================
    // Affordability warning or a model rejection that needs review.
    // =========================================================================
    const affordabilityFailed = !isSolvent || solvencyStatus === 'INSOLVENT' || dtiRatio > 0.50;
    if (affordabilityFailed || (!isApproved && confidencePercent >= 65)) {
        const reasons = [];

        if (affordabilityFailed) {
            if (existingEMI > 0) {
                reasons.push(`Total monthly debt of ₹${Math.round(totalObligation).toLocaleString('en-IN')} (including ₹${Math.round(existingEMI).toLocaleString('en-IN')} existing EMIs) consumes ${dtiPercent} of income, exceeding the project's configured 50% review limit.`);
            } else {
                reasons.push(`Monthly debt takes ${dtiPercent} of income, exceeding the project's configured 50% review limit.`);
            }
        }
        if (!isApproved) {
            reasons.push(`The model gives rejection a score of ${confidencePercent}%. This does not estimate the applicant's chance of failing to repay.`);
        }

        return {
            tier: 'HIGH_RISK',
            badgeText: affordabilityFailed ? 'AFFORDABILITY REVIEW REQUIRED' : 'MODEL REJECTION: REVIEW REQUIRED',
            badgeClass: 'bg-red-700 text-white border-red-800',
            cardBgClass: 'bg-red-50/70 border-red-300',
            indicatorClass: 'bg-red-600',
            textColor: 'text-red-900',
            accentColor: 'text-red-700',
            headline: affordabilityFailed
                ? 'Monthly debt exceeds the configured review limit. Officer review is required, even if the model predicts approval.'
                : 'The model predicts rejection. Review its contributing factors with a loan officer.',
            reasons: reasons.length > 0 ? reasons : ['Review the submitted details and contributing factors.'],
            nextStep: 'Review the submitted income, existing debts and loan terms with the lender before a final decision.'
        };
    }

    // =========================================================================
    // Approved model output with the existing lower-debt and score thresholds.
    // AUTO_APPROVE is a legacy styling identifier, not permission to lend.
    // =========================================================================
    if (isApproved && confidencePercent >= 70 && trustPercent >= 70 && result.solvencyCheck && isSolvent && dtiRatio <= 0.35) {
        const reasons = [
            `Total monthly debt is ${dtiPercent} of the income used for the assessment, within the configured 35% lower-debt band.`,
            `The model gives approval a score of ${confidencePercent}%.`,
            `The project Explanation Trust Score is ${trustPercent}%. It does not establish repayment ability or guarantee approval.`
        ];

        return {
            tier: 'AUTO_APPROVE',
            badgeText: 'MODEL APPROVED: VERIFICATION REQUIRED',
            badgeClass: 'bg-green-700 text-white border-green-800',
            cardBgClass: 'bg-green-50/70 border-green-300',
            indicatorClass: 'bg-green-600',
            textColor: 'text-green-900',
            accentColor: 'text-green-700',
            headline: 'The model predicts approval and the debt ratio is within the lower-debt band. Lender verification is still required.',
            reasons,
            nextStep: 'Verify the submitted information and complete the lender’s normal assessment before approval.'
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
        reasons.push(`The model gives ${result.prediction.toLowerCase()} a score of ${confidencePercent}%. Review the prediction and contributing factors.`);
    }
    if (trustPercent < 70) {
        reasons.push(`The project Explanation Trust Score is ${trustPercent}%; review the individual component checks.`);
    }
    if (!result.solvencyCheck) reasons.push('No affordability assessment is available for this record.');
    if (reasons.length === 0) {
        reasons.push('Application has balanced parameters requiring standard loan officer verification.');
    }

    return {
        tier: 'OFFICER_REVIEW',
        badgeText: 'OFFICER REVIEW REQUIRED',
        badgeClass: 'bg-amber-600 text-white border-amber-700',
        cardBgClass: 'bg-amber-50/70 border-amber-300',
        indicatorClass: 'bg-amber-500',
        textColor: 'text-amber-900',
        accentColor: 'text-amber-700',
        headline: 'Review the model result, debt burden and explanation checks with a loan officer.',
        reasons,
        nextStep: 'Verify income, employment details and existing EMIs before a lending decision.'
    };
};
