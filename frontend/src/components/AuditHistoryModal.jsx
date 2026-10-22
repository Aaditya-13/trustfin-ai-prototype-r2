import React, { useState, useEffect } from 'react';
import { 
    X, 
    Database, 
    Search, 
    RefreshCw, 
    Download, 
    Trash2, 
    ExternalLink, 
    CheckCircle2, 
    AlertTriangle,
    Layers,
    ArrowLeft,
    Eye,
    FileSpreadsheet,
    AlertCircle
} from 'lucide-react';
import { 
    fetchEvaluations, 
    fetchEvaluationById, 
    deleteEvaluation, 
    downloadLoanReportPdf,
    fetchBatches,
    fetchBatchById,
    deleteBatch
} from '../services/api';

const AuditHistoryModal = ({ isOpen, onClose, onLoadEvaluation }) => {
    // Navigation tabs
    const [activeHistoryTab, setActiveHistoryTab] = useState('individual'); // 'individual' | 'batches'
    
    // Individual applications state
    const [evaluations, setEvaluations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState(null);

    // Batch history state
    const [batches, setBatches] = useState([]);
    const [loadingBatches, setLoadingBatches] = useState(false);
    const [selectedBatchDetail, setSelectedBatchDetail] = useState(null);
    const [loadingBatchDetail, setLoadingBatchDetail] = useState(false);
    const [batchSubTab, setBatchSubTab] = useState('valid'); // 'valid' | 'flawed'

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [evalsData, batchesData] = await Promise.all([
                fetchEvaluations(),
                fetchBatches()
            ]);
            setEvaluations(evalsData || []);
            setBatches(batchesData || []);
        } catch (err) {
            setError("Unable to connect to the database. Verify that the backend service is running.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadData();
            setSelectedBatchDetail(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // --- Individual Evaluation Actions ---
    const handleInspect = async (item) => {
        setActionLoadingId(item.id);
        try {
            const detail = await fetchEvaluationById(item.id);
            onLoadEvaluation(detail);
            onClose();
        } catch (err) {
            alert("Failed to load application details from database.");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleDownload = async (item) => {
        setActionLoadingId(item.id);
        try {
            const detail = await fetchEvaluationById(item.id);
            await downloadLoanReportPdf(detail.applicantData, detail.predictionResult);
        } catch (err) {
            alert("Failed to download PDF report for this application.");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm(`Are you sure you want to delete application record #${id}?`)) return;
        
        try {
            await deleteEvaluation(id);
            setEvaluations(prev => prev.filter(item => item.id !== id));
        } catch (err) {
            alert("Failed to delete record.");
        }
    };

    // --- Batch Actions ---
    const handleViewBatch = async (batchId) => {
        setLoadingBatchDetail(true);
        setError(null);
        try {
            const detail = await fetchBatchById(batchId);
            setSelectedBatchDetail(detail);
            setBatchSubTab('valid');
        } catch (err) {
            alert(`Failed to load details for batch ${batchId}`);
        } finally {
            setLoadingBatchDetail(false);
        }
    };

    const handleDeleteBatch = async (batchId, e) => {
        e.stopPropagation();
        if (!window.confirm(`Are you sure you want to delete batch ${batchId} and all its evaluated records?`)) return;

        try {
            await deleteBatch(batchId);
            setBatches(prev => prev.filter(b => b.batchId !== batchId));
            if (selectedBatchDetail?.batchId === batchId) {
                setSelectedBatchDetail(null);
            }
            // Refresh individual list too since batch records were deleted
            const evalsData = await fetchEvaluations();
            setEvaluations(evalsData || []);
        } catch (err) {
            alert("Failed to delete batch.");
        }
    };

    const filteredEvaluations = evaluations.filter(item => {
        const term = searchTerm.toLowerCase();
        return (
            (item.dossierId && item.dossierId.toLowerCase().includes(term)) ||
            (item.prediction && item.prediction.toLowerCase().includes(term)) ||
            (item.solvencyStatus && item.solvencyStatus.toLowerCase().includes(term)) ||
            (item.trustRating && item.trustRating.toLowerCase().includes(term))
        );
    });

    const filteredBatches = batches.filter(b => {
        const term = searchTerm.toLowerCase();
        return (
            (b.batchId && b.batchId.toLowerCase().includes(term)) ||
            (b.filename && b.filename.toLowerCase().includes(term))
        );
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white border border-gray-400 w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-6">
                
                {/* Header */}
                <div className="bg-gov-blue text-white p-4 border-b-2 border-yellow-500 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-blue-900 border border-blue-400 text-yellow-400">
                            <Database className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold tracking-tight">Application & Batch History</h2>
                                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.2 bg-blue-900 border border-blue-400 text-yellow-300">
                                    Institutional Audit Log
                                </span>
                            </div>
                            <p className="text-[11px] text-blue-200">
                                Browse saved applications, audit batch portfolios, review decisions, and inspect flawed records
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={loadData}
                            disabled={loading}
                            className="p-1.5 bg-white/10 hover:bg-white/20 text-white border border-blue-400 text-xs flex items-center gap-1 cursor-pointer transition-colors"
                            title="Refresh List"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Refresh</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 bg-white/10 hover:bg-red-700 text-white border border-blue-400 cursor-pointer transition-colors"
                            title="Close Window"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Top Tabs: Individual Applications vs Batch Upload History */}
                <div className="bg-gray-100 border-b border-gray-300 px-4 flex items-center justify-between">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => { setActiveHistoryTab('individual'); setSelectedBatchDetail(null); }}
                            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
                                activeHistoryTab === 'individual'
                                    ? 'border-gov-blue text-gov-blue bg-white'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Individual Applications ({evaluations.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveHistoryTab('batches')}
                            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
                                activeHistoryTab === 'batches'
                                    ? 'border-gov-blue text-gov-blue bg-white'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Batch Upload History ({batches.length})</span>
                        </button>
                    </div>

                    {selectedBatchDetail && activeHistoryTab === 'batches' && (
                        <button
                            type="button"
                            onClick={() => setSelectedBatchDetail(null)}
                            className="text-xs text-gov-blue font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Back to All Batches
                        </button>
                    )}
                </div>

                {/* Sub-toolbar: Search & Stats */}
                {!selectedBatchDetail && (
                    <div className="bg-gray-50 p-3 border-b border-gray-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                        <div className="relative w-full sm:w-80">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder={activeHistoryTab === 'individual' ? "Filter by Application Ref, Status..." : "Filter by Batch Ref, Filename..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-300 text-xs focus:outline-none focus:border-gov-blue"
                            />
                        </div>
                        <div className="text-gray-600 flex items-center gap-4">
                            <span>
                                Total {activeHistoryTab === 'individual' ? 'Applications' : 'Batches'}: <strong className="text-gray-900">{activeHistoryTab === 'individual' ? evaluations.length : batches.length}</strong>
                            </span>
                        </div>
                    </div>
                )}

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading && evaluations.length === 0 && batches.length === 0 ? (
                        <div className="py-16 text-center text-gray-500 flex flex-col items-center gap-2">
                            <RefreshCw className="w-6 h-6 animate-spin text-gov-blue" />
                            <p className="text-xs">Loading records from database...</p>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 border border-red-300 text-red-800 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                            <span><strong>Database Error:</strong> {error}</span>
                        </div>
                    ) : activeHistoryTab === 'individual' ? (
                        
                        /* TAB 1: INDIVIDUAL APPLICATIONS TABLE */
                        filteredEvaluations.length === 0 ? (
                            <div className="py-16 text-center text-gray-500 flex flex-col items-center gap-2">
                                <Database className="w-8 h-8 text-gray-300" />
                                <p className="text-sm font-semibold text-gray-700">No application records found</p>
                                <p className="text-xs text-gray-500">Submit a loan application or upload a batch to view records here.</p>
                            </div>
                        ) : (
                            <div className="border border-gray-300 overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-300 text-[11px] uppercase tracking-wider">
                                            <th className="p-2.5 border-r border-gray-300">Application Ref</th>
                                            <th className="p-2.5 border-r border-gray-300">Application Date</th>
                                            <th className="p-2.5 border-r border-gray-300">Financial Profile</th>
                                            <th className="p-2.5 border-r border-gray-300">Decision</th>
                                            <th className="p-2.5 border-r border-gray-300">Repayment Status</th>
                                            <th className="p-2.5 border-r border-gray-300">Trust Score</th>
                                            <th className="p-2.5 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {filteredEvaluations.map((item) => {
                                            const isApproved = item.prediction === 'Approved';
                                            const trustPct = Math.round((item.trustScore || 0) * 100);
                                            const isActionLoading = actionLoadingId === item.id;

                                            return (
                                                <tr key={item.id} className="hover:bg-blue-50/50 transition-colors">
                                                    <td className="p-2.5 border-r border-gray-200 font-mono font-bold text-gov-blue">
                                                        {item.dossierId || `TF-EVAL-${item.id}`}
                                                    </td>
                                                    <td className="p-2.5 border-r border-gray-200 text-gray-600 font-mono text-[11px]">
                                                        {item.timestamp || 'N/A'}
                                                    </td>
                                                    <td className="p-2.5 border-r border-gray-200">
                                                        <div className="font-semibold text-gray-900">
                                                            Income: ₹{Number(item.applicantIncome || 0).toLocaleString('en-IN')}/mo
                                                        </div>
                                                        <div className="text-[11px] text-gray-500">
                                                            Loan: ₹{Number(item.loanAmount || 0).toLocaleString('en-IN')}
                                                        </div>
                                                    </td>
                                                    <td className="p-2.5 border-r border-gray-200">
                                                        <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 text-[11px] border ${
                                                            isApproved 
                                                                ? 'bg-green-100 text-green-900 border-green-300' 
                                                                : 'bg-red-100 text-red-900 border-red-300'
                                                        }`}>
                                                            {isApproved ? (
                                                                <>
                                                                    <CheckCircle2 className="w-3 h-3 text-green-700" />
                                                                    APPROVED
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <AlertTriangle className="w-3 h-3 text-red-700" />
                                                                    REJECTED
                                                                </>
                                                            )}
                                                        </span>
                                                    </td>
                                                    <td className="p-2.5 border-r border-gray-200">
                                                         <span className={`inline-block font-semibold px-1.5 py-0.5 text-[10px] border ${
                                                             item.solvencyStatus === 'OPTIMAL'
                                                                 ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                                                 : item.solvencyStatus === 'MODERATE'
                                                                 ? 'bg-amber-50 text-amber-800 border-amber-300'
                                                                 : 'bg-rose-50 text-rose-800 border-rose-300'
                                                         }`}>
                                                             {item.solvencyStatus === 'INSOLVENT' ? 'EXCEEDS LIMIT' : (item.solvencyStatus || 'N/A')}
                                                         </span>
                                                         {item.dtiRatio !== undefined && item.dtiRatio !== null && (
                                                             <div className="text-[10px] text-gray-500 mt-0.5">
                                                                 EMI/Income: {(item.dtiRatio * 100).toFixed(1)}%
                                                             </div>
                                                         )}
                                                    </td>
                                                    <td className="p-2.5 border-r border-gray-200">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-mono font-bold text-gray-900">{trustPct}%</span>
                                                            <span className="text-[10px] text-gray-500 uppercase">
                                                                ({item.trustRating || 'N/A'})
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-2.5 text-center">
                                                         <div className="flex items-center justify-center gap-1.5">
                                                             <button
                                                                 type="button"
                                                                 onClick={() => handleInspect(item)}
                                                                 disabled={isActionLoading}
                                                                 className="px-2 py-1 bg-gov-blue hover:bg-blue-900 text-white rounded-xs text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                                                                 title="Inspect XAI explanations and mathematical audit"
                                                             >
                                                                 {isActionLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
                                                                 <span>Inspect</span>
                                                             </button>
                                                             <button
                                                                 type="button"
                                                                 onClick={() => handleDownload(item)}
                                                                 disabled={isActionLoading}
                                                                 className="p-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 text-[11px] cursor-pointer transition-colors"
                                                                 title="Download Loan Approval / Advisory PDF"
                                                             >
                                                                 <Download className="w-3.5 h-3.5" />
                                                             </button>
                                                             <button
                                                                 type="button"
                                                                 onClick={(e) => handleDelete(item.id, e)}
                                                                 className="p-1 bg-gray-100 hover:bg-red-100 text-red-600 border border-gray-300 text-[11px] cursor-pointer transition-colors"
                                                                 title="Delete Application Record"
                                                             >
                                                                 <Trash2 className="w-3.5 h-3.5" />
                                                             </button>
                                                         </div>
                                                     </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )
                    ) : selectedBatchDetail ? (
                        
                        /* TAB 2B: SPECIFIC BATCH DETAIL VIEW (Processed Applications + Flawed Records) */
                        <div className="space-y-4">
                            {/* Batch Info Card */}
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-sm text-gray-900">
                                            Batch: <span className="font-mono text-gov-blue">{selectedBatchDetail.batchId}</span>
                                        </h3>
                                        <span className="text-xs text-gray-500 font-mono">({selectedBatchDetail.filename})</span>
                                    </div>
                                    <p className="text-[11px] text-gray-500 mt-0.5">Uploaded on {selectedBatchDetail.timestamp}</p>
                                </div>
                                <div className="flex gap-2">
                                    <span className="px-2 py-0.5 text-xs bg-white border border-gray-300 font-semibold rounded-xs">
                                        Total: <strong>{selectedBatchDetail.totalRecords}</strong>
                                    </span>
                                    <span className="px-2 py-0.5 text-xs bg-green-100 text-green-900 border border-green-300 font-semibold rounded-xs">
                                        Processed: <strong>{selectedBatchDetail.validRecords}</strong>
                                    </span>
                                    <span className="px-2 py-0.5 text-xs bg-red-100 text-red-900 border border-red-300 font-semibold rounded-xs">
                                        Trashed: <strong>{selectedBatchDetail.flawedRecords}</strong>
                                    </span>
                                </div>
                            </div>

                            {/* Subtab Switcher inside Batch Detail */}
                            <div className="border-b border-gray-300 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setBatchSubTab('valid')}
                                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
                                        batchSubTab === 'valid'
                                            ? 'border-gov-blue text-gov-blue bg-blue-50/40'
                                            : 'border-transparent text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    Processed Applications ({selectedBatchDetail.validRecords})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBatchSubTab('flawed')}
                                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
                                        batchSubTab === 'flawed'
                                            ? 'border-red-600 text-red-700 bg-red-50/40'
                                            : 'border-transparent text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    Trashed Incomplete Records ({selectedBatchDetail.flawedRecords})
                                </button>
                            </div>

                            {/* Processed Subtab */}
                            {batchSubTab === 'valid' && (
                                <div className="border border-gray-300 overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-300 text-[11px] uppercase tracking-wider">
                                                <th className="p-2.5 border-r border-gray-300">Application Ref</th>
                                                <th className="p-2.5 border-r border-gray-300">Financial Profile</th>
                                                <th className="p-2.5 border-r border-gray-300">Decision</th>
                                                <th className="p-2.5 border-r border-gray-300">Repayment Limit</th>
                                                <th className="p-2.5 border-r border-gray-300">Trust Score</th>
                                                <th className="p-2.5 text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {selectedBatchDetail.processedEvaluations.map((item) => {
                                                const isApproved = item.prediction === 'Approved';
                                                const trustPct = Math.round((item.trustScore || 0) * 100);
                                                return (
                                                    <tr key={item.id} className="hover:bg-blue-50/40 transition-colors">
                                                        <td className="p-2.5 border-r border-gray-200 font-mono font-bold text-gov-blue">
                                                            {item.dossierId}
                                                        </td>
                                                        <td className="p-2.5 border-r border-gray-200">
                                                            <div className="font-semibold text-gray-900">
                                                                Income: ₹{Number(item.applicantIncome || 0).toLocaleString('en-IN')}/mo
                                                            </div>
                                                            <div className="text-[11px] text-gray-500">
                                                                Loan: ₹{Number(item.loanAmount || 0).toLocaleString('en-IN')}
                                                            </div>
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
                                                        <td className="p-2.5 border-r border-gray-200">
                                                            <span className="font-semibold text-gray-800">{item.solvencyStatus || 'N/A'}</span>
                                                        </td>
                                                        <td className="p-2.5 border-r border-gray-200">
                                                            <span className="font-mono font-bold text-gray-900">{trustPct}%</span>
                                                        </td>
                                                        <td className="p-2.5 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleInspect(item)}
                                                                className="px-2.5 py-1 bg-gov-blue hover:bg-blue-900 text-white rounded-xs text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 mx-auto cursor-pointer shadow-xs"
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

                            {/* Flawed Subtab */}
                            {batchSubTab === 'flawed' && (
                                <div className="space-y-3">
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-sm text-xs text-red-900 flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                                        <div>
                                            <strong className="font-bold">Institutional Traceability Audit:</strong> These {selectedBatchDetail.flawedRecords} applications were rejected and excluded from ML scoring during ingestion.
                                        </div>
                                    </div>

                                    <div className="border border-red-200 rounded-sm overflow-hidden">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-red-50 text-red-900 font-bold border-b border-red-200 text-[11px] uppercase tracking-wider">
                                                    <th className="p-2.5 border-r border-red-200 w-20">Row #</th>
                                                    <th className="p-2.5 border-r border-red-200">Validation Failure Reason</th>
                                                    <th className="p-2.5">Received Input Values</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-red-100">
                                                {selectedBatchDetail.flawedData.map((item, idx) => (
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
                    ) : (
                        
                        /* TAB 2A: BATCHES LIST TABLE */
                        filteredBatches.length === 0 ? (
                            <div className="py-16 text-center text-gray-500 flex flex-col items-center gap-2">
                                <FileSpreadsheet className="w-8 h-8 text-gray-300" />
                                <p className="text-sm font-semibold text-gray-700">No batch uploads found</p>
                                <p className="text-xs text-gray-500">Upload a CSV batch or run a demo preset from the Application Form.</p>
                            </div>
                        ) : (
                            <div className="border border-gray-300 overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-300 text-[11px] uppercase tracking-wider">
                                            <th className="p-2.5 border-r border-gray-300">Batch Reference</th>
                                            <th className="p-2.5 border-r border-gray-300">File / Label</th>
                                            <th className="p-2.5 border-r border-gray-300">Upload Date</th>
                                            <th className="p-2.5 border-r border-gray-300 text-center">Total Rows</th>
                                            <th className="p-2.5 border-r border-gray-300 text-center">Processed</th>
                                            <th className="p-2.5 border-r border-gray-300 text-center">Trashed</th>
                                            <th className="p-2.5 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {filteredBatches.map((b) => (
                                            <tr key={b.id} className="hover:bg-blue-50/50 transition-colors">
                                                <td className="p-2.5 border-r border-gray-200 font-mono font-bold text-gov-blue">
                                                    {b.batchId}
                                                </td>
                                                <td className="p-2.5 border-r border-gray-200 font-semibold text-gray-800">
                                                    {b.filename}
                                                </td>
                                                <td className="p-2.5 border-r border-gray-200 font-mono text-gray-600 text-[11px]">
                                                    {b.timestamp}
                                                </td>
                                                <td className="p-2.5 border-r border-gray-200 text-center font-bold">
                                                    {b.totalRecords}
                                                </td>
                                                <td className="p-2.5 border-r border-gray-200 text-center">
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-900 font-bold rounded-xs border border-green-200">
                                                        {b.validRecords}
                                                    </span>
                                                </td>
                                                <td className="p-2.5 border-r border-gray-200 text-center">
                                                    <span className="px-2 py-0.5 bg-red-100 text-red-900 font-bold rounded-xs border border-red-200">
                                                        {b.flawedRecords}
                                                    </span>
                                                </td>
                                                <td className="p-2.5 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleViewBatch(b.batchId)}
                                                            className="px-2.5 py-1 bg-gov-blue hover:bg-blue-900 text-white font-bold rounded-xs text-[11px] uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-xs"
                                                            title="Inspect processed and flawed records in this batch"
                                                        >
                                                            <Eye className="w-3 h-3" />
                                                            <span>View</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleDeleteBatch(b.batchId, e)}
                                                            className="p-1 bg-gray-100 hover:bg-red-100 text-red-600 border border-gray-300 text-[11px] cursor-pointer transition-colors"
                                                            title="Delete Batch and Records"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 bg-gray-50 border-t border-gray-300 flex justify-between items-center text-xs text-gray-500">
                    <span>
                        Connected to Neon PostgreSQL (Automatic SQLite offline failover enabled)
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold uppercase tracking-wider rounded-sm cursor-pointer"
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
};

export default AuditHistoryModal;
