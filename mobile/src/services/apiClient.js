import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { store } from '../store/store';
import { refreshToken, clearAuth } from '../store/slices/authSlice';

// API Base URL
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3001/api'  // Development
  : 'https://api.itsjn.com/api';  // Production

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
const getStoredAccessToken = async () => {
  try {
    const credentials = await Keychain.getInternetCredentials('clothesapp_tokens');
    return credentials ? credentials.password : null;
  } catch (error) {
    console.error('Error retrieving access token:', error);
    return null;
  }
};

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    // Add access token to requests
    const token = await getStoredAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add user language preference
    const state = store.getState();
    const language = state.settings?.language || 'en';
    config.headers['Accept-Language'] = language;
    
    // Add currency preference
    const currency = state.settings?.currency || 'EUR';
    config.headers['X-Currency'] = currency;
    
    // Log request in development
    if (__DEV__) {
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
    if (__DEV__) {
      console.log(`API Response: ${response.status} ${response.config.url}`);
    }
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Log error in development
    if (__DEV__) {
      console.log('API Error:', error.response?.status, error.response?.data);
    }
    
    // Handle 401 Unauthorized (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Attempt to refresh token
        await store.dispatch(refreshToken()).unwrap();
        
        // Retry the original request with new token
        const newToken = await getStoredAccessToken();
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear auth state and redirect to login
        store.dispatch(clearAuth());
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

// API helper functions
export const api = {
  // Auth endpoints
  auth: {
    login: (email, password) => apiClient.post('/auth/login', { email, password }),
    register: (userData) => apiClient.post('/auth/register', userData),
    refresh: () => apiClient.post('/auth/refresh'),
    logout: () => apiClient.post('/auth/logout'),
    me: () => apiClient.get('/auth/me'),
  },
  
  // Product endpoints
  products: {
    getAll: (params) => apiClient.get('/products', { params }),
    getById: (id, language) => apiClient.get(`/products/${id}`, { params: { language } }),
    search: (query, filters) => apiClient.get('/products/search', { params: { query, ...filters } }),
  },
  
  // Category endpoints
  categories: {
    getAll: (language) => apiClient.get('/categories', { params: { language } }),
    getById: (id, language) => apiClient.get(`/categories/${id}`, { params: { language } }),
  },
  
  // Cart endpoints
  cart: {
    sync: (items) => apiClient.post('/cart/sync', { items }),
    add: (productId, variantId, quantity) => apiClient.post('/cart/add', { productId, variantId, quantity }),
    remove: (productId, variantId) => apiClient.delete('/cart/remove', { data: { productId, variantId } }),
    update: (productId, variantId, quantity) => apiClient.put('/cart/update', { productId, variantId, quantity }),
    clear: () => apiClient.delete('/cart/clear'),
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
    createIntent: (amount, currency) => apiClient.post('/payments/create-intent', { amount, currency }),
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
};

export default apiClient;