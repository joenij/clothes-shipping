import { createSlice } from '@reduxjs/toolkit';

const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    language: 'en',
    currency: 'EUR',
    theme: 'light',
    notifications: {
      email: true,
      push: true,
      marketing: false
    },
    shipping: {
      defaultZone: 'EU',
      preferredCarrier: 'DHL'
    }
  },
  reducers: {
    updateLanguage: (state, action) => {
      state.language = action.payload;
    },
    updateCurrency: (state, action) => {
      state.currency = action.payload;
    },
    updateTheme: (state, action) => {
      state.theme = action.payload;
    },
    updateNotifications: (state, action) => {
      state.notifications = { ...state.notifications, ...action.payload };
    },
    updateShipping: (state, action) => {
      state.shipping = { ...state.shipping, ...action.payload };
    },
    resetSettings: (state) => {
      state.language = 'en';
      state.currency = 'EUR';
      state.theme = 'light';
      state.notifications = {
        email: true,
        push: true,
        marketing: false
      };
      state.shipping = {
        defaultZone: 'EU',
        preferredCarrier: 'DHL'
      };
    }
  }
});

export const { 
  updateLanguage, 
  updateCurrency, 
  updateTheme, 
  updateNotifications, 
  updateShipping, 
  resetSettings 
} = settingsSlice.actions;
export default settingsSlice.reducer;