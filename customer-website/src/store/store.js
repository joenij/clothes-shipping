import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // localStorage
import { combineReducers } from '@reduxjs/toolkit';

// Import slices (similar to mobile app structure)
import authReducer from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import productsReducer from './slices/productsSlice';
import categoriesReducer from './slices/categoriesSlice';
import wishlistReducer from './slices/wishlistSlice';
import settingsReducer from './slices/settingsSlice';
import ordersReducer from './slices/ordersSlice';
import reviewsReducer from './slices/reviewsSlice';

// Persist config
const persistConfig = {
  key: 'clothesapp_web',
  version: 1,
  storage,
  whitelist: ['cart', 'settings', 'wishlist'], // Only persist these reducers
  blacklist: ['auth'], // Don't persist auth (security)
};

// Auth persist config (separate for security)
const authPersistConfig = {
  key: 'clothesapp_auth',
  storage,
  whitelist: ['user', 'isAuthenticated'], // Only persist user info, not tokens
};

// Combine reducers
const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  cart: cartReducer,
  products: productsReducer,
  categories: categoriesReducer,
  wishlist: wishlistReducer,
  settings: settingsReducer,
  orders: ordersReducer,
  reviews: reviewsReducer,
});

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/PURGE',
          'persist/REGISTER',
        ],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Create persistor
export const persistor = persistStore(store);

// Enable hot reloading in development
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./slices', () => {
    const newRootReducer = require('./slices').default;
    store.replaceReducer(persistReducer(persistConfig, newRootReducer));
  });
}

// Export store and persistor
export default store;