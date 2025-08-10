import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from '@reduxjs/toolkit';

// Slices
import authSlice from './slices/authSlice';
import userSlice from './slices/userSlice';
import productSlice from './slices/productSlice';
import categorySlice from './slices/categorySlice';
import cartSlice from './slices/cartSlice';
import orderSlice from './slices/orderSlice';
import wishlistSlice from './slices/wishlistSlice';
import settingsSlice from './slices/settingsSlice';
import notificationSlice from './slices/notificationSlice';

// Persist configuration
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'cart', 'wishlist', 'settings'], // Only persist these reducers
  blacklist: ['product', 'category', 'order', 'notification'] // Don't persist these (fetch fresh)
};

const cartPersistConfig = {
  key: 'cart',
  storage: AsyncStorage,
};

const settingsPersistConfig = {
  key: 'settings',
  storage: AsyncStorage,
};

const rootReducer = combineReducers({
  auth: authSlice,
  user: userSlice,
  product: productSlice,
  category: categorySlice,
  cart: persistReducer(cartPersistConfig, cartSlice),
  order: orderSlice,
  wishlist: wishlistSlice,
  settings: persistReducer(settingsPersistConfig, settingsSlice),
  notification: notificationSlice,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: __DEV__,
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;