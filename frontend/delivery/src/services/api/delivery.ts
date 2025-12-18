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
} from '../../types';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// API Response types
interface AuthResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
  };
}

interface LoginRequest {
  email: string;
  password: string;
}

class DeliveryApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('deliveryAuthToken');
  }

  setAuthToken(token: string) {
    this.token = token;
    localStorage.setItem('deliveryAuthToken', token);
  }

  clearAuthToken() {
    this.token = null;
    localStorage.removeItem('deliveryAuthToken');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}/api${endpoint}`;
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

  // Authentication API
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/delivery/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/delivery/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async logout(): Promise<ApiResponse<void>> {
    const result = await this.request<void>('/delivery/auth/logout', {
      method: 'POST',
    });
    this.clearAuthToken();
    return result;
  }

  // Requirement 4.1: Display available delivery assignments
  async getAvailableAssignments(agentId?: string): Promise<ApiResponse<OrderQueueItem[]>> {
    const params = new URLSearchParams();
    if (agentId) {
      params.append('agentId', agentId);
    }
    
    const endpoint = `/delivery/assignments/available${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request<OrderQueueItem[]>(endpoint);
  }

  async getOrderQueue(): Promise<ApiResponse<OrderQueueItem[]>> {
    return this.request<OrderQueueItem[]>('/delivery/orders/queue');
  }

  async getActiveDeliveries(): Promise<ApiResponse<ActiveDeliveryItem[]>> {
    return this.request<ActiveDeliveryItem[]>('/delivery/deliveries/active');
  }

  // Requirement 4.2: Accept assignments and update order status
  async acceptDeliveryAssignment(
    deliveryId: string,
    agentId: string
  ): Promise<ApiResponse<Delivery>> {
    return this.request<Delivery>(`/delivery/deliveries/${deliveryId}/accept`, {
      method: 'POST',
      body: JSON.stringify({ agentId }),
    });
  }

  async declineDeliveryAssignment(
    deliveryId: string,
    agentId: string,
    reason: string
  ): Promise<ApiResponse<void>> {
    return this.request<void>(`/delivery/deliveries/${deliveryId}/decline`, {
      method: 'POST',
      body: JSON.stringify({ agentId, reason }),
    });
  }

  async assignOrderToAgent(assignment: DeliveryAssignment): Promise<ApiResponse<Delivery>> {
    return this.request<Delivery>('/delivery/assignments', {
      method: 'POST',
      body: JSON.stringify(assignment),
    });
  }

  async batchAssignOrders(batchAssignment: BatchAssignment): Promise<ApiResponse<Delivery[]>> {
    return this.request<Delivery[]>('/delivery/assignments/batch', {
      method: 'POST',
      body: JSON.stringify(batchAssignment),
    });
  }

  async unassignDelivery(deliveryId: string): Promise<ApiResponse<Delivery>> {
    return this.request<Delivery>(`/delivery/deliveries/${deliveryId}/unassign`, {
      method: 'POST',
    });
  }

  // Requirement 4.5: Location-based status updates
  async updateAgentLocation(
    agentId: string,
    location: GeoLocation
  ): Promise<ApiResponse<void>> {
    return this.request<void>(`/delivery/agents/${agentId}/location`, {
      method: 'PATCH',
      body: JSON.stringify({ location }),
    });
  }

  async updateDeliveryStatus(
    deliveryId: string,
    status: string,
    location?: GeoLocation,
    notes?: string
  ): Promise<ApiResponse<Delivery>> {
    return this.request<Delivery>(`/delivery/deliveries/${deliveryId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, location, notes }),
    });
  }

  async trackDeliveryLocation(
    deliveryId: string,
    agentId: string,
    location: GeoLocation
  ): Promise<ApiResponse<void>> {
    return this.request<void>(`/delivery/deliveries/${deliveryId}/track`, {
      method: 'POST',
      body: JSON.stringify({ agentId, location, timestamp: new Date().toISOString() }),
    });
  }

  // Requirement 4.4: Complete deliveries and finalize order status
  async confirmPickup(
    deliveryId: string,
    agentId: string,
    location: GeoLocation,
    photo?: string,
    notes?: string
  ): Promise<ApiResponse<Delivery>> {
    return this.request<Delivery>(`/delivery/deliveries/${deliveryId}/pickup`, {
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
    return this.request<Delivery>(`/delivery/deliveries/${deliveryId}/deliver`, {
      method: 'POST',
      body: JSON.stringify({ agentId, location, signature, photo, notes }),
    });
  }

  async finalizeDelivery(
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
  ): Promise<ApiResponse<Delivery>> {
    return this.request<Delivery>(`/delivery/deliveries/${deliveryId}/finalize`, {
      method: 'POST',
      body: JSON.stringify({ agentId, ...completionData }),
    });
  }

  async reportDeliveryIssue(
    deliveryId: string,
    agentId: string,
    issueType: string,
    description: string,
    location?: GeoLocation,
    photo?: string
  ): Promise<ApiResponse<void>> {
    return this.request<void>(`/delivery/deliveries/${deliveryId}/issue`, {
      method: 'POST',
      body: JSON.stringify({ agentId, issueType, description, location, photo }),
    });
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
    
    const endpoint = `/delivery/deliveries${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request<PaginatedResponse<Delivery>>(endpoint);
  }

  async getDelivery(deliveryId: string): Promise<ApiResponse<Delivery>> {
    return this.request<Delivery>(`/delivery/deliveries/${deliveryId}`);
  }

  // Agent Management API
  async getAgents(): Promise<ApiResponse<DeliveryAgent[]>> {
    return this.request<DeliveryAgent[]>('/delivery/agents');
  }

  async getAvailableAgents(): Promise<ApiResponse<AgentSummary[]>> {
    return this.request<AgentSummary[]>('/delivery/agents/available');
  }

  async getAgent(agentId: string): Promise<ApiResponse<DeliveryAgent>> {
    return this.request<DeliveryAgent>(`/delivery/agents/${agentId}`);
  }

  async updateAgentStatus(
    agentId: string,
    status: string
  ): Promise<ApiResponse<DeliveryAgent>> {
    return this.request<DeliveryAgent>(`/delivery/agents/${agentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async getAgentAssignedOrders(agentId: string): Promise<ApiResponse<OrderQueueItem[]>> {
    return this.request<OrderQueueItem[]>(`/delivery/agents/${agentId}/orders`);
  }

  // Route Optimization API
  async optimizeRoute(request: RouteOptimizationRequest): Promise<ApiResponse<RouteOptimizationResult>> {
    return this.request<RouteOptimizationResult>('/delivery/routes/optimize', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getRoute(routeId: string): Promise<ApiResponse<Route>> {
    return this.request<Route>(`/delivery/routes/${routeId}`);
  }

  async updateRouteWithTraffic(routeId: string): Promise<ApiResponse<Route>> {
    return this.request<Route>(`/delivery/routes/${routeId}/update-traffic`, {
      method: 'POST',
    });
  }

  // Dashboard API
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return this.request<DashboardStats>('/delivery/dashboard/stats');
  }

  // Analytics API
  async getDeliveryMetrics(period: TimePeriod): Promise<ApiResponse<DeliveryMetrics>> {
    return this.request<DeliveryMetrics>('/delivery/analytics/metrics', {
      method: 'POST',
      body: JSON.stringify({ period }),
    });
  }

  async getAgentPerformance(
    agentId: string,
    period: TimePeriod
  ): Promise<ApiResponse<AgentPerformance>> {
    return this.request<AgentPerformance>(`/delivery/analytics/agents/${agentId}/performance`, {
      method: 'POST',
      body: JSON.stringify({ period }),
    });
  }

  // WebSocket Token API
  async getWebSocketToken(): Promise<ApiResponse<{ token: string; url: string }>> {
    return this.request<{ token: string; url: string }>('/delivery/websocket/token');
  }
}

// Create and export a singleton instance
export const deliveryApiService = new DeliveryApiService();

// Export the class for testing or custom instances
export { DeliveryApiService };

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

  // Format delivery status for display
  formatDeliveryStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'Pendente',
      'assigned': 'Atribuído',
      'picked_up': 'Coletado',
      'in_transit': 'Em Trânsito',
      'delivered': 'Entregue',
      'failed': 'Falhou',
      'cancelled': 'Cancelado',
    };
    
    return statusMap[status] || status;
  },

  // Calculate delivery time
  calculateDeliveryTime(startTime: Date, endTime: Date): number {
    return Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // minutes
  },

  // Calculate distance between two points (Haversine formula)
  calculateDistance(point1: GeoLocation, point2: GeoLocation): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.latitude)) * Math.cos(this.toRadians(point2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  },

  // Convert degrees to radians
  toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  },

  // Validate location data
  isValidLocation(location: GeoLocation): boolean {
    return (
      location &&
      typeof location.latitude === 'number' &&
      typeof location.longitude === 'number' &&
      location.latitude >= -90 &&
      location.latitude <= 90 &&
      location.longitude >= -180 &&
      location.longitude <= 180
    );
  },

  // Format currency for delivery fees
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  },

  // Format date for delivery times
  formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  },

  // Generate delivery status color
  getDeliveryStatusColor(status: string): string {
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      assigned: 'bg-blue-100 text-blue-800',
      picked_up: 'bg-orange-100 text-orange-800',
      in_transit: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  },
};