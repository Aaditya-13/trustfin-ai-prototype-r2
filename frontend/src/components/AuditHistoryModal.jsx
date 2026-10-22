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
    AlertTriangle 
} from 'lucide-react';
import { fetchEvaluations, fetchEvaluationById, deleteEvaluation, downloadLoanReportPdf } from '../services/api';

const AuditHistoryModal = ({ isOpen, onClose, onLoadEvaluation }) => {
    const [evaluations, setEvaluations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState(null);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchEvaluations();
            setEvaluations(data || []);
        } catch (err) {
            setError("Unable to connect to the audit database. Verify that the backend service is running.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    if (!isOpen) return null;

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

    const filteredEvaluations = evaluations.filter(item => {
        const term = searchTerm.toLowerCase();
        return (
            (item.dossierId && item.dossierId.toLowerCase().includes(term)) ||
            (item.prediction && item.prediction.toLowerCase().includes(term)) ||
            (item.solvencyStatus && item.solvencyStatus.toLowerCase().includes(term)) ||
            (item.trustRating && item.trustRating.toLowerCase().includes(term))
        );
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-none border border-gray-400 w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                
                {/* Header */}
                <div className="bg-gov-blue text-white p-4 border-b-2 border-yellow-500 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-blue-900 border border-blue-400 text-yellow-400">
                            <Database className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold tracking-tight">Saved Loan Applications</h2>
                                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.2 bg-blue-900 border border-blue-400 text-yellow-300">
                                    Application History
                                </span>
                            </div>
                            <p className="text-[11px] text-blue-200">
                                Browse saved applications, review loan decisions, and download approval letters
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

                {/* Sub-toolbar: Search & Stats */}
                <div className="bg-gray-100 p-3 border-b border-gray-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="relative w-full sm:w-80">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Filter by Application Ref, Status (Approved/Rejected), Repayment..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-300 text-xs focus:outline-none focus:border-gov-blue"
                        />
                    </div>
                    <div className="text-gray-600 flex items-center gap-4">
                        <span>Total Records: <strong className="text-gray-900">{evaluations.length}</strong></span>
                        {filteredEvaluations.length !== evaluations.length && (
                            <span>Filtered: <strong className="text-gov-blue">{filteredEvaluations.length}</strong></span>
                        )}
                    </div>
                </div>

                {/* Body Table */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading && evaluations.length === 0 ? (
                        <div className="py-16 text-center text-gray-500 flex flex-col items-center gap-2">
                            <RefreshCw className="w-6 h-6 animate-spin text-gov-blue" />
                            <p className="text-xs">Loading application records...</p>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 border border-red-300 text-red-800 text-xs">
                            <strong>Database Error:</strong> {error}
                        </div>
                    ) : filteredEvaluations.length === 0 ? (
                        <div className="py-16 text-center text-gray-500 flex flex-col items-center gap-2">
                            <Database className="w-8 h-8 text-gray-300" />
                            <p className="text-sm font-semibold text-gray-700">No application records found</p>
                            <p className="text-xs text-gray-500">Submit a loan application to view saved records here.</p>
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
                                                
                                                {/* Application Reference */}
                                                <td className="p-2.5 border-r border-gray-200 font-mono font-bold text-gov-blue">
                                                    {item.dossierId || `TF-EVAL-${item.id}`}
                                                </td>

                                                {/* Timestamp */}
                                                <td className="p-2.5 border-r border-gray-200 text-gray-600 whitespace-nowrap">
                                                    {item.timestamp || 'N/A'}
                                                </td>

                                                {/* Financial Profile */}
                                                <td className="p-2.5 border-r border-gray-200">
                                                    <div className="font-semibold text-gray-800">
                                                        ₹{Number(item.applicantIncome || 0).toLocaleString('en-IN')} /mo
                                                    </div>
                                                    <div className="text-[11px] text-gray-500">
                                                        Loan: ₹{Number(item.loanAmount || 0).toLocaleString('en-IN')}
                                                    </div>
                                                </td>

                                                {/* Decision */}
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

                                                {/* Repayment Health */}
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

                                                 {/* Trust Score */}
                                                 <td className="p-2.5 border-r border-gray-200">
                                                     <div className="flex items-center gap-1.5">
                                                         <div className={`font-bold ${
                                                             trustPct >= 75 ? 'text-green-800' : trustPct >= 50 ? 'text-amber-800' : 'text-red-800'
                                                         }`}>
                                                             {trustPct}%
                                                         </div>
                                                         <span className="text-[10px] text-gray-500 uppercase font-semibold">
                                                             {item.trustRating || 'SCORE'}
                                                         </span>
                                                     </div>
                                                 </td>

                                                 {/* Actions */}
                                                 <td className="p-2.5 text-center">
                                                     <div className="flex items-center justify-center gap-1.5">
                                                         <button
                                                             type="button"
                                                             onClick={() => handleInspect(item)}
                                                             disabled={isActionLoading}
                                                             className="px-2 py-1 bg-gov-blue hover:bg-blue-900 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                                             title="View Full Application & Key Factors"
                                                         >
                                                             <ExternalLink className="w-3 h-3" />
                                                             <span>Load</span>
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
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-100 p-3 border-t border-gray-300 flex items-center justify-between text-xs text-gray-600">
                    <span className="font-mono text-[11px]">
                        Database Engine: Cloud Neon PostgreSQL (with Local SQLite Fallback)
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold cursor-pointer transition-colors"
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
};

export default AuditHistoryModal;
