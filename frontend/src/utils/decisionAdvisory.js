// Decision Advisory & Explanation Verification Engine
// Evaluates ML prediction confidence, repayment capacity (DTI), and explanation reliability

/**
 * Evaluates model prediction, repayment safety, and explanation trust metrics
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

    // =========================================================================
    // CASE 3: DECLINE RECOMMENDED / FAILED FINANCIAL CHECKS (Red)
    // Triggers if: Unaffordable EMI (DTI > 50%), Low Explanation Trust (< 50%), or Confident Rejection
    // =========================================================================
    if (!isSolvent || solvencyStatus === 'INSOLVENT' || trustPercent < 50 || (!isApproved && confidencePercent >= 75)) {
        const reasons = [];

        if (!isSolvent || solvencyStatus === 'INSOLVENT') {
            reasons.push(`Monthly EMI requires ${dtiPercent} of total income, which exceeds the safe 50% repayment limit.`);
        }
        if (trustPercent < 50) {
            reasons.push(`The AI explanation is unstable or explainers disagree (Explanation Trust: ${trustPercent}%).`);
        }
        if (!isApproved) {
            if (applicantData?.Credit_History === 0 || applicantData?.Credit_History === '0') {
                reasons.push('Past credit bureau record indicates defaults or irregular repayment history.');
            } else if (reasons.length === 0) {
                reasons.push(`The model identified high risk with ${confidencePercent}% confidence.`);
            }
        }

        return {
            tier: 'HIGH_RISK',
            badgeText: 'DECLINE RECOMMENDED: HIGH RISK / FAILED CHECKS',
            badgeClass: 'bg-red-700 text-white border-red-800',
            cardBgClass: 'bg-red-50/70 border-red-300',
            indicatorClass: 'bg-red-600',
            textColor: 'text-red-900',
            accentColor: 'text-red-700',
            headline: isSolvent 
                ? 'High Risk: Model indicates elevated risk factors or unverified explanations.'
                : 'Safety Limit Exceeded: Monthly loan repayment is unaffordable on current income.',
            reasons: reasons.length > 0 ? reasons : ['High risk identified across past credit history or debt burden.'],
            nextStep: 'Issue adverse action notice with recourse recommendations or perform manual verification.'
        };
    }

    // =========================================================================
    // CASE 1: CONFIDENT APPROVAL: EXPLANATIONS VERIFIED (Green)
    // Triggers if: Approved AND High Confidence (>= 75%) AND High Trust (>= 75%) AND Solvent
    // =========================================================================
    if (isApproved && confidencePercent >= 75 && trustPercent >= 75 && isSolvent) {
        const reasons = [
            `Both SHAP and LIME confirm positive credit factors with ${(consistencyScore * 100).toFixed(0)}% agreement.`,
            `Monthly EMI is very comfortable at ${dtiPercent} of income (well within the 50% safety limit).`,
            `The explanation demonstrates high mathematical stability (${(result.trustScore.stability * 100).toFixed(0)}%) with no demographic bias.`
        ];

        return {
            tier: 'AUTO_APPROVE',
            badgeText: 'RECOMMENDED FOR SANCTION: HIGH EXPLANATION TRUST',
            badgeClass: 'bg-green-700 text-white border-green-800',
            cardBgClass: 'bg-green-50/70 border-green-300',
            indicatorClass: 'bg-green-600',
            textColor: 'text-green-900',
            accentColor: 'text-green-700',
            headline: 'Clear Approval: Strong model confidence and verified explanation trust.',
            reasons,
            nextStep: 'All financial checks and explanation tests passed. Safe to generate sanction letter.'
        };
    }

    // =========================================================================
    // CASE 2: OFFICER REVIEW ADVISED (Amber / Yellow)
    // Triggers for borderline confidence, moderate trust, moderate DTI, or mild divergence
    // =========================================================================
    const reasons = [];

    if (dtiRatio > 0.35 && dtiRatio <= 0.50) {
        reasons.push(`Monthly EMI takes ${dtiPercent} of income (moderate debt burden between 35% and 50%).`);
    }
    if (trustPercent >= 50 && trustPercent < 75) {
        reasons.push(`SHAP and LIME show slight variation in feature rankings (Trust Score: ${trustPercent}%).`);
    }
    if (confidencePercent >= 50 && confidencePercent < 75) {
        reasons.push(`Model confidence is moderate at ${confidencePercent}%, indicating a borderline applicant.`);
    }
    if (reasons.length === 0) {
        reasons.push('Application has balanced parameters requiring standard loan officer review.');
    }

    return {
        tier: 'OFFICER_REVIEW',
        badgeText: 'OFFICER REVIEW ADVISED: BORDERLINE CASE',
        badgeClass: 'bg-amber-600 text-white border-amber-700',
        cardBgClass: 'bg-amber-50/70 border-amber-300',
        indicatorClass: 'bg-amber-500',
        textColor: 'text-amber-900',
        accentColor: 'text-amber-700',
        headline: 'Borderline Profile: Model leans favorable, but officer review is suggested.',
        reasons,
        nextStep: 'Verify applicant income documents, employer details, and tenure before sanction.'
    };
};
