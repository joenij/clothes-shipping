import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  timeout: 30000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('supplierAccessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('supplierRefreshToken');
        if (refreshToken) {
          const response = await axios.post(
            `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/auth/refresh`,
            { refreshToken }
          );

          const { accessToken } = response.data;
          localStorage.setItem('supplierAccessToken', accessToken);

          // Retry the original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('supplierAccessToken');
        localStorage.removeItem('supplierRefreshToken');
        localStorage.removeItem('supplierUser');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    }

    return Promise.reject(error);
  }
);

// Auth API functions
export const registerSupplier = async (supplierData) => {
  const response = await api.post('/suppliers/register', supplierData);
  return response.data;
};

export const loginSupplier = async (credentials) => {
  const response = await api.post('/suppliers/login', credentials);
  return response.data;
};

export const verifyEmail = async (token) => {
  const response = await api.post('/suppliers/verify-email', { token });
  return response.data;
};

export const forgotPassword = async (email) => {
  const response = await api.post('/suppliers/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (token, password) => {
  const response = await api.post('/suppliers/reset-password', { token, password });
  return response.data;
};

// Supplier Profile API functions
export const getSupplierProfile = async () => {
  const response = await api.get('/suppliers/profile');
  return response.data;
};

export const updateSupplierProfile = async (profileData) => {
  const response = await api.put('/suppliers/profile', profileData);
  return response.data;
};

export const uploadSupplierDocument = async (file, documentType) => {
  const formData = new FormData();
  formData.append('document', file);
  formData.append('type', documentType);

  const response = await api.post('/suppliers/documents', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Product API functions
export const fetchSupplierProducts = async (params = {}) => {
  const response = await api.get('/suppliers/products', { params });
  return response.data;
};

export const getSupplierProduct = async (id) => {
  const response = await api.get(`/suppliers/products/${id}`);
  return response.data;
};

export const createSupplierProduct = async (productData) => {
  const response = await api.post('/suppliers/products', productData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const updateSupplierProduct = async (id, productData) => {
  const response = await api.put(`/suppliers/products/${id}`, productData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const deleteSupplierProduct = async (id) => {
  const response = await api.delete(`/suppliers/products/${id}`);
  return response.data;
};

export const updateProductStock = async (id, stockData) => {
  const response = await api.patch(`/suppliers/products/${id}/stock`, stockData);
  return response.data;
};

export const updateProductStatus = async (id, status) => {
  const response = await api.patch(`/suppliers/products/${id}/status`, { status });
  return response.data;
};

// Order API functions
export const fetchSupplierOrders = async (params = {}) => {
  const response = await api.get('/suppliers/orders', { params });
  return response.data;
};

export const getSupplierOrder = async (id) => {
  const response = await api.get(`/suppliers/orders/${id}`);
  return response.data;
};

export const updateOrderStatus = async (id, status, notes = '') => {
  const response = await api.patch(`/suppliers/orders/${id}/status`, { status, notes });
  return response.data;
};

export const addOrderTracking = async (id, trackingData) => {
  const response = await api.post(`/suppliers/orders/${id}/tracking`, trackingData);
  return response.data;
};

// Inventory API functions
export const fetchSupplierInventory = async (params = {}) => {
  const response = await api.get('/suppliers/inventory', { params });
  return response.data;
};

export const updateInventoryQuantity = async (productId, quantity, notes = '') => {
  const response = await api.patch(`/suppliers/inventory/${productId}`, { quantity, notes });
  return response.data;
};

export const bulkUpdateInventory = async (updates) => {
  const response = await api.patch('/suppliers/inventory/bulk', { updates });
  return response.data;
};

export const getInventoryHistory = async (productId, params = {}) => {
  const response = await api.get(`/suppliers/inventory/${productId}/history`, { params });
  return response.data;
};

// Analytics API functions
export const fetchSupplierStats = async () => {
  const response = await api.get('/suppliers/analytics/stats');
  return response.data;
};

export const fetchSupplierSalesData = async (params = {}) => {
  const response = await api.get('/suppliers/analytics/sales', { params });
  return response.data;
};

export const fetchProductPerformance = async (params = {}) => {
  const response = await api.get('/suppliers/analytics/products', { params });
  return response.data;
};

export const fetchOrderAnalytics = async (params = {}) => {
  const response = await api.get('/suppliers/analytics/orders', { params });
  return response.data;
};

export const generateSupplierReport = async (reportType, params = {}) => {
  const response = await api.get(`/suppliers/analytics/reports/${reportType}`, { 
    params,
    responseType: 'blob' 
  });
  return response.data;
};

// Settings API functions
export const getSupplierSettings = async () => {
  const response = await api.get('/suppliers/settings');
  return response.data;
};

export const updateSupplierSettings = async (settings) => {
  const response = await api.put('/suppliers/settings', settings);
  return response.data;
};

export const updateNotificationPreferences = async (preferences) => {
  const response = await api.put('/suppliers/settings/notifications', preferences);
  return response.data;
};

// Support API functions
export const createSupportTicket = async (ticketData) => {
  const response = await api.post('/suppliers/support/tickets', ticketData);
  return response.data;
};

export const fetchSupportTickets = async (params = {}) => {
  const response = await api.get('/suppliers/support/tickets', { params });
  return response.data;
};

export const getSupportTicket = async (id) => {
  const response = await api.get(`/suppliers/support/tickets/${id}`);
  return response.data;
};

export const addTicketMessage = async (ticketId, message, attachments = []) => {
  const formData = new FormData();
  formData.append('message', message);
  
  attachments.forEach((file, index) => {
    formData.append(`attachment_${index}`, file);
  });

  const response = await api.post(`/suppliers/support/tickets/${ticketId}/messages`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// File upload utilities
export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await api.post('/upload/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append('document', file);

  const response = await api.post('/upload/document', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Utility functions
export const downloadFile = async (url, filename) => {
  const response = await api.get(url, {
    responseType: 'blob',
  });
  
  const blob = new Blob([response.data]);
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(link.href);
};

export const previewFile = async (url) => {
  const response = await api.get(url, {
    responseType: 'blob',
  });
  
  const blob = new Blob([response.data]);
  const fileURL = window.URL.createObjectURL(blob);
  window.open(fileURL, '_blank');
};

// WebSocket connection for real-time updates
export const connectWebSocket = () => {
  if (!window.WebSocket) {
    console.warn('WebSocket not supported');
    return null;
  }

  const token = localStorage.getItem('supplierAccessToken');
  const wsUrl = `${process.env.REACT_APP_WS_URL || 'ws://localhost:3001'}/suppliers?token=${token}`;
  
  const ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('WebSocket connected');
  };
  
  ws.onclose = () => {
    console.log('WebSocket disconnected');
    // Attempt to reconnect after 5 seconds
    setTimeout(connectWebSocket, 5000);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  return ws;
};

export default api;