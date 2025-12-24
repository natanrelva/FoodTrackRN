import { DomainEvent } from '@foodtrack/types';

export class KitchenOrderCreated implements DomainEvent {
  id: string;
  eventType = 'KitchenOrderCreated' as const;
  eventVersion = 1;
  tenantId: string;
  aggregateId: string;
  aggregateType = 'KitchenOrder' as const;
  causationId?: string;
  correlationId?: string;
  occurredAt: Date;
  payload: {
    kitchenOrderId: string;
    orderId: string;
    contractId: string;
    priority: string;
    estimatedCompletionTime?: Date;
  };

  constructor(data: {
    kitchenOrderId: string;
    orderId: string;
    contractId: string;
    tenantId: string;
    priority: string;
    estimatedCompletionTime?: Date;
    causationId?: string;
    correlationId?: string;
  }) {
    this.id = crypto.randomUUID();
    this.tenantId = data.tenantId;
    this.aggregateId = data.kitchenOrderId;
    this.occurredAt = new Date();
    this.causationId = data.causationId;
    this.correlationId = data.correlationId;
    this.payload = {
      kitchenOrderId: data.kitchenOrderId,
      orderId: data.orderId,
      contractId: data.contractId,
      priority: data.priority,
      estimatedCompletionTime: data.estimatedCompletionTime
    };
  }
}

export class KitchenOrderStatusChanged implements DomainEvent {
  id: string;
  eventType = 'KitchenOrderStatusChanged' as const;
  eventVersion = 1;
  tenantId: string;
  aggregateId: string;
  aggregateType = 'KitchenOrder' as const;
  causationId?: string;
  correlationId?: string;
  occurredAt: Date;
  payload: {
    kitchenOrderId: string;
    orderId: string;
    previousStatus: string;
    newStatus: string;
    assignedStation?: string;
    estimatedCompletionTime?: Date;
  };

  constructor(data: {
    kitchenOrderId: string;
    orderId: string;
    tenantId: string;
    previousStatus: string;
    newStatus: string;
    assignedStation?: string;
    estimatedCompletionTime?: Date;
    causationId?: string;
    correlationId?: string;
  }) {
    this.id = crypto.randomUUID();
    this.tenantId = data.tenantId;
    this.aggregateId = data.kitchenOrderId;
    this.occurredAt = new Date();
    this.causationId = data.causationId;
    this.correlationId = data.correlationId;
    this.payload = {
      kitchenOrderId: data.kitchenOrderId,
      orderId: data.orderId,
      previousStatus: data.previousStatus,
      newStatus: data.newStatus,
      assignedStation: data.assignedStation,
      estimatedCompletionTime: data.estimatedCompletionTime
    };
  }
}

export class IngredientConsumed implements DomainEvent {
  id: string;
  eventType = 'IngredientConsumed' as const;
  eventVersion = 1;
  tenantId: string;
  aggregateId: string;
  aggregateType = 'KitchenOrder' as const;
  causationId?: string;
  correlationId?: string;
  occurredAt: Date;
  payload: {
    orderId: string;
    productId: string;
    quantity: number;
    consumedAt: Date;
  };

  constructor(data: {
    orderId: string;
    tenantId: string;
    productId: string;
    quantity: number;
    consumedAt: Date;
    causationId?: string;
    correlationId?: string;
  }) {
    this.id = crypto.randomUUID();
    this.tenantId = data.tenantId;
    this.aggregateId = data.orderId;
    this.occurredAt = new Date();
    this.causationId = data.causationId;
    this.correlationId = data.correlationId;
    this.payload = {
      orderId: data.orderId,
      productId: data.productId,
      quantity: data.quantity,
      consumedAt: data.consumedAt
    };
  }
}