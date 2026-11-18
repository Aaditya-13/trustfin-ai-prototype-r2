import React from 'react';
import { X, User } from 'lucide-react';
import ApplicantPortalView from './ApplicantPortalView';

const CustomerNoticeModal = ({ isOpen, onClose, result, applicantData, onOpenPdfPreview }) => {
    if (!isOpen || !result) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
            <div role="dialog" aria-modal="true" aria-labelledby="applicant-preview-title" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }} className="bg-white w-full max-w-5xl max-h-[90vh] rounded-sm shadow-xl flex flex-col overflow-hidden border border-gray-400">
                <div className="px-5 py-3.5 bg-gov-blue text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-yellow-400" />
                        <h3 id="applicant-preview-title" className="text-xs font-bold uppercase tracking-wider">Applicant View Preview</h3>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close applicant preview" autoFocus className="p-1 hover:bg-blue-800 rounded-sm cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto">
                    <ApplicantPortalView result={result} applicantData={applicantData} onPreviewPdf={onOpenPdfPreview} />
                </div>
            </div>
        </div>
    );
};

export default CustomerNoticeModal;
