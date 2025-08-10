import React, { useEffect, useState } from 'react';
import { StatusBar, Alert, AppState } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import SplashScreen from 'react-native-splash-screen';
import { useTranslation } from 'react-i18next';

// Store
import { store, persistor } from './src/store/store';

// Navigation
import AppNavigator from './src/navigation/AppNavigator';

// Services
import './src/services/i18n'; // Initialize i18n
import NotificationService from './src/services/NotificationService';
import { checkAppVersion } from './src/services/AppUpdateService';

// Components
import LoadingScreen from './src/components/common/LoadingScreen';
import NetworkStatusBanner from './src/components/common/NetworkStatusBanner';
import ErrorBoundary from './src/components/common/ErrorBoundary';

// Hooks
import { useNetworkStatus } from './src/hooks/useNetworkStatus';
import { useAppStateHandler } from './src/hooks/useAppStateHandler';

const STRIPE_PUBLISHABLE_KEY = __DEV__ 
  ? 'pk_test_...' // Development key
  : 'pk_live_...'; // Production key

const AppContent = () => {
  const [isAppReady, setIsAppReady] = useState(false);
  const { isConnected } = useNetworkStatus();
  const { t } = useTranslation();

  // Handle app state changes (foreground/background)
  useAppStateHandler();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize notification service
      await NotificationService.initialize();
      
      // Check for app updates (optional)
      if (!__DEV__) {
        await checkAppVersion();
      }
      
      // Request permissions
      await NotificationService.requestPermissions();
      
      // Setup background tasks
      setupBackgroundTasks();
      
      // App is ready
      setIsAppReady(true);
      
      // Hide splash screen
      SplashScreen.hide();
      
    } catch (error) {
      console.error('App initialization error:', error);
      
      // Still show the app even if some initialization fails
      setIsAppReady(true);
      SplashScreen.hide();
      
      // Show error alert
      Alert.alert(
        t('errors.initializationFailed'),
        t('errors.appWillContinue'),
        [{ text: t('common.ok') }]
      );
    }
  };

  const setupBackgroundTasks = () => {
    // Handle app state changes
    AppState.addEventListener('change', handleAppStateChange);
    
    // Handle push notifications
    NotificationService.onNotificationReceived((notification) => {
      console.log('Notification received:', notification);
      // Handle notification based on type
      handleNotification(notification);
    });
  };

  const handleAppStateChange = (nextAppState) => {
    if (nextAppState === 'active') {
      // App came to foreground
      console.log('App came to foreground');
      
      // Sync data if needed
      store.dispatch({ type: 'app/foreground' });
    } else if (nextAppState === 'background') {
      // App went to background
      console.log('App went to background');
      
      // Save state, pause operations
      store.dispatch({ type: 'app/background' });
    }
  };

  const handleNotification = (notification) => {
    const { type, data } = notification;
    
    switch (type) {
      case 'order_update':
        // Navigate to order details
        // This would need navigation ref
        break;
      case 'promotion':
        // Show promotion banner or navigate to products
        break;
      case 'cart_reminder':
        // Navigate to cart
        break;
      default:
        console.log('Unknown notification type:', type);
    }
  };

  if (!isAppReady) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="#ffffff" 
        translucent={false}
      />
      
      <NetworkStatusBanner isConnected={isConnected} />
      
      <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
        <AppNavigator />
      </StripeProvider>
    </SafeAreaProvider>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <PersistGate loading={<LoadingScreen />} persistor={persistor}>
          <AppContent />
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;