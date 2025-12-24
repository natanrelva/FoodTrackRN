import { 
  KitchenOrder, 
  KitchenOrderStatus, 
  KitchenPriority,
  KitchenItemStatus,
  KitchenOrderFactory,
  KitchenOrderStateMachine,
  Station,
  StationType,
  CreateKitchenOrderRequest,
  UpdateKitchenOrderStatusRequest,
  UpdateKitchenOrderItemStatusRequest
} from '../models/KitchenOrder';
import { KitchenOrderRepository } from '../repositories/KitchenOrderRepository';
import { ProductionContractRepository } from '../repositories/ProductionContractRepository';
import { OrderRepository } from '../repositories/OrderRepository';
import { OrderStatus } from '../models/Order';
import { EventBus, KitchenOrderCreated, KitchenOrderStatusChanged, IngredientConsumed } from '@foodtrack/backend-shared';

export class KitchenService {
  constructor(
    private kitchenOrderRepository: KitchenOrderRepository,
    private productionContractRepository: ProductionContractRepository,
    private orderRepository: OrderRepository,
    private eventBus: EventBus
  ) {}

  async createKitchenOrderFromContract(
    contractId: string,
    tenantId: string,
    priority: KitchenPriority = KitchenPriority.NORMAL
  ): Promise<KitchenOrder> {
    // Get production contract
    const contract = await this.productionContractRepository.findById(contractId, tenantId);
    if (!contract) {
      throw new Error('Production contract not found');
    }

    // Check if kitchen order already exists for this contract
    const existingKitchenOrder = await this.kitchenOrderRepository.findByOrderId(contract.orderId, tenantId);
    if (existingKitchenOrder) {
      throw new Error('Kitchen order already exists for this contract');
    }

    // Create kitchen order from contract
    const kitchenOrderData = KitchenOrderFactory.createFromProductionContract(
      contractId,
      contract.orderId,
      tenantId,
      contract.contractData.items.map(item => ({
        productionItemId: item.productionItemId,
        productId: item.productId,
        recipeId: item.recipeId,
        quantity: item.quantity,
        modifications: item.modifications,
        estimatedTime: this.calculateEstimatedTime(item.productId, item.quantity)
      })),
      priority
    );

    const kitchenOrder = await this.kitchenOrderRepository.create(kitchenOrderData);

    // Assign to optimal station
    await this.assignToOptimalStation(kitchenOrder.id, tenantId);

    // Emit kitchen order created event
    await this.eventBus.publish(new KitchenOrderCreated({
      kitchenOrderId: kitchenOrder.id,
      orderId: kitchenOrder.orderId,
      contractId: kitchenOrder.contractId,
      tenantId,
      priority: kitchenOrder.priority,
      estimatedCompletionTime: kitchenOrder.estimatedCompletionTime
    }));

    return kitchenOrder;
  }

  async createKitchenOrder(request: CreateKitchenOrderRequest, tenantId: string): Promise<KitchenOrder> {
    // Validate production contract exists
    const contract = await this.productionContractRepository.findById(request.contractId, tenantId);
    if (!contract) {
      throw new Error('Production contract not found');
    }

    const kitchenOrderData = KitchenOrderFactory.createFromProductionContract(
      request.contractId,
      request.orderId,
      tenantId,
      request.items,
      request.priority || KitchenPriority.NORMAL
    );

    const kitchenOrder = await this.kitchenOrderRepository.create(kitchenOrderData);

    // Assign to optimal station
    await this.assignToOptimalStation(kitchenOrder.id, tenantId);

    // Emit event
    await this.eventBus.publish(new KitchenOrderCreated({
      kitchenOrderId: kitchenOrder.id,
      orderId: kitchenOrder.orderId,
      contractId: kitchenOrder.contractId,
      tenantId,
      priority: kitchenOrder.priority,
      estimatedCompletionTime: kitchenOrder.estimatedCompletionTime
    }));

    return kitchenOrder;
  }

  async getKitchenOrder(id: string, tenantId: string): Promise<KitchenOrder | null> {
    return this.kitchenOrderRepository.findById(id, tenantId);
  }

  async getKitchenOrderByOrderId(orderId: string, tenantId: string): Promise<KitchenOrder | null> {
    return this.kitchenOrderRepository.findByOrderId(orderId, tenantId);
  }

  async getActiveKitchenOrders(tenantId: string): Promise<KitchenOrder[]> {
    return this.kitchenOrderRepository.findActiveOrders(tenantId);
  }

  async getKitchenOrdersByStatus(status: KitchenOrderStatus, tenantId: string): Promise<KitchenOrder[]> {
    return this.kitchenOrderRepository.findByStatus(status, tenantId);
  }

  async updateKitchenOrderStatus(
    id: string,
    tenantId: string,
    request: UpdateKitchenOrderStatusRequest
  ): Promise<KitchenOrder> {
    const kitchenOrder = await this.kitchenOrderRepository.findById(id, tenantId);
    if (!kitchenOrder) {
      throw new Error('Kitchen order not found');
    }

    // Validate status transition
    KitchenOrderStateMachine.validateTransition(kitchenOrder.status, request.status);

    // Update kitchen order status
    const updatedKitchenOrder = await this.kitchenOrderRepository.updateStatus(
      id,
      tenantId,
      request.status,
      request.assignedStation,
      request.estimatedCompletionTime
    );

    if (!updatedKitchenOrder) {
      throw new Error('Failed to update kitchen order status');
    }

    // Update corresponding order status
    await this.updateOrderStatusFromKitchen(updatedKitchenOrder);

    // Handle station load updates
    if (request.assignedStation && request.assignedStation !== kitchenOrder.assignedStation) {
      await this.updateStationLoads(kitchenOrder.assignedStation, request.assignedStation, tenantId);
    }

    // Emit status change event
    await this.eventBus.publish(new KitchenOrderStatusChanged({
      kitchenOrderId: id,
      orderId: updatedKitchenOrder.orderId,
      tenantId,
      previousStatus: kitchenOrder.status,
      newStatus: request.status,
      assignedStation: request.assignedStation,
      estimatedCompletionTime: request.estimatedCompletionTime
    }));

    // Track ingredient consumption when order is completed
    if (request.status === KitchenOrderStatus.COMPLETED) {
      await this.trackIngredientConsumption(updatedKitchenOrder);
    }

    return updatedKitchenOrder;
  }

  async updateKitchenOrderItemStatus(
    kitchenOrderId: string,
    tenantId: string,
    request: UpdateKitchenOrderItemStatusRequest
  ): Promise<boolean> {
    const success = await this.kitchenOrderRepository.updateItemStatus(
      kitchenOrderId,
      request.itemId,
      tenantId,
      request.status
    );

    if (success) {
      // Check if all items are completed to auto-update order status
      const kitchenOrder = await this.kitchenOrderRepository.findById(kitchenOrderId, tenantId);
      if (kitchenOrder) {
        await this.checkAndUpdateOrderCompletion(kitchenOrder);
      }
    }

    return success;
  }

  async assignToOptimalStation(kitchenOrderId: string, tenantId: string): Promise<void> {
    const kitchenOrder = await this.kitchenOrderRepository.findById(kitchenOrderId, tenantId);
    if (!kitchenOrder) {
      throw new Error('Kitchen order not found');
    }

    const stations = await this.kitchenOrderRepository.findStations(tenantId, true);
    if (stations.length === 0) {
      return; // No stations available
    }

    // Find optimal station based on capacity and current load
    const optimalStation = this.findOptimalStation(stations, kitchenOrder);
    
    if (optimalStation) {
      await this.kitchenOrderRepository.updateStatus(
        kitchenOrderId,
        tenantId,
        KitchenOrderStatus.ASSIGNED,
        optimalStation.id
      );

      // Update station load
      await this.kitchenOrderRepository.updateStationLoad(
        optimalStation.id,
        tenantId,
        optimalStation.currentLoad + 1
      );
    }
  }

  async getStations(tenantId: string, active?: boolean): Promise<Station[]> {
    return this.kitchenOrderRepository.findStations(tenantId, active);
  }

  async createStation(stationData: Omit<Station, 'id' | 'createdAt' | 'updatedAt'>, tenantId: string): Promise<Station> {
    return this.kitchenOrderRepository.createStation({
      ...stationData,
      tenantId
    });
  }

  private findOptimalStation(stations: Station[], kitchenOrder: KitchenOrder): Station | null {
    // Filter stations that have capacity
    const availableStations = stations.filter(station => 
      station.currentLoad < station.capacity
    );

    if (availableStations.length === 0) {
      return null;
    }

    // Prioritize stations by type based on order items
    const preferredStationTypes = this.getPreferredStationTypes(kitchenOrder);
    
    // Find station with preferred type and lowest load
    for (const stationType of preferredStationTypes) {
      const stationsOfType = availableStations.filter(station => station.type === stationType);
      if (stationsOfType.length > 0) {
        return stationsOfType.reduce((optimal, current) => 
          current.currentLoad < optimal.currentLoad ? current : optimal
        );
      }
    }

    // Fallback to station with lowest load
    return availableStations.reduce((optimal, current) => 
      current.currentLoad < optimal.currentLoad ? current : optimal
    );
  }

  private getPreferredStationTypes(kitchenOrder: KitchenOrder): StationType[] {
    // This would typically analyze the items and their recipes to determine
    // the best station types. For now, return a default priority order.
    return [
      StationType.GRILL,
      StationType.FRYER,
      StationType.OVEN,
      StationType.ASSEMBLY,
      StationType.PREP,
      StationType.COLD
    ];
  }

  private async updateOrderStatusFromKitchen(kitchenOrder: KitchenOrder): Promise<void> {
    let orderStatus: OrderStatus;

    switch (kitchenOrder.status) {
      case KitchenOrderStatus.PREPARING:
        orderStatus = 'in_preparation';
        break;
      case KitchenOrderStatus.READY:
        orderStatus = 'ready';
        break;
      case KitchenOrderStatus.COMPLETED:
        orderStatus = 'delivering';
        break;
      case KitchenOrderStatus.FAILED:
        orderStatus = 'cancelled';
        break;
      default:
        return; // No order status update needed
    }

    await this.orderRepository.updateStatus(kitchenOrder.orderId, orderStatus, kitchenOrder.tenantId);
  }

  private async updateStationLoads(
    previousStation: string | undefined,
    newStation: string,
    tenantId: string
  ): Promise<void> {
    // Decrease load on previous station
    if (previousStation) {
      const stations = await this.kitchenOrderRepository.findStations(tenantId);
      const prevStation = stations.find(s => s.id === previousStation);
      if (prevStation && prevStation.currentLoad > 0) {
        await this.kitchenOrderRepository.updateStationLoad(
          previousStation,
          tenantId,
          prevStation.currentLoad - 1
        );
      }
    }

    // Increase load on new station
    const stations = await this.kitchenOrderRepository.findStations(tenantId);
    const station = stations.find(s => s.id === newStation);
    if (station) {
      await this.kitchenOrderRepository.updateStationLoad(
        newStation,
        tenantId,
        station.currentLoad + 1
      );
    }
  }

  private async checkAndUpdateOrderCompletion(kitchenOrder: KitchenOrder): Promise<void> {
    const allItemsCompleted = kitchenOrder.items.every(item => 
      item.status === KitchenItemStatus.COMPLETED
    );

    if (allItemsCompleted && kitchenOrder.status === KitchenOrderStatus.PREPARING) {
      await this.kitchenOrderRepository.updateStatus(
        kitchenOrder.id,
        kitchenOrder.tenantId,
        KitchenOrderStatus.READY
      );

      // Update corresponding order status
      await this.orderRepository.updateStatus(
        kitchenOrder.orderId,
        'ready',
        kitchenOrder.tenantId
      );
    }
  }

  private async trackIngredientConsumption(kitchenOrder: KitchenOrder): Promise<void> {
    // This would typically integrate with recipe management to track
    // actual ingredient consumption. For now, emit consumption events.
    for (const item of kitchenOrder.items) {
      await this.eventBus.publish(new IngredientConsumed({
        orderId: kitchenOrder.orderId,
        tenantId: kitchenOrder.tenantId,
        productId: item.productId,
        quantity: item.quantity,
        consumedAt: new Date()
      }));
    }
  }

  private calculateEstimatedTime(productId: string, quantity: number): number {
    // This would typically look up recipe preparation times
    // For now, return a default estimate based on quantity
    const baseTime = 15; // 15 minutes base time
    return Math.ceil(baseTime * Math.sqrt(quantity));
  }
}