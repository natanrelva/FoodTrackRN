import { KitchenOrder, KitchenStatus, InventoryItem } from '../types/kitchen';

export interface OfflineAction {
  id: string;
  type: 'order_status_update' | 'inventory_update' | 'station_assignment' | 'quality_report';
  data: any;
  timestamp: string;
  retryCount: number;
  maxRetries: number;
}

export interface OfflineData {
  orders: KitchenOrder[];
  inventory: InventoryItem[];
  recipes: any[];
  stations: any[];
  lastSync: string;
}

export interface SyncResult {
  success: boolean;
  syncedActions: number;
  failedActions: OfflineAction[];
  errors: string[];
}

export class OfflineManager {
  private static instance: OfflineManager;
  private isOnline = navigator.onLine;
  private pendingActions: OfflineAction[] = [];
  private offlineData: OfflineData | null = null;
  private syncInProgress = false;
  private listeners: Set<(isOnline: boolean) => void> = new Set();

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  constructor() {
    this.setupEventListeners();
    this.loadOfflineData();
    this.loadPendingActions();
  }

  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      console.log('🌐 Connection restored - going online');
      this.isOnline = true;
      this.notifyListeners(true);
      this.syncPendingActions();
    });

    window.addEventListener('offline', () => {
      console.log('🌐 Connection lost - going offline');
      this.isOnline = false;
      this.notifyListeners(false);
    });

    // Periodic connectivity check
    setInterval(() => {
      this.checkConnectivity();
    }, 30000); // Check every 30 seconds
  }

  private async checkConnectivity(): Promise<void> {
    try {
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      
      const wasOnline = this.isOnline;
      this.isOnline = response.ok;
      
      if (!wasOnline && this.isOnline) {
        console.log('🌐 Connectivity restored via health check');
        this.notifyListeners(true);
        this.syncPendingActions();
      } else if (wasOnline && !this.isOnline) {
        console.log('🌐 Connectivity lost via health check');
        this.notifyListeners(false);
      }
    } catch (error) {
      if (this.isOnline) {
        console.log('🌐 Connectivity lost via health check failure');
        this.isOnline = false;
        this.notifyListeners(false);
      }
    }
  }

  // Public API
  getConnectionStatus(): boolean {
    return this.isOnline;
  }

  onConnectionChange(callback: (isOnline: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(isOnline: boolean): void {
    this.listeners.forEach(callback => callback(isOnline));
  }

  // Offline data management
  async cacheData(data: Partial<OfflineData>): Promise<void> {
    try {
      const existingData = this.offlineData || {
        orders: [],
        inventory: [],
        recipes: [],
        stations: [],
        lastSync: new Date().toISOString()
      };

      this.offlineData = {
        ...existingData,
        ...data,
        lastSync: new Date().toISOString()
      };

      localStorage.setItem('kitchen_offline_data', JSON.stringify(this.offlineData));
      console.log('📦 Cached offline data:', Object.keys(data));
    } catch (error) {
      console.error('Failed to cache offline data:', error);
    }
  }

  getOfflineData(): OfflineData | null {
    return this.offlineData;
  }

  private loadOfflineData(): void {
    try {
      const stored = localStorage.getItem('kitchen_offline_data');
      if (stored) {
        this.offlineData = JSON.parse(stored);
        console.log('📦 Loaded offline data from storage');
      }
    } catch (error) {
      console.error('Failed to load offline data:', error);
    }
  }

  // Pending actions management
  addPendingAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): void {
    const pendingAction: OfflineAction = {
      ...action,
      id: `${action.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      retryCount: 0
    };

    this.pendingActions.push(pendingAction);
    this.savePendingActions();
    
    console.log('📝 Added pending action:', pendingAction.type, pendingAction.id);

    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncPendingActions();
    }
  }

  getPendingActions(): OfflineAction[] {
    return [...this.pendingActions];
  }

  private loadPendingActions(): void {
    try {
      const stored = localStorage.getItem('kitchen_pending_actions');
      if (stored) {
        this.pendingActions = JSON.parse(stored);
        console.log(`📝 Loaded ${this.pendingActions.length} pending actions from storage`);
      }
    } catch (error) {
      console.error('Failed to load pending actions:', error);
    }
  }

  private savePendingActions(): void {
    try {
      localStorage.setItem('kitchen_pending_actions', JSON.stringify(this.pendingActions));
    } catch (error) {
      console.error('Failed to save pending actions:', error);
    }
  }

  // Synchronization
  async syncPendingActions(): Promise<SyncResult> {
    if (this.syncInProgress || !this.isOnline || this.pendingActions.length === 0) {
      return {
        success: true,
        syncedActions: 0,
        failedActions: [],
        errors: []
      };
    }

    this.syncInProgress = true;
    console.log(`🔄 Starting sync of ${this.pendingActions.length} pending actions`);

    const result: SyncResult = {
      success: true,
      syncedActions: 0,
      failedActions: [],
      errors: []
    };

    const actionsToSync = [...this.pendingActions];
    
    for (const action of actionsToSync) {
      try {
        await this.syncAction(action);
        
        // Remove successful action
        this.pendingActions = this.pendingActions.filter(a => a.id !== action.id);
        result.syncedActions++;
        
        console.log('✅ Synced action:', action.type, action.id);
      } catch (error) {
        console.error('❌ Failed to sync action:', action.type, action.id, error);
        
        // Increment retry count
        const actionIndex = this.pendingActions.findIndex(a => a.id === action.id);
        if (actionIndex >= 0) {
          this.pendingActions[actionIndex].retryCount++;
          
          // Remove action if max retries exceeded
          if (this.pendingActions[actionIndex].retryCount >= action.maxRetries) {
            const failedAction = this.pendingActions.splice(actionIndex, 1)[0];
            result.failedActions.push(failedAction);
            console.warn('🚫 Action exceeded max retries:', failedAction.type, failedAction.id);
          }
        }
        
        result.errors.push(`${action.type}: ${error instanceof Error ? error.message : String(error)}`);
        result.success = false;
      }
    }

    this.savePendingActions();
    this.syncInProgress = false;
    
    console.log(`🔄 Sync completed: ${result.syncedActions} synced, ${result.failedActions.length} failed`);
    
    return result;
  }

  private async syncAction(action: OfflineAction): Promise<void> {
    const authToken = localStorage.getItem('authToken');
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

    switch (action.type) {
      case 'order_status_update':
        await fetch(`${baseUrl}/kitchen/orders/${action.data.orderId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            status: action.data.status,
            stationId: action.data.stationId
          })
        });
        break;

      case 'inventory_update':
        await fetch(`${baseUrl}/kitchen/inventory/${action.data.ingredientId}/usage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            quantity: action.data.quantity,
            orderId: action.data.orderId
          })
        });
        break;

      case 'station_assignment':
        await fetch(`${baseUrl}/kitchen/orders/${action.data.orderId}/assign`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            stationId: action.data.stationId
          })
        });
        break;

      case 'quality_report':
        await fetch(`${baseUrl}/kitchen/orders/${action.data.orderId}/quality-issue`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(action.data.issue)
        });
        break;

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  // Offline operation helpers
  updateOrderStatusOffline(orderId: string, status: KitchenStatus, stationId?: string): void {
    // Update local cache
    if (this.offlineData?.orders) {
      const orderIndex = this.offlineData.orders.findIndex(o => o.id === orderId);
      if (orderIndex >= 0) {
        this.offlineData.orders[orderIndex].status = status;
        // Update timestamp would be handled by the backend
        this.cacheData({ orders: this.offlineData.orders });
      }
    }

    // Add to pending actions
    this.addPendingAction({
      type: 'order_status_update',
      data: { orderId, status, stationId },
      maxRetries: 5
    });
  }

  updateInventoryOffline(ingredientId: string, quantity: number, orderId?: string): void {
    // Update local cache
    if (this.offlineData?.inventory) {
      const itemIndex = this.offlineData.inventory.findIndex(i => i.id === ingredientId);
      if (itemIndex >= 0) {
        this.offlineData.inventory[itemIndex].currentStock -= quantity;
        this.cacheData({ inventory: this.offlineData.inventory });
      }
    }

    // Add to pending actions
    this.addPendingAction({
      type: 'inventory_update',
      data: { ingredientId, quantity, orderId },
      maxRetries: 3
    });
  }

  assignStationOffline(orderId: string, stationId: string): void {
    // Add to pending actions
    this.addPendingAction({
      type: 'station_assignment',
      data: { orderId, stationId },
      maxRetries: 3
    });
  }

  reportQualityIssueOffline(orderId: string, issue: any): void {
    // Add to pending actions
    this.addPendingAction({
      type: 'quality_report',
      data: { orderId, issue },
      maxRetries: 2
    });
  }

  // Cleanup
  clearOfflineData(): void {
    this.offlineData = null;
    this.pendingActions = [];
    localStorage.removeItem('kitchen_offline_data');
    localStorage.removeItem('kitchen_pending_actions');
    console.log('🗑️ Cleared all offline data');
  }

  getStorageUsage(): { used: number; available: number } {
    try {
      const used = new Blob([
        localStorage.getItem('kitchen_offline_data') || '',
        localStorage.getItem('kitchen_pending_actions') || '',
        localStorage.getItem('kitchen_error_log') || ''
      ]).size;

      // Estimate available storage (5MB typical limit for localStorage)
      const available = 5 * 1024 * 1024 - used;

      return { used, available };
    } catch (error) {
      return { used: 0, available: 0 };
    }
  }
}

export default OfflineManager;