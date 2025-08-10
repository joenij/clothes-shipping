import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../services/apiClient';

// Async thunks for cart operations
export const syncCartWithServer = createAsyncThunk(
  'cart/syncWithServer',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { cart } = getState();
      const response = await apiClient.post('/cart/sync', {
        items: cart.items
      });
      return response.data.items;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 'Failed to sync cart'
      );
    }
  }
);

export const addToCartServer = createAsyncThunk(
  'cart/addToServer',
  async ({ productId, variantId, quantity }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/cart/add', {
        productId,
        variantId,
        quantity
      });
      return response.data.item;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 'Failed to add item to cart'
      );
    }
  }
);

export const removeFromCartServer = createAsyncThunk(
  'cart/removeFromServer',
  async ({ productId, variantId }, { rejectWithValue }) => {
    try {
      await apiClient.delete('/cart/remove', {
        data: { productId, variantId }
      });
      return { productId, variantId };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 'Failed to remove item from cart'
      );
    }
  }
);

export const updateCartItemServer = createAsyncThunk(
  'cart/updateItemServer',
  async ({ productId, variantId, quantity }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put('/cart/update', {
        productId,
        variantId,
        quantity
      });
      return response.data.item;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 'Failed to update cart item'
      );
    }
  }
);

const calculateCartTotals = (items, currency = 'EUR', exchangeRate = 1) => {
  const subtotal = items.reduce((total, item) => {
    const itemPrice = (item.product.basePrice + (item.variant?.priceAdjustment || 0));
    return total + (itemPrice * item.quantity);
  }, 0);
  
  const tax = subtotal * 0.19; // 19% VAT for EU (adjust based on region)
  const shipping = subtotal > 50 ? 0 : 5.99; // Free shipping over 50 EUR
  const total = subtotal + tax + shipping;
  
  return {
    subtotal: (subtotal * exchangeRate).toFixed(2),
    tax: (tax * exchangeRate).toFixed(2),
    shipping: (shipping * exchangeRate).toFixed(2),
    total: (total * exchangeRate).toFixed(2),
    currency,
    exchangeRate
  };
};

const initialState = {
  items: [],
  totals: {
    subtotal: '0.00',
    tax: '0.00',
    shipping: '0.00',
    total: '0.00',
    currency: 'EUR',
    exchangeRate: 1
  },
  isLoading: false,
  error: null,
  lastSyncTime: null,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const { product, variant, quantity = 1 } = action.payload;
      
      const existingItemIndex = state.items.findIndex(
        item => item.product.id === product.id && 
                 (item.variant?.id || null) === (variant?.id || null)
      );
      
      if (existingItemIndex >= 0) {
        state.items[existingItemIndex].quantity += quantity;
      } else {
        state.items.push({
          id: `${product.id}_${variant?.id || 'no-variant'}`,
          product,
          variant,
          quantity,
          addedAt: new Date().toISOString()
        });
      }
      
      // Recalculate totals
      state.totals = calculateCartTotals(state.items, state.totals.currency, state.totals.exchangeRate);
    },
    
    removeFromCart: (state, action) => {
      const { productId, variantId } = action.payload;
      
      state.items = state.items.filter(
        item => !(item.product.id === productId && 
                 (item.variant?.id || null) === (variantId || null))
      );
      
      state.totals = calculateCartTotals(state.items, state.totals.currency, state.totals.exchangeRate);
    },
    
    updateCartItemQuantity: (state, action) => {
      const { productId, variantId, quantity } = action.payload;
      
      const itemIndex = state.items.findIndex(
        item => item.product.id === productId && 
                (item.variant?.id || null) === (variantId || null)
      );
      
      if (itemIndex >= 0) {
        if (quantity <= 0) {
          state.items.splice(itemIndex, 1);
        } else {
          state.items[itemIndex].quantity = quantity;
        }
        
        state.totals = calculateCartTotals(state.items, state.totals.currency, state.totals.exchangeRate);
      }
    },
    
    clearCart: (state) => {
      state.items = [];
      state.totals = {
        subtotal: '0.00',
        tax: '0.00',
        shipping: '0.00',
        total: '0.00',
        currency: state.totals.currency,
        exchangeRate: state.totals.exchangeRate
      };
    },
    
    setCurrency: (state, action) => {
      const { currency, exchangeRate } = action.payload;
      state.totals.currency = currency;
      state.totals.exchangeRate = exchangeRate;
      state.totals = calculateCartTotals(state.items, currency, exchangeRate);
    },
    
    clearCartError: (state) => {
      state.error = null;
    },
  },
  
  extraReducers: (builder) => {
    builder
      // Sync with server
      .addCase(syncCartWithServer.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(syncCartWithServer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
        state.totals = calculateCartTotals(state.items, state.totals.currency, state.totals.exchangeRate);
        state.lastSyncTime = new Date().toISOString();
      })
      .addCase(syncCartWithServer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Add to cart server
      .addCase(addToCartServer.fulfilled, (state, action) => {
        // Server sync successful, item already added locally
        state.lastSyncTime = new Date().toISOString();
      })
      .addCase(addToCartServer.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Remove from cart server
      .addCase(removeFromCartServer.fulfilled, (state, action) => {
        state.lastSyncTime = new Date().toISOString();
      })
      .addCase(removeFromCartServer.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Update cart item server
      .addCase(updateCartItemServer.fulfilled, (state, action) => {
        state.lastSyncTime = new Date().toISOString();
      })
      .addCase(updateCartItemServer.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const {
  addToCart,
  removeFromCart,
  updateCartItemQuantity,
  clearCart,
  setCurrency,
  clearCartError
} = cartSlice.actions;

// Selectors
export const selectCart = (state) => state.cart;
export const selectCartItems = (state) => state.cart.items;
export const selectCartTotals = (state) => state.cart.totals;
export const selectCartItemCount = (state) => 
  state.cart.items.reduce((count, item) => count + item.quantity, 0);
export const selectCartLoading = (state) => state.cart.isLoading;
export const selectCartError = (state) => state.cart.error;

// Helper selectors
export const selectIsInCart = (productId, variantId = null) => (state) =>
  state.cart.items.some(
    item => item.product.id === productId && 
             (item.variant?.id || null) === (variantId || null)
  );

export const selectCartItemQuantity = (productId, variantId = null) => (state) => {
  const item = state.cart.items.find(
    item => item.product.id === productId && 
             (item.variant?.id || null) === (variantId || null)
  );
  return item ? item.quantity : 0;
};

export default cartSlice.reducer;