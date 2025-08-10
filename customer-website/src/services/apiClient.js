import axios from 'axios';
import { store } from '../store/store';
import { refreshToken, clearAuth } from '../store/slices/authSlice';

// API Base URL
const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3001/api'  // Development
  : 'https://api.itsjn.com/api';  // Production

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // For cookies (refresh tokens)
});

// Token management for web (using localStorage instead of Keychain)
const getStoredAccessToken = () => {
  try {
    return localStorage.getItem('clothesapp_access_token');
  } catch (error) {
    console.error('Error retrieving access token:', error);
    return null;
  }
};

const setStoredAccessToken = (token) => {
  try {
    if (token) {
      localStorage.setItem('clothesapp_access_token', token);
    } else {
      localStorage.removeItem('clothesapp_access_token');
    }
  } catch (error) {
    console.error('Error storing access token:', error);
  }
};

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Add access token to requests
    const token = getStoredAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add user language preference
    const state = store.getState();
    const language = state.settings?.language || navigator.language.split('-')[0] || 'en';
    config.headers['Accept-Language'] = language;
    
    // Add currency preference
    const currency = state.settings?.currency || 'EUR';
    config.headers['X-Currency'] = currency;
    
    // Add device info for analytics
    config.headers['X-Device-Type'] = 'web';
    config.headers['X-User-Agent'] = navigator.userAgent;
    
    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response) => {
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Response: ${response.status} ${response.config.url}`);
    }
    
    // Update token if provided in response
    const newToken = response.data?.accessToken;
    if (newToken) {
      setStoredAccessToken(newToken);
    }
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.log('API Error:', error.response?.status, error.response?.data);
    }
    
    // Handle 401 Unauthorized (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Attempt to refresh token
        const refreshResult = await store.dispatch(refreshToken()).unwrap();
        
        // Update stored token
        if (refreshResult.accessToken) {
          setStoredAccessToken(refreshResult.accessToken);
          originalRequest.headers.Authorization = `Bearer ${refreshResult.accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear auth state
        store.dispatch(clearAuth());
        setStoredAccessToken(null);
        
        // Redirect to login if not already there
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }
    
    // Handle network errors
    if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
      error.userMessage = 'Network connection error. Please check your internet connection.';
    }
    
    // Handle timeout errors
    if (error.code === 'ECONNABORTED') {
      error.userMessage = 'Request timeout. Please try again.';
    }
    
    // Handle server errors
    if (error.response?.status >= 500) {
      error.userMessage = 'Server error. Please try again later.';
    }
    
    // Handle client errors
    if (error.response?.status >= 400 && error.response?.status < 500) {
      error.userMessage = error.response?.data?.error || 'Request failed. Please check your input.';
    }
    
    return Promise.reject(error);
  }
);

// API helper functions (same as mobile app for consistency)
export const api = {
  // Auth endpoints
  auth: {
    login: (email, password) => apiClient.post('/auth/login', { email, password }),
    register: (userData) => apiClient.post('/auth/register', userData),
    refresh: () => apiClient.post('/auth/refresh'),
    logout: () => apiClient.post('/auth/logout'),
    me: () => apiClient.get('/auth/me'),
    forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }),
    resetPassword: (token, password) => apiClient.post('/auth/reset-password', { token, password }),
  },
  
  // Product endpoints
  products: {
    getAll: (params) => apiClient.get('/products', { params }),
    getById: (id, language) => apiClient.get(`/products/${id}`, { params: { language } }),
    search: (query, filters) => apiClient.get('/products/search', { params: { query, ...filters } }),
    getFeatured: (limit = 12) => apiClient.get('/products/featured', { params: { limit } }),
    getByCategory: (categoryId, params) => apiClient.get(`/products/category/${categoryId}`, { params }),
  },
  
  // Category endpoints
  categories: {
    getAll: (language) => apiClient.get('/categories', { params: { language } }),
    getById: (id, language) => apiClient.get(`/categories/${id}`, { params: { language } }),
    getTree: (language) => apiClient.get('/categories/tree', { params: { language } }),
  },
  
  // Cart endpoints
  cart: {
    sync: (items) => apiClient.post('/cart/sync', { items }),
    add: (productId, variantId, quantity) => apiClient.post('/cart/add', { productId, variantId, quantity }),
    remove: (productId, variantId) => apiClient.delete('/cart/remove', { data: { productId, variantId } }),
    update: (productId, variantId, quantity) => apiClient.put('/cart/update', { productId, variantId, quantity }),
    clear: () => apiClient.delete('/cart/clear'),
    get: () => apiClient.get('/cart'),
  },
  
  // Order endpoints
  orders: {
    create: (orderData) => apiClient.post('/orders', orderData),
    getAll: (params) => apiClient.get('/orders', { params }),
    getById: (id) => apiClient.get(`/orders/${id}`),
    cancel: (id) => apiClient.put(`/orders/${id}/cancel`),
    track: (trackingNumber) => apiClient.get(`/orders/track/${trackingNumber}`),
  },
  
  // Payment endpoints
  payments: {
    createIntent: (amount, currency, orderId) => apiClient.post('/payments/create-intent', { amount, currency, orderId }),
    confirmPayment: (paymentIntentId, paymentMethodId) => 
      apiClient.post('/payments/confirm', { paymentIntentId, paymentMethodId }),
    getPaymentMethods: () => apiClient.get('/payments/methods'),
  },
  
  // User endpoints
  users: {
    getProfile: () => apiClient.get('/users/profile'),
    updateProfile: (userData) => apiClient.put('/users/profile', userData),
    getAddresses: () => apiClient.get('/users/addresses'),
    addAddress: (address) => apiClient.post('/users/addresses', address),
    updateAddress: (id, address) => apiClient.put(`/users/addresses/${id}`, address),
    deleteAddress: (id) => apiClient.delete(`/users/addresses/${id}`),
    changePassword: (currentPassword, newPassword) => 
      apiClient.put('/users/change-password', { currentPassword, newPassword }),
  },
  
  // Shipping endpoints
  shipping: {
    getZones: () => apiClient.get('/shipping/zones'),
    calculateShipping: (address, items) => 
      apiClient.post('/shipping/calculate', { address, items }),
    trackPackage: (trackingNumber) => apiClient.get(`/shipping/track/${trackingNumber}`),
  },
  
  // Wishlist endpoints
  wishlist: {
    getAll: () => apiClient.get('/wishlist'),
    add: (productId, variantId) => apiClient.post('/wishlist/add', { productId, variantId }),
    remove: (productId, variantId) => apiClient.delete('/wishlist/remove', { data: { productId, variantId } }),
  },
  
  // Newsletter endpoints
  newsletter: {
    subscribe: (email) => apiClient.post('/newsletter/subscribe', { email }),
    unsubscribe: (email) => apiClient.post('/newsletter/unsubscribe', { email }),
  },
  
  // Reviews endpoints
  reviews: {
    getByProduct: (productId, params) => apiClient.get(`/reviews/product/${productId}`, { params }),
    create: (reviewData) => apiClient.post('/reviews', reviewData),
    update: (id, reviewData) => apiClient.put(`/reviews/${id}`, reviewData),
    delete: (id) => apiClient.delete(`/reviews/${id}`),
  },
};

// Export token management functions for auth slice
export { getStoredAccessToken, setStoredAccessToken };

export default apiClient;