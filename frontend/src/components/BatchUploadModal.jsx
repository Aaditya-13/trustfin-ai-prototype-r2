import React, { useState } from 'react';
import { 
    X, Upload, FileText, CheckCircle2, AlertTriangle, 
    Download, Play, RefreshCw, Eye, ArrowRight, ShieldCheck, 
    Layers, HelpCircle, AlertCircle, FileSpreadsheet
} from 'lucide-react';
import { 
    uploadBatchFile, 
    submitBatchJson, 
    fetchBatchPreset, 
    downloadSampleBatchCsv,
    fetchEvaluationById 
} from '../services/api';

const BatchUploadModal = ({ isOpen, onClose, onInspectEvaluation, onViewInHistory }) => {
    const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'results'
    const [selectedFile, setSelectedFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [batchResult, setBatchResult] = useState(null);
    const [error, setError] = useState(null);
    const [resultsSubTab, setResultsSubTab] = useState('valid'); // 'valid' | 'flawed'
    const [dragOver, setDragOver] = useState(false);
    const [downloadingSample, setDownloadingSample] = useState(false);

    if (!isOpen) return null;

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.name.endsWith('.csv')) {
                setError("Please select a valid .csv file.");
                return;
            }
            setSelectedFile(file);
            setError(null);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            if (!file.name.endsWith('.csv')) {
                setError("Please upload a valid .csv file.");
                return;
            }
            setSelectedFile(file);
            setError(null);
        }
    };

    const handleProcessFile = async () => {
        if (!selectedFile) return;
        setIsProcessing(true);
        setError(null);
        try {
            const data = await uploadBatchFile(selectedFile);
            setBatchResult(data);
            setActiveTab('results');
        } catch (err) {
            setError(err.response?.data?.detail || "Batch processing failed. Verify server connection.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRunPreset = async (presetId, label) => {
        setIsProcessing(true);
        setError(null);
        try {
            const preset = await fetchBatchPreset(presetId);
            const data = await submitBatchJson(preset.rows, label);
            setBatchResult(data);
            setActiveTab('results');
        } catch (err) {
            setError(err.response?.data?.detail || `Failed to run ${label}. Verify server status.`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownloadSample = async () => {
        setDownloadingSample(true);
        try {
            await downloadSampleBatchCsv();
        } catch (err) {
            alert("Failed to download sample CSV template.");
        } finally {
            setDownloadingSample(false);
        }
    };

    const handleInspectRow = async (item) => {
        if (item.evaluationId) {
            try {
                const fullDetail = await fetchEvaluationById(item.evaluationId);
                onInspectEvaluation(fullDetail);
            } catch {
                onInspectEvaluation({ applicantData: {}, predictionResult: item });
            }
        } else {
            onInspectEvaluation({ applicantData: {}, predictionResult: item });
        }
        onClose();
    };

    const handleReset = () => {
        setSelectedFile(null);
        setBatchResult(null);
        setActiveTab('upload');
        setError(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white border border-gray-400 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-6">
                
                {/* Modal Header */}
                <div className="bg-gov-blue text-white px-5 py-3.5 border-b-2 border-yellow-500 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-blue-900 border border-blue-400 text-yellow-400">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold tracking-tight uppercase">Batch Application Processing</h2>
                                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.2 bg-blue-900 border border-blue-400 text-yellow-300">
                                    Officer Console
                                </span>
                            </div>
                            <p className="text-[11px] text-blue-200">
                                Ingest bulk loan portfolios, validate incomplete records, and run XAI explanation pipelines
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 text-white/80 hover:text-white hover:bg-blue-800 rounded-sm cursor-pointer transition-colors"
                        title="Close Window"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Sub-Header Navigation (When in Results mode) */}
                {activeTab === 'results' && (
                    <div className="bg-gray-100 px-5 py-2.5 border-b border-gray-300 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-gray-800">
                                Batch: <span className="font-mono text-gov-blue">{batchResult?.batchId}</span>
                            </span>
                            <span className="text-gray-500">•</span>
                            <span className="text-gray-600">{batchResult?.filename}</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="px-2.5 py-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-semibold rounded-sm flex items-center gap-1 cursor-pointer"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Upload Another Batch
                        </button>
                    </div>
                )}

                {/* Modal Body */}
                <div className="p-6 flex-1 overflow-y-auto space-y-6">

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-300 text-red-800 rounded-sm text-xs flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                            <div>
                                <strong className="font-bold">Error:</strong> {error}
                            </div>
                        </div>
                    )}

                    {/* VIEW 1: UPLOAD SCREEN */}
                    {activeTab === 'upload' && (
                        <div className="space-y-6">

                            {/* Section A: Ready Demo Presets */}
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                                        <Play className="w-4 h-4 text-gov-blue" />
                                        Option 1: Quick Demo Batches (Instant One-Click Evaluation)
                                    </h3>
                                    <span className="text-[10px] text-gray-500">Includes intentional errors to demo handling</span>
                                </div>
                                <p className="text-xs text-gray-600 mb-3">
                                    Test the batch pipeline immediately using curated portfolios with deliberate data flaws (missing credit scores, blank incomes, invalid amounts).
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Preset 1 */}
                                    <button
                                        type="button"
                                        disabled={isProcessing}
                                        onClick={() => handleRunPreset('batch_1', 'Demo Batch 1 (10 Records)')}
                                        className="p-3.5 bg-white hover:bg-blue-50/70 border-2 border-gray-300 hover:border-gov-blue rounded-sm text-left transition-all cursor-pointer group disabled:opacity-50"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-gray-900 group-hover:text-gov-blue">
                                                Demo Batch 1 (10 Records)
                                            </span>
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-900 rounded-xs">
                                                10 Applications
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 mt-1">
                                            <strong>7 Valid</strong> (Approved & Rejected) • <strong>3 Flawed</strong> (Missing CIBIL, blank income, 0 loan)
                                        </p>
                                        <div className="mt-2.5 flex items-center gap-1 text-[11px] font-bold text-gov-blue group-hover:underline">
                                            <span>Run Batch 1</span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </div>
                                    </button>

                                    {/* Preset 2 */}
                                    <button
                                        type="button"
                                        disabled={isProcessing}
                                        onClick={() => handleRunPreset('batch_2', 'Demo Batch 2 (30 Records)')}
                                        className="p-3.5 bg-white hover:bg-blue-50/70 border-2 border-gray-300 hover:border-gov-blue rounded-sm text-left transition-all cursor-pointer group disabled:opacity-50"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-gray-900 group-hover:text-gov-blue">
                                                Demo Batch 2 (30 Records)
                                            </span>
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-900 rounded-xs">
                                                30 Applications
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 mt-1">
                                            <strong>24 Valid</strong> (Full distribution) • <strong>6 Flawed</strong> (Various data missing)
                                        </p>
                                        <div className="mt-2.5 flex items-center gap-1 text-[11px] font-bold text-gov-blue group-hover:underline">
                                            <span>Run Batch 2</span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Section B: File Upload / Drag-and-Drop */}
                            <div className="bg-white border border-gray-300 p-5 rounded-sm">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                                            <Upload className="w-4 h-4 text-gov-blue" />
                                            Option 2: Upload Real CSV File
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Upload your institution's borrower portfolio in standard CSV format
                                        </p>
                                    </div>

                                    {/* Sample Template Download */}
                                    <button
                                        type="button"
                                        onClick={handleDownloadSample}
                                        disabled={downloadingSample}
                                        className="px-3 py-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-900 border border-yellow-300 text-xs font-bold rounded-sm flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                                        title="Download a 20-row sample CSV with intentional flaws to test upload"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>Download Sample Batch (20 Records)</span>
                                    </button>
                                </div>

                                {/* Drag and drop dropzone */}
                                <div 
                                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={handleDrop}
                                    className={`border-2 border-dashed p-8 text-center rounded-sm transition-colors ${
                                        dragOver ? 'border-gov-blue bg-blue-50/50' : 'border-gray-300 bg-gray-50/50 hover:bg-gray-50'
                                    }`}
                                >
                                    <FileSpreadsheet className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                                    <p className="text-xs font-semibold text-gray-700">
                                        Drag & drop your CSV file here, or{' '}
                                        <label className="text-gov-blue underline cursor-pointer hover:text-blue-900">
                                            browse files
                                            <input 
                                                type="file" 
                                                accept=".csv" 
                                                className="hidden" 
                                                onChange={handleFileSelect} 
                                            />
                                        </label>
                                    </p>
                                    <p className="text-[11px] text-gray-500 mt-1">
                                        Accepts standard CSV with 12 application fields. Incomplete/invalid rows are automatically flagged and trashed.
                                    </p>

                                    {selectedFile && (
                                        <div className="mt-4 inline-flex items-center gap-2 p-2 px-3 bg-white border border-gray-300 rounded-sm text-xs font-medium text-gray-800 shadow-xs">
                                            <FileText className="w-4 h-4 text-gov-blue" />
                                            <span>{selectedFile.name}</span>
                                            <span className="text-[10px] text-gray-500 font-mono">
                                                ({(selectedFile.size / 1024).toFixed(1)} KB)
                                            </span>
                                            <button 
                                                type="button" 
                                                onClick={() => setSelectedFile(null)}
                                                className="text-red-500 hover:text-red-700 ml-2 font-bold cursor-pointer"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 flex justify-end">
                                    <button
                                        type="button"
                                        disabled={!selectedFile || isProcessing}
                                        onClick={handleProcessFile}
                                        className="px-5 py-2 bg-gov-blue hover:bg-blue-900 text-white rounded-sm text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-40 transition-colors shadow-xs"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                <span>Evaluating Portfolio...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-4 h-4" />
                                                <span>Process & Ingest Batch</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                        </div>
                    )}

                    {/* VIEW 2: BATCH EVALUATION RESULTS */}
                    {activeTab === 'results' && batchResult && (
                        <div className="space-y-5">
                            
                            {/* Summary KPI Badges */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm text-center">
                                    <span className="text-[10px] font-semibold text-gray-500 uppercase">Total Rows Read</span>
                                    <p className="text-xl font-bold font-mono text-gray-900 mt-0.5">{batchResult.totalRecords}</p>
                                    <span className="text-[10px] text-gray-500">Submitted in file</span>
                                </div>
                                <div className="p-3 bg-green-50 border border-green-200 rounded-sm text-center">
                                    <span className="text-[10px] font-semibold text-green-700 uppercase">Valid & Evaluated</span>
                                    <p className="text-xl font-bold font-mono text-green-800 mt-0.5">{batchResult.validRecords}</p>
                                    <span className="text-[10px] text-green-700">Saved to database</span>
                                </div>
                                <div className="p-3 bg-red-50 border border-red-200 rounded-sm text-center">
                                    <span className="text-[10px] font-semibold text-red-700 uppercase">Trashed / Flawed</span>
                                    <p className="text-xl font-bold font-mono text-red-800 mt-0.5">{batchResult.flawedRecords}</p>
                                    <span className="text-[10px] text-red-700">Data errors discarded</span>
                                </div>
                            </div>

                            {/* Results Table Tabs Switcher */}
                            <div className="border-b border-gray-300 flex items-center justify-between">
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setResultsSubTab('valid')}
                                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
                                            resultsSubTab === 'valid'
                                                ? 'border-gov-blue text-gov-blue bg-blue-50/40'
                                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        Processed Applications ({batchResult.validRecords})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setResultsSubTab('flawed')}
                                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
                                            resultsSubTab === 'flawed'
                                                ? 'border-red-600 text-red-700 bg-red-50/40'
                                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        Trashed Incomplete Records ({batchResult.flawedRecords})
                                    </button>
                                </div>

                                <div className="text-[11px] text-gray-500 pr-2">
                                    All valid records are persisted to institutional database
                                </div>
                            </div>

                            {/* SUBTAB 1: PROCESSED VALID APPLICATIONS */}
                            {resultsSubTab === 'valid' && (
                                <div className="border border-gray-300 overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-300 text-[11px] uppercase tracking-wider">
                                                <th className="p-2.5 border-r border-gray-300">Application Ref</th>
                                                <th className="p-2.5 border-r border-gray-300">Decision</th>
                                                <th className="p-2.5 border-r border-gray-300">Confidence</th>
                                                <th className="p-2.5 border-r border-gray-300">Repayment Limit</th>
                                                <th className="p-2.5 border-r border-gray-300">Trust Score</th>
                                                <th className="p-2.5 text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {batchResult.processedResults.map((item, idx) => {
                                                const isApproved = item.prediction === 'Approved';
                                                const trustPct = Math.round(item.trustScore.overallTrustScore * 100);
                                                return (
                                                    <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                                                        <td className="p-2.5 border-r border-gray-200 font-mono font-bold text-gov-blue">
                                                            {item.dossierId}
                                                        </td>
                                                        <td className="p-2.5 border-r border-gray-200">
                                                            <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 text-[10px] rounded-xs border ${
                                                                isApproved 
                                                                    ? 'bg-green-100 text-green-900 border-green-300' 
                                                                    : 'bg-red-100 text-red-900 border-red-300'
                                                            }`}>
                                                                {isApproved ? <CheckCircle2 className="w-3 h-3 text-green-700" /> : <AlertTriangle className="w-3 h-3 text-red-700" />}
                                                                {item.prediction.toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td className="p-2.5 border-r border-gray-200 font-mono">
                                                            {(item.confidenceScore * 100).toFixed(1)}%
                                                        </td>
                                                        <td className="p-2.5 border-r border-gray-200">
                                                            <span className={`inline-block font-semibold px-1.5 py-0.5 text-[10px] border ${
                                                                item.solvencyCheck?.status === 'OPTIMAL'
                                                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                                                    : item.solvencyCheck?.status === 'MODERATE'
                                                                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                                                                    : 'bg-rose-50 text-rose-800 border-rose-300'
                                                            }`}>
                                                                {item.solvencyCheck?.status || 'N/A'}
                                                            </span>
                                                            <span className="text-[10px] text-gray-500 ml-1.5">
                                                                ({item.solvencyCheck?.dtiPercent})
                                                            </span>
                                                        </td>
                                                        <td className="p-2.5 border-r border-gray-200">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-mono font-bold text-gray-900">{trustPct}%</span>
                                                                <span className="text-[9px] text-gray-500 uppercase">
                                                                    ({item.trustScore.rating})
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="p-2.5 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleInspectRow(item)}
                                                                className="px-2.5 py-1 bg-gov-blue hover:bg-blue-900 text-white rounded-xs text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 mx-auto cursor-pointer shadow-xs"
                                                                title="Load full XAI explanation and loan evaluation audit"
                                                            >
                                                                <Eye className="w-3 h-3" />
                                                                Inspect
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* SUBTAB 2: TRASHED / FLAWED RECORDS */}
                            {resultsSubTab === 'flawed' && (
                                <div className="space-y-3">
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm text-xs text-amber-900 flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                                        <div>
                                            <strong className="font-bold">Institutional Data Quality Enforcement:</strong> The following {batchResult.flawedRecords} records were discarded prior to credit scoring because they failed mandatory underwriting schema requirements.
                                        </div>
                                    </div>

                                    <div className="border border-red-200 rounded-sm overflow-hidden">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-red-50 text-red-900 font-bold border-b border-red-200 text-[11px] uppercase tracking-wider">
                                                    <th className="p-2.5 border-r border-red-200 w-20">Row #</th>
                                                    <th className="p-2.5 border-r border-red-200">Specific Missing / Invalid Parameter</th>
                                                    <th className="p-2.5">Received Raw Input Values</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-red-100">
                                                {batchResult.flawedData.map((item, idx) => (
                                                    <tr key={idx} className="bg-white hover:bg-red-50/30">
                                                        <td className="p-2.5 border-r border-gray-200 font-mono font-bold text-red-700">
                                                            Row #{item.row}
                                                        </td>
                                                        <td className="p-2.5 border-r border-gray-200 text-red-900 font-medium">
                                                            {item.errorReason}
                                                        </td>
                                                        <td className="p-2.5 font-mono text-[11px] text-gray-600">
                                                            {Object.entries(item.rawData || {}).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}

                </div>

                {/* Modal Footer */}
                <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-300 flex items-center justify-between text-xs">
                    {activeTab === 'results' ? (
                        <>
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onViewInHistory?.();
                                }}
                                className="px-3.5 py-1.5 bg-white hover:bg-gray-100 text-gov-blue border border-gray-300 font-bold rounded-sm flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                                <Layers className="w-3.5 h-3.5" />
                                <span>Open Batch in Application History</span>
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-1.5 bg-gov-blue hover:bg-blue-900 text-white font-bold uppercase tracking-wider rounded-sm cursor-pointer shadow-xs"
                            >
                                Done
                            </button>
                        </>
                    ) : (
                        <>
                            <span className="text-gray-500 text-[11px]">
                                Automated pre-screening filter prevents incomplete records from corrupting credit models
                            </span>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-sm cursor-pointer"
                            >
                                Cancel
                            </button>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
};

export default BatchUploadModal;
