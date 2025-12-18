import { useState, useCallback } from 'react';
import { clientApi, ClientApiHelpers } from '../services/api/client';
import type {
  Product,
  Order,
  CreateOrderRequest,
  CustomerInfo,
  CartItem,
  OrderFilters,
  PaginatedOrders
} from '@foodtrack/types';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface AuthState {
  user: { id: string; email: string; name: string } | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Hook for managing authentication state
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: !!localStorage.getItem('authToken'),
    loading: false,
    error: null,
  });

  const login = useCallback(async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await clientApi.login({ email, password });
      
      if (response.success && response.data) {
        clientApi.setAuthToken(response.data.token);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        
        setAuthState({
          user: response.data.user,
          isAuthenticated: true,
          loading: false,
          error: null,
        });
        
        return { success: true };
      } else {
        const errorMessage = ClientApiHelpers.formatError(response.error);
        setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, []);

  const register = useCallback(async (userData: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await clientApi.register(userData);
      
      if (response.success && response.data) {
        clientApi.setAuthToken(response.data.token);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        
        setAuthState({
          user: response.data.user,
          isAuthenticated: true,
          loading: false,
          error: null,
        });
        
        return { success: true };
      } else {
        const errorMessage = ClientApiHelpers.formatError(response.error);
        setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthState(prev => ({ ...prev, loading: true }));
    
    try {
      await clientApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('refreshToken');
      setAuthState({
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      });
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const response = await clientApi.refreshToken(refreshToken);
      
      if (response.success && response.data) {
        clientApi.setAuthToken(response.data.token);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        
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
    register,
    logout,
    refreshAuth,
  };
}

// Hook for managing products
export function useProducts() {
  const [state, setState] = useState<ApiState<Product[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchProducts = useCallback(async (category?: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await clientApi.getProducts(category);
      
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
          error: ClientApiHelpers.formatError(response.error),
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

  const getProduct = useCallback(async (productId: string): Promise<Product | null> => {
    try {
      const response = await clientApi.getProduct(productId);
      return response.success && response.data ? response.data : null;
    } catch (error) {
      console.error('Failed to fetch product:', error);
      return null;
    }
  }, []);

  return {
    ...state,
    fetchProducts,
    getProduct,
  };
}

// Hook for managing orders
export function useOrders() {
  const [state, setState] = useState<ApiState<PaginatedOrders>>({
    data: null,
    loading: false,
    error: null,
  });

  const createOrder = useCallback(async (orderData: CreateOrderRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await clientApi.createOrder(orderData);
      
      if (response.success && response.data) {
        setState(prev => ({ ...prev, loading: false, error: null }));
        return { success: true, order: response.data };
      } else {
        const errorMessage = ClientApiHelpers.formatError(response.error);
        setState(prev => ({ ...prev, loading: false, error: errorMessage }));
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create order';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, []);

  const fetchCustomerOrders = useCallback(async (
    customerId: string,
    filters?: Partial<OrderFilters>
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await clientApi.getCustomerOrders(customerId, filters);
      
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
          error: ClientApiHelpers.formatError(response.error),
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
      const response = await clientApi.getOrder(orderId);
      return response.success && response.data ? response.data : null;
    } catch (error) {
      console.error('Failed to fetch order:', error);
      return null;
    }
  }, []);

  return {
    ...state,
    createOrder,
    fetchCustomerOrders,
    getOrder,
  };
}

// Hook for managing customers
export function useCustomers() {
  const [state, setState] = useState<ApiState<CustomerInfo>>({
    data: null,
    loading: false,
    error: null,
  });

  const createCustomer = useCallback(async (customerData: Omit<CustomerInfo, 'id'>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await clientApi.createCustomer(customerData);
      
      if (response.success && response.data) {
        setState({
          data: response.data,
          loading: false,
          error: null,
        });
        return { success: true, customer: response.data };
      } else {
        const errorMessage = ClientApiHelpers.formatError(response.error);
        setState(prev => ({ ...prev, loading: false, error: errorMessage }));
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create customer';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, []);

  const fetchCustomer = useCallback(async (customerId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await clientApi.getCustomer(customerId);
      
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
          error: ClientApiHelpers.formatError(response.error),
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch customer',
      }));
    }
  }, []);

  const updateCustomer = useCallback(async (
    customerId: string,
    customerData: Partial<Omit<CustomerInfo, 'id'>>
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await clientApi.updateCustomer(customerId, customerData);
      
      if (response.success && response.data) {
        setState({
          data: response.data,
          loading: false,
          error: null,
        });
        return { success: true, customer: response.data };
      } else {
        const errorMessage = ClientApiHelpers.formatError(response.error);
        setState(prev => ({ ...prev, loading: false, error: errorMessage }));
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update customer';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, []);

  return {
    ...state,
    createCustomer,
    fetchCustomer,
    updateCustomer,
  };
}

// Hook for cart validation
export function useCartValidation() {
  const [state, setState] = useState<ApiState<{
    valid: boolean;
    errors: string[];
    updatedItems: CartItem[];
  }>>({
    data: null,
    loading: false,
    error: null,
  });

  const validateCart = useCallback(async (cartItems: CartItem[]) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await clientApi.validateCart(cartItems);
      
      if (response.success && response.data) {
        setState({
          data: response.data,
          loading: false,
          error: null,
        });
        return response.data;
      } else {
        const errorMessage = ClientApiHelpers.formatError(response.error);
        setState(prev => ({ ...prev, loading: false, error: errorMessage }));
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to validate cart';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return null;
    }
  }, []);

  return {
    ...state,
    validateCart,
  };
}