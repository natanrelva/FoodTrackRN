import { useState, useCallback } from 'react';
import { kitchenApiClient } from '../lib/api';
import type {
  KitchenOrder,
  KitchenStatus,
  OrderPriority,
  StationAssignment,
  StationWorkload,
  InventoryItem,
  KitchenMetrics,
  QualityIssue,
  PreparationStage
} from '../types/kitchen';

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

// Helper function to format API errors
const formatError = (error: any): string => {
  if (!error) return 'Unknown error occurred';
  return error.message || `Error ${error.code}`;
};

// Hook for managing kitchen authentication
export function useKitchenAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: !!localStorage.getItem('kitchenAuthToken'),
    loading: false,
    error: null,
  });

  const login = useCallback(async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await kitchenApiClient.login({ email, password });
      
      if (response.success && response.data) {
        kitchenApiClient.setAuthToken(response.data.token);
        localStorage.setItem('kitchenRefreshToken', response.data.refreshToken);
        
        setAuthState({
          user: response.data.user,
          isAuthenticated: true,
          loading: false,
          error: null,
        });
        
        return { success: true };
      } else {
        const errorMessage = formatError(response.error);
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
      await kitchenApiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('kitchenRefreshToken');
      setAuthState({
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      });
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    const refreshToken = localStorage.getItem('kitchenRefreshToken');
    if (!refreshToken) return false;

    try {
      const response = await kitchenApiClient.refreshToken(refreshToken);
      
      if (response.success && response.data) {
        kitchenApiClient.setAuthToken(response.data.token);
        localStorage.setItem('kitchenRefreshToken', response.data.refreshToken);
        
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

// Hook for managing kitchen orders
export function useKitchenOrders() {
  const [state, setState] = useState<ApiState<{ orders: KitchenOrder[] }>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchActiveOrders = useCallback(async (filters?: {
    status?: KitchenStatus[];
    priority?: OrderPriority[];
    stationId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  }) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await kitchenApiClient.getActiveOrders(filters);
      
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
          error: formatError(response.error),
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

  const getOrder = useCallback(async (orderId: string): Promise<KitchenOrder | null> => {
    try {
      const response = await kitchenApiClient.getKitchenOrder(orderId);
      return response.success && response.data ? response.data : null;
    } catch (error) {
      console.error('Failed to fetch order:', error);
      return null;
    }
  }, []);

  const updateOrderStatus = useCallback(async (
    orderId: string,
    status: KitchenStatus,
    stationId?: string
  ) => {
    try {
      const response = await kitchenApiClient.updateOrderStatus(orderId, status, stationId);
      
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
          error: formatError(response.error) 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update order status' 
      };
    }
  }, []);

  const assignOrderToStation = useCallback(async (
    orderId: string,
    stationId: string
  ) => {
    try {
      const response = await kitchenApiClient.assignOrderToStation(orderId, stationId);
      
      if (response.success && response.data) {
        return { success: true, assignment: response.data };
      } else {
        return { 
          success: false, 
          error: formatError(response.error) 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to assign order to station' 
      };
    }
  }, []);

  const reportQualityIssue = useCallback(async (
    orderId: string,
    issue: {
      type: 'temperature' | 'presentation' | 'taste' | 'missing_ingredient' | 'other';
      description: string;
      severity: 'minor' | 'major' | 'critical';
    }
  ) => {
    try {
      const response = await kitchenApiClient.reportQualityIssue(orderId, issue);
      
      if (response.success) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: formatError(response.error) 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to report quality issue' 
      };
    }
  }, []);

  return {
    ...state,
    fetchActiveOrders,
    getOrder,
    updateOrderStatus,
    assignOrderToStation,
    reportQualityIssue,
  };
}

// Hook for kitchen metrics and performance
export function useKitchenMetrics() {
  const [state, setState] = useState<ApiState<KitchenMetrics>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchKitchenMetrics = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await kitchenApiClient.getKitchenMetrics();
      
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
          error: formatError(response.error),
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch kitchen metrics',
      }));
    }
  }, []);

  const fetchStationPerformance = useCallback(async (stationId?: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await kitchenApiClient.getStationPerformance(stationId);
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          data: { ...prev.data, stationPerformance: response.data },
          loading: false,
          error: null,
        }));
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: formatError(response.error),
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch station performance',
      }));
    }
  }, []);

  return {
    ...state,
    fetchKitchenMetrics,
    fetchStationPerformance,
  };
}

// Hook for station management
export function useStationManagement() {
  const [state, setState] = useState<ApiState<any>>({
    data: null,
    loading: false,
    error: null,
  });

  const getStationWorkload = useCallback(async (stationId: string) => {
    try {
      const response = await kitchenApiClient.getStationWorkload(stationId);
      
      if (response.success && response.data) {
        return { success: true, workload: response.data };
      } else {
        return { 
          success: false, 
          error: formatError(response.error) 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get station workload' 
      };
    }
  }, []);

  const getOptimalStationAssignments = useCallback(async (orderId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await kitchenApiClient.getOptimalStationAssignments(orderId);
      
      if (response.success && response.data) {
        setState({
          data: response.data,
          loading: false,
          error: null,
        });
        return { success: true, assignments: response.data };
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: formatError(response.error),
        }));
        return { 
          success: false, 
          error: formatError(response.error) 
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get optimal station assignments';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, []);

  const autoAssignOrderToOptimalStation = useCallback(async (orderId: string) => {
    try {
      const response = await kitchenApiClient.autoAssignOrderToOptimalStation(orderId);
      
      if (response.success && response.data) {
        return { success: true, assignments: response.data.assignments };
      } else {
        return { 
          success: false, 
          error: formatError(response.error) 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to auto-assign order' 
      };
    }
  }, []);

  return {
    ...state,
    getStationWorkload,
    getOptimalStationAssignments,
    autoAssignOrderToOptimalStation,
  };
}

// Hook for inventory management
export function useKitchenInventory() {
  const [state, setState] = useState<ApiState<{ inventory: InventoryItem[] }>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchCurrentStock = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await kitchenApiClient.getCurrentStock();
      
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
          error: formatError(response.error),
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch inventory',
      }));
    }
  }, []);

  const updateIngredientUsage = useCallback(async (
    ingredientId: string,
    quantity: number,
    orderId?: string
  ) => {
    try {
      const response = await kitchenApiClient.updateIngredientUsage(ingredientId, quantity, orderId);
      
      if (response.success) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: formatError(response.error) 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update ingredient usage' 
      };
    }
  }, []);

  const checkIngredientAvailability = useCallback(async (
    ingredientId: string,
    quantity: number
  ) => {
    try {
      const response = await kitchenApiClient.checkIngredientAvailability(ingredientId, quantity);
      
      if (response.success && response.data) {
        return { success: true, availability: response.data };
      } else {
        return { 
          success: false, 
          error: formatError(response.error) 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to check ingredient availability' 
      };
    }
  }, []);

  return {
    ...state,
    fetchCurrentStock,
    updateIngredientUsage,
    checkIngredientAvailability,
  };
}