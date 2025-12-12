import { useState, useEffect, useCallback } from 'react';
import { 
  InventoryItem, 
  StockAlert, 
  ExpirationAlert, 
  AvailabilityCheck 
} from '@foodtrack/types';
import { kitchenOperations } from '../lib/api';

export interface InventoryUsageRecord {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  orderId?: string;
  timestamp: string;
}

export interface DeliveryItem {
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  batchNumber?: string;
  expirationDate?: string;
  qualityCheck: 'passed' | 'failed' | 'pending';
  notes?: string;
}

export interface IngredientDelivery {
  supplier: string;
  deliveryDate: string;
  invoiceNumber?: string;
  totalCost: number;
  items: DeliveryItem[];
  notes?: string;
}

export interface ReorderSuggestion {
  ingredientId: string;
  ingredientName: string;
  currentStock: number;
  minimumStock: number;
  suggestedOrderQuantity: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  estimatedCost: number;
}

export interface BarcodeScannedItem {
  inventoryItem: InventoryItem;
  suggestedQuantity: number;
  lastDeliveryDate: string | null;
}

export const useInventoryTracking = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<StockAlert[]>([]);
  const [expirationAlerts, setExpirationAlerts] = useState<ExpirationAlert[]>([]);
  const [reorderSuggestions, setReorderSuggestions] = useState<ReorderSuggestion[]>([]);
  const [usageHistory, setUsageHistory] = useState<InventoryUsageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial inventory data
  const loadInventoryData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [
        inventoryResponse,
        lowStockResponse,
        expirationResponse,
        reorderResponse
      ] = await Promise.all([
        kitchenOperations.getCurrentStock(),
        kitchenOperations.getLowStockAlerts(),
        kitchenOperations.getExpirationAlerts(),
        fetch('/api/kitchen/inventory/reorder-suggestions', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
        }).then(res => res.json()).catch(() => ({ suggestions: [] }))
      ]);
      
      setInventory(inventoryResponse.inventory);
      setLowStockAlerts(lowStockResponse.alerts);
      setExpirationAlerts(expirationResponse.alerts);
      setReorderSuggestions(reorderResponse.suggestions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update ingredient usage
  const updateIngredientUsage = useCallback(async (
    ingredientId: string, 
    quantity: number, 
    orderId?: string
  ) => {
    try {
      const result = await kitchenOperations.updateIngredientUsage(ingredientId, quantity, orderId);
      
      // Update local inventory state
      setInventory(prev => prev.map(item => 
        item.id === ingredientId 
          ? { ...item, currentStock: item.currentStock - quantity }
          : item
      ));
      
      // Add to usage history
      const ingredient = inventory.find(i => i.id === ingredientId);
      if (ingredient) {
        const usageRecord: InventoryUsageRecord = {
          ingredientId,
          ingredientName: ingredient.name,
          quantity,
          orderId,
          timestamp: new Date().toISOString(),
        };
        setUsageHistory(prev => [usageRecord, ...prev.slice(0, 49)]); // Keep last 50 records
      }
      
      // Refresh alerts after usage update
      await loadAlerts();
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ingredient usage');
      throw err;
    }
  }, [inventory]);

  // Check ingredient availability
  const checkIngredientAvailability = useCallback(async (
    ingredientId: string, 
    quantity: number
  ): Promise<AvailabilityCheck> => {
    try {
      return await kitchenOperations.checkIngredientAvailability(ingredientId, quantity);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check ingredient availability');
      throw err;
    }
  }, []);

  // Process barcode scan
  const processBarcodeScann = useCallback(async (
    barcode: string, 
    quantity?: number
  ): Promise<BarcodeScannedItem> => {
    try {
      const response = await fetch('/api/kitchen/inventory/barcode-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ barcode, quantity }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Barcode scan failed');
      }
      
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process barcode scan');
      throw err;
    }
  }, []);

  // Record ingredient delivery
  const recordIngredientDelivery = useCallback(async (delivery: IngredientDelivery) => {
    try {
      const response = await fetch('/api/kitchen/inventory/delivery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(delivery),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to record delivery');
      }
      
      const result = await response.json();
      
      // Update local inventory with delivered quantities
      setInventory(prev => prev.map(item => {
        const deliveredItem = delivery.items.find(di => di.inventoryItemId === item.id);
        if (deliveredItem) {
          return {
            ...item,
            currentStock: item.currentStock + deliveredItem.quantity,
          };
        }
        return item;
      }));
      
      // Refresh alerts after delivery
      await loadAlerts();
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record ingredient delivery');
      throw err;
    }
  }, []);

  // Update dish availability based on ingredient stock
  const updateDishAvailability = useCallback(async (
    ingredientId: string, 
    markUnavailable: boolean = false
  ) => {
    try {
      const response = await fetch(`/api/kitchen/inventory/${ingredientId}/availability`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ markUnavailable }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update dish availability');
      }
      
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update dish availability');
      throw err;
    }
  }, []);

  // Load alerts only
  const loadAlerts = useCallback(async () => {
    try {
      const [lowStockResponse, expirationResponse] = await Promise.all([
        kitchenOperations.getLowStockAlerts(),
        kitchenOperations.getExpirationAlerts(),
      ]);
      
      setLowStockAlerts(lowStockResponse.alerts);
      setExpirationAlerts(expirationResponse.alerts);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    }
  }, []);

  // Auto-refresh alerts every 5 minutes
  useEffect(() => {
    const interval = setInterval(loadAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadAlerts]);

  // Load initial data on mount
  useEffect(() => {
    loadInventoryData();
  }, [loadInventoryData]);

  // Helper functions
  const getIngredientById = useCallback((id: string) => {
    return inventory.find(item => item.id === id);
  }, [inventory]);

  const getIngredientsByCategory = useCallback((category: string) => {
    return inventory.filter(item => item.category === category);
  }, [inventory]);

  const getLowStockItems = useCallback(() => {
    return inventory.filter(item => item.currentStock <= item.minimumStock);
  }, [inventory]);

  const getExpiringItems = useCallback((daysAhead: number = 7) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);
    
    return inventory.filter(item => {
      if (!item.expirationDate) return false;
      const expirationDate = new Date(item.expirationDate);
      return expirationDate <= cutoffDate;
    });
  }, [inventory]);

  const getTotalAlertCount = useCallback(() => {
    return lowStockAlerts.length + expirationAlerts.length;
  }, [lowStockAlerts, expirationAlerts]);

  const getCriticalAlertCount = useCallback(() => {
    const criticalLowStock = lowStockAlerts.filter(alert => alert.severity === 'critical').length;
    const criticalExpiration = expirationAlerts.filter(alert => alert.severity === 'expired').length;
    return criticalLowStock + criticalExpiration;
  }, [lowStockAlerts, expirationAlerts]);

  return {
    // State
    inventory,
    lowStockAlerts,
    expirationAlerts,
    reorderSuggestions,
    usageHistory,
    isLoading,
    error,
    
    // Actions
    loadInventoryData,
    updateIngredientUsage,
    checkIngredientAvailability,
    processBarcodeScann,
    recordIngredientDelivery,
    updateDishAvailability,
    loadAlerts,
    
    // Helpers
    getIngredientById,
    getIngredientsByCategory,
    getLowStockItems,
    getExpiringItems,
    getTotalAlertCount,
    getCriticalAlertCount,
  };
};