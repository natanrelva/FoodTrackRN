import { 
  KitchenOrder, 
  KitchenStatus,
  OrderPriority,
  StationAssignment,
  StationWorkload,
  PreparationStation,
  Recipe,
  RecipeInstructions,
  InventoryItem,
  StockAlert,
  ExpirationAlert,
  AvailabilityCheck,
  IngredientDelivery,
  KitchenStatusMapper,
  Order,
  StationType,
  Equipment,
  StaffMember,
  Specialization,
  ItemStatus
} from '@foodtrack/backend-shared';
import { KitchenRepository, KitchenOrderFilters, TimeEstimate } from '../repositories/KitchenRepository';
import { RecipeRepository } from '../repositories/RecipeRepository';
import { InventoryRepository } from '../repositories/InventoryRepository';
import { OrderRepository } from '../repositories/OrderRepository';
import { NotificationService } from './NotificationService';
import { webSocketService } from './WebSocketService';

// Local type definitions for kitchen-specific types
export interface StationAssignmentSuggestion {
  stationId: string;
  stationName: string;
  stationType: StationType;
  confidence: number;
  reason: string;
  estimatedWaitTime: number;
  currentUtilization: number;
  equipmentMatch: boolean;
  skillMatch: boolean;
}

export interface WorkloadRedistributionSuggestion {
  fromStationId: string;
  toStationId: string;
  fromStationName: string;
  toStationName: string;
  orderIds: string[];
  estimatedTimeReduction: number;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface CrossTrainingSuggestion {
  staffMemberId: string;
  staffMemberName: string;
  currentStationId: string;
  suggestedStationId: string;
  currentStationName: string;
  suggestedStationName: string;
  skillGap: string[];
  trainingRequired: string[];
  estimatedTrainingTime: number;
  benefit: string;
  priority: 'low' | 'medium' | 'high';
}

export interface StationAssignmentResult {
  orderId: string;
  assignments: StationAssignmentSuggestion[];
  redistributionSuggestions: WorkloadRedistributionSuggestion[];
  crossTrainingSuggestions: CrossTrainingSuggestion[];
  overloadWarnings: any[];
}

export interface StatusUpdateLog {
  orderId: string;
  itemId?: string;
  previousStatus: string;
  newStatus: string;
  updatedBy: string;
  updatedAt: Date;
  notes?: string;
}

export interface DelayNotification {
  orderId: string;
  delayMinutes: number;
  reason: string;
  notifiedAt: Date;
  notificationMethod: string;
}

export interface QualityIssue {
  type: string;
  description: string;
  severity: 'minor' | 'major' | 'critical';
  reportedBy: string;
}

export interface QualityReport {
  id: string;
  orderId: string;
  issue: QualityIssue;
  reportedAt: Date;
  status: 'open' | 'resolved';
}

export interface RemakeRequest {
  id: string;
  originalOrderId: string;
  originalItemId?: string;
  reason: string;
  requestedBy: string;
  requestedAt: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed';
  approvedBy?: string;
  approvedAt?: Date;
  newOrderId?: string;
}

export interface DeliveryCoordination {
  id: string;
  orderId: string;
  status: 'pending' | 'notified' | 'dispatched' | 'picked_up' | 'delivered';
  estimatedPickupTime: Date;
  actualPickupTime?: Date;
  coordinatedBy: string;
  coordinatedAt: Date;
}

export interface PreparationStage {
  id: string;
  orderId: string;
  itemId: string;
  stage: 'prep' | 'cooking' | 'plating' | 'quality_check' | 'ready';
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration: number;
  actualDuration?: number;
  stationId: string;
  notes?: string;
}

export interface KitchenServiceAPI {
  getActiveOrders(tenantId: string, filters?: KitchenOrderFilters): Promise<KitchenOrder[]>;
  updateOrderStatus(orderId: string, status: KitchenStatus, tenantId: string, stationId?: string): Promise<KitchenOrder>;
  assignOrderToStation(orderId: string, stationId: string, tenantId: string): Promise<StationAssignment>;
  getStationWorkload(stationId: string, tenantId: string): Promise<StationWorkload>;
  estimatePreparationTime(items: any[], tenantId: string): Promise<TimeEstimate[]>;
  reportQualityIssue(orderId: string, issue: QualityIssue, tenantId: string): Promise<QualityReport>;
  // Station Assignment and Workflow Management
  getOptimalStationAssignments(orderId: string, tenantId: string): Promise<StationAssignmentResult>;
  detectStationOverloads(tenantId: string): Promise<WorkloadRedistributionSuggestion[]>;
  suggestWorkloadRedistribution(tenantId: string): Promise<WorkloadRedistributionSuggestion[]>;
  getCrossTrainingSuggestions(tenantId: string): Promise<CrossTrainingSuggestion[]>;
  autoAssignOrderToOptimalStation(orderId: string, tenantId: string): Promise<StationAssignment[]>;
  // Status Tracking and Updates
  updateItemStatus(orderId: string, itemId: string, status: ItemStatus, tenantId: string, updatedBy: string, notes?: string): Promise<void>;
  getStatusUpdateHistory(orderId: string, tenantId: string): Promise<StatusUpdateLog[]>;
  reportDelay(orderId: string, delayMinutes: number, reason: string, tenantId: string, reportedBy: string): Promise<DelayNotification>;
  notifyCustomerOfDelay(orderId: string, delayMinutes: number, reason: string, tenantId: string): Promise<DelayNotification>;
  createRemakeRequest(orderId: string, reason: string, tenantId: string, requestedBy: string, itemId?: string): Promise<RemakeRequest>;
  approveRemakeRequest(requestId: string, tenantId: string, approvedBy: string): Promise<RemakeRequest>;
  coordinateDeliveryPickup(orderId: string, tenantId: string, coordinatedBy: string): Promise<DeliveryCoordination>;
  updateDeliveryStatus(coordinationId: string, status: string, tenantId: string): Promise<DeliveryCoordination>;
  trackPreparationStages(orderId: string, tenantId: string): Promise<PreparationStage[]>;
  updatePreparationStage(stageId: string, status: string, tenantId: string, updatedBy: string, notes?: string): Promise<PreparationStage>;
}

export interface RecipeServiceAPI {
  getRecipe(dishId: string, tenantId: string): Promise<Recipe | null>;
  getRecipeInstructions(dishId: string, modifications: string[], tenantId: string): Promise<RecipeInstructions | null>;
  updateRecipe(dishId: string, recipe: any, tenantId: string): Promise<Recipe | null>;
  getIngredientRequirements(dishId: string, quantity: number, tenantId: string): Promise<any>;
  validateRecipeModifications(dishId: string, modifications: string[], tenantId: string): Promise<any[]>;
}

export interface InventoryServiceAPI {
  getCurrentStock(tenantId: string): Promise<InventoryItem[]>;
  updateIngredientUsage(ingredientId: string, quantity: number, orderId: string, tenantId: string): Promise<any>;
  checkIngredientAvailability(ingredientId: string, requiredQuantity: number, tenantId: string): Promise<AvailabilityCheck>;
  getLowStockAlerts(tenantId: string): Promise<StockAlert[]>;
  recordIngredientDelivery(delivery: any, tenantId: string): Promise<IngredientDelivery>;
  getExpirationAlerts(tenantId: string): Promise<ExpirationAlert[]>;
}

export class KitchenService implements KitchenServiceAPI, RecipeServiceAPI, InventoryServiceAPI {
  private kitchenRepository: KitchenRepository;
  private recipeRepository: RecipeRepository;
  private inventoryRepository: InventoryRepository;
  private orderRepository: OrderRepository;
  private notificationService: NotificationService;

  constructor() {
    this.kitchenRepository = new KitchenRepository();
    this.recipeRepository = new RecipeRepository();
    this.inventoryRepository = new InventoryRepository();
    this.orderRepository = new OrderRepository();
    this.notificationService = new NotificationService();
  }

  // Kitchen Operations
  async getActiveOrders(tenantId: string, filters: KitchenOrderFilters = {}): Promise<KitchenOrder[]> {
    try {
      return await this.kitchenRepository.findActiveOrders(tenantId, filters);
    } catch (error) {
      throw new Error(`Failed to get active orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateOrderStatus(orderId: string, status: KitchenStatus, tenantId: string, stationId?: string): Promise<KitchenOrder> {
    try {
      // Validate status transition
      const currentOrder = await this.kitchenRepository.findById(orderId, tenantId);
      if (!currentOrder) {
        throw new Error('Kitchen order not found');
      }

      if (!KitchenStatusMapper.isValidTransition(currentOrder.status, status)) {
        throw new Error(`Invalid status transition from ${currentOrder.status} to ${status}`);
      }

      const updatedOrder = await this.kitchenRepository.updateStatus(orderId, status, tenantId, stationId);
      if (!updatedOrder) {
        throw new Error('Failed to update order status');
      }

      // Send notifications based on status
      await this.handleStatusChangeNotifications(updatedOrder, status, tenantId);

      // Integration hook: notify other systems of status change
      await this.handleSystemIntegrations(updatedOrder, status, tenantId);

      // Broadcast status update via WebSocket
      webSocketService.broadcastOrderStatusUpdate({
        orderId: updatedOrder.orderId,
        tenantId,
        status,
        stationId,
        timestamp: new Date().toISOString(),
        estimatedCompletionTime: updatedOrder.estimatedCompletionTime.toISOString(),
      });

      return updatedOrder;
    } catch (error) {
      throw new Error(`Failed to update order status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async assignOrderToStation(orderId: string, stationId: string, tenantId: string): Promise<StationAssignment> {
    try {
      // Check station capacity before assignment
      const workload = await this.kitchenRepository.getStationWorkload(stationId, tenantId);
      if (workload.utilizationRate > 90) {
        throw new Error('Station is at capacity. Consider redistributing workload.');
      }

      const assignment = await this.kitchenRepository.assignToStation(orderId, stationId, tenantId);
      
      // Update order status to in_preparation if it was received
      const order = await this.kitchenRepository.findById(orderId, tenantId);
      if (order && order.status === 'received') {
        await this.kitchenRepository.updateStatus(orderId, 'in_preparation', tenantId, stationId);
      }

      // Broadcast station assignment via WebSocket
      const station = await this.kitchenRepository.findStationById(stationId, tenantId);
      if (station && order) {
        webSocketService.broadcastStationAssignment({
          tenantId,
          orderId: order.orderId,
          stationId,
          stationName: station.name,
          assignedItems: order.items.map(item => item.id),
          estimatedTime: order.items.reduce((sum, item) => sum + (item.estimatedTime || 15), 0),
          priority: order.priority === 'urgent' ? 1 : order.priority === 'high' ? 2 : order.priority === 'medium' ? 3 : 4,
        });
      }

      return assignment;
    } catch (error) {
      throw new Error(`Failed to assign order to station: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getStationWorkload(stationId: string, tenantId: string): Promise<StationWorkload> {
    try {
      return await this.kitchenRepository.getStationWorkload(stationId, tenantId);
    } catch (error) {
      throw new Error(`Failed to get station workload: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async estimatePreparationTime(items: any[], tenantId: string): Promise<TimeEstimate[]> {
    try {
      // Get recipe information for more accurate estimates
      const estimates = await Promise.all(
        items.map(async (item) => {
          const recipe = await this.recipeRepository.findByDishId(item.productId, tenantId);
          const baseTime = recipe ? recipe.preparationTime + recipe.cookingTime : 15;
          
          return {
            dishId: item.productId,
            estimatedMinutes: baseTime * item.quantity,
            complexity: baseTime > 30 ? 'high' as const : baseTime > 15 ? 'medium' as const : 'low' as const,
            stationRequirements: this.determineStationRequirements(item, recipe),
          };
        })
      );

      return estimates;
    } catch (error) {
      throw new Error(`Failed to estimate preparation time: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async reportQualityIssue(orderId: string, issue: any, tenantId: string): Promise<QualityReport> {
    try {
      // Create a mock quality report for now
      const report: any = {
        id: `qr_${Date.now()}`,
        orderId,
        issue: issue,
        // resolution: 'Pending investigation',
        // actionTaken: 'escalated',
        // customerNotified: false,
      };
      
      // Broadcast quality issue via WebSocket
      webSocketService.broadcastToTenant(tenantId, 'quality:issue-reported', {
        tenantId,
        orderId,
        stationId: 'unknown', // Would be determined from context
        issue: issue.description,
        severity: issue.severity,
        reportedBy: issue.reportedBy,
        timestamp: new Date().toISOString(),
        requiresRemake: issue.severity === 'critical',
      });
      
      // For critical issues, we would typically send notifications
      if (issue.severity === 'critical') {
        console.log(`Critical quality issue reported for order ${orderId}: ${issue.description}`);
      }

      return report;
    } catch (error) {
      throw new Error(`Failed to report quality issue: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Recipe Management
  async getRecipe(dishId: string, tenantId: string): Promise<Recipe | null> {
    try {
      return await this.recipeRepository.findByDishId(dishId, tenantId);
    } catch (error) {
      throw new Error(`Failed to get recipe: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getRecipeInstructions(dishId: string, modifications: string[] = [], tenantId: string): Promise<RecipeInstructions | null> {
    try {
      return await this.recipeRepository.getRecipeInstructions(dishId, modifications, tenantId);
    } catch (error) {
      throw new Error(`Failed to get recipe instructions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateRecipe(dishId: string, recipe: any, tenantId: string): Promise<Recipe | null> {
    try {
      const existingRecipe = await this.recipeRepository.findByDishId(dishId, tenantId);
      if (!existingRecipe) {
        throw new Error('Recipe not found');
      }

      return await this.recipeRepository.update(existingRecipe.id, recipe, tenantId);
    } catch (error) {
      throw new Error(`Failed to update recipe: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getIngredientRequirements(dishId: string, quantity: number, tenantId: string): Promise<any> {
    try {
      return await this.recipeRepository.getIngredientRequirements(dishId, quantity, tenantId);
    } catch (error) {
      throw new Error(`Failed to get ingredient requirements: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validateRecipeModifications(dishId: string, modifications: string[], tenantId: string): Promise<any[]> {
    try {
      return await this.recipeRepository.validateRecipeModifications(dishId, modifications, tenantId);
    } catch (error) {
      throw new Error(`Failed to validate recipe modifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Inventory Management
  async getCurrentStock(tenantId: string): Promise<InventoryItem[]> {
    try {
      const result = await this.inventoryRepository.findAll(tenantId, { 
        page: 1,
        limit: 1000,
        sortBy: 'name',
        sortOrder: 'asc'
      });
      return result.items;
    } catch (error) {
      throw new Error(`Failed to get current stock: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateIngredientUsage(ingredientId: string, quantity: number, orderId: string, tenantId: string): Promise<any> {
    try {
      const result = await this.inventoryRepository.updateIngredientUsage(ingredientId, quantity, orderId, tenantId, 'kitchen-system');
      
      // Get updated inventory item for broadcasting
      const inventoryItems = await this.inventoryRepository.findAll(tenantId, { 
        page: 1, 
        limit: 1
      });
      
      const inventoryItem = inventoryItems.items[0];
      if (inventoryItem) {
        // Broadcast inventory usage update
        webSocketService.broadcastToTenant(tenantId, 'inventory:usage-update', {
          tenantId,
          ingredientId,
          ingredientName: inventoryItem.name,
          quantityUsed: quantity,
          remainingStock: inventoryItem.currentStock,
          unit: inventoryItem.unit,
          orderId,
          timestamp: new Date().toISOString(),
        });

        // Check for low stock and broadcast alert if needed
        if (inventoryItem.currentStock <= inventoryItem.minimumStock) {
          webSocketService.broadcastLowStockAlert({
            tenantId,
            ingredientId,
            ingredientName: inventoryItem.name,
            currentStock: inventoryItem.currentStock,
            minimumStock: inventoryItem.minimumStock,
            unit: inventoryItem.unit,
            severity: inventoryItem.currentStock === 0 ? 'critical' : 'warning',
          });
        }
      }
      
      return result;
    } catch (error) {
      throw new Error(`Failed to update ingredient usage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async checkIngredientAvailability(ingredientId: string, requiredQuantity: number, tenantId: string): Promise<AvailabilityCheck> {
    try {
      return await this.inventoryRepository.checkIngredientAvailability(ingredientId, requiredQuantity, tenantId);
    } catch (error) {
      throw new Error(`Failed to check ingredient availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getLowStockAlerts(tenantId: string): Promise<StockAlert[]> {
    try {
      return await this.inventoryRepository.getLowStockAlerts(tenantId);
    } catch (error) {
      throw new Error(`Failed to get low stock alerts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async recordIngredientDelivery(delivery: any, tenantId: string): Promise<IngredientDelivery> {
    try {
      return await this.inventoryRepository.recordIngredientDelivery(delivery, tenantId);
    } catch (error) {
      throw new Error(`Failed to record ingredient delivery: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getExpirationAlerts(tenantId: string): Promise<ExpirationAlert[]> {
    try {
      return await this.inventoryRepository.getExpirationAlerts(tenantId);
    } catch (error) {
      throw new Error(`Failed to get expiration alerts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Integration Methods
  async createKitchenOrderFromOrder(order: Order, tenantId: string): Promise<KitchenOrder> {
    try {
      // Calculate estimated completion time based on items
      const estimates = await this.estimatePreparationTime(order.items, tenantId);
      const totalTime = estimates.reduce((sum, est) => sum + est.estimatedMinutes, 0);
      const estimatedCompletionTime = new Date(Date.now() + totalTime * 60 * 1000);

      // Determine priority based on order channel and timing
      let priority: OrderPriority = 'medium';
      if (order.delivery?.type === 'delivery' && order.delivery?.estimatedTime) {
        const estimatedTime = order.delivery.estimatedTime;
        if (estimatedTime < 30) { // Less than 30 minutes
          priority = 'urgent';
        } else if (estimatedTime < 60) { // Less than 1 hour
          priority = 'high';
        }
      }

      // Extract allergen information from order items
      const allergenAlerts = await this.extractAllergenAlerts(order.items, tenantId);

      const kitchenOrderData: Omit<KitchenOrder, 'id' | 'createdAt' | 'updatedAt'> = {
        orderId: order.id,
        tenantId,
        items: order.items.map(item => ({
          ...item,
          modifications: item.extras?.map(e => e.name) || [],
          allergens: [], // Would be populated from product data
          preparationNotes: item.notes || '',
          status: 'pending' as const,
          estimatedTime: estimates.find(e => e.dishId === item.productId)?.estimatedMinutes || 15,
        })),
        status: 'received',
        priority,
        specialInstructions: order.notes || '',
        allergenAlerts,
        estimatedCompletionTime,
        assignedStations: [],
      };

      const createdOrder = await this.kitchenRepository.create(kitchenOrderData);
      
      // Broadcast new order to kitchen staff
      webSocketService.broadcastNewOrder({
        orderId: createdOrder.orderId,
        tenantId,
        items: createdOrder.items.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          specialInstructions: item.preparationNotes,
          allergens: item.allergens,
        })),
        priority: createdOrder.priority,
        estimatedCompletionTime: createdOrder.estimatedCompletionTime.toISOString(),
        customerInfo: order.customer ? {
          name: order.customer.name,
          phone: order.customer.phone,
        } : undefined,
      });
      
      return createdOrder;
    } catch (error) {
      throw new Error(`Failed to create kitchen order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Station Assignment and Workflow Management Methods
  async getOptimalStationAssignments(orderId: string, tenantId: string): Promise<StationAssignmentResult> {
    try {
      const order = await this.kitchenRepository.findById(orderId, tenantId);
      if (!order) {
        throw new Error('Kitchen order not found');
      }

      const stations = await this.kitchenRepository.findAllStations(tenantId);
      const assignments: StationAssignmentSuggestion[] = [];
      const overloadWarnings: any[] = [];

      for (const item of order.items) {
        const recipe = await this.recipeRepository.findByDishId(item.productId, tenantId);
        const stationSuggestions = await this.calculateStationSuggestions(item, recipe, stations, tenantId);
        
        // Find the best station for this item
        const bestStation = stationSuggestions[0];
        if (bestStation) {
          assignments.push(bestStation);
          
          // Check for overload warnings
          if (bestStation.currentUtilization > 85) {
            overloadWarnings.push({
              stationId: bestStation.stationId,
              stationName: bestStation.stationName,
              currentUtilization: bestStation.currentUtilization,
              estimatedUtilization: bestStation.currentUtilization + 15, // Estimate additional load
              severity: bestStation.currentUtilization > 95 ? 'critical' as const : 'warning' as const,
            });
          }
        }
      }

      const redistributionSuggestions = await this.suggestWorkloadRedistribution(tenantId);
      const crossTrainingSuggestions = await this.getCrossTrainingSuggestions(tenantId);

      return {
        orderId,
        assignments,
        redistributionSuggestions,
        crossTrainingSuggestions,
        overloadWarnings,
      };
    } catch (error) {
      throw new Error(`Failed to get optimal station assignments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async detectStationOverloads(tenantId: string): Promise<WorkloadRedistributionSuggestion[]> {
    try {
      const stations = await this.kitchenRepository.findAllStations(tenantId);
      const suggestions: WorkloadRedistributionSuggestion[] = [];

      for (const station of stations) {
        const workload = await this.kitchenRepository.getStationWorkload(station.id, tenantId);
        
        if (workload.utilizationRate > 90) {
          // Find alternative stations that can handle some of the workload
          const alternativeStations = stations.filter(s => 
            s.id !== station.id && 
            s.type === station.type && 
            s.status === 'active'
          );

          for (const altStation of alternativeStations) {
            const altWorkload = await this.kitchenRepository.getStationWorkload(altStation.id, tenantId);
            
            if (altWorkload.utilizationRate < 70) {
              // Get orders that could be redistributed
              const activeOrders = await this.kitchenRepository.findActiveOrders(tenantId, {
                stationId: station.id,
                status: ['received', 'in_preparation']
              });

              if (activeOrders.length > 0) {
                suggestions.push({
                  fromStationId: station.id,
                  toStationId: altStation.id,
                  fromStationName: station.name,
                  toStationName: altStation.name,
                  orderIds: activeOrders.slice(0, Math.ceil(activeOrders.length / 2)).map(o => o.id),
                  estimatedTimeReduction: Math.max(0, workload.estimatedWaitTime - altWorkload.estimatedWaitTime),
                  reason: `${station.name} is overloaded (${workload.utilizationRate.toFixed(1)}% utilization)`,
                  priority: workload.utilizationRate > 95 ? 'urgent' : 'high',
                });
              }
            }
          }
        }
      }

      return suggestions;
    } catch (error) {
      throw new Error(`Failed to detect station overloads: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async suggestWorkloadRedistribution(tenantId: string): Promise<WorkloadRedistributionSuggestion[]> {
    try {
      return await this.detectStationOverloads(tenantId);
    } catch (error) {
      throw new Error(`Failed to suggest workload redistribution: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCrossTrainingSuggestions(tenantId: string): Promise<CrossTrainingSuggestion[]> {
    try {
      const stations = await this.kitchenRepository.findAllStations(tenantId);
      const suggestions: CrossTrainingSuggestion[] = [];

      // Analyze station workloads and staff distribution
      const stationWorkloads = await Promise.all(
        stations.map(async (station) => ({
          station,
          workload: await this.kitchenRepository.getStationWorkload(station.id, tenantId)
        }))
      );

      // Find overloaded stations and underutilized stations
      const overloadedStations = stationWorkloads.filter(sw => sw.workload.utilizationRate > 85);
      const underutilizedStations = stationWorkloads.filter(sw => sw.workload.utilizationRate < 50);

      for (const overloaded of overloadedStations) {
        for (const underutilized of underutilizedStations) {
          // Check if staff from underutilized station can help overloaded station
          for (const staff of underutilized.station.assignedStaff) {
            const skillGap = this.analyzeSkillGap(staff, overloaded.station);
            
            if (skillGap.length <= 2) { // Only suggest if skill gap is manageable
              suggestions.push({
                staffMemberId: staff.id,
                staffMemberName: staff.name,
                currentStationId: underutilized.station.id,
                suggestedStationId: overloaded.station.id,
                currentStationName: underutilized.station.name,
                suggestedStationName: overloaded.station.name,
                skillGap,
                trainingRequired: skillGap,
                estimatedTrainingTime: skillGap.length * 2, // 2 hours per skill
                benefit: `Help reduce ${overloaded.station.name} workload from ${overloaded.workload.utilizationRate.toFixed(1)}%`,
                priority: overloaded.workload.utilizationRate > 95 ? 'high' : 'medium',
              });
            }
          }
        }
      }

      return suggestions;
    } catch (error) {
      throw new Error(`Failed to get cross-training suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async autoAssignOrderToOptimalStation(orderId: string, tenantId: string): Promise<StationAssignment[]> {
    try {
      const assignmentResult = await this.getOptimalStationAssignments(orderId, tenantId);
      const assignments: StationAssignment[] = [];

      for (const suggestion of assignmentResult.assignments) {
        if (suggestion.confidence > 70) { // Only auto-assign if confidence is high
          const assignment = await this.assignOrderToStation(orderId, suggestion.stationId, tenantId);
          assignments.push(assignment);
        }
      }

      return assignments;
    } catch (error) {
      throw new Error(`Failed to auto-assign order to optimal station: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper Methods for Station Assignment
  private async calculateStationSuggestions(
    item: any, 
    recipe: Recipe | null, 
    stations: PreparationStation[], 
    tenantId: string
  ): Promise<StationAssignmentSuggestion[]> {
    const suggestions: StationAssignmentSuggestion[] = [];

    for (const station of stations) {
      if (station.status !== 'active') continue;

      const workload = await this.kitchenRepository.getStationWorkload(station.id, tenantId);
      const equipmentMatch = this.checkEquipmentMatch(item, recipe, station);
      const skillMatch = this.checkSkillMatch(item, recipe, station);
      const stationTypeMatch = this.checkStationTypeMatch(item, recipe, station);

      let confidence = 0;
      let reason = '';

      // Calculate confidence based on various factors
      if (stationTypeMatch) {
        confidence += 40;
        reason += 'Station type matches dish requirements. ';
      }

      if (equipmentMatch) {
        confidence += 30;
        reason += 'Required equipment available. ';
      }

      if (skillMatch) {
        confidence += 20;
        reason += 'Staff has required skills. ';
      }

      // Adjust confidence based on workload
      if (workload.utilizationRate < 50) {
        confidence += 10;
        reason += 'Station has low utilization. ';
      } else if (workload.utilizationRate > 90) {
        confidence -= 30;
        reason += 'Station is heavily loaded. ';
      }

      if (confidence > 0) {
        suggestions.push({
          stationId: station.id,
          stationName: station.name,
          stationType: station.type,
          confidence: Math.min(100, confidence),
          reason: reason.trim(),
          estimatedWaitTime: workload.estimatedWaitTime,
          currentUtilization: workload.utilizationRate,
          equipmentMatch,
          skillMatch,
        });
      }
    }

    // Sort by confidence (highest first)
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  private checkStationTypeMatch(item: any, recipe: Recipe | null, station: PreparationStation): boolean {
    const requiredStationTypes = this.determineStationRequirements(item, recipe);
    return requiredStationTypes.includes(station.type);
  }

  private checkEquipmentMatch(item: any, recipe: Recipe | null, station: PreparationStation): boolean {
    if (!recipe) return true; // Assume match if no recipe info

    const requiredEquipment = this.extractRequiredEquipment(recipe);
    const availableEquipment = station.equipment.filter(eq => eq.status === 'operational').map(eq => eq.type);

    return requiredEquipment.every(req => availableEquipment.includes(req));
  }

  private checkSkillMatch(item: any, recipe: Recipe | null, station: PreparationStation): boolean {
    if (!recipe) return true; // Assume match if no recipe info

    const requiredSkills = this.extractRequiredSkills(recipe);
    const availableSkills = station.assignedStaff.flatMap(staff => staff.skills.map(skill => skill.type));

    return requiredSkills.every(req => availableSkills.includes(req));
  }

  private extractRequiredEquipment(recipe: Recipe): string[] {
    const equipment: string[] = [];
    
    for (const step of recipe.instructions) {
      equipment.push(...step.equipment);
    }

    // Add equipment based on cooking methods
    const instructions = recipe.instructions.map(s => s.instruction.toLowerCase()).join(' ');
    
    if (instructions.includes('grill') || instructions.includes('char')) {
      equipment.push('grill');
    }
    if (instructions.includes('fry') || instructions.includes('deep fry')) {
      equipment.push('fryer');
    }
    if (instructions.includes('bake') || instructions.includes('oven')) {
      equipment.push('oven');
    }
    if (instructions.includes('blend') || instructions.includes('puree')) {
      equipment.push('blender');
    }

    return [...new Set(equipment)]; // Remove duplicates
  }

  private extractRequiredSkills(recipe: Recipe): string[] {
    const skills: string[] = [];

    // Determine skills based on difficulty and cooking methods
    if (recipe.difficulty === 'expert') {
      skills.push('advanced_cooking');
    }
    if (recipe.difficulty === 'hard') {
      skills.push('intermediate_cooking');
    }

    const instructions = recipe.instructions.map(s => s.instruction.toLowerCase()).join(' ');
    
    if (instructions.includes('knife') || instructions.includes('chop') || instructions.includes('dice')) {
      skills.push('knife_skills');
    }
    if (instructions.includes('sauce') || instructions.includes('reduction')) {
      skills.push('sauce_making');
    }
    if (instructions.includes('grill') || instructions.includes('sear')) {
      skills.push('grilling');
    }
    if (instructions.includes('pastry') || instructions.includes('dough')) {
      skills.push('pastry');
    }

    return [...new Set(skills)]; // Remove duplicates
  }

  private analyzeSkillGap(staff: StaffMember, targetStation: PreparationStation): string[] {
    const currentSkills = staff.skills.map(skill => skill.type);
    const requiredSkills = this.getStationRequiredSkills(targetStation);
    
    return requiredSkills.filter(skill => !currentSkills.includes(skill));
  }

  private getStationRequiredSkills(station: PreparationStation): string[] {
    const skills: string[] = [];

    switch (station.type) {
      case 'grill':
        skills.push('grilling', 'temperature_control', 'meat_handling');
        break;
      case 'salad':
        skills.push('knife_skills', 'food_safety', 'presentation');
        break;
      case 'dessert':
        skills.push('pastry', 'decoration', 'temperature_control');
        break;
      case 'beverage':
        skills.push('beverage_preparation', 'equipment_operation');
        break;
      case 'appetizer':
        skills.push('presentation', 'knife_skills', 'timing');
        break;
      case 'main_course':
        skills.push('cooking_techniques', 'sauce_making', 'plating');
        break;
      case 'plating':
        skills.push('presentation', 'food_styling', 'timing');
        break;
    }

    return skills;
  }

  // Helper Methods
  private async handleStatusChangeNotifications(order: KitchenOrder, status: KitchenStatus, tenantId: string): Promise<void> {
    try {
      // For now, we'll just log status changes
      // In a full implementation, we would integrate with the notification system
      switch (status) {
        case 'ready_for_pickup':
          console.log(`Order ${order.orderId} is ready for pickup`);
          break;
        case 'on_hold':
          console.log(`Order ${order.orderId} has been placed on hold`);
          break;
      }
    } catch (error) {
      // Log error but don't fail the main operation
      console.error('Failed to handle status change notification:', error);
    }
  }

  /**
   * Handles integration with other FoodTrack systems when kitchen status changes
   * Requirements: 7.1, 7.2, 7.4
   */
  private async handleSystemIntegrations(order: KitchenOrder, status: KitchenStatus, tenantId: string): Promise<void> {
    try {
      // Import integration service dynamically to avoid circular dependencies
      const { KitchenIntegrationService } = await import('./KitchenIntegrationService');
      const integrationService = new KitchenIntegrationService();

      // Update main order status
      await integrationService.updateMainOrderStatus(order, status, tenantId);

      // Notify delivery system when ready for pickup
      if (status === 'ready_for_pickup') {
        await integrationService.notifyDeliverySystem(order, tenantId);
      }

      // Send analytics data for completed orders
      if (status === 'ready_for_pickup' || status === 'cancelled') {
        // Send analytics data (async, don't wait)
        integrationService.sendAnalyticsData(tenantId).catch(error => {
          console.error('Failed to send analytics data:', error);
        });
      }
    } catch (error) {
      // Log error but don't fail the main kitchen operation
      console.error('Failed to handle system integrations:', error);
    }
  }

  private determineStationRequirements(item: any, recipe?: Recipe | null): string[] {
    const requirements: string[] = [];
    
    if (recipe) {
      // Determine based on recipe instructions and equipment
      const instructions = recipe.instructions;
      const hasGrilling = instructions.some(step => 
        step.instruction.toLowerCase().includes('grill') || 
        step.equipment.includes('grill')
      );
      const hasSalad = instructions.some(step => 
        step.instruction.toLowerCase().includes('salad') || 
        step.instruction.toLowerCase().includes('fresh')
      );
      
      if (hasGrilling) requirements.push('grill');
      if (hasSalad) requirements.push('salad');
      
      // Add based on cooking methods
      if (instructions.some(step => step.temperature && step.temperature > 100)) {
        requirements.push('main_course');
      }
    } else {
      // Fallback to category-based assignment
      if (item.category === 'main_course') {
        requirements.push('grill', 'main_course');
      } else if (item.category === 'salad') {
        requirements.push('salad');
      } else if (item.category === 'dessert') {
        requirements.push('dessert');
      } else if (item.category === 'beverage') {
        requirements.push('beverage');
      } else {
        requirements.push('appetizer');
      }
    }
    
    return requirements;
  }

  // Status Tracking and Updates Implementation
  async updateItemStatus(orderId: string, itemId: string, status: ItemStatus, tenantId: string, updatedBy: string, notes?: string): Promise<void> {
    try {
      // Get current order to check current item status
      const order = await this.kitchenRepository.findById(orderId, tenantId);
      if (!order) {
        throw new Error('Kitchen order not found');
      }

      const item = order.items.find(i => i.id === itemId);
      if (!item) {
        throw new Error('Order item not found');
      }

      const previousStatus = item.status;

      // Update item status in the order
      await this.kitchenRepository.updateItemStatus(orderId, itemId, status, tenantId);

      // Log the status update
      await this.kitchenRepository.logStatusUpdate({
        orderId,
        itemId,
        previousStatus,
        newStatus: status,
        updatedBy,
        updatedAt: new Date().toISOString(),
        notes,
      });

      // Check if all items are completed to update order status
      const updatedOrder = await this.kitchenRepository.findById(orderId, tenantId);
      if (updatedOrder) {
        const allItemsCompleted = updatedOrder.items.every(i => i.status === 'completed');
        if (allItemsCompleted && updatedOrder.status !== 'ready_for_pickup') {
          await this.updateOrderStatus(orderId, 'ready_for_pickup', tenantId);
        }
      }
    } catch (error) {
      throw new Error(`Failed to update item status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getStatusUpdateHistory(orderId: string, tenantId: string): Promise<any[]> {
    try {
      return await this.kitchenRepository.getStatusUpdateHistory(orderId, tenantId);
    } catch (error) {
      throw new Error(`Failed to get status update history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async reportDelay(orderId: string, delayMinutes: number, reason: string, tenantId: string, reportedBy: string): Promise<any> {
    try {
      // Update estimated completion time
      const order = await this.kitchenRepository.findById(orderId, tenantId);
      if (!order) {
        throw new Error('Kitchen order not found');
      }

      const newEstimatedTime = new Date(order.estimatedCompletionTime.getTime() + delayMinutes * 60 * 1000);
      await this.kitchenRepository.updateEstimatedCompletionTime(orderId, newEstimatedTime, tenantId);

      // Create delay notification
      const delayNotification = await this.kitchenRepository.createDelayNotification({
        orderId,
        delayMinutes,
        reason,
        notifiedAt: new Date().toISOString(),
        notificationMethod: 'app', // Default method
      });

      // Automatically notify customer if delay is significant (>15 minutes)
      if (delayMinutes > 15) {
        await this.notifyCustomerOfDelay(orderId, delayMinutes, reason, tenantId);
      }

      return delayNotification;
    } catch (error) {
      throw new Error(`Failed to report delay: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async notifyCustomerOfDelay(orderId: string, delayMinutes: number, reason: string, tenantId: string): Promise<any> {
    try {
      // Get order details for customer notification
      const order = await this.kitchenRepository.findById(orderId, tenantId);
      if (!order) {
        throw new Error('Kitchen order not found');
      }

      // Create notification record
      const notification = await this.kitchenRepository.createDelayNotification({
        orderId,
        delayMinutes,
        reason,
        notifiedAt: new Date().toISOString(),
        notificationMethod: 'app', // Would be determined by customer preferences
      });

      // Send notification through notification service
      try {
        // TODO: Fix notification service interface
        console.log('Delay notification would be sent:', {
          orderNumber: orderId,
          customerName: 'Customer',
          delayMinutes,
          reason,
        });
      } catch (notificationError) {
        console.error('Failed to send delay notification:', notificationError);
        // Don't fail the main operation if notification fails
      }

      return notification;
    } catch (error) {
      throw new Error(`Failed to notify customer of delay: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createRemakeRequest(orderId: string, reason: string, tenantId: string, requestedBy: string, itemId?: string): Promise<any> {
    try {
      const order = await this.kitchenRepository.findById(orderId, tenantId);
      if (!order) {
        throw new Error('Kitchen order not found');
      }

      // Create remake request
      const remakeRequest = await this.kitchenRepository.createRemakeRequest({
        originalOrderId: orderId,
        originalItemId: itemId,
        reason,
        requestedBy,
        requestedAt: new Date().toISOString(),
        priority: 'high', // Remakes typically have high priority
        status: 'pending',
      });

      // Put original order on hold
      await this.updateOrderStatus(orderId, 'on_hold', tenantId);

      // Log the remake request
      await this.kitchenRepository.logStatusUpdate({
        orderId,
        itemId,
        previousStatus: order.status,
        newStatus: 'on_hold',
        updatedBy: requestedBy,
        updatedAt: new Date().toISOString(),
        notes: `Remake requested: ${reason}`,
      });

      return remakeRequest;
    } catch (error) {
      throw new Error(`Failed to create remake request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async approveRemakeRequest(requestId: string, tenantId: string, approvedBy: string): Promise<any> {
    try {
      const remakeRequest = await this.kitchenRepository.findRemakeRequestById(requestId, tenantId);
      if (!remakeRequest) {
        throw new Error('Remake request not found');
      }

      // Update remake request status
      const updatedRequest = await this.kitchenRepository.updateRemakeRequest(requestId, {
        status: 'approved',
        approvedBy,
        approvedAt: new Date().toISOString(),
      }, tenantId);

      // Create new kitchen order for remake
      const originalOrder = await this.kitchenRepository.findById(remakeRequest.originalOrderId, tenantId);
      if (originalOrder) {
        let itemsToRemake = originalOrder.items;
        
        // If specific item remake, only remake that item
        if (remakeRequest.originalItemId) {
          itemsToRemake = originalOrder.items.filter(item => item.id === remakeRequest.originalItemId);
        }

        const remakeOrderData: Omit<KitchenOrder, 'id' | 'createdAt' | 'updatedAt'> = {
          orderId: originalOrder.orderId, // Same original order
          tenantId,
          items: itemsToRemake.map(item => ({
            ...item,
            status: 'pending',
            actualTime: undefined,
          })),
          status: 'received',
          priority: 'high', // Remakes get high priority
          specialInstructions: `REMAKE: ${remakeRequest.reason}. ${originalOrder.specialInstructions}`,
          allergenAlerts: originalOrder.allergenAlerts,
          estimatedCompletionTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
          assignedStations: [],
        };

        const newKitchenOrder = await this.kitchenRepository.create(remakeOrderData);
        
        // Update remake request with new order ID
        await this.kitchenRepository.updateRemakeRequest(requestId, {
          newOrderId: newKitchenOrder.id,
          status: 'in_progress',
        }, tenantId);
      }

      return updatedRequest;
    } catch (error) {
      throw new Error(`Failed to approve remake request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async coordinateDeliveryPickup(orderId: string, tenantId: string, coordinatedBy: string): Promise<any> {
    try {
      const order = await this.kitchenRepository.findById(orderId, tenantId);
      if (!order) {
        throw new Error('Kitchen order not found');
      }

      if (order.status !== 'ready_for_pickup') {
        throw new Error('Order is not ready for pickup');
      }

      // Create delivery coordination record
      const coordination = await this.kitchenRepository.createDeliveryCoordination({
        orderId,
        status: 'pending',
        estimatedPickupTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes from now
        coordinatedBy,
        coordinatedAt: new Date().toISOString(),
      });

      // Notify delivery system
      try {
        await this.notificationService.notifyDeliverySystem({
          orderId: order.orderId,
          orderNumber: orderId,
          estimatedPickupTime: new Date(coordination.estimatedPickupTime),
          specialInstructions: order.specialInstructions,
        });
      } catch (notificationError) {
        console.error('Failed to notify delivery system:', notificationError);
        // Don't fail the main operation
      }

      return coordination;
    } catch (error) {
      throw new Error(`Failed to coordinate delivery pickup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateDeliveryStatus(coordinationId: string, status: any, tenantId: string): Promise<any> {
    try {
      const coordination = await this.kitchenRepository.updateDeliveryCoordination(coordinationId, {
        status,
        ...(status === 'picked_up' && { actualPickupTime: new Date().toISOString() }),
      }, tenantId);

      if (!coordination) {
        throw new Error('Delivery coordination not found');
      }

      return coordination;
    } catch (error) {
      throw new Error(`Failed to update delivery status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async trackPreparationStages(orderId: string, tenantId: string): Promise<any[]> {
    try {
      return await this.kitchenRepository.getPreparationStages(orderId, tenantId);
    } catch (error) {
      throw new Error(`Failed to track preparation stages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updatePreparationStage(stageId: string, status: any, tenantId: string, updatedBy: string, notes?: string): Promise<any> {
    try {
      const stage = await this.kitchenRepository.updatePreparationStage(stageId, {
        status,
        ...(status === 'in_progress' && { startedAt: new Date().toISOString() }),
        ...(status === 'completed' && { 
          completedAt: new Date().toISOString(),
          // Calculate actual duration if started
        }),
        notes,
      }, tenantId);

      if (!stage) {
        throw new Error('Preparation stage not found');
      }

      // If stage completed, check if we should advance to next stage
      if (status === 'completed') {
        await this.advanceToNextPreparationStage(stage.orderId, stage.itemId, tenantId);
      }

      return stage;
    } catch (error) {
      throw new Error(`Failed to update preparation stage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper method to advance to next preparation stage
  private async advanceToNextPreparationStage(orderId: string, itemId: string, tenantId: string): Promise<void> {
    try {
      const stages = await this.kitchenRepository.getPreparationStages(orderId, tenantId);
      const itemStages = stages.filter(s => s.itemId === itemId).sort((a, b) => {
        const stageOrder = ['prep', 'cooking', 'plating', 'quality_check', 'ready'];
        return stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage);
      });

      // TODO: Fix status type compatibility
      // const currentStageIndex = itemStages.findIndex(s => s.status === 'completed');
      // const nextStage = itemStages[currentStageIndex + 1];

      // if (nextStage && nextStage.status === 'pending') {
      //   await this.kitchenRepository.updatePreparationStage(nextStage.id, {
      //     status: 'pending', // Ready to start
      //   }, tenantId);
      // }

      // // If all stages completed, update item status
      // const allStagesCompleted = itemStages.every(s => s.status === 'completed');
      // if (allStagesCompleted) {
      //   await this.updateItemStatus(orderId, itemId, 'completed', tenantId, 'system');
      // }
    } catch (error) {
      console.error('Failed to advance to next preparation stage:', error);
      // Don't fail the main operation
    }
  }

  private async extractAllergenAlerts(items: any[], tenantId: string): Promise<any[]> {
    const allergenAlerts: any[] = [];
    
    for (const item of items) {
      try {
        const recipe = await this.recipeRepository.findByDishId(item.productId, tenantId);
        if (recipe && recipe.allergens.length > 0) {
          allergenAlerts.push(...recipe.allergens.map(allergen => ({
            type: allergen.type,
            severity: allergen.severity,
            description: `${item.name} contains ${allergen.type}`,
          })));
        }
      } catch (error) {
        // Continue processing other items if one fails
        console.error(`Failed to get allergen info for item ${item.productId}:`, error);
      }
    }
    
    return allergenAlerts;
  }

  // Station Display System Methods
  async getStationInstructions(stationId: string, tenantId: string): Promise<any> {
    try {
      const station = await this.kitchenRepository.findStationById(stationId, tenantId);
      if (!station) {
        throw new Error('Station not found');
      }

      // Get active orders for this station
      const activeOrders = await this.getActiveOrders(tenantId, { stationId });
      
      // Get station workload
      const workload = await this.getStationWorkload(stationId, tenantId);

      // Extract items assigned to this station
      const stationItems = activeOrders.flatMap(order => 
        order.items.filter(item => 
          order.assignedStations.some(assignment => assignment.stationId === stationId)
        )
      );

      // Prioritize items by order priority and timing
      const priorityQueue = stationItems
        .sort((a, b) => {
          const orderA = activeOrders.find(o => o.items.includes(a));
          const orderB = activeOrders.find(o => o.items.includes(b));
          
          if (!orderA || !orderB) return 0;
          
          // Sort by priority first, then by estimated completion time
          const priorityOrder = { urgent: 1, high: 2, medium: 3, low: 4 };
          const priorityDiff = priorityOrder[orderA.priority] - priorityOrder[orderB.priority];
          
          if (priorityDiff !== 0) return priorityDiff;
          
          return orderA.estimatedCompletionTime.getTime() - orderB.estimatedCompletionTime.getTime();
        });

      return {
        stationId,
        stationType: station.type,
        activeOrders: stationItems,
        priorityQueue,
        specialInstructions: activeOrders.flatMap(order => 
          order.specialInstructions ? [order.specialInstructions] : []
        ),
        equipmentStatus: station.equipment,
        currentCapacity: workload.activeOrders,
        maxCapacity: station.capacity,
        utilizationRate: workload.utilizationRate,
        estimatedWaitTime: workload.estimatedWaitTime,
      };
    } catch (error) {
      throw new Error(`Failed to get station instructions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createHelpRequest(
    stationId: string, 
    requestType: string, 
    description: string, 
    priority: string,
    tenantId: string,
    requestedBy: string
  ): Promise<any> {
    try {
      const station = await this.kitchenRepository.findStationById(stationId, tenantId);
      if (!station) {
        throw new Error('Station not found');
      }

      const helpRequest = await this.kitchenRepository.createHelpRequest({
        stationId,
        requestType,
        description,
        priority,
        requestedBy,
        requestedAt: new Date().toISOString(),
        status: 'pending',
      }, tenantId);

      // Broadcast help request via WebSocket
      webSocketService.broadcastToTenant(tenantId, 'station:help-request', {
        tenantId,
        stationId,
        stationName: station.name,
        helpType: requestType as any,
        message: description,
        requestedBy,
        timestamp: new Date().toISOString(),
        status: 'pending',
      });

      // Send notification to kitchen management
      try {
        // TODO: Implement sendHelpRequestNotification method
        console.log('Help request notification:', {
          stationId,
          stationName: station.name,
          requestType,
          description,
          priority,
          requestedBy,
        });
      } catch (notificationError) {
        console.error('Failed to send help request notification:', notificationError);
        // Don't fail the main operation
      }

      return helpRequest;
    } catch (error) {
      throw new Error(`Failed to create help request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async reportStationIssue(
    stationId: string, 
    issue: any, 
    tenantId: string,
    reportedBy: string
  ): Promise<any> {
    try {
      const station = await this.kitchenRepository.findStationById(stationId, tenantId);
      if (!station) {
        throw new Error('Station not found');
      }

      const issueReport = await this.kitchenRepository.createStationIssueReport({
        stationId,
        ...issue,
        reportedBy,
        reportedAt: new Date().toISOString(),
        status: 'open',
      }, tenantId);

      // Update station status if critical issue
      if (issue.severity === 'critical') {
        await this.kitchenRepository.updateStationStatus(stationId, 'maintenance', tenantId);
        
        // Redistribute orders from this station
        const activeOrders = await this.getActiveOrders(tenantId, { stationId });
        if (activeOrders.length > 0) {
          const redistributionSuggestions = await this.suggestWorkloadRedistribution(tenantId);
          // Auto-redistribute if there are clear alternatives
          for (const suggestion of redistributionSuggestions) {
            if (suggestion.fromStationId === stationId && suggestion.priority === 'urgent') {
              await this.kitchenRepository.redistributeWorkload(
                suggestion.fromStationId,
                suggestion.toStationId,
                suggestion.orderIds,
                tenantId
              );
            }
          }
        }
      }

      // Send notification to maintenance/management
      try {
        // TODO: Implement sendStationIssueNotification method
        console.log('Station issue notification:', {
          stationId,
          stationName: station.name,
          issueType: issue.type,
          description: issue.description,
          severity: issue.severity,
          reportedBy,
          affectedEquipment: issue.affectedEquipment,
          estimatedDowntime: issue.estimatedDowntime,
        });
      } catch (notificationError) {
        console.error('Failed to send station issue notification:', notificationError);
        // Don't fail the main operation
      }

      return issueReport;
    } catch (error) {
      throw new Error(`Failed to report station issue: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}