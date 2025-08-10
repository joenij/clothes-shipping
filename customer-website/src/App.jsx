import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { HelmetProvider } from 'react-helmet-async';

// Store
import { store, persistor } from './store/store';

// Simple layout component
const Layout = ({ children }) => (
  <div style={{ minHeight: '100vh', padding: '20px' }}>
    <header style={{ background: '#007bff', color: 'white', padding: '1rem', marginBottom: '2rem' }}>
      <h1>Clothes Shipping - Customer Portal</h1>
    </header>
    <main>{children}</main>
    <footer style={{ marginTop: '2rem', padding: '1rem', background: '#f8f9fa', textAlign: 'center' }}>
      <p>&copy; 2025 Clothes Shipping. All rights reserved.</p>
    </footer>
  </div>
);

// Simple home page
const HomePage = () => (
  <div>
    <h2>Welcome to Clothes Shipping</h2>
    <p>Premium fashion from China with worldwide shipping.</p>
    <p>Customer website is being built...</p>
  </div>
);

// Loading component
const LoadingSpinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
    <div style={{ 
      width: '40px', 
      height: '40px', 
      border: '4px solid #f3f3f3', 
      borderTop: '4px solid #007bff', 
      borderRadius: '50%', 
      animation: 'spin 1s linear infinite' 
    }}></div>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

function App() {
  return (
    <HelmetProvider>
      <Provider store={store}>
        <PersistGate loading={<LoadingSpinner />} persistor={persistor}>
          <Router>
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="*" element={<HomePage />} />
              </Routes>
            </Layout>
          </Router>
        </PersistGate>
      </Provider>
    </HelmetProvider>
  );
}

export default App;