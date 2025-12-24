// Domain Events for Event-Driven Architecture

export interface DomainEvent {
  id: string;
  eventType: string;
  eventVersion: number;
  tenantId: string;
  aggregateId: string;
  aggregateType: string;
  causationId?: string;
  correlationId?: string;
  occurredAt: Date;
  payload: any;
}

// Order Events
export interface OrderCreatedEvent extends DomainEvent {
  eventType: 'OrderCreated';
  payload: {
    orderId: string;
    customerId?: string;
    items: any[];
    totalAmount: number;
  };
}

export interface OrderConfirmedEvent extends DomainEvent {
  eventType: 'OrderConfirmed';
  payload: {
    orderId: string;
    confirmedAt: Date;
  };
}

export interface OrderStatusUpdatedEvent extends DomainEvent {
  eventType: 'OrderStatusUpdated';
  payload: {
    orderId: string;
    previousStatus: string;
    newStatus: string;
    updatedAt: Date;
  };
}

// Production Contract Events
export interface ProductionContractCreatedEvent extends DomainEvent {
  eventType: 'ProductionContractCreated';
  payload: {
    contractId: string;
    orderId: string;
    contract: any;
  };
}

// Kitchen Events
export interface KitchenOrderCreatedEvent extends DomainEvent {
  eventType: 'KitchenOrderCreated';
  payload: {
    kitchenOrderId: string;
    contractId: string;
    assignedStation?: string;
  };
}

export interface PreparationStartedEvent extends DomainEvent {
  eventType: 'PreparationStarted';
  payload: {
    kitchenOrderId: string;
    contractId: string;
    startedAt: Date;
  };
}

export interface PreparationCompletedEvent extends DomainEvent {
  eventType: 'PreparationCompleted';
  payload: {
    kitchenOrderId: string;
    contractId: string;
    completedAt: Date;
  };
}

// Supply Events
export interface IngredientConsumedEvent extends DomainEvent {
  eventType: 'IngredientConsumed';
  payload: {
    ingredientId: string;
    quantity: number;
    orderId: string;
    consumedAt: Date;
  };
}

export interface StockUpdatedEvent extends DomainEvent {
  eventType: 'StockUpdated';
  payload: {
    itemId: string;
    previousQuantity: number;
    newQuantity: number;
    transactionType: string;
  };
}

// Delivery Events
export interface OrderDispatchedEvent extends DomainEvent {
  eventType: 'OrderDispatched';
  payload: {
    orderId: string;
    deliveryOrderId: string;
    agentId?: string;
    dispatchedAt: Date;
  };
}

export interface OrderDeliveredEvent extends DomainEvent {
  eventType: 'OrderDelivered';
  payload: {
    orderId: string;
    deliveryOrderId: string;
    deliveredAt: Date;
  };
}