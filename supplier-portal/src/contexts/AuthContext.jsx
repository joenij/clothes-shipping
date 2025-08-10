import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { loginSupplier, getSupplierProfile } from '../services/api';

// Auth context
const AuthContext = createContext();

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload.supplier,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        error: null,
      };
    case 'UPDATE_PROFILE':
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

// Initial state
const initialState = {
  isLoading: true,
  isAuthenticated: false,
  user: null,
  error: null,
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('supplierAccessToken');
        const refreshToken = localStorage.getItem('supplierRefreshToken');
        const storedUser = localStorage.getItem('supplierUser');

        if (token && refreshToken && storedUser) {
          const user = JSON.parse(storedUser);
          
          // Verify token is still valid by fetching profile
          try {
            const profileData = await getSupplierProfile();
            dispatch({
              type: 'LOGIN_SUCCESS',
              payload: { supplier: profileData.supplier },
            });
          } catch (error) {
            // Token invalid, clear auth
            localStorage.removeItem('supplierAccessToken');
            localStorage.removeItem('supplierRefreshToken');
            localStorage.removeItem('supplierUser');
            dispatch({ type: 'LOGOUT' });
          }
        } else {
          dispatch({ type: 'LOGOUT' });
        }
      } catch (error) {
        console.error('Auth check error:', error);
        dispatch({ type: 'LOGOUT' });
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (credentials) => {
    try {
      dispatch({ type: 'LOGIN_START' });

      const response = await loginSupplier(credentials);
      const { supplier, accessToken, refreshToken } = response;

      // Store tokens and user data
      localStorage.setItem('supplierAccessToken', accessToken);
      localStorage.setItem('supplierRefreshToken', refreshToken);
      localStorage.setItem('supplierUser', JSON.stringify(supplier));

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { supplier },
      });

      return response;
    } catch (error) {
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: error.response?.data?.message || 'Login failed',
      });
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Clear local storage
      localStorage.removeItem('supplierAccessToken');
      localStorage.removeItem('supplierRefreshToken');
      localStorage.removeItem('supplierUser');

      // Optional: Call logout endpoint to invalidate tokens server-side
      // await api.post('/suppliers/logout');

      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local auth even if server call fails
      dispatch({ type: 'LOGOUT' });
    }
  };

  // Update profile function
  const updateProfile = (profileData) => {
    const updatedUser = { ...state.user, ...profileData };
    localStorage.setItem('supplierUser', JSON.stringify(updatedUser));
    dispatch({
      type: 'UPDATE_PROFILE',
      payload: profileData,
    });
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Set loading function
  const setLoading = (loading) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  // Check if user has specific permission
  const hasPermission = (permission) => {
    if (!state.user) return false;
    
    // For suppliers, check status and role
    if (state.user.role !== 'supplier') return false;
    if (state.user.status !== 'approved') return false;

    // Add more granular permissions as needed
    switch (permission) {
      case 'manage_products':
        return true; // All approved suppliers can manage products
      case 'view_orders':
        return true; // All approved suppliers can view orders
      case 'update_inventory':
        return true; // All approved suppliers can update inventory
      case 'view_analytics':
        return true; // All approved suppliers can view analytics
      default:
        return false;
    }
  };

  // Check if user can access feature based on status
  const canAccessFeature = (feature) => {
    if (!state.user) return false;

    const { status } = state.user;

    switch (feature) {
      case 'dashboard':
        return status === 'approved';
      case 'products':
        return status === 'approved';
      case 'orders':
        return status === 'approved';
      case 'inventory':
        return status === 'approved';
      case 'analytics':
        return status === 'approved';
      case 'profile':
        return true; // All authenticated users can access profile
      case 'settings':
        return status === 'approved';
      default:
        return status === 'approved';
    }
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (!state.user) return 'Supplier';
    return state.user.companyName || state.user.contactPerson || 'Supplier';
  };

  // Get user initials
  const getUserInitials = () => {
    if (!state.user) return 'S';
    
    const name = state.user.companyName || state.user.contactPerson || 'Supplier';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const value = {
    // State
    ...state,
    
    // Actions
    login,
    logout,
    updateProfile,
    clearError,
    setLoading,
    
    // Utilities
    hasPermission,
    canAccessFeature,
    getUserDisplayName,
    getUserInitials,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// HOC for protected components
export const withAuth = (Component) => {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, isLoading } = useAuth();
    
    if (isLoading) {
      return <div>Loading...</div>;
    }
    
    if (!isAuthenticated) {
      return <div>Access denied. Please log in.</div>;
    }
    
    return <Component {...props} />;
  };
};

// HOC for components that require specific permissions
export const withPermission = (permission) => (Component) => {
  return function PermissionComponent(props) {
    const { hasPermission } = useAuth();
    
    if (!hasPermission(permission)) {
      return <div>You don't have permission to access this feature.</div>;
    }
    
    return <Component {...props} />;
  };
};

export default AuthProvider;