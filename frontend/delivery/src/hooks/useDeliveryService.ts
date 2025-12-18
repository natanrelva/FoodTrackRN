import { useState, useCallback } from 'react';
import { deliveryApiService, DeliveryApiHelpers } from '../services/api/delivery';
import type {
  Delivery,
  DeliveryAgent,
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
      const response = await deliveryApiService.login({ email, password });
      
      if (response.success && response.data) {
        deliveryApiService.setAuthToken(response.data.token);
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
      await deliveryApiService.logout();
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
      const response = await deliveryApiService.refreshToken(refreshToken);
      
      if (response.success && response.data) {
        deliveryApiService.setAuthToken(response.data.token);
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

// Hook for delivery assignments (Requirement 4.1)
export function useDeliveryAssignments() {
  const [state, setState] = useState<ApiState<OrderQueueItem[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchAvailableAssignments = useCallback(async (agentId?: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await deliveryApiService.getAvailableAssignments(agentId);
      
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
        error: error instanceof Error ? error.message : 'Failed to fetch available assignments',
      }));
    }
  }, []);

  const fetchOrderQueue = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await deliveryApiService.getOrderQueue();
      
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
        error: error instanceof Error ? error.message : 'Failed to fetch order queue',
      }));
    }
  }, []);

  // Requirement 4.2: Accept assignments and update order status
  const acceptAssignment = useCallback(async (deliveryId: string, agentId: string) => {
    try {
      const response = await deliveryApiService.acceptDeliveryAssignment(deliveryId, agentId);
      
      if (response.success && response.data) {
        // Remove the accepted assignment from the available list
        setState(prev => ({
          ...prev,
          data: prev.data ? prev.data.filter(item => item.id !== deliveryId) : null,
        }));
        
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
        error: error instanceof Error ? error.message : 'Failed to accept assignment' 
      };
    }
  }, []);

  const declineAssignment = useCallback(async (
    deliveryId: string,
    agentId: string,
    reason: string
  ) => {
    try {
      const response = await deliveryApiService.declineDeliveryAssignment(deliveryId, agentId, reason);
      
      if (response.success) {
        // Remove the declined assignment from the available list
        setState(prev => ({
          ...prev,
          data: prev.data ? prev.data.filter(item => item.id !== deliveryId) : null,
        }));
        
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
        error: error instanceof Error ? error.message : 'Failed to decline assignment' 
      };
    }
  }, []);

  const assignOrderToAgent = useCallback(async (assignment: DeliveryAssignment) => {
    try {
      const response = await deliveryApiService.assignOrderToAgent(assignment);
      
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
        error: error instanceof Error ? error.message : 'Failed to assign order' 
      };
    }
  }, []);

  return {
    ...state,
    fetchAvailableAssignments,
    fetchOrderQueue,
    acceptAssignment,
    declineAssignment,
    assignOrderToAgent,
  };
}

// Hook for location tracking (Requirement 4.5)
export function useLocationTracking() {
  const [state, setState] = useState<ApiState<any>>({
    data: null,
    loading: false,
    error: null,
  });

  const updateAgentLocation = useCallback(async (
    agentId: string,
    location: GeoLocation
  ) => {
    try {
      const response = await deliveryApiService.updateAgentLocation(agentId, location);
      
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

  const updateDeliveryStatus = useCallback(async (
    deliveryId: string,
    status: string,
    location?: GeoLocation,
    notes?: string
  ) => {
    try {
      const response = await deliveryApiService.updateDeliveryStatus(deliveryId, status, location, notes);
      
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
        error: error instanceof Error ? error.message : 'Failed to update delivery status' 
      };
    }
  }, []);

  const trackDeliveryLocation = useCallback(async (
    deliveryId: string,
    agentId: string,
    location: GeoLocation
  ) => {
    try {
      const response = await deliveryApiService.trackDeliveryLocation(deliveryId, agentId, location);
      
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
        error: error instanceof Error ? error.message : 'Failed to track delivery location' 
      };
    }
  }, []);

  return {
    ...state,
    updateAgentLocation,
    updateDeliveryStatus,
    trackDeliveryLocation,
  };
}

// Hook for delivery completion (Requirement 4.4)
export function useDeliveryCompletion() {
  const [state, setState] = useState<ApiState<any>>({
    data: null,
    loading: false,
    error: null,
  });

  const confirmPickup = useCallback(async (
    deliveryId: string,
    agentId: string,
    location: GeoLocation,
    photo?: string,
    notes?: string
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await deliveryApiService.confirmPickup(deliveryId, agentId, location, photo, notes);
      
      if (response.success && response.data) {
        setState(prev => ({ ...prev, loading: false, error: null }));
        return { success: true, delivery: response.data };
      } else {
        const errorMessage = DeliveryApiHelpers.formatError(response.error);
        setState(prev => ({ ...prev, loading: false, error: errorMessage }));
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to confirm pickup';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
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
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await deliveryApiService.confirmDelivery(
        deliveryId,
        agentId,
        location,
        signature,
        photo,
        notes
      );
      
      if (response.success && response.data) {
        setState(prev => ({ ...prev, loading: false, error: null }));
        return { success: true, delivery: response.data };
      } else {
        const errorMessage = DeliveryApiHelpers.formatError(response.error);
        setState(prev => ({ ...prev, loading: false, error: errorMessage }));
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to confirm delivery';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, []);

  const finalizeDelivery = useCallback(async (
    deliveryId: string,
    agentId: string,
    completionData: {
      location: GeoLocation;
      signature?: string;
      photo?: string;
      notes?: string;
      customerRating?: number;
      deliveryTime: number;
    }
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await deliveryApiService.finalizeDelivery(deliveryId, agentId, completionData);
      
      if (response.success && response.data) {
        setState(prev => ({ ...prev, loading: false, error: null }));
        return { success: true, delivery: response.data };
      } else {
        const errorMessage = DeliveryApiHelpers.formatError(response.error);
        setState(prev => ({ ...prev, loading: false, error: errorMessage }));
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to finalize delivery';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
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
      const response = await deliveryApiService.reportDeliveryIssue(
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
    confirmPickup,
    confirmDelivery,
    finalizeDelivery,
    reportIssue,
  };
}

// Hook for agent management
export function useAgentManagement() {
  const [state, setState] = useState<ApiState<DeliveryAgent[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchAgents = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await deliveryApiService.getAgents();
      
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
      const response = await deliveryApiService.getAvailableAgents();
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          data: response.data as any, // Type assertion for compatibility
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

  const updateAgentStatus = useCallback(async (
    agentId: string,
    status: string
  ) => {
    try {
      const response = await deliveryApiService.updateAgentStatus(agentId, status);
      
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
    updateAgentStatus,
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
      const response = await deliveryApiService.getDashboardStats();
      
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

  const fetchActiveDeliveries = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await deliveryApiService.getActiveDeliveries();
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          data: { ...prev.data, activeDeliveries: response.data } as DashboardStats,
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
    fetchActiveDeliveries,
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
      const response = await deliveryApiService.getDeliveryMetrics(period);
      
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
      const response = await deliveryApiService.getAgentPerformance(agentId, period);
      
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