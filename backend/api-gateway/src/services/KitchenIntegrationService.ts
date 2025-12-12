import { 
  Order, 
  OrderStatus,
  Product,
  KitchenOrder,
  KitchenStatus,
  InventoryItem,
  StockAlert,
  Recipe
} from '@foodtrack/backend-shared';
import { KitchenService } from './KitchenService';
import { OrderService } from './OrderService';
import { NotificationService } from './NotificationService';
import { OrderRepository } from '../repositories/OrderRepository';
import { ProductRepository } from '../repositories/ProductRepository';
import { InventoryRepository } from '../repositories/InventoryRepository';

export interface SystemIntegrationConfig {
  deliverySystemUrl?: string;
  analyticsSystemUrl?: string;
  procurementSystemUrl?: string;
  enableAutoReordering?: boolean;
  reorderThresholdDays?: number;
}

export interface DeliverySystemNotification {
  orderId: string;
  orderNumber: string;
  status: 'ready_for_pickup' | 'picked_up' | 'delivered';
  estimatedPickupTime?: Date;
  actualPickupTime?: Date;
  specialInstructions?: string;
  deliveryAddress?: any;
}

export interface AnalyticsData {
  tenantId: string;
  date: Date;
  kitchenMetrics: {
    ordersProcessed: number;
    averagePreparationTime: number;
    stationUtilization: Record<string, number>;
    qualityIssues: number;
    delayedOrders: number;
    remakeRequests: number;
  };
  inventoryMetrics: {
    ingredientsUsed: Record<string, number>;
    wastePercentage: number;
    stockTurns: number;
    lowStockEvents: number;
  };
  performanceMetrics: {
    throughput: number;
    efficiency: number;
    customerSatisfaction?: number;
  };
}

export interface ProcurementData {
  tenantId: string;
  ingredientId: string;
  ingredientName: string;
  currentStock: number;
  minimumStock: number;
  averageUsage: number;
  suggestedOrderQuantity: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  supplier?: string;
  estimatedCost?: number;
}

/**
 * Service for integrating kitchen management with other FoodTrack systems
 * Handles communication between kitchen operations and external systems
 */
export class KitchenIntegrationService {
  private kitchenService: KitchenService;
  private orderService: OrderService;
  private notificationService: NotificationService;
  private orderRepository: OrderRepository;
  private productRepository: ProductRepository;
  private inventoryRepository: InventoryRepository;
  private config: SystemIntegrationConfig;

  constructor(config: SystemIntegrationConfig = {}) {
    this.kitchenService = new KitchenService();
    this.orderService = new OrderService();
    this.notificationService = new NotificationService();
    this.orderRepository = new OrderRepository();
    this.productRepository = new ProductRepository();
    this.inventoryRepository = new InventoryRepository();
    this.config = {
      enableAutoReordering: true,
      reorderThresholdDays: 3,
      ...config,
    };
  }

  // Order Management System Integration

  /**
   * Processes new orders from Order Management system
   * Creates kitchen orders and initiates preparation workflow
   * Requirements: 7.1
   */
  async processNewOrder(order: Order, tenantId: string): Promise<KitchenOrder> {
    try {
      // Create kitchen order from regular order
      const kitchenOrder = await this.kitchenService.createKitchenOrderFromOrder(order, tenantId);

      // Auto-assign to optimal stations if enabled
      try {
        await this.kitchenService.autoAssignOrderToOptimalStation(kitchenOrder.id, tenantId);
      } catch (assignmentError) {
        console.warn(`Failed to auto-assign order ${order.id}:`, assignmentError);
        // Continue processing even if auto-assignment fails
      }

      // Update ingredient usage based on order items
      await this.updateIngredientUsageForOrder(order, tenantId);

      // Check for low stock alerts after usage update
      await this.checkAndProcessLowStockAlerts(tenantId);

      console.log(`Kitchen order created for order ${order.number}: ${kitchenOrder.id}`);
      return kitchenOrder;
    } catch (error) {
      throw new Error(`Failed to process new order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handles order status changes from Order Management system
   * Synchronizes kitchen order status with main order status
   * Requirements: 7.1
   */
  async handleOrderStatusChange(
    orderId: string, 
    newStatus: OrderStatus, 
    previousStatus: OrderStatus,
    tenantId: string
  ): Promise<void> {
    try {
      // Map order status to kitchen status
      const kitchenStatus = this.mapOrderStatusToKitchenStatus(newStatus);
      
      if (kitchenStatus) {
        // Find kitchen order by original order ID
        const kitchenOrders = await this.kitchenService.getActiveOrders(tenantId, {});
        const kitchenOrder = kitchenOrders.find(ko => ko.orderId === orderId);
        
        if (kitchenOrder) {
          await this.kitchenService.updateOrderStatus(kitchenOrder.id, kitchenStatus, tenantId);
          console.log(`Kitchen order ${kitchenOrder.id} status updated to ${kitchenStatus}`);
        }
      }

      // Handle cancellations
      if (newStatus === 'cancelled') {
        await this.handleOrderCancellation(orderId, tenantId);
      }
    } catch (error) {
      console.error(`Failed to handle order status change for ${orderId}:`, error);
      // Don't throw error to avoid breaking the main order flow
    }
  }

  /**
   * Updates main order status when kitchen status changes
   * Requirements: 7.1
   */
  async updateMainOrderStatus(
    kitchenOrder: KitchenOrder, 
    newKitchenStatus: KitchenStatus,
    tenantId: string
  ): Promise<void> {
    try {
      const mainOrderStatus = this.mapKitchenStatusToOrderStatus(newKitchenStatus);
      
      if (mainOrderStatus) {
        await this.orderService.updateOrderStatus(
          kitchenOrder.orderId, 
          mainOrderStatus, 
          tenantId,
          {
            userId: 'kitchen-system',
            reason: `Kitchen status changed to ${newKitchenStatus}`,
          }
        );
        console.log(`Main order ${kitchenOrder.orderId} status updated to ${mainOrderStatus}`);
      }
    } catch (error) {
      console.error(`Failed to update main order status for ${kitchenOrder.orderId}:`, error);
      // Don't throw error to avoid breaking kitchen workflow
    }
  }

  // Delivery System Integration

  /**
   * Notifies delivery system when order is ready for pickup
   * Requirements: 7.2
   */
  async notifyDeliverySystem(kitchenOrder: KitchenOrder, tenantId: string): Promise<void> {
    try {
      const order = await this.orderRepository.findById(kitchenOrder.orderId, tenantId);
      if (!order) {
        throw new Error('Main order not found');
      }

      // Only notify for delivery orders
      if (order.delivery.type !== 'delivery') {
        console.log(`Order ${order.number} is pickup - no delivery notification needed`);
        return;
      }

      const deliveryNotification: DeliverySystemNotification = {
        orderId: kitchenOrder.orderId,
        orderNumber: order.number,
        status: 'ready_for_pickup',
        estimatedPickupTime: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
        specialInstructions: kitchenOrder.specialInstructions,
        deliveryAddress: order.delivery.address,
      };

      // Send notification to delivery system
      await this.sendDeliverySystemNotification(deliveryNotification, tenantId);
      
      console.log(`Delivery system notified for order ${order.number}`);
    } catch (error) {
      console.error(`Failed to notify delivery system:`, error);
      // Don't throw error to avoid breaking kitchen workflow
    }
  }

  /**
   * Handles delivery status updates from delivery system
   * Requirements: 7.2
   */
  async handleDeliveryStatusUpdate(
    orderId: string, 
    deliveryStatus: 'dispatched' | 'picked_up' | 'delivered',
    tenantId: string
  ): Promise<void> {
    try {
      // Update main order status based on delivery status
      let orderStatus: OrderStatus;
      switch (deliveryStatus) {
        case 'dispatched':
        case 'picked_up':
          orderStatus = 'delivering';
          break;
        case 'delivered':
          orderStatus = 'delivered';
          break;
        default:
          return; // Unknown status
      }

      await this.orderService.updateOrderStatus(
        orderId, 
        orderStatus, 
        tenantId,
        {
          userId: 'delivery-system',
          reason: `Delivery status: ${deliveryStatus}`,
        }
      );

      console.log(`Order ${orderId} status updated to ${orderStatus} from delivery system`);
    } catch (error) {
      console.error(`Failed to handle delivery status update:`, error);
    }
  }

  // Product Service Integration

  /**
   * Syncs recipe data with Product service
   * Requirements: 7.3
   */
  async syncRecipeData(productId: string, tenantId: string): Promise<Recipe | null> {
    try {
      // Get product information
      const product = await this.productRepository.findById(productId, tenantId);
      if (!product) {
        console.warn(`Product ${productId} not found for recipe sync`);
        return null;
      }

      // Get existing recipe
      const existingRecipe = await this.kitchenService.getRecipe(productId, tenantId);
      
      // If no recipe exists and product has preparation time, create basic recipe
      if (!existingRecipe && product.preparationTime) {
        const basicRecipe = this.createBasicRecipeFromProduct(product);
        console.log(`Created basic recipe for product ${product.name}`);
        return basicRecipe;
      }

      return existingRecipe;
    } catch (error) {
      console.error(`Failed to sync recipe data for product ${productId}:`, error);
      return null;
    }
  }

  /**
   * Updates product availability based on ingredient stock
   * Requirements: 7.3
   */
  async updateProductAvailability(tenantId: string): Promise<void> {
    try {
      // Get all products
      const products = await this.productRepository.findAll(tenantId, { active: true });
      
      // Get current inventory
      const inventory = await this.kitchenService.getCurrentStock(tenantId);
      
      for (const product of products) {
        try {
          // Check if product can be made with current inventory
          const canMake = await this.checkProductAvailability(product, inventory, tenantId);
          
          // Update product availability if needed
          if (product.active !== canMake) {
            await this.productRepository.update(product.id, { active: canMake }, tenantId);
            console.log(`Product ${product.name} availability updated to ${canMake}`);
          }
        } catch (error) {
          console.error(`Failed to check availability for product ${product.name}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to update product availability:', error);
    }
  }

  // Analytics System Integration

  /**
   * Sends kitchen performance data to Analytics system
   * Requirements: 7.4
   */
  async sendAnalyticsData(tenantId: string, date: Date = new Date()): Promise<void> {
    try {
      const analyticsData = await this.collectAnalyticsData(tenantId, date);
      
      // Send to analytics system
      await this.sendToAnalyticsSystem(analyticsData);
      
      console.log(`Analytics data sent for tenant ${tenantId} on ${date.toDateString()}`);
    } catch (error) {
      console.error('Failed to send analytics data:', error);
    }
  }

  /**
   * Collects kitchen performance metrics for analytics
   * Requirements: 7.4
   */
  private async collectAnalyticsData(tenantId: string, date: Date): Promise<AnalyticsData> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get orders for the day
    const orders = await this.orderRepository.findByDateRange(startOfDay, endOfDay, tenantId);
    const kitchenOrders = await this.kitchenService.getActiveOrders(tenantId, {
      dateFrom: startOfDay,
      dateTo: endOfDay
    });

    // Calculate kitchen metrics
    const kitchenMetrics = {
      ordersProcessed: kitchenOrders.length,
      averagePreparationTime: this.calculateAveragePreparationTime(kitchenOrders),
      stationUtilization: await this.calculateStationUtilization(tenantId, date),
      qualityIssues: 0, // Would be calculated from quality reports
      delayedOrders: kitchenOrders.filter(ko => ko.status === 'on_hold').length,
      remakeRequests: 0, // Would be calculated from remake requests
    };

    // Calculate inventory metrics
    const inventoryMetrics = {
      ingredientsUsed: await this.calculateIngredientsUsed(tenantId, date),
      wastePercentage: 0, // Would be calculated from waste tracking
      stockTurns: 0, // Would be calculated from inventory turnover
      lowStockEvents: (await this.kitchenService.getLowStockAlerts(tenantId)).length,
    };

    // Calculate performance metrics
    const performanceMetrics = {
      throughput: orders.length,
      efficiency: kitchenMetrics.ordersProcessed / Math.max(1, kitchenMetrics.ordersProcessed + kitchenMetrics.delayedOrders),
    };

    return {
      tenantId,
      date,
      kitchenMetrics,
      inventoryMetrics,
      performanceMetrics,
    };
  }

  // Procurement System Integration

  /**
   * Processes automatic reordering based on inventory levels
   * Requirements: 7.5
   */
  async processAutomaticReordering(tenantId: string): Promise<void> {
    try {
      if (!this.config.enableAutoReordering) {
        console.log('Automatic reordering is disabled');
        return;
      }

      // Get low stock alerts
      const lowStockAlerts = await this.kitchenService.getLowStockAlerts(tenantId);
      
      // Generate procurement requests
      const procurementRequests: ProcurementData[] = [];
      
      for (const alert of lowStockAlerts) {
        const procurementData = await this.generateProcurementRequest(alert, tenantId);
        if (procurementData) {
          procurementRequests.push(procurementData);
        }
      }

      // Send to procurement system
      if (procurementRequests.length > 0) {
        await this.sendToProcurementSystem(procurementRequests, tenantId);
        console.log(`Sent ${procurementRequests.length} procurement requests`);
      }
    } catch (error) {
      console.error('Failed to process automatic reordering:', error);
    }
  }

  /**
   * Generates procurement request for low stock item
   * Requirements: 7.5
   */
  private async generateProcurementRequest(
    alert: StockAlert, 
    tenantId: string
  ): Promise<ProcurementData | null> {
    try {
      // Get inventory item details
      const inventory = await this.kitchenService.getCurrentStock(tenantId);
      const item = inventory.find(i => i.id === alert.inventoryItemId);
      
      if (!item) {
        return null;
      }

      // Calculate average usage (simplified calculation)
      const averageUsage = await this.calculateAverageUsage(item.id, tenantId);
      
      // Calculate suggested order quantity
      const daysOfStock = this.config.reorderThresholdDays || 3;
      const suggestedQuantity = Math.max(
        item.minimumStock * 2, // At least double minimum stock
        averageUsage * daysOfStock // Or enough for configured days
      );

      return {
        tenantId,
        ingredientId: item.id,
        ingredientName: item.name,
        currentStock: item.currentStock,
        minimumStock: item.minimumStock,
        averageUsage,
        suggestedOrderQuantity: suggestedQuantity,
        priority: this.determineProcurementPriority(item.currentStock, item.minimumStock),
        supplier: item.supplier,
        estimatedCost: suggestedQuantity * item.costPerUnit,
      };
    } catch (error) {
      console.error(`Failed to generate procurement request for ${alert.itemName}:`, error);
      return null;
    }
  }

  // Helper Methods

  private mapOrderStatusToKitchenStatus(orderStatus: OrderStatus): KitchenStatus | null {
    const statusMap: Record<OrderStatus, KitchenStatus | null> = {
      'pending': null,
      'confirmed': 'received',
      'preparing': 'in_preparation',
      'ready': 'ready_for_pickup',
      'delivering': 'ready_for_pickup',
      'delivered': 'ready_for_pickup',
      'cancelled': 'cancelled',
    };
    
    return statusMap[orderStatus] || null;
  }

  private mapKitchenStatusToOrderStatus(kitchenStatus: KitchenStatus): OrderStatus | null {
    const statusMap: Record<KitchenStatus, OrderStatus | null> = {
      'received': 'confirmed',
      'in_preparation': 'preparing',
      'ready_for_plating': 'preparing',
      'plated': 'ready',
      'ready_for_pickup': 'ready',
      'on_hold': null, // Don't change main order status for holds
      'cancelled': 'cancelled',
    };
    
    return statusMap[kitchenStatus] || null;
  }

  private async updateIngredientUsageForOrder(order: Order, tenantId: string): Promise<void> {
    try {
      for (const item of order.items) {
        // Get recipe to determine ingredient usage
        const recipe = await this.kitchenService.getRecipe(item.productId, tenantId);
        
        if (recipe) {
          for (const ingredient of recipe.ingredients) {
            const totalQuantity = ingredient.quantity * item.quantity;
            
            try {
              await this.kitchenService.updateIngredientUsage(
                ingredient.ingredientId,
                totalQuantity,
                order.id,
                tenantId
              );
            } catch (usageError) {
              console.warn(`Failed to update usage for ingredient ${ingredient.name}:`, usageError);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Failed to update ingredient usage for order ${order.id}:`, error);
    }
  }

  private async checkAndProcessLowStockAlerts(tenantId: string): Promise<void> {
    try {
      const alerts = await this.kitchenService.getLowStockAlerts(tenantId);
      
      if (alerts.length > 0) {
        console.log(`Found ${alerts.length} low stock alerts`);
        
        // Update product availability
        await this.updateProductAvailability(tenantId);
        
        // Process automatic reordering if enabled
        if (this.config.enableAutoReordering) {
          await this.processAutomaticReordering(tenantId);
        }
      }
    } catch (error) {
      console.error('Failed to process low stock alerts:', error);
    }
  }

  private async handleOrderCancellation(orderId: string, tenantId: string): Promise<void> {
    try {
      // Find kitchen order
      const kitchenOrders = await this.kitchenService.getActiveOrders(tenantId, {});
      const kitchenOrder = kitchenOrders.find(ko => ko.orderId === orderId);
      
      if (kitchenOrder) {
        // Cancel kitchen order
        await this.kitchenService.updateOrderStatus(kitchenOrder.id, 'cancelled', tenantId);
        
        // Reverse ingredient usage if order was in preparation
        if (kitchenOrder.status === 'in_preparation' || kitchenOrder.status === 'ready_for_plating') {
          await this.reverseIngredientUsage(kitchenOrder, tenantId);
        }
      }
    } catch (error) {
      console.error(`Failed to handle order cancellation for ${orderId}:`, error);
    }
  }

  private async reverseIngredientUsage(kitchenOrder: KitchenOrder, tenantId: string): Promise<void> {
    try {
      for (const item of kitchenOrder.items) {
        const recipe = await this.kitchenService.getRecipe(item.productId, tenantId);
        
        if (recipe) {
          for (const ingredient of recipe.ingredients) {
            const totalQuantity = ingredient.quantity * item.quantity;
            
            try {
              // Add back the ingredients (negative usage)
              await this.kitchenService.updateIngredientUsage(
                ingredient.ingredientId,
                -totalQuantity,
                kitchenOrder.orderId,
                tenantId
              );
            } catch (error) {
              console.warn(`Failed to reverse usage for ingredient ${ingredient.name}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to reverse ingredient usage:', error);
    }
  }

  private createBasicRecipeFromProduct(product: Product): any {
    return {
      id: `recipe-${product.id}`,
      dishId: product.id,
      name: product.name,
      description: product.description,
      preparationTime: product.preparationTime || 15,
      cookingTime: 0,
      difficulty: 'easy',
      allergens: [],
      servings: 1,
    };
  }

  private async checkProductAvailability(
    product: Product, 
    inventory: InventoryItem[], 
    tenantId: string
  ): Promise<boolean> {
    try {
      const recipe = await this.kitchenService.getRecipe(product.id, tenantId);
      
      if (!recipe || recipe.ingredients.length === 0) {
        return true; // Assume available if no recipe or ingredients
      }

      // Check if all ingredients are available
      for (const ingredient of recipe.ingredients) {
        const inventoryItem = inventory.find(i => i.id === ingredient.ingredientId);
        
        if (!inventoryItem || inventoryItem.currentStock < ingredient.quantity) {
          return false; // Not enough stock for this ingredient
        }
      }

      return true; // All ingredients available
    } catch (error) {
      console.error(`Failed to check availability for product ${product.name}:`, error);
      return true; // Default to available on error
    }
  }

  private calculateAveragePreparationTime(kitchenOrders: KitchenOrder[]): number {
    if (kitchenOrders.length === 0) return 0;
    
    const completedOrders = kitchenOrders.filter(ko => 
      ko.actualCompletionTime && ko.actualStartTime
    );
    
    if (completedOrders.length === 0) return 0;
    
    const totalTime = completedOrders.reduce((sum, ko) => {
      const startTime = new Date(ko.actualStartTime!).getTime();
      const endTime = new Date(ko.actualCompletionTime!).getTime();
      return sum + (endTime - startTime) / (1000 * 60); // Convert to minutes
    }, 0);
    
    return totalTime / completedOrders.length;
  }

  private async calculateStationUtilization(tenantId: string, date: Date): Promise<Record<string, number>> {
    // Mock implementation - would calculate actual station utilization
    return {
      'grill': 75,
      'salad': 60,
      'dessert': 45,
      'beverage': 80,
    };
  }

  private async calculateIngredientsUsed(tenantId: string, date: Date): Promise<Record<string, number>> {
    // Mock implementation - would calculate actual ingredient usage
    return {
      'tomatoes': 50,
      'lettuce': 30,
      'cheese': 25,
      'bread': 100,
    };
  }

  private async calculateAverageUsage(ingredientId: string, tenantId: string): Promise<number> {
    // Mock implementation - would calculate from historical usage data
    return 10; // Default average usage per day
  }

  private determineProcurementPriority(currentStock: number, minimumStock: number): 'low' | 'medium' | 'high' | 'urgent' {
    const ratio = currentStock / minimumStock;
    
    if (ratio <= 0.25) return 'urgent';
    if (ratio <= 0.5) return 'high';
    if (ratio <= 0.75) return 'medium';
    return 'low';
  }

  // External System Communication Methods

  private async sendDeliverySystemNotification(
    notification: DeliverySystemNotification, 
    tenantId: string
  ): Promise<void> {
    try {
      // Mock implementation - would send HTTP request to delivery system
      console.log(`[DELIVERY SYSTEM] Notification sent:`, notification);
      
      // In production, this would be an HTTP request:
      // const response = await fetch(`${this.config.deliverySystemUrl}/notifications`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ ...notification, tenantId })
      // });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Failed to send delivery system notification:', error);
      throw error;
    }
  }

  private async sendToAnalyticsSystem(data: AnalyticsData): Promise<void> {
    try {
      // Mock implementation - would send HTTP request to analytics system
      console.log(`[ANALYTICS SYSTEM] Data sent for ${data.tenantId} on ${data.date.toDateString()}`);
      console.log('Kitchen Metrics:', data.kitchenMetrics);
      console.log('Inventory Metrics:', data.inventoryMetrics);
      console.log('Performance Metrics:', data.performanceMetrics);
      
      // In production, this would be an HTTP request:
      // const response = await fetch(`${this.config.analyticsSystemUrl}/kitchen-data`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(data)
      // });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 150));
    } catch (error) {
      console.error('Failed to send analytics data:', error);
      throw error;
    }
  }

  private async sendToProcurementSystem(
    requests: ProcurementData[], 
    tenantId: string
  ): Promise<void> {
    try {
      // Mock implementation - would send HTTP request to procurement system
      console.log(`[PROCUREMENT SYSTEM] ${requests.length} requests sent for tenant ${tenantId}`);
      requests.forEach(req => {
        console.log(`- ${req.ingredientName}: ${req.suggestedOrderQuantity} units (${req.priority} priority)`);
      });
      
      // In production, this would be an HTTP request:
      // const response = await fetch(`${this.config.procurementSystemUrl}/auto-orders`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ tenantId, requests })
      // });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error('Failed to send procurement requests:', error);
      throw error;
    }
  }
}