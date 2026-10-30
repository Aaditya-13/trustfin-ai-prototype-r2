import axios from 'axios';

const API_URL = 'http://localhost:8000/api/v1/loan';

export const predictLoan = async (applicantData) => {
    try {
        const response = await axios.post(`${API_URL}/predict`, applicantData);
        return response.data;
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
};

export const fetchLoanReportPdfBlob = async (applicantData, predictionResult) => {
    try {
        const response = await axios.post(`${API_URL}/generate-pdf`, {
            applicantData,
            predictionResult
        }, {
            responseType: 'blob'
        });
        return new Blob([response.data], { type: 'application/pdf' });
    } catch (error) {
        console.error("PDF Fetch Error:", error);
        throw error;
    }
};

export const downloadLoanReportPdf = async (applicantData, predictionResult) => {
    try {
        const blob = await fetchLoanReportPdfBlob(applicantData, predictionResult);
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        const statusSlug = predictionResult.prediction === 'Approved' ? 'Sanction_Letter' : 'Status_Advisory';
        link.download = `TrustFin_Bank_${statusSlug}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Retain blob URL long enough for browser download stream to complete
        setTimeout(() => {
            window.URL.revokeObjectURL(downloadUrl);
        }, 15000);
        return true;
    } catch (error) {
        console.error("PDF Download Error:", error);
        throw error;
    }
};

export const fetchEvaluations = async () => {
    try {
        const response = await axios.get(`${API_URL}/evaluations`);
        return response.data;
    } catch (error) {
        console.error("Fetch Evaluations Error:", error);
        throw error;
    }
};

export const fetchEvaluationById = async (id) => {
    try {
        const response = await axios.get(`${API_URL}/evaluations/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Fetch Evaluation #${id} Error:`, error);
        throw error;
    }
};

export const deleteEvaluation = async (id) => {
    try {
        const response = await axios.delete(`${API_URL}/evaluations/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Delete Evaluation #${id} Error:`, error);
        throw error;
    }
};

// --- Batch Processing APIs ---

export const uploadBatchFile = async (file, loanType = 'home_loan') => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('loan_type', loanType);
        const response = await axios.post(`${API_URL}/predict-batch`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        console.error("Batch File Upload Error:", error);
        throw error;
    }
};

export const submitBatchJson = async (rows, filename = "preset_batch.csv", loanType = null) => {
    try {
        const payload = { filename, rows };
        if (loanType) payload.loan_type = loanType;
        const response = await axios.post(`${API_URL}/predict-batch-json`, payload);
        return response.data;
    } catch (error) {
        console.error("Batch JSON Submission Error:", error);
        throw error;
    }
};

export const fetchBatchPreset = async (presetId) => {
    try {
        const response = await axios.get(`${API_URL}/batch-presets/${presetId}`);
        return response.data;
    } catch (error) {
        console.error(`Fetch Batch Preset '${presetId}' Error:`, error);
        throw error;
    }
};

export const downloadSampleBatchCsv = async (loanType = 'home_loan') => {
    try {
        const response = await axios.get(`${API_URL}/batch-sample-csv`, {
            params: { loan_type: loanType },
            responseType: 'blob'
        });
        const downloadUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `trustfin_${loanType}_sample.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 10000);
        return true;
    } catch (error) {
        console.error("Download Sample CSV Error:", error);
        throw error;
    }
};

export const fetchBatches = async () => {
    try {
        const response = await axios.get(`${API_URL}/batches`);
        return response.data;
    } catch (error) {
        console.error("Fetch Batches Error:", error);
        throw error;
    }
};

export const fetchBatchById = async (batchId) => {
    try {
        const response = await axios.get(`${API_URL}/batches/${batchId}`);
        return response.data;
    } catch (error) {
        console.error(`Fetch Batch '${batchId}' Error:`, error);
        throw error;
    }
};

export const deleteBatch = async (batchId) => {
    try {
        const response = await axios.delete(`${API_URL}/batches/${batchId}`);
        return response.data;
    } catch (error) {
        console.error(`Delete Batch '${batchId}' Error:`, error);
        throw error;
    }
};

