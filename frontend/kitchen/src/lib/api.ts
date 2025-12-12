import { 
  KitchenOrder, 
  KitchenStatus, 
  OrderPriority,
  StationAssignment,
  StationWorkload,
  InventoryItem
} from '../types/kitchen';
import { handleOrderError, handleInventoryError, handleStationError, handleRecipeError } from '../utils/errorHandler';
import OfflineManager from '../utils/offlineManager';
import { retryOrderOperation, retryInventoryOperation, retryStationOperation, retryRecipeOperation } from '../utils/retryLogic';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// API Client class for kitchen operations
export class KitchenApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private offlineManager: OfflineManager;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('authToken');
    this.offlineManager = OfflineManager.getInstance();
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    // Add timeout signal
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    config.signal = controller.signal;

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        const error = new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        (error as any).status = response.status;
        throw error;
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // Authentication
  setAuthToken(token: string) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  clearAuthToken() {
    this.token = null;
    localStorage.removeItem('authToken');
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
  }): Promise<{ orders: KitchenOrder[] }> {
    // Use mock data in development
    if (import.meta.env.DEV) {
      const { mockKitchenOrders } = await import('../data/mockKitchenOrders');
      
      let filteredOrders = [...mockKitchenOrders];
      
      if (filters) {
        if (filters.status && filters.status.length > 0) {
          filteredOrders = filteredOrders.filter(order => 
            filters.status!.includes(order.status)
          );
        }
        
        if (filters.priority && filters.priority.length > 0) {
          filteredOrders = filteredOrders.filter(order => 
            filters.priority!.includes(order.priority)
          );
        }
        
        if (filters.stationId) {
          filteredOrders = filteredOrders.filter(order => 
            order.assignedStations.some(station => station.stationId === filters.stationId)
          );
        }
      }
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { orders: filteredOrders };
    }

    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.status) {
        filters.status.forEach(s => params.append('status', s));
      }
      if (filters.priority) {
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
    
    return this.request<{ orders: KitchenOrder[] }>(endpoint);
  }

  async getKitchenOrder(id: string): Promise<KitchenOrder> {
    return this.request<KitchenOrder>(`/kitchen/orders/${id}`);
  }

  async updateOrderStatus(
    orderId: string, 
    status: KitchenStatus, 
    stationId?: string
  ): Promise<KitchenOrder> {
    // Check if offline
    if (!this.offlineManager.getConnectionStatus()) {
      this.offlineManager.updateOrderStatusOffline(orderId, status, stationId);
      
      // Return optimistic update from cached data
      const offlineData = this.offlineManager.getOfflineData();
      const order = offlineData?.orders.find(o => o.id === orderId);
      if (order) {
        return { ...order, status };
      }
      throw new Error('Order not found in offline cache');
    }

    // Use mock data in development
    if (import.meta.env.DEV) {
      const { mockKitchenOrders } = await import('../data/mockKitchenOrders');
      const order = mockKitchenOrders.find(o => o.id === orderId);
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Return updated order (in real implementation, this would be persisted)
      return {
        ...order,
        status
      };
    }

    return retryOrderOperation(
      () => this.request<KitchenOrder>(`/kitchen/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, stationId }),
      }),
      orderId,
      'status_update'
    ).catch(error => {
      const kitchenError = handleOrderError(error, orderId, 'status_update');
      throw kitchenError;
    });
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