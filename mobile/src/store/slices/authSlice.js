import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import apiClient from '../../services/apiClient';

// Secure token storage
const storeTokenSecurely = async (accessToken, refreshToken) => {
  try {
    await Keychain.setInternetCredentials(
      'clothesapp_tokens',
      'access_token',
      accessToken
    );
    await AsyncStorage.setItem('refreshToken', refreshToken);
  } catch (error) {
    console.error('Error storing tokens:', error);
  }
};

const getStoredTokens = async () => {
  try {
    const credentials = await Keychain.getInternetCredentials('clothesapp_tokens');
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    
    if (credentials && refreshToken) {
      return {
        accessToken: credentials.password,
        refreshToken
      };
    }
  } catch (error) {
    console.error('Error retrieving tokens:', error);
  }
  return null;
};

const clearStoredTokens = async () => {
  try {
    await Keychain.resetInternetCredentials('clothesapp_tokens');
    await AsyncStorage.removeItem('refreshToken');
  } catch (error) {
    console.error('Error clearing tokens:', error);
  }
};

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { user, accessToken } = response.data;
      
      // Store tokens securely
      const refreshToken = response.data.refreshToken || 'dummy'; // Backend sets as httpOnly cookie
      await storeTokenSecurely(accessToken, refreshToken);
      
      return { user, accessToken };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 'Login failed'
      );
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/auth/register', userData);
      const { user, accessToken } = response.data;
      
      // Store tokens securely
      const refreshToken = response.data.refreshToken || 'dummy';
      await storeTokenSecurely(accessToken, refreshToken);
      
      return { user, accessToken };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 'Registration failed'
      );
    }
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/auth/refresh');
      const { accessToken } = response.data;
      
      // Update stored access token
      const tokens = await getStoredTokens();
      if (tokens) {
        await storeTokenSecurely(accessToken, tokens.refreshToken);
      }
      
      return { accessToken };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 'Token refresh failed'
      );
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data.user;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 'Failed to get user data'
      );
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await apiClient.post('/auth/logout');
      await clearStoredTokens();
      return {};
    } catch (error) {
      // Even if logout fails on server, clear local tokens
      await clearStoredTokens();
      return {};
    }
  }
);

const initialState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setTokens: (state, action) => {
      const { accessToken, user } = action.payload;
      state.accessToken = accessToken;
      state.user = user;
      state.isAuthenticated = true;
    },
    clearAuth: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    setInitialized: (state) => {
      state.isInitialized = true;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      
      // Register
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      
      // Refresh Token
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.accessToken = action.payload.accessToken;
      })
      .addCase(refreshToken.rejected, (state) => {
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
      })
      
      // Get Current User
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(getCurrentUser.rejected, (state) => {
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
      })
      
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
        state.error = null;
      });
  },
});

export const { clearError, setTokens, clearAuth, setInitialized } = authSlice.actions;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.isLoading;
export const selectAuthError = (state) => state.auth.error;

export default authSlice.reducer;