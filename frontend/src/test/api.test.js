import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { 
  predictLoan, 
  fetchEvaluations, 
  fetchEvaluationById, 
  deleteEvaluation,
  uploadBatchFile,
  submitBatchJson,
  fetchBatchPreset,
  fetchBatches,
  fetchBatchById,
  deleteBatch
} from '../services/api';

vi.mock('axios');

describe('API Service Layer (Modular Test)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('predictLoan sends POST request to /predict endpoint', async () => {
    const mockData = { Applicant_Income: 50000 };
    const mockResponse = { data: { prediction: 'Approved', confidenceScore: 0.95 } };
    axios.post.mockResolvedValueOnce(mockResponse);

    const result = await predictLoan(mockData);
    expect(axios.post).toHaveBeenCalledWith('http://localhost:8000/api/v1/loan/predict', mockData);
    expect(result).toEqual(mockResponse.data);
  });

  it('fetchEvaluations sends GET request to /evaluations', async () => {
    const mockList = [{ id: 1, dossierId: 'TF-001' }];
    axios.get.mockResolvedValueOnce({ data: mockList });

    const result = await fetchEvaluations();
    expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/api/v1/loan/evaluations');
    expect(result).toEqual(mockList);
  });

  it('fetchEvaluationById calls /evaluations/:id', async () => {
    const mockDetail = { id: 42, dossierId: 'TF-042' };
    axios.get.mockResolvedValueOnce({ data: mockDetail });

    const result = await fetchEvaluationById(42);
    expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/api/v1/loan/evaluations/42');
    expect(result).toEqual(mockDetail);
  });

  it('deleteEvaluation calls DELETE /evaluations/:id', async () => {
    axios.delete.mockResolvedValueOnce({ data: { status: 'success' } });

    const result = await deleteEvaluation(42);
    expect(axios.delete).toHaveBeenCalledWith('http://localhost:8000/api/v1/loan/evaluations/42');
    expect(result.status).toBe('success');
  });

  it('uploadBatchFile formats multipart/form-data and posts to /predict-batch', async () => {
    const mockFile = new File(['col1,col2\nval1,val2'], 'applications.csv', { type: 'text/csv' });
    axios.post.mockResolvedValueOnce({ data: { batchId: 'BATCH-001', validRecords: 5 } });

    const result = await uploadBatchFile(mockFile);
    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/loan/predict-batch',
      expect.any(FormData),
      expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } })
    );
    expect(result.batchId).toBe('BATCH-001');
  });

  it('submitBatchJson posts payload to /predict-batch-json', async () => {
    const rows = [{ Income: 50000 }];
    axios.post.mockResolvedValueOnce({ data: { batchId: 'BATCH-JSON-01', totalRecords: 1 } });

    const result = await submitBatchJson(rows, 'test_batch.csv');
    expect(axios.post).toHaveBeenCalledWith('http://localhost:8000/api/v1/loan/predict-batch-json', {
      filename: 'test_batch.csv',
      rows
    });
    expect(result.batchId).toBe('BATCH-JSON-01');
  });

  it('fetchBatchPreset calls /batch-presets/:presetId', async () => {
    axios.get.mockResolvedValueOnce({ data: { preset_id: 'batch_1', rows: [] } });

    const result = await fetchBatchPreset('batch_1');
    expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/api/v1/loan/batch-presets/batch_1');
    expect(result.preset_id).toBe('batch_1');
  });

  it('fetchBatches and deleteBatch interact with /batches endpoints', async () => {
    axios.get.mockResolvedValueOnce({ data: [{ batchId: 'BATCH-01' }] });
    const batches = await fetchBatches();
    expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/api/v1/loan/batches');
    expect(batches).toHaveLength(1);

    axios.delete.mockResolvedValueOnce({ data: { status: 'success' } });
    const delResult = await deleteBatch('BATCH-01');
    expect(axios.delete).toHaveBeenCalledWith('http://localhost:8000/api/v1/loan/batches/BATCH-01');
    expect(delResult.status).toBe('success');
  });

  it('propagates API error exceptions to the caller', async () => {
    axios.post.mockRejectedValueOnce(new Error('Network Failure'));

    await expect(predictLoan({ Applicant_Income: 50000 })).rejects.toThrow('Network Failure');
  });
});
