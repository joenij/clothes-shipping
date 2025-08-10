import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/apiClient';

// Async thunks for cart operations (adapted from mobile app)
export const syncCartWithServer = createAsyncThunk(
  'cart/syncWithServer',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { cart } = getState();
      const response = await api.cart.sync(cart.items);
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
      const response = await api.cart.add(productId, variantId, quantity);
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
      await api.cart.remove(productId, variantId);
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
      const response = await api.cart.update(productId, variantId, quantity);
      return response.data.item;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 'Failed to update cart item'
      );
    }
  }
);

export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.cart.get();
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 'Failed to fetch cart'
      );
    }
  }
);

// Calculate cart totals (same logic as mobile app)
const calculateCartTotals = (items, currency = 'EUR', exchangeRate = 1, shippingZone = 'EU') => {
  const subtotal = items.reduce((total, item) => {
    const itemPrice = (item.product.basePrice + (item.variant?.priceAdjustment || 0));
    return total + (itemPrice * item.quantity);
  }, 0);
  
  // Tax calculation based on zone
  let taxRate = 0.19; // 19% VAT for EU
  if (shippingZone === 'BR') taxRate = 0.17; // Brazil
  if (shippingZone === 'NA') taxRate = 0.15; // Namibia
  
  const tax = subtotal * taxRate;
  
  // Shipping calculation
  let shipping = 0;
  const freeShippingThreshold = currency === 'EUR' ? 50 : (currency === 'BRL' ? 250 : 350);
  if (subtotal < freeShippingThreshold) {
    shipping = currency === 'EUR' ? 5.99 : (currency === 'BRL' ? 29.99 : 89.99);
  }
  
  const total = subtotal + tax + shipping;
  
  return {
    subtotal: (subtotal * exchangeRate).toFixed(2),
    tax: (tax * exchangeRate).toFixed(2),
    shipping: (shipping * exchangeRate).toFixed(2),
    total: (total * exchangeRate).toFixed(2),
    currency,
    exchangeRate,
    itemCount: items.reduce((count, item) => count + item.quantity, 0)
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
    exchangeRate: 1,
    itemCount: 0
  },
  isLoading: false,
  isOpen: false, // For cart drawer/modal
  error: null,
  lastSyncTime: null,
  shippingZone: 'EU',
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
      state.totals = calculateCartTotals(
        state.items, 
        state.totals.currency, 
        state.totals.exchangeRate,
        state.shippingZone
      );
    },
    
    removeFromCart: (state, action) => {
      const { productId, variantId } = action.payload;
      
      state.items = state.items.filter(
        item => !(item.product.id === productId && 
                 (item.variant?.id || null) === (variantId || null))
      );
      
      state.totals = calculateCartTotals(
        state.items, 
        state.totals.currency, 
        state.totals.exchangeRate,
        state.shippingZone
      );
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
        
        state.totals = calculateCartTotals(
          state.items, 
          state.totals.currency, 
          state.totals.exchangeRate,
          state.shippingZone
        );
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
        exchangeRate: state.totals.exchangeRate,
        itemCount: 0
      };
    },
    
    setCurrency: (state, action) => {
      const { currency, exchangeRate } = action.payload;
      state.totals.currency = currency;
      state.totals.exchangeRate = exchangeRate;
      state.totals = calculateCartTotals(
        state.items, 
        currency, 
        exchangeRate,
        state.shippingZone
      );
    },
    
    setShippingZone: (state, action) => {
      state.shippingZone = action.payload;
      state.totals = calculateCartTotals(
        state.items, 
        state.totals.currency, 
        state.totals.exchangeRate,
        action.payload
      );
    },
    
    toggleCartDrawer: (state) => {
      state.isOpen = !state.isOpen;
    },
    
    openCartDrawer: (state) => {
      state.isOpen = true;
    },
    
    closeCartDrawer: (state) => {
      state.isOpen = false;
    },
    
    clearCartError: (state) => {
      state.error = null;
    },
  },
  
  extraReducers: (builder) => {
    builder
      // Fetch cart
      .addCase(fetchCart.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.items || [];
        state.totals = calculateCartTotals(
          state.items, 
          state.totals.currency, 
          state.totals.exchangeRate,
          state.shippingZone
        );
        state.lastSyncTime = new Date().toISOString();
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Sync with server
      .addCase(syncCartWithServer.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(syncCartWithServer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
        state.totals = calculateCartTotals(
          state.items, 
          state.totals.currency, 
          state.totals.exchangeRate,
          state.shippingZone
        );
        state.lastSyncTime = new Date().toISOString();
      })
      .addCase(syncCartWithServer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Add to cart server
      .addCase(addToCartServer.fulfilled, (state, action) => {
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
  setShippingZone,
  toggleCartDrawer,
  openCartDrawer,
  closeCartDrawer,
  clearCartError
} = cartSlice.actions;

// Selectors (same as mobile app)
export const selectCart = (state) => state.cart;
export const selectCartItems = (state) => state.cart.items;
export const selectCartTotals = (state) => state.cart.totals;
export const selectCartItemCount = (state) => state.cart.totals.itemCount;
export const selectCartLoading = (state) => state.cart.isLoading;
export const selectCartError = (state) => state.cart.error;
export const selectCartIsOpen = (state) => state.cart.isOpen;

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