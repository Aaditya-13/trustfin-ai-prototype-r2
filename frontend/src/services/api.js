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
