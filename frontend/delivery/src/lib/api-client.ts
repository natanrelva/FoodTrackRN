// API client for delivery operations
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

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  setAuthToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: response.status.toString(),
            message: data.message || 'Request failed',
            details: data.details,
          },
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error occurred',
        },
      };
    }
  }

  // Dashboard API
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return this.request<DashboardStats>('/api/delivery/dashboard/stats');
  }

  async getOrderQueue(): Promise<ApiResponse<OrderQueueItem[]>> {
    return this.request<OrderQueueItem[]>('/api/delivery/orders/queue');
  }

  async getActiveDeliveries(): Promise<ApiResponse<ActiveDeliveryItem[]>> {
    return this.request<ActiveDeliveryItem[]>('/api/delivery/deliveries/active');
  }

  // Delivery Management API
  async getDeliveries(filters?: DeliveryFilters): Promise<ApiResponse<PaginatedResponse<Delivery>>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }
    
    const endpoint = `/api/delivery/deliveries${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request<PaginatedResponse<Delivery>>(endpoint);
  }

  async getDelivery(deliveryId: string): Promise<ApiResponse<Delivery>> {
    return this.request<Delivery>(`/api/delivery/deliveries/${deliveryId}`);
  }

  async updateDeliveryStatus(
    deliveryId: string,
    status: string,
    location?: GeoLocation,
    notes?: string
  ): Promise<ApiResponse<Delivery>> {
    return this.request<Delivery>(`/api/delivery/deliveries/${deliveryId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, location, notes }),
    });
  }

  // Agent Management API
  async getAgents(): Promise<ApiResponse<DeliveryAgent[]>> {
    return this.request<DeliveryAgent[]>('/api/delivery/agents');
  }

  async getAvailableAgents(): Promise<ApiResponse<AgentSummary[]>> {
    return this.request<AgentSummary[]>('/api/delivery/agents/available');
  }

  async getAgent(agentId: string): Promise<ApiResponse<DeliveryAgent>> {
    return this.request<DeliveryAgent>(`/api/delivery/agents/${agentId}`);
  }

  async updateAgentLocation(
    agentId: string,
    location: GeoLocation
  ): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/delivery/agents/${agentId}/location`, {
      method: 'PATCH',
      body: JSON.stringify({ location }),
    });
  }

  async updateAgentStatus(
    agentId: string,
    status: string
  ): Promise<ApiResponse<DeliveryAgent>> {
    return this.request<DeliveryAgent>(`/api/delivery/agents/${agentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Assignment API
  async assignOrderToAgent(assignment: DeliveryAssignment): Promise<ApiResponse<Delivery>> {
    return this.request<Delivery>('/api/delivery/assignments', {
      method: 'POST',
      body: JSON.stringify(assignment),
    });
  }

  async batchAssignOrders(batchAssignment: BatchAssignment): Promise<ApiResponse<Delivery[]>> {
    return this.request<Delivery[]>('/api/delivery/assignments/batch', {
      method: 'POST',
      body: JSON.stringify(batchAssignment),
    });
  }

  async unassignDelivery(deliveryId: string): Promise<ApiResponse<Delivery>> {
    return this.request<Delivery>(`/api/delivery/deliveries/${deliveryId}/unassign`, {
      method: 'POST',
    });
  }

  // Route Optimization API
  async optimizeRoute(request: RouteOptimizationRequest): Promise<ApiResponse<RouteOptimizationResult>> {
    return this.request<RouteOptimizationResult>('/api/delivery/routes/optimize', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getRoute(routeId: string): Promise<ApiResponse<Route>> {
    return this.request<Route>(`/api/delivery/routes/${routeId}`);
  }

  async updateRouteWithTraffic(routeId: string): Promise<ApiResponse<Route>> {
    return this.request<Route>(`/api/delivery/routes/${routeId}/update-traffic`, {
      method: 'POST',
    });
  }

  // Mobile Agent API
  async getAgentAssignedOrders(agentId: string): Promise<ApiResponse<OrderQueueItem[]>> {
    return this.request<OrderQueueItem[]>(`/api/delivery/agents/${agentId}/orders`);
  }

  async acceptOrder(deliveryId: string, agentId: string): Promise<ApiResponse<Delivery>> {
    return this.request<Delivery>(`/api/delivery/deliveries/${deliveryId}/accept`, {
      method: 'POST',
      body: JSON.stringify({ agentId }),
    });
  }

  async declineOrder(
    deliveryId: string,
    agentId: string,
    reason: string
  ): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/delivery/deliveries/${deliveryId}/decline`, {
      method: 'POST',
      body: JSON.stringify({ agentId, reason }),
    });
  }

  async confirmPickup(
    deliveryId: string,
    agentId: string,
    location: GeoLocation,
    photo?: string,
    notes?: string
  ): Promise<ApiResponse<Delivery>> {
    return this.request<Delivery>(`/api/delivery/deliveries/${deliveryId}/pickup`, {
      method: 'POST',
      body: JSON.stringify({ agentId, location, photo, notes }),
    });
  }

  async confirmDelivery(
    deliveryId: string,
    agentId: string,
    location: GeoLocation,
    signature?: string,
    photo?: string,
    notes?: string
  ): Promise<ApiResponse<Delivery>> {
    return this.request<Delivery>(`/api/delivery/deliveries/${deliveryId}/deliver`, {
      method: 'POST',
      body: JSON.stringify({ agentId, location, signature, photo, notes }),
    });
  }

  async reportIssue(
    deliveryId: string,
    agentId: string,
    issueType: string,
    description: string,
    location?: GeoLocation,
    photo?: string
  ): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/delivery/deliveries/${deliveryId}/issue`, {
      method: 'POST',
      body: JSON.stringify({ agentId, issueType, description, location, photo }),
    });
  }

  // Analytics API
  async getDeliveryMetrics(period: TimePeriod): Promise<ApiResponse<DeliveryMetrics>> {
    return this.request<DeliveryMetrics>('/api/delivery/analytics/metrics', {
      method: 'POST',
      body: JSON.stringify({ period }),
    });
  }

  async getAgentPerformance(
    agentId: string,
    period: TimePeriod
  ): Promise<ApiResponse<AgentPerformance>> {
    return this.request<AgentPerformance>(`/api/delivery/analytics/agents/${agentId}/performance`, {
      method: 'POST',
      body: JSON.stringify({ period }),
    });
  }

  // Real-time updates (for WebSocket connection info)
  async getWebSocketToken(): Promise<ApiResponse<{ token: string; url: string }>> {
    return this.request<{ token: string; url: string }>('/api/delivery/websocket/token');
  }
}

// Create and export a singleton instance
export const deliveryApi = new ApiClient();

// Export the class for testing or custom instances
export { ApiClient };

// Helper functions for common operations
export const DeliveryApiHelpers = {
  // Format API errors for display
  formatError(error: ApiResponse<any>['error']): string {
    if (!error) return 'Unknown error occurred';
    return error.message || `Error ${error.code}`;
  },

  // Check if response is successful and has data
  isSuccessWithData<T>(response: ApiResponse<T>): response is ApiResponse<T> & { data: T } {
    return response.success && response.data !== undefined;
  },

  // Extract data from successful response or throw error
  unwrapResponse<T>(response: ApiResponse<T>): T {
    if (this.isSuccessWithData(response)) {
      return response.data;
    }
    throw new Error(this.formatError(response.error));
  },

  // Retry logic for failed requests
  async withRetry<T>(
    operation: () => Promise<ApiResponse<T>>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<ApiResponse<T>> {
    let lastError: ApiResponse<T>['error'];
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await operation();
      
      if (result.success) {
        return result;
      }
      
      lastError = result.error;
      
      // Don't retry on client errors (4xx)
      if (result.error?.code.startsWith('4')) {
        break;
      }
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
    
    return {
      success: false,
      error: lastError || { code: 'RETRY_FAILED', message: 'All retry attempts failed' },
    };
  },
};