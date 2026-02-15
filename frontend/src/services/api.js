import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://sos-supbots-backend-4484b02ee4b5.herokuapp.com/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// JWT token interceptor
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
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

/* ── Auth ── */
export const login = (email, password) =>
  api.post('/auth/login', { email, password });

export const getProfile = () => api.get('/auth/profile');

// Villages
export const getVillages = () => api.get('/villages');

// Signalements
export const createSignalement = (formData) => 
  api.post('/signalements', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

export const getSignalements = () => api.get('/signalements');
export const getMyCreatedSignalements = () => api.get('/signalements/my-created');

export const closeSignalement = (id, closureReason) =>
  api.put(`/signalements/${id}/close`, { closureReason });

export const archiveSignalement = (id) =>
  api.put(`/signalements/${id}/archive`);

export const sauvegarderSignalement = (id) => 
  api.put(`/signalements/${id}/sauvegarder`);

export const predictFalseAlarm = (id) =>
  api.get(`/signalements/${id}/predict-false-alarm`);

export const markSignalementFaux = (id) =>
  api.put(`/signalements/${id}/faux`);

export const downloadAttachment = (signalementId, filename) =>
  api.get(`/signalements/${signalementId}/attachments/${filename}`, { responseType: 'blob' });

// Workflow endpoints
export const createWorkflow = (signalementId) =>
  api.post('/workflows', { signalementId });

export const getWorkflow = (signalementId) =>
  api.get(`/workflows/${signalementId}`);

export const updateWorkflowStage = (workflowId, formData) =>
  api.put(`/workflows/${workflowId}/stage`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

export const classifySignalement = (workflowId, classification) =>
  api.put(`/workflows/${workflowId}/classify`, { classification });

export const escalateSignalement = (workflowId, escalatedTo) =>
  api.put(`/workflows/${workflowId}/escalate`, { escalatedTo });

export const addWorkflowNote = (workflowId, content) =>
  api.post(`/workflows/${workflowId}/notes`, { content });

export const downloadTemplate = (templateName) =>
  api.get(`/workflows/templates/${templateName}`, { responseType: 'blob' });

export const markDpeGenerated = (workflowId) =>
  api.put(`/workflows/${workflowId}/dpe-generated`);

export const closeWorkflow = (workflowId, reason) =>
  api.put(`/workflows/${workflowId}/close`, { reason });

// DPE AI generation endpoints
export const generateDPE = (signalementId) =>
  api.post(`/dpe/${signalementId}/generate`);

export const getDPEDraft = (signalementId) =>
  api.get(`/dpe/${signalementId}`);

export const submitDPEDraft = (signalementId) =>
  api.post(`/dpe/${signalementId}/submit`);

// Director Village — sign & forward
export const directorSignDossier = (id, signatureType, target, signatureImage) => {
  if (signatureImage) {
    const fd = new FormData();
    fd.append('signatureType', 'IMAGE');
    fd.append('target', target);
    fd.append('signatureImage', signatureImage);
    return api.post(`/signalements/${id}/director/sign`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  }
  return api.post(`/signalements/${id}/director/sign`, { signatureType: signatureType || 'STAMP', target });
};

export const directorForwardDossier = (id) =>
  api.post(`/signalements/${id}/director/forward`);

// Download workflow stage attachment
export const downloadWorkflowAttachment = (workflowId, stage, filename) =>
  api.get(`/workflows/${workflowId}/stages/${stage}/attachments/${filename}`, { responseType: 'blob' });

// Analytics (Level 3)
export const getAnalytics = () => api.get('/analytics');
export const getVillageRatings = () => api.get('/analytics/village-ratings');
export const exportData = (params) => api.get('/analytics/export', { params, responseType: 'blob' });

// History / Activity logs (Level 2+)
export const getActivityHistory = (params) => api.get('/history', { params });

// Admin (Level 4)
export const getAdminUsers = () => api.get('/admin/users');
export const createAdminUser = (userData) => api.post('/admin/users', userData);
export const updateUserStatus = (id, status) => api.put(`/admin/users/${id}/status`, status);
export const updateUserRole = (id, data) => api.put(`/admin/users/${id}/role`, data);
export const resetUserPassword = (id, data) => api.put(`/admin/users/${id}/reset-password`, data);
export const deleteAdminUser = (id) => api.delete(`/admin/users/${id}`);
export const grantTemporaryRole = (id, data) => api.post(`/admin/users/${id}/temp-role`, data);
export const revokeTemporaryRole = (id) => api.delete(`/admin/users/${id}/temp-role`);
export const getAdminSignalements = (params) => api.get('/admin/signalements', { params });
export const getAdminAuditLogs = (params) => api.get('/admin/audit-logs', { params });

export default api;