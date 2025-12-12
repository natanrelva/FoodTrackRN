import { useState, useEffect, useCallback } from 'react';
import { kitchenOperations } from '../lib/api';
import { KitchenOrder, KitchenStatus, OrderPriority } from '../types/kitchen';
import { useErrorHandler } from '../components/ErrorHandler';
import OfflineManager from '../utils/offlineManager';

interface UseKitchenOrdersOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  filters?: {
    status?: KitchenStatus[];
    priority?: OrderPriority[];
    stationId?: string;
  };
}

interface UseKitchenOrdersReturn {
  orders: KitchenOrder[];
  loading: boolean;
  error: string | null;
  refreshOrders: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: KitchenStatus) => Promise<void>;
  updateOrderPriority: (orderId: string, priority: OrderPriority) => Promise<void>;
  assignOrderToStation: (orderId: string, stationId: string) => Promise<void>;
}

export function useKitchenOrders(options: UseKitchenOrdersOptions = {}): UseKitchenOrdersReturn {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    filters = {}
  } = options;

  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { handleError } = useErrorHandler();
  const offlineManager = OfflineManager.getInstance();

  const refreshOrders = useCallback(async () => {
    try {
      setError(null);
      
      // Try to get from offline cache first if offline
      if (!offlineManager.getConnectionStatus()) {
        const offlineData = offlineManager.getOfflineData();
        if (offlineData?.orders) {
          setOrders(offlineData.orders);
          setLoading(false);
          return;
        }
      }
      
      const response = await kitchenOperations.getActiveOrders(filters);
      setOrders(response.orders);
      
      // Cache the orders for offline use
      await offlineManager.cacheData({ orders: response.orders });
    } catch (err) {
      const kitchenError = handleError(err, {
        operation: 'fetch_orders',
        component: 'useKitchenOrders'
      });
      setError(kitchenError.userMessage);
    } finally {
      setLoading(false);
    }
  }, [filters, handleError, offlineManager]);

  const updateOrderStatus = useCallback(async (orderId: string, status: KitchenStatus) => {
    // Store original state for potential rollback
    let originalOrder: KitchenOrder | undefined;
    
    try {
      setError(null);
      
      // Update local state optimistically first
      setOrders(prevOrders => 
        prevOrders.map(order => {
          if (order.id === orderId) {
            originalOrder = order;
            return { ...order, status, updatedAt: new Date().toISOString() };
          }
          return order;
        })
      );
      
      await kitchenOperations.updateOrderStatus(orderId, status);
      
      // If online, refresh to get the latest data from server
      if (offlineManager.getConnectionStatus()) {
        await refreshOrders();
      }
    } catch (err) {
      // Revert optimistic update on error using stored original
      if (originalOrder) {
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId ? originalOrder! : order
          )
        );
      }
      
      const kitchenError = handleError(err, {
        operation: 'update_order_status',
        component: 'useKitchenOrders',
        orderId
      });
      setError(kitchenError.userMessage);
      throw kitchenError;
    }
  }, [refreshOrders, handleError, offlineManager]);

  const updateOrderPriority = useCallback(async (orderId: string, priority: OrderPriority) => {
    // Store original state for potential rollback
    let originalOrder: KitchenOrder | undefined;
    
    try {
      setError(null);
      
      // Update local state optimistically
      setOrders(prevOrders => 
        prevOrders.map(order => {
          if (order.id === orderId) {
            originalOrder = order;
            return { ...order, priority, updatedAt: new Date().toISOString() };
          }
          return order;
        })
      );
      
      // Note: This would require a backend endpoint for priority updates
      // For now, we'll just update locally and refresh
      console.log(`Priority updated for order ${orderId}: ${priority}`);
      
    } catch (err) {
      // Revert optimistic update on error
      if (originalOrder) {
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId ? originalOrder! : order
          )
        );
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to update order priority';
      setError(errorMessage);
      console.error('Failed to update order priority:', err);
      throw err;
    }
  }, []);

  const assignOrderToStation = useCallback(async (orderId: string, stationId: string) => {
    try {
      setError(null);
      const assignment = await kitchenOperations.assignOrderToStation(orderId, stationId);
      
      // Update local state optimistically
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { 
                ...order, 
                assignedStations: [...order.assignedStations, assignment],
                updatedAt: new Date().toISOString()
              }
            : order
        )
      );
      
      // Refresh to get the latest data from server
      await refreshOrders();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign order to station';
      setError(errorMessage);
      console.error('Failed to assign order to station:', err);
      throw err;
    }
  }, [refreshOrders]);

  // Initial load
  useEffect(() => {
    refreshOrders();
  }, []); // Remove refreshOrders dependency to avoid infinite loops

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshOrders();
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]); // Remove refreshOrders dependency

  // WebSocket connection for real-time updates (placeholder)
  useEffect(() => {
    // TODO: Implement WebSocket connection for real-time kitchen updates
    // This would listen for events like:
    // - 'order:new' - New order received
    // - 'order:modified' - Order modified
    // - 'order:status-update' - Status updated from another client
    // - 'inventory:low-stock' - Inventory alerts
    
    console.log('WebSocket connection for real-time updates would be established here');
    
    return () => {
      console.log('WebSocket connection would be cleaned up here');
    };
  }, []);

  return {
    orders,
    loading,
    error,
    refreshOrders,
    updateOrderStatus,
    updateOrderPriority,
    assignOrderToStation
  };
}