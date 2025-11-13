import axios from 'axios';
import type {
  EvalRun,
  EvalSample,
  Feedback,
  FeedbackCreate,
  FeedbackUpdate,
  PaginatedResponse,
  EvalRunFilters,
  SampleFilters,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const evalApi = {
  list: async (
    offset: number = 0,
    limit: number = 50,
    filters?: EvalRunFilters
  ): Promise<PaginatedResponse<EvalRun>> => {
    const params = { offset, limit, ...filters };
    const response = await api.get('/api/evals', { params });
    return response.data;
  },

  get: async (id: string): Promise<EvalRun> => {
    const response = await api.get(`/api/evals/${id}`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/evals/${id}`);
  },

  listFiles: async (): Promise<{ files: any[] }> => {
    const response = await api.get('/api/evals/files/list');
    return response.data;
  },

  ingest: async (filePaths?: string[], scanDirectory?: boolean): Promise<any> => {
    const response = await api.post('/api/evals/ingest', {
      file_paths: filePaths,
      scan_directory: scanDirectory,
    });
    return response.data;
  },
};

export const sampleApi = {
  listForEval: async (
    evalId: string,
    offset: number = 0,
    limit: number = 50,
    filters?: SampleFilters
  ): Promise<PaginatedResponse<EvalSample>> => {
    const params = { offset, limit, ...filters };
    const response = await api.get(`/api/samples/eval/${evalId}/samples`, { params });
    return response.data;
  },

  get: async (id: string): Promise<EvalSample> => {
    const response = await api.get(`/api/samples/${id}`);
    return response.data;
  },

  compare: async (ids: string[]): Promise<{ samples: EvalSample[] }> => {
    // Manually construct query string with repeated params: ?ids=uuid1&ids=uuid2
    const queryString = ids.map(id => `ids=${encodeURIComponent(id)}`).join('&');
    const response = await api.get(`/api/samples/compare?${queryString}`);
    return response.data;
  },
};

export const feedbackApi = {
  getForSample: async (sampleId: string): Promise<Feedback[]> => {
    const response = await api.get(`/api/feedback/sample/${sampleId}/feedback`);
    return response.data;
  },

  create: async (sampleId: string, data: FeedbackCreate): Promise<Feedback> => {
    const response = await api.post(`/api/feedback/sample/${sampleId}/feedback`, data);
    return response.data;
  },

  update: async (id: string, data: FeedbackUpdate): Promise<Feedback> => {
    const response = await api.patch(`/api/feedback/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/feedback/${id}`);
  },

  getStats: async (): Promise<any> => {
    const response = await api.get('/api/feedback/stats');
    return response.data;
  },
};
