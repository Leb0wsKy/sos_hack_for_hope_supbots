import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

/* ── Auth ── */
export const login = (email, password) =>
  api.post('/auth/login', { email, password });

export const getProfile = () => api.get('/auth/profile');

/* ── Villages ── */
export const getVillages = () => api.get('/villages');
export const getVillageById = (id) => api.get(`/villages/${id}`);
export const getVillageStatistics = (id) => api.get(`/villages/${id}/statistics`);

/* ── Signalements ── */
export const createSignalement = (formData) =>
  api.post('/signalements', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

export const getSignalements = (params) => api.get('/signalements', { params });
export const getSignalementById = (id) => api.get(`/signalements/${id}`);
export const updateSignalement = (id, data) => api.put(`/signalements/${id}`, data);
export const assignSignalement = (id, data) => api.put(`/signalements/${id}/assign`, data);
export const sauvegarderSignalement = (id) => api.put(`/signalements/${id}/sauvegarder`);
export const closeSignalement = (id, data) => api.put(`/signalements/${id}/close`, data);
export const archiveSignalement = (id) => api.put(`/signalements/${id}/archive`);
export const getMyDeadlines = () => api.get('/signalements/my-deadlines');

/* ── Workflows ── */
export const getMyWorkflows = () => api.get('/workflows/my-workflows');
export const getWorkflow = (signalementId) => api.get(`/workflows/${signalementId}`);
export const createWorkflow = (data) => api.post('/workflows', data);
export const updateWorkflowStage = (workflowId, formData) =>
  api.put(`/workflows/${workflowId}/stage`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
export const classifySignalement = (workflowId, data) =>
  api.put(`/workflows/${workflowId}/classify`, data);
export const escalateSignalement = (workflowId, data) =>
  api.put(`/workflows/${workflowId}/escalate`, data);
export const addWorkflowNote = (workflowId, data) =>
  api.post(`/workflows/${workflowId}/notes`, data);

/* ── Analytics ── */
export const getAnalytics = (params) => api.get('/analytics', { params });
export const getHeatmapData = () => api.get('/analytics/heatmap');
export const getVillageRatings = () => api.get('/analytics/village-ratings');
export const exportData = (params) =>
  api.get('/analytics/export', { params });

export default api;
