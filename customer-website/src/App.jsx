import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { HelmetProvider } from 'react-helmet-async';
import { ToastContainer } from 'react-toastify';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Store
import { store, persistor } from './store/store';

// Context providers
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';

// Layout components
import Layout from './components/Layout/Layout';
import LoadingSpinner from './components/UI/LoadingSpinner';

// Auth hook
import { useAuth } from './hooks/useAuth';

// Lazy load pages for code splitting
const HomePage = React.lazy(() => import('./pages/HomePage'));
const ProductsPage = React.lazy(() => import('./pages/ProductsPage'));
const ProductDetailPage = React.lazy(() => import('./pages/ProductDetailPage'));
const CategoryPage = React.lazy(() => import('./pages/CategoryPage'));
const CartPage = React.lazy(() => import('./pages/CartPage'));
const CheckoutPage = React.lazy(() => import('./pages/CheckoutPage'));
const LoginPage = React.lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = React.lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/auth/ResetPasswordPage'));
const ProfilePage = React.lazy(() => import('./pages/account/ProfilePage'));
const OrdersPage = React.lazy(() => import('./pages/account/OrdersPage'));
const OrderDetailPage = React.lazy(() => import('./pages/account/OrderDetailPage'));
const WishlistPage = React.lazy(() => import('./pages/WishlistPage'));
const TrackingPage = React.lazy(() => import('./pages/TrackingPage'));
const ContactPage = React.lazy(() => import('./pages/ContactPage'));
const AboutPage = React.lazy(() => import('./pages/AboutPage'));
const FAQPage = React.lazy(() => import('./pages/FAQPage'));
const ShippingInfoPage = React.lazy(() => import('./pages/ShippingInfoPage'));
const PrivacyPolicyPage = React.lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsOfServicePage = React.lazy(() => import('./pages/TermsOfServicePage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));

// Initialize Stripe
const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder'
);

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Guest Route component (redirect to home if authenticated)
const GuestRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  return !isAuthenticated ? children : <Navigate to="/" replace />;
};

// App initialization component
const AppInitializer = ({ children }) => {
  const { initializeAuth } = useAuth();
  
  useEffect(() => {
    // Initialize authentication on app start
    initializeAuth();
  }, [initializeAuth]);
  
  return children;
};

function App() {
  return (
    <HelmetProvider>
      <Provider store={store}>
        <PersistGate loading={<LoadingSpinner />} persistor={persistor}>
          <Elements stripe={stripePromise}>
            <ThemeProvider>
              <LanguageProvider>
                <Router>
                  <AppInitializer>
                    <div className="App">
                      <Layout>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Routes>
                            {/* Public Routes */}
                            <Route path="/" element={<HomePage />} />
                            <Route path="/products" element={<ProductsPage />} />
                            <Route path="/products/:id" element={<ProductDetailPage />} />
                            <Route path="/category/:id" element={<CategoryPage />} />
                            <Route path="/cart" element={<CartPage />} />
                            <Route path="/track/:trackingNumber?" element={<TrackingPage />} />
                            <Route path="/contact" element={<ContactPage />} />
                            <Route path="/about" element={<AboutPage />} />
                            <Route path="/faq" element={<FAQPage />} />
                            <Route path="/shipping-info" element={<ShippingInfoPage />} />
                            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                            <Route path="/terms-of-service" element={<TermsOfServicePage />} />
                            
                            {/* Guest Only Routes */}
                            <Route path="/login" element={
                              <GuestRoute>
                                <LoginPage />
                              </GuestRoute>
                            } />
                            <Route path="/register" element={
                              <GuestRoute>
                                <RegisterPage />
                              </GuestRoute>
                            } />
                            <Route path="/forgot-password" element={
                              <GuestRoute>
                                <ForgotPasswordPage />
                              </GuestRoute>
                            } />
                            <Route path="/reset-password/:token" element={
                              <GuestRoute>
                                <ResetPasswordPage />
                              </GuestRoute>
                            } />
                            
                            {/* Protected Routes */}
                            <Route path="/checkout" element={
                              <ProtectedRoute>
                                <CheckoutPage />
                              </ProtectedRoute>
                            } />
                            <Route path="/account/profile" element={
                              <ProtectedRoute>
                                <ProfilePage />
                              </ProtectedRoute>
                            } />
                            <Route path="/account/orders" element={
                              <ProtectedRoute>
                                <OrdersPage />
                              </ProtectedRoute>
                            } />
                            <Route path="/account/orders/:id" element={
                              <ProtectedRoute>
                                <OrderDetailPage />
                              </ProtectedRoute>
                            } />
                            <Route path="/wishlist" element={
                              <ProtectedRoute>
                                <WishlistPage />
                              </ProtectedRoute>
                            } />
                            
                            {/* 404 Route */}
                            <Route path="*" element={<NotFoundPage />} />
                          </Routes>
                        </Suspense>
                      </Layout>
                      
                      {/* Global Toast Notifications */}
                      <ToastContainer
                        position="bottom-right"
                        autoClose={5000}
                        hideProgressBar={false}
                        newestOnTop={false}
                        closeOnClick
                        rtl={false}
                        pauseOnFocusLoss
                        draggable
                        pauseOnHover
                        theme="light"
                      />
                    </div>
                  </AppInitializer>
                </Router>
              </LanguageProvider>
            </ThemeProvider>
          </Elements>
        </PersistGate>
      </Provider>
    </HelmetProvider>
  );
}

export default App;