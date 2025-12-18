import { useState, useCallback } from 'react';
import { deliveryApi, DeliveryApiHelpers } from '../lib/api-client';
import type {
  Delivery,
  DeliveryAgent,
  DeliveryFilters,
  GeoLocation,
  Route,
  DeliveryMetrics,
  AgentPerformance,
  TimePeriod
} from '@foodtrack/types';
import type {
  DashboardStats,
  OrderQueueItem,
  ActiveDeliveryItem,
  AgentSummary,
  DeliveryAssignment,
  BatchAssignment,
  RouteOptimizationRequest,
  RouteOptimizationResult,
  PaginatedResponse,
  ApiResponse
} from '../types';

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

// Hook for managing delivery authentication
export function useDeliveryAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: !!localStorage.getItem('deliveryAuthToken'),
    loading: false,
    error: null,
  });

  const login = useCallback(async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await deliveryApi.login({ email, password });
      
      if (response.success && response.data) {
        deliveryApi.setAuthToken(response.data.token);
        localStorage.setItem('deliveryRefreshToken', response.data.refreshToken);
        
        setAuthState({
          user: response.data.user,
          isAuthenticated: true,
          loading: false,
          error: null,
        });
        
        return { success: true };
      } else {
        const errorMessage = DeliveryApiHelpers.formatError(response.error);
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
      await deliveryApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('deliveryRefreshToken');
      setAuthState({
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      });
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    const refreshToken = localStorage.getItem('deliveryRefreshToken');
    if (!refreshToken) return false;

    try {
      const response = await deliveryApi.refreshToken(refreshToken);
      
      if (response.success && response.data) {
        deliveryApi.setAuthToken(response.data.token);
        localStorage.setItem('deliveryRefreshToken', response.data.refreshToken);
        
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
export function useDeliveryDashboard() {
  const [state, setState] = useState<ApiState<DashboardStats>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchDashboardStats = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await deliveryApi.getDashboardStats();
      
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
          error: DeliveryApiHelpers.formatError(response.error),
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

  const fetchOrderQueue = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await deliveryApi.getOrderQueue();
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          data: { ...prev.data, orderQueue: response.data },
          loading: false,
          error: null,
        }));
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: DeliveryApiHelpers.formatError(response.error),
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch order queue',
      }));
    }
  }, []);

  const fetchActiveDeliveries = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await deliveryApi.getActiveDeliveries();
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          data: { ...prev.data, activeDeliveries: response.data },
          loading: false,
          error: null,
        }));
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: DeliveryApiHelpers.formatError(response.error),
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch active deliveries',
      }));
    }
  }, []);

  return {
    ...state,
    fetchDashboardStats,
    fetchOrderQueue,
    fetchActiveDeliveries,
  };
}

// Hook for delivery management
export function useDeliveries() {
  const [state, setState] = useState<ApiState<PaginatedResponse<Delivery>>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchDeliveries = useCallback(async (filters?: DeliveryFilters) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await deliveryApi.getDeliveries(filters);
      
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
          error: DeliveryApiHelpers.formatError(response.error),
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch deliveries',
      }));
    }
  }, []);

  const getDelivery = useCallback(async (deliveryId: string): Promise<Delivery | null> => {
    try {
      const response = await deliveryApi.getDelivery(deliveryId);
      return response.success && response.data ? response.data : null;
    } catch (error) {
      console.error('Failed to fetch delivery:', error);
      return null;
    }
  }, []);

  const updateDeliveryStatus = useCallback(async (
    deliveryId: string,
    status: string,
    location?: GeoLocation,
    notes?: string
  ) => {
    try {
      const response = await deliveryApi.updateDeliveryStatus(deliveryId, status, location, notes);
      
      if (response.success && response.data) {
        // Update the delivery in the current state if it exists
        setState(prev => {
          if (prev.data?.data) {
            const updatedDeliveries = prev.data.data.map(delivery =>
              delivery.id === deliveryId ? response.data! : delivery
            );
            return {
              ...prev,
              data: {
                ...prev.data,
                data: updatedDeliveries,
              },
            };
          }
          return prev;
        });
        
        return { success: true, delivery: response.data };
      } else {
        return { 
          success: false, 
          error: DeliveryApiHelpers.formatError(response.error) 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update delivery status' 
      };
    }
  }, []);

  return {
    ...state,
    fetchDeliveries,
    getDelivery,
    updateDeliveryStatus,
  };
}

// Hook for agent management
export function useDeliveryAgents() {
  const [state, setState] = useState<ApiState<DeliveryAgent[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchAgents = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await deliveryApi.getAgents();
      
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
          error: DeliveryApiHelpers.formatError(response.error),
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch agents',
      }));
    }
  }, []);

  const fetchAvailableAgents = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await deliveryApi.getAvailableAgents();
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          data: { ...prev.data, availableAgents: response.data },
          loading: false,
          error: null,
        }));
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: DeliveryApiHelpers.formatError(response.error),
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch available agents',
      }));
    }
  }, []);

  const updateAgentLocation = useCallback(async (
    agentId: string,
    location: GeoLocation
  ) => {
    try {
      const response = await deliveryApi.updateAgentLocation(agentId, location);
      
      if (response.success) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: DeliveryApiHelpers.formatError(response.error) 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update agent location' 
      };
    }
  }, []);

  const updateAgentStatus = useCallback(async (
    agentId: string,
    status: string
  ) => {
    try {
      const response = await deliveryApi.updateAgentStatus(agentId, status);
      
      if (response.success && response.data) {
        // Update the agent in the current state if it exists
        setState(prev => {
          if (prev.data) {
            const updatedAgents = prev.data.map(agent =>
              agent.id === agentId ? response.data! : agent
            );
            return {
              ...prev,
              data: updatedAgents,
            };
          }
          return prev;
        });
        
        return { success: true, agent: response.data };
      } else {
        return { 
          success: false, 
          error: DeliveryApiHelpers.formatError(response.error) 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update agent status' 
      };
    }
  }, []);

  return {
    ...state,
    fetchAgents,
    fetchAvailableAgents,
    updateAgentLocation,
    updateAgentStatus,
  };
}

// Hook for delivery assignments
export function useDeliveryAssignments() {
  const [state, setState] = useState<ApiState<any>>({
    data: null,
    loading: false,
    error: null,
  });

  const assignOrderToAgent = useCallback(async (assignment: DeliveryAssignment) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await deliveryApi.assignOrderToAgent(assignment);
      
      if (response.success && response.data) {
        setState(prev => ({ ...prev, loading: false, error: null }));
        return { success: true, delivery: response.data };
      } else {
        const errorMessage = DeliveryApiHelpers.formatError(response.error);
        setState(prev => ({ ...prev, loading: false, error: errorMessage }));
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to assign order';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, []);

  const batchAssignOrders = useCallback(async (batchAssignment: BatchAssignment) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await deliveryApi.batchAssignOrders(batchAssignment);
      
      if (response.success && response.data) {
        setState(prev => ({ ...prev, loading: false, error: null }));
        return { success: true, deliveries: response.data };
      } else {
        const errorMessage = DeliveryApiHelpers.formatError(response.error);
        setState(prev => ({ ...prev, loading: false, error: errorMessage }));
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to batch assign orders';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, []);

  const unassignDelivery = useCallback(async (deliveryId: string) => {
    try {
      const response = await deliveryApi.unassignDelivery(deliveryId);
      
      if (response.success && response.data) {
        return { success: true, delivery: response.data };
      } else {
        return { 
          success: false, 
          error: DeliveryApiHelpers.formatError(response.error) 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to unassign delivery' 
      };
    }
  }, []);

  return {
    ...state,
    assignOrderToAgent,
    batchAssignOrders,
    unassignDelivery,
  };
}

// Hook for mobile agent operations
export function useMobileAgent() {
  const [state, setState] = useState<ApiState<OrderQueueItem[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchAgentAssignedOrders = useCallback(async (agentId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await deliveryApi.getAgentAssignedOrders(agentId);
      
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
          error: DeliveryApiHelpers.formatError(response.error),
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch assigned orders',
      }));
    }
  }, []);

  const acceptOrder = useCallback(async (deliveryId: string, agentId: string) => {
    try {
      const response = await deliveryApi.acceptOrder(deliveryId, agentId);
      
      if (response.success && response.data) {
        return { success: true, delivery: response.data };
      } else {
        return { 
          success: false, 
          error: DeliveryApiHelpers.formatError(response.error) 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to accept order' 
      };
    }
  }, []);

  const declineOrder = useCallback(async (
    deliveryId: string,
    agentId: string,
    reason: string
  ) => {
    try {
      const response = await deliveryApi.declineOrder(deliveryId, agentId, reason);
      
      if (response.success) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: DeliveryApiHelpers.formatError(response.error) 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to decline order' 
      };
    }
  }, []);

  const confirmPickup = useCallback(async (
    deliveryId: string,
    agentId: string,
    location: GeoLocation,
    photo?: string,
    notes?: string
  ) => {
    try {
      const response = await deliveryApi.confirmPickup(deliveryId, agentId, location, photo, notes);
      
      if (response.success && response.data) {
        return { success: true, delivery: response.data };
      } else {
        return { 
          success: false, 
          error: DeliveryApiHelpers.formatError(response.error) 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to confirm pickup' 
      };
    }
  }, []);

  const confirmDelivery = useCallback(async (
    deliveryId: string,
    agentId: string,
    location: GeoLocation,
    signature?: string,
    photo?: string,
    notes?: string
  ) => {
    try {
      const response = await deliveryApi.confirmDelivery(
        deliveryId,
        agentId,
        location,
        signature,
        photo,
        notes
      );
      
      if (response.success && response.data) {
        return { success: true, delivery: response.data };
      } else {
        return { 
          success: false, 
          error: DeliveryApiHelpers.formatError(response.error) 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to confirm delivery' 
      };
    }
  }, []);

  const reportIssue = useCallback(async (
    deliveryId: string,
    agentId: string,
    issueType: string,
    description: string,
    location?: GeoLocation,
    photo?: string
  ) => {
    try {
      const response = await deliveryApi.reportIssue(
        deliveryId,
        agentId,
        issueType,
        description,
        location,
        photo
      );
      
      if (response.success) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: DeliveryApiHelpers.formatError(response.error) 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to report issue' 
      };
    }
  }, []);

  return {
    ...state,
    fetchAgentAssignedOrders,
    acceptOrder,
    declineOrder,
    confirmPickup,
    confirmDelivery,
    reportIssue,
  };
}

// Hook for analytics
export function useDeliveryAnalytics() {
  const [state, setState] = useState<ApiState<any>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchDeliveryMetrics = useCallback(async (period: TimePeriod) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await deliveryApi.getDeliveryMetrics(period);
      
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
          error: DeliveryApiHelpers.formatError(response.error),
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch delivery metrics',
      }));
    }
  }, []);

  const fetchAgentPerformance = useCallback(async (
    agentId: string,
    period: TimePeriod
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await deliveryApi.getAgentPerformance(agentId, period);
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          data: { ...prev.data, agentPerformance: response.data },
          loading: false,
          error: null,
        }));
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: DeliveryApiHelpers.formatError(response.error),
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch agent performance',
      }));
    }
  }, []);

  return {
    ...state,
    fetchDeliveryMetrics,
    fetchAgentPerformance,
  };
}