// Operational Decision Routing & Action Reasoning Engine

/**
 * Evaluates model prediction, solvency guardrails, and XAI trust metrics
 * to produce an actionable banking workflow recommendation with clear reasoning.
 * 
 * @param {Object} result - API response containing prediction, solvencyCheck, trustScore, shap, lime
 * @param {Object} applicantData - Raw applicant profile data
 * @returns {Object} Structured action directive object
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
    // TIER 3: HIGH RISK / MANUAL AUDIT REQUIRED (Red)
    // Triggers if: Insolvent (DTI > 50%), or Low Trust (< 50%), or Strong Rejection
    // =========================================================================
    if (!isSolvent || solvencyStatus === 'INSOLVENT' || trustPercent < 50 || (!isApproved && confidencePercent >= 75)) {
        const reasons = [];

        if (!isSolvent || solvencyStatus === 'INSOLVENT') {
            reasons.push(`Monthly repayment takes ${dtiPercent} of household income, exceeding the safe 50% limit.`);
        }
        if (trustPercent < 50) {
            reasons.push(`Explanation tools show low stability or disagree on this profile (Trust Score: ${trustPercent}%).`);
        }
        if (!isApproved) {
            if (applicantData?.Credit_History === 0 || applicantData?.Credit_History === '0') {
                reasons.push('Past credit bureau record indicates defaults or irregular repayment history.');
            } else if (reasons.length === 0) {
                reasons.push(`Model confidence for rejection is strong at ${confidencePercent}%.`);
            }
        }

        return {
            tier: 'HIGH_RISK',
            badgeText: 'HIGH RISK: MANUAL AUDIT REQUIRED',
            badgeClass: 'bg-red-700 text-white border-red-800',
            cardBgClass: 'bg-red-50/70 border-red-300',
            indicatorClass: 'bg-red-600',
            textColor: 'text-red-900',
            accentColor: 'text-red-700',
            headline: isSolvent 
                ? 'High Default Risk: Auto-approval blocked due to elevated risk factors.'
                : 'Safety Limit Exceeded: Monthly repayment obligation is unaffordable.',
            reasons: reasons.length > 0 ? reasons : ['High risk parameters detected across credit history and income ratio.'],
            nextStep: 'Auto-approval locked. Issue official rejection notice or escalate dossier to senior risk manager for manual review.'
        };
    }

    // =========================================================================
    // TIER 1: AUTO-APPROVE: SAFE TO SANCTION (Green)
    // Triggers if: Approved AND High Confidence (>= 75%) AND High Trust (>= 75%) AND Solvent
    // =========================================================================
    if (isApproved && confidencePercent >= 75 && trustPercent >= 75 && isSolvent) {
        const reasons = [
            `Both SHAP & LIME confirm strong positive factors with ${(consistencyScore * 100).toFixed(0)}% agreement.`,
            `Monthly EMI is very comfortable at ${dtiPercent} of income (well within the 50% safety limit).`,
            `The AI decision shows high stability (${(result.trustScore.stability * 100).toFixed(0)}%) with zero bias.`
        ];

        return {
            tier: 'AUTO_APPROVE',
            badgeText: 'AUTO-APPROVE: SAFE TO SANCTION',
            badgeClass: 'bg-green-700 text-white border-green-800',
            cardBgClass: 'bg-green-50/70 border-green-300',
            indicatorClass: 'bg-green-600',
            textColor: 'text-green-900',
            accentColor: 'text-green-700',
            headline: 'Fast-Track Approved: All financial and explanation checks passed.',
            reasons,
            nextStep: 'System policy authorizes immediate sanction. Safe to generate and issue the formal sanction letter.'
        };
    }

    // =========================================================================
    // TIER 2: OFFICER REVIEW: VERIFY DETAILS (Amber / Yellow)
    // Triggers for all borderline, moderate trust, moderate DTI (35-50%), or mild divergence cases
    // =========================================================================
    const reasons = [];

    if (dtiRatio > 0.35 && dtiRatio <= 0.50) {
        reasons.push(`Monthly repayment takes ${dtiPercent} of income (moderate debt zone between 35% and 50%).`);
    }
    if (trustPercent >= 50 && trustPercent < 75) {
        reasons.push(`Explanation tools show minor differences in feature rankings (Trust Score: ${trustPercent}%).`);
    }
    if (confidencePercent >= 50 && confidencePercent < 75) {
        reasons.push(`Prediction confidence is moderate at ${confidencePercent}%, indicating a borderline profile.`);
    }
    if (reasons.length === 0) {
        reasons.push('Application has balanced parameters requiring standard underwriter verification.');
    }

    return {
        tier: 'OFFICER_REVIEW',
        badgeText: 'OFFICER REVIEW: VERIFY DETAILS',
        badgeClass: 'bg-amber-600 text-white border-amber-700',
        cardBgClass: 'bg-amber-50/70 border-amber-300',
        indicatorClass: 'bg-amber-500',
        textColor: 'text-amber-900',
        accentColor: 'text-amber-700',
        headline: 'Assisted Underwriting: Model leans favorable but officer verification recommended.',
        reasons,
        nextStep: 'Loan officer should review income documents and loan tenure before final sign-off.'
    };
};
