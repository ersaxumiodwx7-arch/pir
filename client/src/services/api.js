import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle expired/invalid auth tokens: clear them and send the user back to the
// login page instead of leaving them stuck on a page where every save fails.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Avoid a redirect loop while the user is already on the login page
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
};

// Forms API
export const formsAPI = {
  getAll: () => api.get('/forms'),
  getById: (id) => api.get(`/forms/${id}`),
  getBySlug: (slug) => api.get(`/forms/slug/${slug}`),
  create: (data) => api.post('/forms', data),
  update: (id, data) => api.put(`/forms/${id}`, data),
  delete: (id) => api.delete(`/forms/${id}`),
  duplicate: (id) => api.post(`/forms/${id}/duplicate`),
};

// Fields API
export const fieldsAPI = {
  getByFormId: (formId) => api.get(`/fields/form/${formId}`),
  create: (data) => api.post('/fields', data),
  update: (id, data) => api.put(`/fields/${id}`, data),
  delete: (id) => api.delete(`/fields/${id}`),
  reorder: (fields) => api.post('/fields/reorder', { fields }),
};

// Submissions API
export const submissionsAPI = {
  submit: (data) => api.post('/submissions/submit', data),
  getByFormId: (formId) => api.get(`/submissions/form/${formId}`),
  getById: (id) => api.get(`/submissions/${id}`),
  exportCSV: (formId) => api.get(`/submissions/form/${formId}/export`, { responseType: 'blob' }),
};

// Upload API
export const uploadAPI = {
  uploadLogo: (file) => {
    const formData = new FormData();
    formData.append('logo', file);
    return api.post('/upload/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Admin Client Management API
export const adminClientsAPI = {
  getAll: (params) => api.get('/admin/clients', { params }),
  getById: (id) => api.get(`/admin/clients/${id}`),
  create: (data) => api.post('/admin/clients', data),
  update: (id, data) => api.put(`/admin/clients/${id}`, data),
  delete: (id) => api.delete(`/admin/clients/${id}`),
  // Transactions
  getTransactions: (id, params) => api.get(`/admin/clients/${id}/transactions`, { params }),
  createTransaction: (id, data) => api.post(`/admin/clients/${id}/transactions`, data),
  updateTransaction: (id, txnId, data) => api.put(`/admin/clients/${id}/transactions/${txnId}`, data),
  deleteTransaction: (id, txnId) => api.delete(`/admin/clients/${id}/transactions/${txnId}`),
  // Documents
  getDocuments: (id) => api.get(`/admin/clients/${id}/documents`),
  uploadDocument: (id, formData) => api.post(`/admin/clients/${id}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteDocument: (id, docId) => api.delete(`/admin/clients/${id}/documents/${docId}`),
  // Notifications
  getNotifications: (id) => api.get(`/admin/clients/${id}/notifications`),
  createNotification: (id, data) => api.post(`/admin/clients/${id}/notifications`, data),
  updateNotification: (id, notifId, data) => api.put(`/admin/clients/${id}/notifications/${notifId}`, data),
  deleteNotification: (id, notifId) => api.delete(`/admin/clients/${id}/notifications/${notifId}`),
  broadcastNotification: (data) => api.post('/admin/clients/broadcast/notification', data),
  // Bill Payments
  getBillPayments: (id, params) => api.get(`/admin/clients/${id}/bill-payments`, { params }),
  createBillPayment: (id, data) => api.post(`/admin/clients/${id}/bill-payments`, data),
  updateBillPaymentStatus: (id, billId, data) => api.put(`/admin/clients/${id}/bill-payments/${billId}`, data),
  // Activity
  getActivity: (id) => api.get(`/admin/clients/${id}/activity`),
  // Client Deposit Methods (per-client)
  getDepositMethods: (id) => api.get(`/admin/clients/${id}/deposit-methods`),
  createDepositMethod: (id, data) => api.post(`/admin/clients/${id}/deposit-methods`, data),
  updateDepositMethod: (id, methodId, data) => api.put(`/admin/clients/${id}/deposit-methods/${methodId}`, data),
  deleteDepositMethod: (id, methodId) => api.delete(`/admin/clients/${id}/deposit-methods/${methodId}`),
};

// Admin Agent Management API
export const adminAgentsAPI = {
  getAll: (params) => api.get('/admin/agents', { params }),
  getById: (id) => api.get(`/admin/agents/${id}`),
  create: (data) => api.post('/admin/agents', data),
  update: (id, data) => api.put(`/admin/agents/${id}`, data),
  delete: (id) => api.delete(`/admin/agents/${id}`),
};

// Admin Deposit Methods API
export const adminDepositMethodsAPI = {
  getAll: (params) => api.get('/admin/deposits/methods', { params }),
  getById: (id) => api.get(`/admin/deposits/methods/${id}`),
  create: (data) => api.post('/admin/deposits/methods', data),
  update: (id, data) => api.put(`/admin/deposits/methods/${id}`, data),
  delete: (id) => api.delete(`/admin/deposits/methods/${id}`),
  toggle: (id) => api.patch(`/admin/deposits/methods/${id}/toggle`),
};

// Admin Deposits API
export const adminDepositsAPI = {
  getAll: (params) => api.get('/admin/deposits/requests', { params }),
  getById: (id) => api.get(`/admin/deposits/requests/${id}`),
  updateStatus: (id, data) => api.patch(`/admin/deposits/requests/${id}/status`, data),
  getStats: () => api.get('/admin/deposits/requests/stats'),
};

// Agent Verification (public)
export const agentVerificationAPI = {
  verify: (agentId) => clientApi.get(`/client/verify-agent/${agentId}`),
};

// Client Portal API (separate auth context)
const clientApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

clientApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('client_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

clientApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('client_token');
      localStorage.removeItem('client_data');
      if (!window.location.pathname.startsWith('/client/login')) {
        window.location.href = '/client/login';
      }
    }
    return Promise.reject(error);
  }
);

export const clientPortalAPI = {
  login: (caseId, password) => clientApi.post('/client/auth/login', { case_id: caseId, password }),
  getProfile: () => clientApi.get('/client/auth/profile'),
  changePassword: (data) => clientApi.post('/client/auth/change-password', data),
  forgotPassword: (data) => clientApi.post('/client/auth/forgot-password', data),
  resetPassword: (data) => clientApi.post('/client/auth/reset-password', data),
  getDashboard: () => clientApi.get('/client/dashboard'),
  getAccount: () => clientApi.get('/client/account'),
  getTransactions: (params) => clientApi.get('/client/transactions', { params }),
  getDocuments: () => clientApi.get('/client/documents'),
  getNotifications: () => clientApi.get('/client/notifications'),
  markRead: (id) => clientApi.put(`/client/notifications/${id}/read`),
  markAllRead: () => clientApi.put('/client/notifications/read-all'),
  getActivity: () => clientApi.get('/client/activity'),
  // Bill Payments
  getBillPayments: () => clientApi.get('/client/bill-payments'),
  submitBillPayment: (data) => clientApi.post('/client/bill-payments', data),
  // Deposits
  getDepositMethods: () => clientApi.get('/client/deposits/methods'),
  getDepositMethodDetails: (id) => clientApi.get(`/client/deposits/methods/${id}`),
  submitDeposit: (formData) => clientApi.post('/client/deposits/submit', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getMyDeposits: () => clientApi.get('/client/deposits/my-deposits'),
  getMyDepositDetails: (id) => clientApi.get(`/client/deposits/my-deposits/${id}`),
  // Transfers
  submitTransfer: (data) => clientApi.post('/client/transfers', data),
  getTransfers: (params) => clientApi.get('/client/transfers', { params }),
};

export default api;
