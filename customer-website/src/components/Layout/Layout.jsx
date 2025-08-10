import React from 'react';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';

// Layout components
import Header from './Header';
import Footer from './Footer';
import CartDrawer from '../Cart/CartDrawer';
import MobileMenu from './MobileMenu';
import ScrollToTop from '../UI/ScrollToTop';
import CookieConsent from '../UI/CookieConsent';
import WhatsAppWidget from '../UI/WhatsAppWidget';

// Styled components
const LayoutContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: ${props => props.theme.colors.background};
`;

const MainContent = styled.main`
  flex: 1;
  padding-top: ${props => props.hasHeaderPadding ? '80px' : '0'};
  
  @media (max-width: 768px) {
    padding-top: ${props => props.hasHeaderPadding ? '60px' : '0'};
  }
`;

const Layout = ({ children }) => {
  const location = useLocation();
  
  // Pages that don't need header padding (like full-screen pages)
  const noHeaderPaddingPages = ['/login', '/register', '/checkout'];
  const hasHeaderPadding = !noHeaderPaddingPages.includes(location.pathname);
  
  // Pages that don't need footer (like checkout)
  const noFooterPages = ['/checkout'];
  const hasFooter = !noFooterPages.includes(location.pathname);
  
  return (
    <LayoutContainer>
      {/* Header - always visible */}
      <Header />
      
      {/* Main content area */}
      <MainContent hasHeaderPadding={hasHeaderPadding}>
        {children}
      </MainContent>
      
      {/* Footer - conditional */}
      {hasFooter && <Footer />}
      
      {/* Mobile menu overlay */}
      <MobileMenu />
      
      {/* Cart drawer/sidebar */}
      <CartDrawer />
      
      {/* Utility components */}
      <ScrollToTop />
      <CookieConsent />
      <WhatsAppWidget />
    </LayoutContainer>
  );
};

export default Layout;