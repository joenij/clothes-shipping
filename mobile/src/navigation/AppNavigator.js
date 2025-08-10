import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Main Screens
import HomeScreen from '../screens/main/HomeScreen';
import ProductListScreen from '../screens/products/ProductListScreen';
import ProductDetailScreen from '../screens/products/ProductDetailScreen';
import CategoryScreen from '../screens/categories/CategoryScreen';
import CartScreen from '../screens/cart/CartScreen';
import CheckoutScreen from '../screens/checkout/CheckoutScreen';
import OrderHistoryScreen from '../screens/orders/OrderHistoryScreen';
import OrderDetailScreen from '../screens/orders/OrderDetailScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import WishlistScreen from '../screens/wishlist/WishlistScreen';
import SearchScreen from '../screens/search/SearchScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import TrackingScreen from '../screens/tracking/TrackingScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Auth Stack
const AuthStack = () => {
  const { t } = useTranslation();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2196F3',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="Login" 
        component={LoginScreen} 
        options={{ title: t('auth.login') }}
      />
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen} 
        options={{ title: t('auth.register') }}
      />
      <Stack.Screen 
        name="ForgotPassword" 
        component={ForgotPasswordScreen} 
        options={{ title: t('auth.forgotPassword') }}
      />
    </Stack.Navigator>
  );
};

// Home Stack
const HomeStack = () => {
  const { t } = useTranslation();
  
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="HomeMain" 
        component={HomeScreen} 
        options={{ title: t('navigation.home') }}
      />
      <Stack.Screen 
        name="ProductDetail" 
        component={ProductDetailScreen} 
        options={{ title: t('products.productDetail') }}
      />
      <Stack.Screen 
        name="ProductList" 
        component={ProductListScreen} 
        options={{ title: t('products.products') }}
      />
      <Stack.Screen 
        name="Category" 
        component={CategoryScreen} 
        options={({ route }) => ({ title: route.params?.categoryName || t('categories.category') })}
      />
    </Stack.Navigator>
  );
};

// Shop Stack
const ShopStack = () => {
  const { t } = useTranslation();
  
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ProductListMain" 
        component={ProductListScreen} 
        options={{ title: t('navigation.shop') }}
      />
      <Stack.Screen 
        name="ProductDetail" 
        component={ProductDetailScreen} 
        options={{ title: t('products.productDetail') }}
      />
      <Stack.Screen 
        name="Search" 
        component={SearchScreen} 
        options={{ title: t('search.search') }}
      />
    </Stack.Navigator>
  );
};

// Cart Stack
const CartStack = () => {
  const { t } = useTranslation();
  
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="CartMain" 
        component={CartScreen} 
        options={{ title: t('navigation.cart') }}
      />
      <Stack.Screen 
        name="Checkout" 
        component={CheckoutScreen} 
        options={{ title: t('checkout.checkout') }}
      />
      <Stack.Screen 
        name="ProductDetail" 
        component={ProductDetailScreen} 
        options={{ title: t('products.productDetail') }}
      />
    </Stack.Navigator>
  );
};

// Profile Stack
const ProfileStack = () => {
  const { t } = useTranslation();
  
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ProfileMain" 
        component={ProfileScreen} 
        options={{ title: t('navigation.profile') }}
      />
      <Stack.Screen 
        name="OrderHistory" 
        component={OrderHistoryScreen} 
        options={{ title: t('orders.orderHistory') }}
      />
      <Stack.Screen 
        name="OrderDetail" 
        component={OrderDetailScreen} 
        options={{ title: t('orders.orderDetail') }}
      />
      <Stack.Screen 
        name="Tracking" 
        component={TrackingScreen} 
        options={{ title: t('tracking.trackOrder') }}
      />
      <Stack.Screen 
        name="Wishlist" 
        component={WishlistScreen} 
        options={{ title: t('wishlist.wishlist') }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ title: t('settings.settings') }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ title: t('notifications.notifications') }}
      />
    </Stack.Navigator>
  );
};

// Main Tab Navigator
const MainTabs = () => {
  const { t } = useTranslation();
  const cartItemsCount = useSelector(state => state.cart.items.length);
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Shop':
              iconName = 'shopping-bag';
              break;
            case 'Cart':
              iconName = 'shopping-cart';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'home';
          }
          
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#757575',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStack} 
        options={{ 
          title: t('navigation.home'),
          tabBarLabel: t('navigation.home')
        }}
      />
      <Tab.Screen 
        name="Shop" 
        component={ShopStack} 
        options={{ 
          title: t('navigation.shop'),
          tabBarLabel: t('navigation.shop')
        }}
      />
      <Tab.Screen 
        name="Cart" 
        component={CartStack} 
        options={{ 
          title: t('navigation.cart'),
          tabBarLabel: t('navigation.cart'),
          tabBarBadge: cartItemsCount > 0 ? cartItemsCount : null
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStack} 
        options={{ 
          title: t('navigation.profile'),
          tabBarLabel: t('navigation.profile')
        }}
      />
    </Tab.Navigator>
  );
};

// Main App Navigator
const AppNavigator = () => {
  const { isAuthenticated } = useSelector(state => state.auth);
  
  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default AppNavigator;