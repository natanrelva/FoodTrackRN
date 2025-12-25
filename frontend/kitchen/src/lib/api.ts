import { 
  KitchenOrder, 
  KitchenStatus, 
  OrderPriority,
  StationAssignment,
  StationWorkload,
  InventoryItem,
  KitchenMetrics,
  QualityIssue,
  StatusUpdateLog,
  PreparationStage
} from '../types/kitchen';
import { handleOrderError, handleInventoryError, handleStationError, handleRecipeError } from '../utils/errorHandler';
import OfflineManager from '../utils/offlineManager';
import { retryOrderOperation, retryInventoryOperation, retryStationOperation, retryRecipeOperation } from '../utils/retryLogic';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// API Response types
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

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

// API Client class for kitchen operations
export class KitchenApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private offlineManager: OfflineManager;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('kitchenAuthToken');
    this.offlineManager = OfflineManager.getInstance();
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

    // Add timeout signal
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    const config: RequestInit = {
      ...options,
      headers,
      signal: controller.signal,
    };

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);

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
      clearTimeout(timeoutId);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error occurred',
        },
      };
    }
  }

  // Authentication
  setAuthToken(token: string) {
    this.token = token;
    localStorage.setItem('kitchenAuthToken', token);
  }

  clearAuthToken() {
    this.token = null;
    localStorage.removeItem('kitchenAuthToken');
  }

  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/kitchen/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/kitchen/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async logout(): Promise<ApiResponse<void>> {
    const result = await this.request<void>('/kitchen/auth/logout', {
      method: 'POST',
    });
    this.clearAuthToken();
    return result;
  }

  // Kitchen Order Operations
  async getActiveOrders(filters?: {
    status?: KitchenStatus[];
    priority?: OrderPriority[];
    stationId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ orders: KitchenOrder[] }>> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.status && filters.status.length > 0) {
        filters.status.forEach(s => params.append('status', s));
      }
      if (filters.priority && filters.priority.length > 0) {
        filters.priority.forEach(p => params.append('priority', p));
      }
      if (filters.stationId) {
        params.append('stationId', filters.stationId);
      }
      if (filters.dateFrom) {
        params.append('dateFrom', filters.dateFrom.toISOString());
      }
      if (filters.dateTo) {
        params.append('dateTo', filters.dateTo.toISOString());
      }
      if (filters.page) {
        params.append('page', filters.page.toString());
      }
      if (filters.limit) {
        params.append('limit', filters.limit.toString());
      }
    }

    const queryString = params.toString();
    const endpoint = `/kitchen/orders${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.request<{ orders: KitchenOrder[] }>(endpoint);
    
    // Transform backend response to match frontend expectations
    if (response.success && response.data) {
      const transformedOrders = response.data.orders.map(order => ({
        ...order,
        // Map backend status to frontend status if needed
        status: this.mapBackendStatus(order.status),
        // Ensure all required fields are present
        items: order.items || [],
        assignedStations: order.assignedStations || [],
        allergenAlerts: order.allergenAlerts || [],
        priority: order.priority || 'medium'
      }));
      
      return {
        success: true,
        data: { orders: transformedOrders }
      };
    }
    
    return response;
  }

  private mapBackendStatus(backendStatus: string): KitchenStatus {
    // Map backend kitchen order statuses to frontend statuses
    const statusMap: Record<string, KitchenStatus> = {
      'pending': 'received',
      'assigned': 'received', 
      'preparing': 'in_preparation',
      'ready': 'ready_for_pickup',
      'completed': 'ready_for_pickup',
      'failed': 'on_hold'
    };
    
    return statusMap[backendStatus] || backendStatus as KitchenStatus;
  }

  async getKitchenOrder(id: string): Promise<ApiResponse<KitchenOrder>> {
    return this.request<KitchenOrder>(`/kitchen/orders/${id}`);
  }

  // Kitchen Metrics and Performance API
  async getKitchenMetrics(): Promise<ApiResponse<KitchenMetrics>> {
    return this.request<KitchenMetrics>('/kitchen/metrics');
  }

  async getStationPerformance(stationId?: string): Promise<ApiResponse<any>> {
    const endpoint = stationId 
      ? `/kitchen/stations/${stationId}/performance`
      : '/kitchen/stations/performance';
    return this.request<any>(endpoint);
  }

  async getPreparationStages(orderId: string): Promise<ApiResponse<PreparationStage[]>> {
    return this.request<PreparationStage[]>(`/kitchen/orders/${orderId}/stages`);
  }

  async updatePreparationStage(
    orderId: string,
    stageId: string,
    status: 'started' | 'completed' | 'delayed'
  ): Promise<ApiResponse<any>> {
    return this.request<any>(`/kitchen/orders/${orderId}/stages/${stageId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async updateOrderStatus(
    orderId: string, 
    status: KitchenStatus, 
    stationId?: string
  ): Promise<ApiResponse<KitchenOrder>> {
    // Check if offline
    if (!this.offlineManager.getConnectionStatus()) {
      this.offlineManager.updateOrderStatusOffline(orderId, status, stationId);
      
      // Return optimistic update from cached data
      const offlineData = this.offlineManager.getOfflineData();
      const order = offlineData?.orders.find(o => o.id === orderId);
      if (order) {
        return { success: true, data: { ...order, status } };
      }
      return {
        success: false,
        error: { code: 'OFFLINE_ERROR', message: 'Order not found in offline cache' }
      };
    }

    // Map frontend status to backend status
    const backendStatus = this.mapFrontendStatus(status);
    
    const response = await this.request<KitchenOrder>(`/kitchen/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: backendStatus, stationId }),
    });
    
    // Transform response back to frontend format
    if (response.success && response.data) {
      return {
        success: true,
        data: {
          ...response.data,
          status: this.mapBackendStatus(response.data.status)
        }
      };
    }
    
    return response;
  }

  private mapFrontendStatus(frontendStatus: KitchenStatus): string {
    // Map frontend kitchen statuses to backend statuses
    const statusMap: Record<KitchenStatus, string> = {
      'received': 'pending',
      'in_preparation': 'preparing',
      'ready_for_pickup': 'ready',
      'on_hold': 'failed'
    };
    
    return statusMap[frontendStatus] || frontendStatus;
  }

  // WebSocket Token API
  async getWebSocketToken(): Promise<ApiResponse<{ token: string; url: string }>> {
    return this.request<{ token: string; url: string }>('/kitchen/websocket/token');
  }

  async assignOrderToStation(orderId: string, stationId: string): Promise<StationAssignment> {
    // Check if offline
    if (!this.offlineManager.getConnectionStatus()) {
      this.offlineManager.assignStationOffline(orderId, stationId);
      
      // Return optimistic assignment
      return {
        stationId,
        stationName: `Estação ${stationId.slice(-1)}`,
        assignedAt: new Date().toISOString(),
        estimatedDuration: 15,
        items: [orderId]
      };
    }

    // Use mock data in development
    if (import.meta.env.DEV) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Return mock assignment
      return {
        stationId,
        stationName: `Estação ${stationId.slice(-1)}`,
        assignedAt: new Date().toISOString(),
        estimatedDuration: 15,
        items: [orderId] // Simplified for mock
      };
    }

    return retryStationOperation(
      () => this.request<StationAssignment>(`/kitchen/orders/${orderId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ stationId }),
      }),
      stationId,
      'assignment'
    ).catch(error => {
      const kitchenError = handleStationError(error, stationId, orderId);
      throw kitchenError;
    });
  }

  async reportQualityIssue(
    orderId: string, 
    issue: {
      type: 'temperature' | 'presentation' | 'taste' | 'missing_ingredient' | 'other';
      description: string;
      severity: 'minor' | 'major' | 'critical';
    }
  ): Promise<any> {
    // Check if offline
    if (!this.offlineManager.getConnectionStatus()) {
      this.offlineManager.reportQualityIssueOffline(orderId, issue);
      return { success: true, message: 'Quality issue queued for sync' };
    }

    return retryOrderOperation(
      () => this.request(`/kitchen/orders/${orderId}/quality-issue`, {
        method: 'POST',
        body: JSON.stringify(issue),
      }),
      orderId,
      'quality_report'
    ).catch(error => {
      const kitchenError = handleOrderError(error, orderId, 'quality_report');
      throw kitchenError;
    });
  }

  // Recipe Operations
  async getRecipeInstructions(
    dishId: string, 
    modifications?: string[]
  ): Promise<any> {
    // Check offline cache first
    if (!this.offlineManager.getConnectionStatus()) {
      const offlineData = this.offlineManager.getOfflineData();
      const recipe = offlineData?.recipes.find(r => r.dishId === dishId);
      if (recipe) {
        return recipe;
      }
      throw new Error('Recipe not available offline');
    }

    // Use mock data in development
    if (import.meta.env.DEV) {
      const { getMockRecipe } = await import('../data/mockRecipes');
      const recipe = await getMockRecipe(dishId, modifications);
      if (!recipe) {
        throw new Error('Recipe not found');
      }
      return recipe;
    }

    const params = new URLSearchParams();
    if (modifications && modifications.length > 0) {
      modifications.forEach(mod => params.append('modifications', mod));
    }
    
    const queryString = params.toString();
    const endpoint = `/kitchen/recipes/${dishId}${queryString ? `?${queryString}` : ''}`;
    
    return retryRecipeOperation(
      () => this.request<any>(endpoint),
      dishId
    ).catch(error => {
      const kitchenError = handleRecipeError(error, dishId);
      throw kitchenError;
    });
  }

  // Inventory Operations
  async getCurrentStock(): Promise<{ inventory: InventoryItem[] }> {
    return this.request<{ inventory: InventoryItem[] }>('/kitchen/inventory');
  }

  async getLowStockAlerts(): Promise<{ alerts: any[] }> {
    return this.request<{ alerts: any[] }>('/kitchen/inventory/alerts/low-stock');
  }

  async getExpirationAlerts(): Promise<{ alerts: any[] }> {
    return this.request<{ alerts: any[] }>('/kitchen/inventory/alerts/expiration');
  }

  async updateIngredientUsage(
    ingredientId: string, 
    quantity: number, 
    orderId?: string
  ): Promise<any> {
    // Check if offline
    if (!this.offlineManager.getConnectionStatus()) {
      this.offlineManager.updateInventoryOffline(ingredientId, quantity, orderId);
      return { success: true, message: 'Inventory update queued for sync' };
    }

    return retryInventoryOperation(
      () => this.request(`/kitchen/inventory/${ingredientId}/usage`, {
        method: 'POST',
        body: JSON.stringify({ quantity, orderId }),
      }),
      ingredientId,
      'usage_update'
    ).catch(error => {
      const kitchenError = handleInventoryError(error, ingredientId, 'usage_update');
      throw kitchenError;
    });
  }

  async checkIngredientAvailability(
    ingredientId: string, 
    quantity: number
  ): Promise<any> {
    return this.request<any>(
      `/kitchen/inventory/${ingredientId}/availability?quantity=${quantity}`
    );
  }

  // Station Operations
  async getStationWorkload(stationId: string): Promise<StationWorkload> {
    return this.request<StationWorkload>(`/kitchen/stations/${stationId}/workload`);
  }

  async getOptimalStationAssignments(orderId: string): Promise<any> {
    // Use mock data in development
    if (import.meta.env.DEV) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Return mock assignment suggestions
      return {
        orderId,
        assignments: [
          {
            stationId: 'station-1',
            stationName: 'Estação Grill',
            stationType: 'grill',
            confidence: 85,
            reason: 'Tipo de estação corresponde aos requisitos do prato. Equipamento necessário disponível.',
            estimatedWaitTime: 10,
            currentUtilization: 65,
            equipmentMatch: true,
            skillMatch: true,
          }
        ],
        redistributionSuggestions: [],
        crossTrainingSuggestions: [],
        overloadWarnings: []
      };
    }

    return this.request(`/kitchen/orders/${orderId}/station-assignments`);
  }

  async autoAssignOrderToOptimalStation(orderId: string): Promise<{ assignments: StationAssignment[] }> {
    // Use mock data in development
    if (import.meta.env.DEV) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Return mock assignments
      return {
        assignments: [
          {
            stationId: 'station-1',
            stationName: 'Estação Grill',
            assignedAt: new Date().toISOString(),
            estimatedDuration: 15,
            items: [orderId]
          }
        ]
      };
    }

    return this.request<{ assignments: StationAssignment[] }>(`/kitchen/orders/${orderId}/auto-assign`, {
      method: 'POST',
    });
  }
}

// Create a singleton instance
export const kitchenApiClient = new KitchenApiClient();

// Export individual operation groups for easier use
export const kitchenOperations = {
  // Orders
  getActiveOrders: kitchenApiClient.getActiveOrders.bind(kitchenApiClient),
  getKitchenOrder: kitchenApiClient.getKitchenOrder.bind(kitchenApiClient),
  updateOrderStatus: kitchenApiClient.updateOrderStatus.bind(kitchenApiClient),
  assignOrderToStation: kitchenApiClient.assignOrderToStation.bind(kitchenApiClient),
  reportQualityIssue: kitchenApiClient.reportQualityIssue.bind(kitchenApiClient),
  
  // Recipes
  getRecipeInstructions: kitchenApiClient.getRecipeInstructions.bind(kitchenApiClient),
  
  // Inventory
  getCurrentStock: kitchenApiClient.getCurrentStock.bind(kitchenApiClient),
  getLowStockAlerts: kitchenApiClient.getLowStockAlerts.bind(kitchenApiClient),
  getExpirationAlerts: kitchenApiClient.getExpirationAlerts.bind(kitchenApiClient),
  updateIngredientUsage: kitchenApiClient.updateIngredientUsage.bind(kitchenApiClient),
  
  // Stations
  getStationWorkload: kitchenApiClient.getStationWorkload.bind(kitchenApiClient),
  getOptimalStationAssignments: kitchenApiClient.getOptimalStationAssignments.bind(kitchenApiClient),
  autoAssignOrderToOptimalStation: kitchenApiClient.autoAssignOrderToOptimalStation.bind(kitchenApiClient),
  
  // Additional methods that were missing
  getIngredientRequirements: async (dishId: string, quantity: number = 1) => {
    // Mock implementation
    return { ingredients: [], totalCost: 0 };
  },
  
  checkIngredientAvailability: kitchenApiClient.checkIngredientAvailability.bind(kitchenApiClient),
  
  getStatusUpdateHistory: async (orderId: string) => {
    // Mock implementation
    return [];
  },
  
  getPreparationStages: async (orderId: string) => {
    // Mock implementation
    return [];
  },
  
  getIntegrationStatus: async () => {
    // Mock implementation
    return { status: 'connected', services: [] };
  },
  
  sendAnalyticsData: async () => {
    // Mock implementation
    return { success: true };
  },
  
  processAutomaticReordering: async () => {
    // Mock implementation
    return { success: true };
  },
  
  updateProductAvailability: async () => {
    // Mock implementation
    return { success: true };
  },
  
  getWorkloadRedistributionSuggestions: async () => {
    // Mock implementation
    return [];
  },
  
  getCrossTrainingSuggestions: async () => {
    // Mock implementation
    return [];
  },
  
  detectStationOverloads: async () => {
    // Mock implementation
    return [];
  },
  
  redistributeWorkload: async (fromStationId: string, toStationId: string, orderIds: string[]) => {
    // Mock implementation
    return { success: true };
  },
  
  updateStationCapacity: async (stationId: string, capacity: number) => {
    // Mock implementation
    return { success: true };
  },
  
  assignStaffToStation: async (stationId: string, staffId: string) => {
    // Mock implementation
    return { success: true };
  },
  
  getStationOrders: async (stationId: string, filters?: any) => {
    // Mock implementation
    return { orders: [] };
  },
  
  getStationInstructions: async (stationId: string) => {
    // Mock implementation
    return { instructions: [] };
  },
  
  updateItemStatus: async (orderId: string, itemId: string, status: string) => {
    // Mock implementation
    return { success: true };
  },
  
  createHelpRequest: async (stationId: string, type: string, description: string, priority: string) => {
    // Mock implementation
    return { success: true, id: 'help-' + Date.now() };
  },
  
  reportStationIssue: async (stationId: string, issue: any) => {
    // Mock implementation
    return { success: true };
  },
};

export default kitchenApiClient;