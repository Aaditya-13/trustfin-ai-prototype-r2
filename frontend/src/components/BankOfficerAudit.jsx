import React, { useState } from 'react';
import FaithfulnessCheckDetails from './FaithfulnessCheckDetails';
import PolicyCheckNotice from './PolicyCheckNotice';
import StabilityCheckDetails from './StabilityCheckDetails';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  ArrowLeft, ShieldCheck, CheckCircle, AlertTriangle, AlertCircle,
  Info, ChevronDown, ChevronUp, BarChart2, Layers, Cpu, Check, HelpCircle
} from 'lucide-react';
import { getBankingLabel, getBankingDescription, getFeatureActualValue, getContributionLabel } from '../utils/bankingTerms';
import { formatTrustFormula, formatTrustWeight } from '../utils/trustScorePresentation';

const BankOfficerAudit = ({ result, applicantData, onBackToSummary }) => {
  const [activeExplainerTab, setActiveExplainerTab] = useState('shap');
  const [showFormula, setShowFormula] = useState(true);

  if (!result) return null;

  const isApproved = result.prediction === 'Approved';
  const trustPercent = Math.max(0, Math.min(100, result.trustScore.overallTrustScore * 100));

  // Trust Reliability Classification
  let trustLevel = {
    label: 'HIGH EXPLANATION SCORE',
    color: 'text-green-800 bg-green-50 border-green-300',
    badgeColor: 'bg-green-700',
    desc: 'The combined explanation score is high. Review the individual checks and any nearby decision changes.'
  };
  if (trustPercent < 70) {
    trustLevel = {
      label: 'LOW SCORE: REVIEW REQUIRED',
      color: 'text-red-800 bg-red-50 border-red-300',
      badgeColor: 'bg-red-700',
      desc: 'The combined explanation score is low. Review the individual checks to see which need attention.'
    };
  } else if (trustPercent < 85) {
    trustLevel = {
      label: 'MODERATE SCORE: REVIEW RECOMMENDED',
      color: 'text-amber-800 bg-amber-50 border-amber-300',
      badgeColor: 'bg-amber-600',
      desc: 'The combined explanation score is moderate. Review the individual checks before using the explanation.'
    };
  }

  // Prepare SHAP Data mapped to official banking names and actual input values
  const shapSorted = [...result.shap.features].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const shapData = shapSorted.slice(0, 7).map(f => ({
    rawName: f.feature,
    name: getBankingLabel(f.feature),
    contribution: Number(f.contribution.toFixed(3)),
    direction: f.direction,
    actualValue: getFeatureActualValue(f.feature, applicantData, result, f.value)
  }));

  // Prepare LIME Data mapped to official banking names and actual input values
  const limeSorted = [...result.lime.features].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const limeData = limeSorted.slice(0, 7).map(f => ({
    rawName: f.feature,
    name: getBankingLabel(f.feature),
    contribution: Number(f.contribution.toFixed(3)),
    direction: f.direction,
    actualValue: getFeatureActualValue(f.feature, applicantData, result, f.value)
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
    const featVal = shapFeat ? shapFeat.value : (limeFeat ? limeFeat.value : undefined);

    let status = 'Explanation Difference';
    let statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200';

    if ((shapVal > 0.001 && limeVal > 0.001) || (shapVal < -0.001 && limeVal < -0.001)) {
      status = shapVal > 0 ? 'Both Support Approval' : 'Both Support Rejection';
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
      isAgreement: (shapVal * limeVal > 0),
      actualValue: getFeatureActualValue(rawName, applicantData, result, featVal)
    };
  });

  const agreementCount = agreementRows.filter(r => r.isAgreement).length;
  const directionalConcordance = agreementRows.length > 0 ? ((agreementCount / agreementRows.length) * 100).toFixed(0) : '0';

  // Helper to get color-matched semantic icon for concordance status
  const getStatusIcon = (status) => {
    if (status === 'Both Support Approval') {
      return <CheckCircle className="w-3 h-3 text-green-700 shrink-0" />;
    }
    if (status === 'Both Support Rejection') {
      return <AlertCircle className="w-3 h-3 text-red-600 shrink-0" />;
    }
    if (status === 'Explanation Difference') {
      return <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />;
    }
    return <Info className="w-3 h-3 text-gray-500 shrink-0" />;
  };

  // Custom Hover Tooltip for Explainer Bar Charts displaying actual dossier value and impact
  const CustomExplainerTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isPositive = data.contribution > 0;
      return (
        <div className="bg-white p-3 border border-gray-300 shadow-lg rounded-sm text-xs min-w-[250px] z-50">
          <div className="flex items-center justify-between border-b border-gray-200 pb-1.5 mb-2">
            <span className="font-bold text-gray-900 text-[12px]">{data.name}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-xs uppercase tracking-wider ${isPositive ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
              }`}>
              {getContributionLabel(data.contribution)}
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center gap-3">
              <span className="text-gray-600 font-medium">Applicant's Value:</span>
              <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-xs border border-gray-200">
                {data.actualValue || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center gap-3">
              <span className="text-gray-600 font-medium">
                {activeExplainerTab === 'shap' ? 'SHAP Contribution:' : 'LIME Contribution:'}
              </span>
              <span className={`font-mono font-bold text-[12px] ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
                {data.contribution > 0 ? `+${data.contribution.toFixed(4)}` : data.contribution.toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between items-center gap-3 text-[11px] pt-1.5 border-t border-gray-100">
              <span className="text-gray-500">Effect on Model Prediction:</span>
              <span className={`font-semibold ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
                {getContributionLabel(data.contribution)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <PolicyCheckNotice result={result} />

      {/* Header Navigation & Audit Context */}
      <div className="bg-white border border-gray-300 p-4 rounded-sm shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToSummary}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-sm text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors border border-gray-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Summary
          </button>
          <div>
            <h2 className="text-base font-extrabold text-gray-900 uppercase tracking-tight flex items-center gap-1.5">
              <Cpu className="w-5 h-5 text-gov-blue" />
              Explanation Review
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Compare SHAP and LIME, explanation quality and Gender sensitivity
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
              Factors Behind the Model Prediction
            </h3>
            <p className="text-xs text-gray-600">
              Factors highlighted by each method. Hover over a bar to view the submitted value and contribution.
            </p>
          </div>

          {/* Explainer Tab Switcher */}
          <div className="flex border border-gray-300 rounded-sm overflow-hidden text-xs font-semibold">
            <button
              onClick={() => setActiveExplainerTab('shap')}
              className={`px-3 py-1.5 transition-colors cursor-pointer ${activeExplainerTab === 'shap'
                ? 'bg-gov-blue text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Explainer 1: SHAP
            </button>
            <button
              onClick={() => setActiveExplainerTab('lime')}
              className={`px-3 py-1.5 transition-colors cursor-pointer ${activeExplainerTab === 'lime'
                ? 'bg-gov-blue text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Explainer 2: LIME
            </button>
          </div>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm text-xs text-gray-700 mb-4">
          {activeExplainerTab === 'shap' ? (
            <span>
              <strong>SHAP Explanation:</strong> Shows how each feature contributes to the model output for this application. Contributions use log-odds, rather than approval percentage points.
            </span>
          ) : (
            <span>
              <strong>LIME Explanation:</strong> Approximates model behaviour near this application and highlights influential features. Its contribution values use a different scale from SHAP.
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
              <XAxis type="number" tick={{ fill: '#4b5563', fontSize: 11 }} />
              <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 11, fill: '#1f2937' }} />
              <Tooltip
                content={<CustomExplainerTooltip />}
                cursor={{ fill: 'rgba(0, 86, 179, 0.05)' }}
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
            <span className="w-3 h-3 bg-green-600 inline-block rounded-xs"></span> Positive Contribution (Supports Approval)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-red-600 inline-block rounded-xs"></span> Negative Contribution (Supports Rejection)
          </span>
        </div>
      </div>

      {/* Section 2: SHAP vs. LIME Concordance Matrix */}
      <div className="bg-white p-6 border border-gray-300 shadow-sm rounded-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-300 pb-3 mb-4 gap-2">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase flex items-center gap-2">
              <Layers className="w-4 h-4 text-gov-blue" />
              Explanation Agreement Comparison
            </h3>
            <p className="text-xs text-gray-600">
              Compare the important features and their directions. Agreement alone does not prove correctness.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-1 text-xs bg-slate-100 border border-slate-300 text-slate-800 font-semibold rounded-sm">
              Directions in This Table: <strong>{directionalConcordance}%</strong>
            </span>
            <span className="px-2.5 py-1 text-xs bg-slate-100 border border-slate-300 text-slate-800 font-semibold rounded-sm">
              Consistency Score: <strong>{(result.trustScore.consistency * 100).toFixed(0)}%</strong>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300 text-gray-800 uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-3">Application Factor</th>
                <th className="py-2.5 px-3 text-center">Applicant's Value</th>
                <th className="py-2.5 px-3 text-right">Explainer 1: SHAP</th>
                <th className="py-2.5 px-3 text-right">Explainer 2: LIME</th>
                <th className="py-2.5 px-3 text-center">Agreement Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {agreementRows.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-2 px-3 font-semibold text-gray-900">
                    {row.bankingLabel}
                    <span className="block text-[10px] text-gray-500 font-normal">{getBankingDescription(row.rawName)}</span>
                  </td>
                  <td className="py-2 px-3 text-center font-mono font-bold text-gray-800">
                    <span className="bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-xs">
                      {row.actualValue}
                    </span>
                  </td>
                  <td className={`py-2 px-3 text-right font-mono font-medium ${row.shapVal > 0 ? 'text-green-700' : row.shapVal < 0 ? 'text-red-700' : 'text-gray-500'}`}>
                    {row.shapVal > 0 ? `+${row.shapVal.toFixed(3)}` : row.shapVal.toFixed(3)}
                  </td>
                  <td className={`py-2 px-3 text-right font-mono font-medium ${row.limeVal > 0 ? 'text-green-700' : row.limeVal < 0 ? 'text-red-700' : 'text-gray-500'}`}>
                    {row.limeVal > 0 ? `+${row.limeVal.toFixed(3)}` : row.limeVal.toFixed(3)}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-sm border ${row.statusBadgeClass}`}>
                      {getStatusIcon(row.status)}
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
            <strong>INFO:</strong> Strong agreement between Explainer 1 (SHAP) and Explainer 2 (LIME) confirms consistent credit rationale across both independent models.
          </span>
        </div>
      </div>

      {/* Section 3: 4-Pillar Quantitative Evaluation Suite */}
      <div className="bg-white p-6 border border-gray-300 shadow-sm rounded-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-300 pb-3 mb-4 gap-2">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-gov-blue" />
              Four Validation Checks
            </h3>
            <p className="text-xs text-gray-600">
              Explanation faithfulness, stability, SHAP-LIME agreement and Gender sensitivity
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
              <span className="text-[10px] font-semibold text-gray-500 bg-white px-1.5 py-0.5 border border-gray-200 rounded-xs">{formatTrustWeight(result.trustScore, 'faithfulness')}</span>
            </div>
            <p className="text-2xl font-black text-gray-900 font-mono mt-1">{(result.trustScore.faithfulness * 100).toFixed(1)}%</p>
            <FaithfulnessCheckDetails result={result} />
          </div>

          {/* Pillar 2: Stability */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-gray-700 uppercase">2. Stability</span>
              <span className="text-[10px] font-semibold text-gray-500 bg-white px-1.5 py-0.5 border border-gray-200 rounded-xs">{formatTrustWeight(result.trustScore, 'stability')}</span>
            </div>
            <p className="text-2xl font-black text-gray-900 font-mono mt-1">{(result.trustScore.stability * 100).toFixed(1)}%</p>
            <p className="text-xs text-gray-700 font-semibold mt-1">Similarity After Small Input Changes</p>
            <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
              Combines importance-rank similarity (70%) and contribution-direction agreement (30%). New assessments average valid nearby financial changes using SHAP.
            </p>
            <StabilityCheckDetails result={result} />
          </div>

          {/* Pillar 3: Consistency */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-gray-700 uppercase">3. Consistency</span>
              <span className="text-[10px] font-semibold text-gray-500 bg-white px-1.5 py-0.5 border border-gray-200 rounded-xs">{formatTrustWeight(result.trustScore, 'consistency')}</span>
            </div>
            <p className="text-2xl font-black text-gray-900 font-mono mt-1">{(result.trustScore.consistency * 100).toFixed(1)}%</p>
            <p className="text-xs text-gray-700 font-semibold mt-1">SHAP and LIME Agreement</p>
            <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
              Combines top-five feature overlap (60%) and direction agreement among shared features (40%) between SHAP and LIME.
            </p>
          </div>

          {/* Pillar 4: Fairness */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-gray-700 uppercase">4. Fairness</span>
              <span className="text-[10px] font-semibold text-gray-500 bg-white px-1.5 py-0.5 border border-gray-200 rounded-xs">{formatTrustWeight(result.trustScore, 'fairness')}</span>
            </div>
            <p className="text-2xl font-black text-gray-900 font-mono mt-1">{result.trustScore.fairness == null ? 'N/A' : `${(result.trustScore.fairness * 100).toFixed(1)}%`}</p>
            <p className="text-xs text-gray-700 font-semibold mt-1">Gender Sensitivity Check</p>
            <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
              Changes only Gender and measures the change in approval probability. A higher score means less change; it does not establish fairness across groups.
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
            {showFormula ? 'Hide scoring details' : 'View scoring details'}
            {showFormula ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showFormula && (
            <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-sm text-xs text-gray-700 space-y-3">
              <p className="font-bold text-gray-900 uppercase tracking-wider">How the Trust Score Is Calculated:</p>
              <div className="bg-white p-2.5 border border-gray-300 rounded-sm text-gray-900">
                <p className="font-mono font-semibold text-center leading-relaxed">
                  {formatTrustFormula(result.trustScore)}
                </p>
                <p className="text-[11px] text-gray-500 text-center mt-1">
                  New assessments give faithfulness, stability and consistency one-third each. Displayed percentages are rounded. Fairness is shown separately.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="bg-white p-3 border border-gray-200 rounded-sm">
                  <p className="font-bold text-gray-800 mb-1">Faithfulness: Does the explanation match the model?</p>
                  <p className="text-[11px] text-gray-700 leading-relaxed">
                    {result.faithfulnessCheck?.method === 'local_concordance'
                      ? 'We compare the original model probability with the approximation from each short explanation, then combine their local concordance scores using the recorded weights.'
                      : 'The method was not recorded for this saved assessment. Its original score is preserved.'}
                  </p>
                  <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-sm text-[11px] text-gray-700 leading-relaxed">
                    <strong>Current method example</strong> A model probability of 80% and explanation estimate of 76% give local concordance of 96%. SHAP concordance of 96% and LIME concordance of 80% combine to 89.6% using 60/40 weights.
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1.5">
                    <strong>Higher local concordance =</strong> closer reconstruction of the original prediction. It does not verify correct assignment of contributions to features or behavior on other applicants.
                  </p>
                </div>
                <div className="bg-white p-3 border border-gray-200 rounded-sm">
                  <p className="font-bold text-gray-800 mb-1">Consistency: Do SHAP and LIME Highlight Similar Factors?</p>
                  <p className="text-[11px] text-gray-700 leading-relaxed">
                    We compare the five largest absolute contributions from each method and the directions of their shared features.
                  </p>
                  <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-sm text-[11px] text-gray-700 leading-relaxed">
                    <strong>Example</strong> Matching top-five features and directions give 100%. Matching features with all directions reversed give 60% under this formula.
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1.5">
                    <strong>Higher score =</strong> both explanation methods identify more of the same important factors.
                  </p>
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
          Return to Evaluation Summary
        </button>
      </div>

    </div>
  );
};

export default BankOfficerAudit;
