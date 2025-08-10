import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, GlobalStyles } from '@mui/material';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';

// Components
import Layout from './components/Layout/Layout';
import AuthProvider from './contexts/AuthContext';
import LoadingSpinner from './components/common/LoadingSpinner';

// Pages
import SupplierDashboard from './pages/SupplierDashboard';
import SupplierLogin from './pages/auth/SupplierLogin';
import SupplierRegister from './pages/auth/SupplierRegister';
import EmailVerification from './pages/auth/EmailVerification';
import Products from './pages/products/Products';
import ProductCreate from './pages/products/ProductCreate';
import ProductEdit from './pages/products/ProductEdit';
import Orders from './pages/orders/Orders';
import OrderDetail from './pages/orders/OrderDetail';
import Inventory from './pages/inventory/Inventory';
import Analytics from './pages/analytics/Analytics';
import Profile from './pages/profile/Profile';
import Settings from './pages/settings/Settings';
import Support from './pages/support/Support';

// Hooks
import { useAuth } from './hooks/useAuth';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});

// Create Material-UI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#2e7d32', // Green theme for suppliers
      light: '#4caf50',
      dark: '#1b5e20',
    },
    secondary: {
      main: '#f57c00',
      light: '#ff9800',
      dark: '#e65100',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    success: {
      main: '#4caf50',
    },
    warning: {
      main: '#ff9800',
    },
    error: {
      main: '#f44336',
    },
    info: {
      main: '#2196f3',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid #f0f0f0',
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#f8f9fa',
            borderBottom: '2px solid #e0e0e0',
          },
        },
      },
    },
  },
});

// Global styles
const globalStyles = (
  <GlobalStyles
    styles={{
      '*': {
        boxSizing: 'border-box',
      },
      html: {
        height: '100%',
      },
      body: {
        height: '100%',
        margin: 0,
        fontFamily: theme.typography.fontFamily,
      },
      '#root': {
        height: '100%',
      },
      '.MuiTableCell-root': {
        borderBottom: '1px solid #f0f0f0',
      },
    }}
  />
);

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'supplier') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>You don't have permission to access this supplier portal.</p>
      </div>
    );
  }

  // Check if supplier is approved
  if (user.status === 'pending') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Account Pending Approval</h2>
        <p>Your supplier account is currently being reviewed. You will receive an email once approved.</p>
      </div>
    );
  }

  if (user.status === 'rejected') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Account Not Approved</h2>
        <p>Unfortunately, your supplier application was not approved. Please contact support for more information.</p>
      </div>
    );
  }

  if (user.status === 'suspended') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Account Suspended</h2>
        <p>Your supplier account has been suspended. Please contact support for assistance.</p>
      </div>
    );
  }

  return children;
};

// Public Route component (redirect to dashboard if authenticated)
const PublicRoute = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (user && user.role === 'supplier' && user.status === 'approved') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Email verification required route
const EmailVerificationRoute = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.emailVerified) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Main App component
function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {globalStyles}
          <AuthProvider>
            <Router>
              <div className="App">
                <Routes>
                  {/* Public Routes */}
                  <Route
                    path="/login"
                    element={
                      <PublicRoute>
                        <SupplierLogin />
                      </PublicRoute>
                    }
                  />
                  <Route
                    path="/register"
                    element={
                      <PublicRoute>
                        <SupplierRegister />
                      </PublicRoute>
                    }
                  />

                  {/* Email Verification Route */}
                  <Route
                    path="/verify-email"
                    element={
                      <EmailVerificationRoute>
                        <EmailVerification />
                      </EmailVerificationRoute>
                    }
                  />

                  {/* Protected Routes */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Layout />
                      </ProtectedRoute>
                    }
                  >
                    {/* Dashboard */}
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<SupplierDashboard />} />

                    {/* Products */}
                    <Route path="products" element={<Products />} />
                    <Route path="products/create" element={<ProductCreate />} />
                    <Route path="products/edit/:id" element={<ProductEdit />} />

                    {/* Orders */}
                    <Route path="orders" element={<Orders />} />
                    <Route path="orders/:id" element={<OrderDetail />} />

                    {/* Inventory */}
                    <Route path="inventory" element={<Inventory />} />

                    {/* Analytics */}
                    <Route path="analytics" element={<Analytics />} />

                    {/* Profile & Settings */}
                    <Route path="profile" element={<Profile />} />
                    <Route path="settings" element={<Settings />} />

                    {/* Support */}
                    <Route path="support" element={<Support />} />
                  </Route>

                  {/* Catch all route */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>

                {/* Toast notifications */}
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                    },
                    success: {
                      duration: 3000,
                      theme: {
                        primary: '#4caf50',
                        secondary: '#fff',
                      },
                    },
                    error: {
                      duration: 5000,
                      theme: {
                        primary: '#f44336',
                        secondary: '#fff',
                      },
                    },
                  }}
                />
              </div>
            </Router>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;