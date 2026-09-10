import React, { useState } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { 
    ArrowLeft, ShieldCheck, CheckCircle, AlertTriangle, 
    Info, ChevronDown, ChevronUp, BarChart2, Layers, Cpu, Check, HelpCircle
} from 'lucide-react';
import { getBankingLabel, getBankingDescription } from '../utils/bankingTerms';

const BankOfficerAudit = ({ result, applicantData, onBackToSummary }) => {
    const [activeExplainerTab, setActiveExplainerTab] = useState('shap');
    const [showFormula, setShowFormula] = useState(true);

    if (!result) return null;

    const isApproved = result.prediction === 'Approved';
    const trustPercent = Math.max(0, Math.min(100, result.trustScore.overallTrustScore * 100));

    // Trust Reliability Classification
    let trustLevel = {
        label: 'HIGH TRUST: RELIABLE EXPLANATION',
        color: 'text-green-800 bg-green-50 border-green-300',
        badgeColor: 'bg-green-700',
        desc: 'Both explanation methods strongly agree and the decision remains stable under input perturbation.'
    };
    if (trustPercent < 50) {
        trustLevel = {
            label: 'LOW TRUST: MANUAL REVIEW REQUIRED',
            color: 'text-red-800 bg-red-50 border-red-300',
            badgeColor: 'bg-red-700',
            desc: 'Explanation methods conflict or are unstable. A loan officer must review manually.'
        };
    } else if (trustPercent < 75) {
        trustLevel = {
            label: 'MODERATE TRUST: REVIEW RECOMMENDED',
            color: 'text-amber-800 bg-amber-50 border-amber-300',
            badgeColor: 'bg-amber-600',
            desc: 'Minor differences found between explanation methods; officer review suggested.'
        };
    }

    // Prepare SHAP Data mapped to official banking names
    const shapSorted = [...result.shap.features].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
    const shapData = shapSorted.slice(0, 7).map(f => ({
        rawName: f.feature,
        name: getBankingLabel(f.feature),
        contribution: Number(f.contribution.toFixed(3)),
        direction: f.direction
    }));

    // Prepare LIME Data mapped to official banking names
    const limeSorted = [...result.lime.features].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
    const limeData = limeSorted.slice(0, 7).map(f => ({
        rawName: f.feature,
        name: getBankingLabel(f.feature),
        contribution: Number(f.contribution.toFixed(3)),
        direction: f.direction
    }));

    // Prepare Feature Agreement Comparison Table (Union of top SHAP & LIME features)
    const topShapNames = shapSorted.slice(0, 5).map(f => f.feature);
    const topLimeNames = limeSorted.slice(0, 5).map(f => f.feature);
    const comparisonFeatureNames = Array.from(new Set([...topShapNames, ...topLimeNames])).slice(0, 7);

    const agreementRows = comparisonFeatureNames.map(rawName => {
        const shapFeat = result.shap.features.find(f => f.feature === rawName);
        const limeFeat = result.lime.features.find(f => f.feature === rawName);
        const shapVal = shapFeat ? shapFeat.contribution : 0;
        const limeVal = limeFeat ? limeFeat.contribution : 0;

        let status = 'Explanation Difference';
        let statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200';

        if ((shapVal > 0.001 && limeVal > 0.001) || (shapVal < -0.001 && limeVal < -0.001)) {
            status = shapVal > 0 ? 'Agreed: Positive Factor' : 'Agreed: Risk Factor';
            statusBadgeClass = shapVal > 0 ? 'bg-green-50 text-green-800 border-green-300' : 'bg-red-50 text-red-800 border-red-300';
        } else if (Math.abs(shapVal) < 0.001 || Math.abs(limeVal) < 0.001) {
            status = 'Low Impact';
            statusBadgeClass = 'bg-gray-50 text-gray-600 border-gray-200';
        }

        return {
            rawName,
            bankingLabel: getBankingLabel(rawName),
            shapVal,
            limeVal,
            status,
            statusBadgeClass,
            isAgreement: (shapVal * limeVal > 0)
        };
    });

    const agreementCount = agreementRows.filter(r => r.isAgreement).length;
    const directionalConcordance = agreementRows.length > 0 ? ((agreementCount / agreementRows.length) * 100).toFixed(0) : '0';

    return (
        <div className="space-y-6">
            
            {/* Header Navigation & Audit Context */}
            <div className="bg-white border border-gray-300 p-4 rounded-sm shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onBackToSummary}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-sm text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors border border-gray-300"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Underwriting Summary
                    </button>
                    <div>
                        <h2 className="text-base font-extrabold text-gray-900 uppercase tracking-tight flex items-center gap-1.5">
                            <Cpu className="w-5 h-5 text-gov-blue" />
                            In-Depth XAI & Trust Audit Suite
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Algorithmic Accountability, Explainer Concordance, and Mathematical Robustness
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-gray-600 bg-gray-50 border border-gray-300 px-2 py-1 rounded-sm">
                        Decision: <strong className={isApproved ? 'text-green-700' : 'text-red-700'}>{result.prediction}</strong> ({(result.confidenceScore * 100).toFixed(1)}%)
                    </span>
                </div>
            </div>

            {/* Section 1: Dual Explainer Visual Attribution (SHAP vs. LIME) */}
            <div className="bg-white p-6 border border-gray-300 shadow-sm rounded-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-300 pb-3 mb-4 gap-2">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase flex items-center gap-2">
                            <BarChart2 className="w-4 h-4 text-gov-blue" />
                            Local Feature Attribution (SHAP vs. LIME)
                        </h3>
                        <p className="text-xs text-gray-600">
                            Quantified impact of individual applicant characteristics on the credit scoring model
                        </p>
                    </div>

                    {/* Explainer Tab Switcher */}
                    <div className="flex border border-gray-300 rounded-sm overflow-hidden text-xs font-semibold">
                        <button
                            onClick={() => setActiveExplainerTab('shap')}
                            className={`px-3 py-1.5 transition-colors cursor-pointer ${
                                activeExplainerTab === 'shap' 
                                    ? 'bg-gov-blue text-white' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            SHAP (Shapley Values)
                        </button>
                        <button
                            onClick={() => setActiveExplainerTab('lime')}
                            className={`px-3 py-1.5 transition-colors cursor-pointer ${
                                activeExplainerTab === 'lime' 
                                    ? 'bg-gov-blue text-white' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            LIME (Local Surrogates)
                        </button>
                    </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm text-xs text-gray-700 mb-4">
                    {activeExplainerTab === 'shap' ? (
                        <span>
                            <strong>SHAP (Shapley Additive Explanations):</strong> Grounded in cooperative game theory. Computes the exact marginal contribution of each variable across all possible feature combinations.
                        </span>
                    ) : (
                        <span>
                            <strong>LIME (Local Interpretable Model-agnostic Explanations):</strong> Trains an interpretable sparse linear surrogate model locally around the applicant's specific feature vector.
                        </span>
                    )}
                </div>

                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            layout="vertical"
                            data={activeExplainerTab === 'shap' ? shapData : limeData}
                            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                            <XAxis type="number" tick={{fill: '#4b5563', fontSize: 11}} />
                            <YAxis dataKey="name" type="category" width={180} tick={{fontSize: 11, fill: '#1f2937'}} />
                            <Tooltip 
                                formatter={(val) => [Number(val).toFixed(4), 'Attribution Weight']}
                                contentStyle={{ borderRadius: '2px', border: '1px solid #d1d5db', fontSize: '12px' }} 
                            />
                            <Bar dataKey="contribution" isAnimationActive={false}>
                                {(activeExplainerTab === 'shap' ? shapData : limeData).map((entry, index) => (
                                     <Cell key={`cell-${index}`} fill={entry.contribution > 0 ? '#28a745' : '#dc3545'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex justify-center gap-6 mt-3 text-xs font-semibold text-gray-700">
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 bg-green-600 inline-block rounded-xs"></span> Positive Factor (Supports Approval)
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 bg-red-600 inline-block rounded-xs"></span> Negative Factor (Increases Risk)
                    </span>
                </div>
            </div>

            {/* Section 2: SHAP vs. LIME Concordance Matrix */}
            <div className="bg-white p-6 border border-gray-300 shadow-sm rounded-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-300 pb-3 mb-4 gap-2">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase flex items-center gap-2">
                            <Layers className="w-4 h-4 text-gov-blue" />
                            Cross-Explainer Concordance Matrix
                        </h3>
                        <p className="text-xs text-gray-600">
                            Evaluating alignment between independent post-hoc explainers to detect algorithmic hallucinations
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className="px-2.5 py-1 text-xs bg-slate-100 border border-slate-300 text-slate-800 font-semibold rounded-sm">
                            Directional Concordance: <strong>{directionalConcordance}%</strong>
                        </span>
                        <span className="px-2.5 py-1 text-xs bg-slate-100 border border-slate-300 text-slate-800 font-semibold rounded-sm">
                            Top Factors Agreement: <strong>{(result.trustScore.consistency * 100).toFixed(0)}%</strong>
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-100 border-b border-gray-300 text-gray-800 uppercase tracking-wider font-semibold">
                                <th className="py-2.5 px-3">Feature Parameter</th>
                                <th className="py-2.5 px-3 text-right">SHAP Contribution</th>
                                <th className="py-2.5 px-3 text-right">LIME Contribution</th>
                                <th className="py-2.5 px-3 text-center">Concordance Assessment</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {agreementRows.map((row, idx) => (
                                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="py-2 px-3 font-semibold text-gray-900">
                                        {row.bankingLabel}
                                        <span className="block text-[10px] text-gray-500 font-normal">{getBankingDescription(row.rawName)}</span>
                                    </td>
                                    <td className={`py-2 px-3 text-right font-mono font-medium ${row.shapVal > 0 ? 'text-green-700' : row.shapVal < 0 ? 'text-red-700' : 'text-gray-500'}`}>
                                        {row.shapVal > 0 ? `+${row.shapVal.toFixed(3)}` : row.shapVal.toFixed(3)}
                                    </td>
                                    <td className={`py-2 px-3 text-right font-mono font-medium ${row.limeVal > 0 ? 'text-green-700' : row.limeVal < 0 ? 'text-red-700' : 'text-gray-500'}`}>
                                        {row.limeVal > 0 ? `+${row.limeVal.toFixed(3)}` : row.limeVal.toFixed(3)}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-sm border ${row.statusBadgeClass}`}>
                                            {row.isAgreement ? (
                                                <CheckCircle className="w-3 h-3 text-green-700" />
                                            ) : (
                                                <AlertTriangle className="w-3 h-3 text-amber-700" />
                                            )}
                                            {row.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-sm text-xs text-blue-900 flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                    <span>
                        <strong>Auditor Guidance:</strong> High concordance between SHAP and LIME gives mathematical certainty that both local and cooperative game-theoretic formulations corroborate the same underwriting rationale.
                    </span>
                </div>
            </div>

            {/* Section 3: 4-Pillar Quantitative Evaluation Suite */}
            <div className="bg-white p-6 border border-gray-300 shadow-sm rounded-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-300 pb-3 mb-4 gap-2">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-gov-blue" />
                            4-Pillar Quantitative Validation Framework
                        </h3>
                        <p className="text-xs text-gray-600">
                            Mathematical validation of explanation fidelity, perturbation invariance, cross-method agreement, and demographic fairness
                        </p>
                    </div>
                    <div className={`px-3 py-1 text-xs font-bold uppercase rounded-sm border flex items-center gap-1.5 ${trustLevel.color}`}>
                        <span className={`w-2 h-2 rounded-full ${trustLevel.badgeColor}`}></span>
                        {trustPercent.toFixed(1)}% Overall Trust Score
                    </div>
                </div>

                {/* 4 Pillars Full Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* Pillar 1: Faithfulness */}
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-sm">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-gray-700 uppercase">1. Faithfulness</span>
                            <span className="text-[10px] font-semibold text-gray-500 bg-white px-1.5 py-0.5 border border-gray-200 rounded-xs">Weight: 25%</span>
                        </div>
                        <p className="text-2xl font-black text-gray-900 font-mono mt-1">{(result.trustScore.faithfulness * 100).toFixed(1)}%</p>
                        <p className="text-xs text-gray-700 font-semibold mt-1">Feature Masking Test</p>
                        <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                            Validates that masking top-ranked features causes a significant drop in prediction probability, proving truthfulness.
                        </p>
                    </div>

                    {/* Pillar 2: Stability */}
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-sm">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-gray-700 uppercase">2. Stability</span>
                            <span className="text-[10px] font-semibold text-gray-500 bg-white px-1.5 py-0.5 border border-gray-200 rounded-xs">Weight: 25%</span>
                        </div>
                        <p className="text-2xl font-black text-gray-900 font-mono mt-1">{(result.trustScore.stability * 100).toFixed(1)}%</p>
                        <p className="text-xs text-gray-700 font-semibold mt-1">Noise Perturbation Test</p>
                        <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                            Injects 1% Gaussian noise into numerical features to ensure top explanation ranks remain robust and invariant.
                        </p>
                    </div>

                    {/* Pillar 3: Consistency */}
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-sm">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-gray-700 uppercase">3. Consistency</span>
                            <span className="text-[10px] font-semibold text-gray-500 bg-white px-1.5 py-0.5 border border-gray-200 rounded-xs">Weight: 25%</span>
                        </div>
                        <p className="text-2xl font-black text-gray-900 font-mono mt-1">{(result.trustScore.consistency * 100).toFixed(1)}%</p>
                        <p className="text-xs text-gray-700 font-semibold mt-1">Jaccard Top-K Similarity</p>
                        <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                            Measures the intersection over union (IoU) of the top 3 critical features selected by SHAP versus LIME.
                        </p>
                    </div>

                    {/* Pillar 4: Fairness */}
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-sm">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-gray-700 uppercase">4. Fairness</span>
                            <span className="text-[10px] font-semibold text-gray-500 bg-white px-1.5 py-0.5 border border-gray-200 rounded-xs">Weight: 25%</span>
                        </div>
                        <p className="text-2xl font-black text-gray-900 font-mono mt-1">{((result.trustScore.fairness ?? 1.0) * 100).toFixed(1)}%</p>
                        <p className="text-xs text-gray-700 font-semibold mt-1">Protected Attribute Parity</p>
                        <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                            Tests whether perturbing demographic indicators (e.g. Gender, Marital Status) shifts the credit determination.
                        </p>
                    </div>

                </div>

                {/* Formula Transparency Drawer */}
                <div className="mt-5 pt-3 border-t border-gray-200">
                    <button 
                        onClick={() => setShowFormula(!showFormula)}
                        className="text-xs font-semibold text-gov-blue hover:underline flex items-center gap-1 focus:outline-none cursor-pointer"
                    >
                        <Info className="w-3.5 h-3.5" />
                        {showFormula ? 'Hide Mathematical Formulations & Calibration Details' : 'View Mathematical Formulations & Calibration Details'}
                        {showFormula ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    {showFormula && (
                        <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-sm text-xs text-gray-700 space-y-3">
                            <p className="font-bold text-gray-900 uppercase tracking-wider">Composite Trust Index Formulation:</p>
                            <p className="bg-white p-2.5 border border-gray-300 rounded-sm font-mono text-gray-900">
                                <strong>Trust Score (T)</strong> = (0.25 × Faithfulness) + (0.25 × Stability) + (0.25 × Consistency) + (0.25 × Fairness)
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                <div className="bg-white p-3 border border-gray-200 rounded-sm">
                                    <p className="font-bold text-gray-800 mb-1">Faithfulness Formulation:</p>
                                    <p className="font-mono text-[11px] text-gray-700">F = 1.0 - (P_masked / P_original)</p>
                                    <p className="text-[11px] text-gray-500 mt-1">High drop in output probability indicates genuine dependency on identified top features.</p>
                                </div>
                                <div className="bg-white p-3 border border-gray-200 rounded-sm">
                                    <p className="font-bold text-gray-800 mb-1">Consistency Formulation:</p>
                                    <p className="font-mono text-[11px] text-gray-700">J(S, L) = |TopK(S) ∩ TopK(L)| / |TopK(S) ∪ TopK(L)|</p>
                                    <p className="text-[11px] text-gray-500 mt-1">Jaccard set similarity between top-3 SHAP attributions and top-3 LIME attributions.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Return Button */}
            <div className="pt-2 flex justify-between items-center">
                <button
                    type="button"
                    onClick={onBackToSummary}
                    className="px-4 py-2 bg-gov-blue hover:bg-blue-900 text-white rounded-sm text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Return to Underwriting Summary
                </button>
            </div>

        </div>
    );
};

export default BankOfficerAudit;
