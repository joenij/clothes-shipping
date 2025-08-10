import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSearch,
  FiShoppingBag,
  FiUser,
  FiHeart,
  FiMenu,
  FiGlobe,
} from 'react-icons/fi';

// Redux selectors and actions
import { selectCartItemCount, openCartDrawer } from '../../store/slices/cartSlice';
import { selectIsAuthenticated, selectUser } from '../../store/slices/authSlice';
import { selectWishlistItemCount } from '../../store/slices/wishlistSlice';

// Components
import SearchBar from '../Search/SearchBar';
import LanguageSelector from '../UI/LanguageSelector';
import CurrencySelector from '../UI/CurrencySelector';
import UserMenu from './UserMenu';

// Styled components
const HeaderContainer = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid ${props => props.theme.colors.border};
  transition: all 0.3s ease;
  
  ${props => props.scrolled && `
    box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
  `}
`;

const TopBar = styled.div`
  background: ${props => props.theme.colors.primary};
  color: white;
  padding: 4px 0;
  font-size: 12px;
  text-align: center;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const HeaderContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 70px;
  
  @media (max-width: 768px) {
    height: 60px;
    padding: 0 12px;
  }
`;

const Logo = styled(Link)`
  font-size: 24px;
  font-weight: 700;
  color: ${props => props.theme.colors.primary};
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 8px;
  
  @media (max-width: 768px) {
    font-size: 20px;
  }
`;

const Navigation = styled.nav`
  display: flex;
  align-items: center;
  gap: 32px;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const NavLink = styled(Link)`
  color: ${props => props.theme.colors.text};
  text-decoration: none;
  font-weight: 500;
  position: relative;
  transition: color 0.3s ease;
  
  &:hover {
    color: ${props => props.theme.colors.primary};
  }
  
  &.active {
    color: ${props => props.theme.colors.primary};
    
    &::after {
      content: '';
      position: absolute;
      bottom: -8px;
      left: 0;
      right: 0;
      height: 2px;
      background: ${props => props.theme.colors.primary};
    }
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  
  @media (max-width: 768px) {
    gap: 12px;
  }
`;

const SearchToggle = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.text};
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => props.theme.colors.lightGray};
  }
  
  @media (min-width: 769px) {
    display: none;
  }
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.text};
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  position: relative;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => props.theme.colors.lightGray};
  }
`;

const Badge = styled.span`
  position: absolute;
  top: 2px;
  right: 2px;
  background: ${props => props.theme.colors.accent};
  color: white;
  border-radius: 50%;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
`;

const MobileMenuButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.text};
  font-size: 24px;
  cursor: pointer;
  padding: 4px;
  
  @media (min-width: 769px) {
    display: none;
  }
`;

const SearchOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
  z-index: 999;
  display: flex;
  align-items: flex-start;
  padding-top: 100px;
  padding: 100px 16px 0;
`;

const UtilityBar = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const SearchContainer = styled.div`
  flex: 1;
  max-width: 400px;
  margin: 0 32px;
  
  @media (max-width: 968px) {
    display: none;
  }
`;

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Redux selectors
  const cartItemCount = useSelector(selectCartItemCount);
  const wishlistItemCount = useSelector(selectWishlistItemCount);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  
  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Close search on route change
  useEffect(() => {
    setShowSearch(false);
  }, [location]);
  
  const handleCartClick = () => {
    dispatch(openCartDrawer());
  };
  
  const handleWishlistClick = () => {
    if (isAuthenticated) {
      navigate('/wishlist');
    } else {
      navigate('/login');
    }
  };
  
  const handleUserClick = () => {
    if (isAuthenticated) {
      setShowUserMenu(!showUserMenu);
    } else {
      navigate('/login');
    }
  };
  
  return (
    <>
      <HeaderContainer scrolled={scrolled}>
        <TopBar>
          🚚 Free shipping on orders over €50 | 📞 Customer Support: +1-234-567-8900
        </TopBar>
        
        <HeaderContent>
          {/* Logo */}
          <Logo to="/">
            👕 ClothesShip
          </Logo>
          
          {/* Desktop Navigation */}
          <Navigation>
            <NavLink 
              to="/" 
              className={location.pathname === '/' ? 'active' : ''}
            >
              Home
            </NavLink>
            <NavLink 
              to="/products" 
              className={location.pathname.startsWith('/products') ? 'active' : ''}
            >
              Products
            </NavLink>
            <NavLink 
              to="/categories" 
              className={location.pathname.startsWith('/category') ? 'active' : ''}
            >
              Categories
            </NavLink>
            <NavLink 
              to="/about"
              className={location.pathname === '/about' ? 'active' : ''}
            >
              About
            </NavLink>
            <NavLink 
              to="/contact"
              className={location.pathname === '/contact' ? 'active' : ''}
            >
              Contact
            </NavLink>
          </Navigation>
          
          {/* Desktop Search */}
          <SearchContainer>
            <SearchBar />
          </SearchContainer>
          
          {/* Header Actions */}
          <HeaderActions>
            {/* Utility Selectors */}
            <UtilityBar>
              <LanguageSelector />
              <CurrencySelector />
            </UtilityBar>
            
            {/* Mobile Search Toggle */}
            <SearchToggle onClick={() => setShowSearch(true)}>
              <FiSearch />
            </SearchToggle>
            
            {/* Wishlist */}
            <ActionButton onClick={handleWishlistClick}>
              <FiHeart />
              {wishlistItemCount > 0 && (
                <Badge>{wishlistItemCount}</Badge>
              )}
            </ActionButton>
            
            {/* Cart */}
            <ActionButton onClick={handleCartClick}>
              <FiShoppingBag />
              {cartItemCount > 0 && (
                <Badge>{cartItemCount}</Badge>
              )}
            </ActionButton>
            
            {/* User Account */}
            <ActionButton onClick={handleUserClick}>
              <FiUser />
            </ActionButton>
            
            {/* Mobile Menu */}
            <MobileMenuButton>
              <FiMenu />
            </MobileMenuButton>
          </HeaderActions>
        </HeaderContent>
      </HeaderContainer>
      
      {/* Mobile Search Overlay */}
      <AnimatePresence>
        {showSearch && (
          <SearchOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSearch(false)}
          >
            <div onClick={e => e.stopPropagation()}>
              <SearchBar 
                autoFocus 
                onClose={() => setShowSearch(false)} 
                mobile 
              />
            </div>
          </SearchOverlay>
        )}
      </AnimatePresence>
      
      {/* User Menu Dropdown */}
      <AnimatePresence>
        {showUserMenu && isAuthenticated && (
          <UserMenu 
            user={user}
            onClose={() => setShowUserMenu(false)} 
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;