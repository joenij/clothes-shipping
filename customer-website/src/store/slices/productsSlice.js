import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async actions
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async ({ page = 1, limit = 20, category, search, sortBy = 'created_at', sortOrder = 'desc' } = {}) => {
    const response = await fetch(`/api/products?page=${page}&limit=${limit}&category=${category || ''}&search=${search || ''}&sortBy=${sortBy}&sortOrder=${sortOrder}`);
    return response.json();
  }
);

export const fetchProductById = createAsyncThunk(
  'products/fetchProductById',
  async (productId) => {
    const response = await fetch(`/api/products/${productId}`);
    return response.json();
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState: {
    items: [],
    currentProduct: null,
    loading: false,
    error: null,
    pagination: {
      page: 1,
      totalPages: 0,
      totalItems: 0,
      limit: 20
    },
    filters: {
      category: null,
      search: '',
      sortBy: 'created_at',
      sortOrder: 'desc'
    }
  },
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearCurrentProduct: (state) => {
      state.currentProduct = null;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.products;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(fetchProductById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProduct = action.payload;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  }
});

export const { setFilters, clearCurrentProduct, clearError } = productsSlice.actions;
export default productsSlice.reducer;