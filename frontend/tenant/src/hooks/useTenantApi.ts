import { useState, useCallback } from 'react';
import { tenantApi, TenantApiHelpers } from '../services/api/tenant';
import type {
  Product,
  Order,
  CreateProductRequest,
  UpdateProductRequest,
  OrderFilters,
  PaginatedOrders,
  OrderMetrics,
  UpdateOrderStatusRequest,
  Category
} from '@foodtrack/types';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface AuthState {
  user: { 
    id: string; 
    email: string; 
    name: string; 
    role: string; 
    tenantId: string; 
  } | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Hook for managing tenant authentication
export function useTenantAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: !!localStorage.getItem('tenantAuthToken'),
    loading: false,
    error: null,
  });

  const login = useCallback(async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await tenantApi.login({ email, password });
      
      if (response.success && response.data) {
        tenantApi.setAuthToken(response.data.token);
        localStorage.setItem('tenantRefreshToken', response.data.refreshToken);
        
        setAuthState({
          user: response.data.user,
          isAuthenticated: true,
          loading: false,
          error: null,
        });
        
        return { success: true };
      } else {
        const errorMessage = TenantApiHelpers.formatError(response.error);
        setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthState(prev => ({ ...prev, loading: true }));
    
    try {
      await tenantApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('tenantRefreshToken');
      setAuthState({
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      });
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    const refreshToken = localStorage.getItem('tenantRefreshToken');
    if (!refreshToken) return false;

    try {
      const response = await tenantApi.refreshToken(refreshToken);
      
      if (response.success && response.data) {
        tenantApi.setAuthToken(response.data.token);
        localStorage.setItem('tenantRefreshToken', response.data.refreshToken);
        
        setAuthState({
          user: response.data.user,
          isAuthenticated: true,
          loading: false,
          error: null,
        });
        
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
    
    return false;
  }, []);

  return {
    ...authState,
    login,
    logout,
    refreshAuth,
  };
}

// Hook for dashboard data
export function useDashboard() {
  const [state, setState] = useState<ApiState<any>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchDashboardStats = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await tenantApi.getDashboardStats();
      
      if (response.success && response.data) {
        setState({
          data: response.data,
          loading: false,
          error: null,
        });
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: TenantApiHelpers.formatError(response.error),
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard stats',
      }));
    }
  }, []);

  const fetchOrderMetrics = useCallback(async (dateFrom?: Date, dateTo?: Date) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await tenantApi.getOrderMetrics(dateFrom, dateTo);
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          data: { ...prev.data, metrics: response.data },
          loading: false,
          error: null,
        }));
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: TenantApiHelpers.formatError(response.error),
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch order metrics',
      }));
    }
  }, []);

  return {
    ...state,
    fetchDashboardStats,
    fetchOrderMetrics,
  };
}

// Hook for order management
export function useTenantOrders() {
  const [state, setState] = useState<ApiState<PaginatedOrders>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchOrders = useCallback(async (filters?: Partial<OrderFilters>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await tenantApi.getOrders(filters);
      
      if (response.success && response.data) {
        setState({
          data: response.data,
          loading: false,
          error: null,
        });
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: TenantApiHelpers.formatError(response.error),
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch orders',
      }));
    }
  }, []);

  const getOrder = useCallback(async (orderId: string): Promise<Order | null> => {
    try {
      const response = await tenantApi.getOrder(orderId);
      return response.success && response.data ? response.data : null;
    } catch (error) {
      console.error('Failed to fetch order:', error);
      return null;
    }
  }, []);

  const updateOrderStatus = useCallback(async (
    orderId: string,
    statusData: UpdateOrderStatusRequest
  ) => {
    try {
      const response = await tenantApi.updateOrderStatus(orderId, statusData);
      
      if (response.success && response.data) {
        // Update the order in the current state if it exists
        setState(prev => {
          if (prev.data?.orders) {
            const updatedOrders = prev.data.orders.map(order =>
              order.id === orderId ? response.data! : order
            );
            return {
              ...prev,
              data: {
                ...prev.data,
                orders: updatedOrders,
              },
            };
          }
          return prev;
        });
        
        return { success: true, order: response.data };
      } else {
        return { 
          success: false, 
          error: TenantApiHelpers.formatError(response.error) 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update order status' 
      };
    }
  }, []);

  const cancelOrder = useCallback(async (orderId: string, reason?: string) => {
    try {
      const response = await tenantApi.cancelOrder(orderId, reason);
      
      if (response.success && response.data) {
        // Update the order in the current state if it exists
        setState(prev => {
          if (prev.data?.orders) {
            const updatedOrders = prev.data.orders.map(order =>
              order.id === orderId ? response.data! : order
            );
            return {
              ...prev,
              data: {
                ...prev.data,
                orders: updatedOrders,
              },
            };
          }
          return prev;
        });
        
        return { success: true, order: response.data };
      } else {
        return { 
          success: false, 
          error: TenantApiHelpers.formatError(response.error) 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to cancel order' 
      };
    }
  }, []);

  return {
    ...state,
    fetchOrders,
    getOrder,
    updateOrderStatus,
    cancelOrder,
  };
}

// Hook for product management
export function useTenantProducts() {
  const [state, setState] = useState<ApiState<Product[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchProducts = useCallback(async (category?: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await tenantApi.getProducts(category);
      
      if (response.success && response.data) {
        setState({
          data: response.data,
          loading: false,
          error: null,
        });
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: TenantApiHelpers.formatError(response.error),
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch products',
      }));
    }
  }, []);

  const createProduct = useCallback(async (productData: CreateProductRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await tenantApi.createProduct(productData);
      
      if (response.success && response.data) {
        setState(prev => ({
          data: prev.data ? [...prev.data, response.data!] : [response.data!],
          loading: false,
          error: null,
        }));
        
        return { success: true, product: response.data };
      } else {
        const errorMessage = TenantApiHelpers.formatError(response.error);
        setState(prev => ({ ...prev, loading: false, error: errorMessage }));
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create product';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, []);

  const updateProduct = useCallback(async (
    productId: string,
    productData: UpdateProductRequest
  ) => {
    try {
      const response = await tenantApi.updateProduct(productId, productData);
      
      if (response.success && response.data) {
        setState(prev => {
          if (prev.data) {
            const updatedProducts = prev.data.map(product =>
              product.id === productId ? response.data! : product
            );
            return {
              ...prev,
              data: updatedProducts,
            };
          }
          return prev;
        });
        
        return { success: true, product: response.data };
      } else {
        return { 
          success: false, 
          error: TenantApiHelpers.formatError(response.error) 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update product' 
      };
    }
  }, []);

  const deleteProduct = useCallback(async (productId: string) => {
    try {
      const response = await tenantApi.deleteProduct(productId);
      
      if (response.success) {
        setState(prev => {
          if (prev.data) {
            const filteredProducts = prev.data.filter(product => product.id !== productId);
            return {
              ...prev,
              data: filteredProducts,
            };
          }
          return prev;
        });
        
        return { success: true };
      } else {
        return { 
          success: false, 
          error: TenantApiHelpers.formatError(response.error) 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete product' 
      };
    }
  }, []);

  const toggleProductAvailability = useCallback(async (
    productId: string,
    available: boolean
  ) => {
    try {
      const response = await tenantApi.toggleProductAvailability(productId, available);
      
      if (response.success && response.data) {
        setState(prev => {
          if (prev.data) {
            const updatedProducts = prev.data.map(product =>
              product.id === productId ? response.data! : product
            );
            return {
              ...prev,
              data: updatedProducts,
            };
          }
          return prev;
        });
        
        return { success: true, product: response.data };
      } else {
        return { 
          success: false, 
          error: TenantApiHelpers.formatError(response.error) 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to toggle product availability' 
      };
    }
  }, []);

  return {
    ...state,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleProductAvailability,
  };
}

// Hook for analytics
export function useTenantAnalytics() {
  const [state, setState] = useState<ApiState<any>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchSalesReport = useCallback(async (
    dateFrom: Date,
    dateTo: Date,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await tenantApi.getSalesReport(dateFrom, dateTo, groupBy);
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          data: { ...prev.data, salesReport: response.data },
          loading: false,
          error: null,
        }));
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: TenantApiHelpers.formatError(response.error),
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch sales report',
      }));
    }
  }, []);

  const fetchProductPerformance = useCallback(async (dateFrom: Date, dateTo: Date) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await tenantApi.getProductPerformance(dateFrom, dateTo);
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          data: { ...prev.data, productPerformance: response.data },
          loading: false,
          error: null,
        }));
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: TenantApiHelpers.formatError(response.error),
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch product performance',
      }));
    }
  }, []);

  const fetchCustomerInsights = useCallback(async (dateFrom: Date, dateTo: Date) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await tenantApi.getCustomerInsights(dateFrom, dateTo);
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          data: { ...prev.data, customerInsights: response.data },
          loading: false,
          error: null,
        }));
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: TenantApiHelpers.formatError(response.error),
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch customer insights',
      }));
    }
  }, []);

  return {
    ...state,
    fetchSalesReport,
    fetchProductPerformance,
    fetchCustomerInsights,
  };
}