import { z } from 'zod';
import { TenantEntity } from '@foodtrack/backend-shared';

// Kitchen Order Status enum
export enum KitchenOrderStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  PREPARING = 'preparing',
  READY = 'ready',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Kitchen Priority enum
export enum KitchenPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

// Kitchen Item Status enum
export enum KitchenItemStatus {
  PENDING = 'pending',
  PREPARING = 'preparing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Station Type enum
export enum StationType {
  GRILL = 'grill',
  FRYER = 'fryer',
  ASSEMBLY = 'assembly',
  COLD = 'cold',
  OVEN = 'oven',
  PREP = 'prep'
}

// Zod schemas for validation
export const KitchenOrderItemSchema = z.object({
  id: z.string().uuid(),
  productionItemId: z.string().uuid(),
  productId: z.string().uuid(),
  recipeId: z.string().uuid().optional(),
  quantity: z.number().int().positive(),
  modifications: z.array(z.string()).optional(),
  status: z.nativeEnum(KitchenItemStatus),
  estimatedTime: z.number().int().positive().optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional()
});

export const KitchenOrderSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  contractId: z.string().uuid(),
  orderId: z.string().uuid(),
  items: z.array(KitchenOrderItemSchema),
  priority: z.nativeEnum(KitchenPriority),
  assignedStation: z.string().optional(),
  status: z.nativeEnum(KitchenOrderStatus),
  estimatedCompletionTime: z.date().optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const StationSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: z.nativeEnum(StationType),
  capacity: z.number().int().positive(),
  currentLoad: z.number().int().min(0),
  active: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date()
});

// TypeScript interfaces
export interface KitchenOrderItem {
  id: string;
  productionItemId: string;
  productId: string;
  recipeId?: string;
  quantity: number;
  modifications?: string[];
  status: KitchenItemStatus;
  estimatedTime?: number;
  startedAt?: Date;
  completedAt?: Date;
}

export interface KitchenOrder extends TenantEntity {
  contractId: string;
  orderId: string;
  items: KitchenOrderItem[];
  priority: KitchenPriority;
  assignedStation?: string;
  status: KitchenOrderStatus;
  estimatedCompletionTime?: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface Station extends TenantEntity {
  name: string;
  type: StationType;
  capacity: number;
  currentLoad: number;
  active: boolean;
}

// Kitchen Order State Machine
export class KitchenOrderStateMachine {
  private static readonly validTransitions: Record<KitchenOrderStatus, KitchenOrderStatus[]> = {
    [KitchenOrderStatus.PENDING]: [KitchenOrderStatus.ASSIGNED, KitchenOrderStatus.FAILED],
    [KitchenOrderStatus.ASSIGNED]: [KitchenOrderStatus.PREPARING, KitchenOrderStatus.FAILED],
    [KitchenOrderStatus.PREPARING]: [KitchenOrderStatus.READY, KitchenOrderStatus.FAILED],
    [KitchenOrderStatus.READY]: [KitchenOrderStatus.COMPLETED],
    [KitchenOrderStatus.COMPLETED]: [],
    [KitchenOrderStatus.FAILED]: [KitchenOrderStatus.PENDING] // Allow retry
  };

  static isValidTransition(from: KitchenOrderStatus, to: KitchenOrderStatus): boolean {
    return this.validTransitions[from]?.includes(to) ?? false;
  }

  static getValidTransitions(status: KitchenOrderStatus): KitchenOrderStatus[] {
    return this.validTransitions[status] ?? [];
  }

  static validateTransition(from: KitchenOrderStatus, to: KitchenOrderStatus): void {
    if (!this.isValidTransition(from, to)) {
      throw new Error(`Invalid kitchen order status transition from ${from} to ${to}`);
    }
  }
}

// Kitchen Order Factory
export class KitchenOrderFactory {
  static createFromProductionContract(
    contractId: string,
    orderId: string,
    tenantId: string,
    items: Array<{
      productionItemId: string;
      productId: string;
      recipeId?: string;
      quantity: number;
      modifications?: string[];
      estimatedTime?: number;
    }>,
    priority: KitchenPriority = KitchenPriority.NORMAL
  ): Omit<KitchenOrder, 'id' | 'createdAt' | 'updatedAt'> {
    const now = new Date();
    
    const kitchenItems: KitchenOrderItem[] = items.map(item => ({
      id: crypto.randomUUID(),
      productionItemId: item.productionItemId,
      productId: item.productId,
      recipeId: item.recipeId,
      quantity: item.quantity,
      modifications: item.modifications,
      status: KitchenItemStatus.PENDING,
      estimatedTime: item.estimatedTime
    }));

    // Calculate estimated completion time based on items
    const totalEstimatedTime = kitchenItems.reduce((total, item) => {
      return total + (item.estimatedTime || 15) * item.quantity;
    }, 0);

    const estimatedCompletionTime = new Date(now.getTime() + totalEstimatedTime * 60000);

    return {
      tenantId,
      contractId,
      orderId,
      items: kitchenItems,
      priority,
      status: KitchenOrderStatus.PENDING,
      estimatedCompletionTime
    };
  }
}

// Request/Response schemas for API
export const CreateKitchenOrderRequestSchema = z.object({
  contractId: z.string().uuid(),
  orderId: z.string().uuid(),
  items: z.array(z.object({
    productionItemId: z.string().uuid(),
    productId: z.string().uuid(),
    recipeId: z.string().uuid().optional(),
    quantity: z.number().int().positive(),
    modifications: z.array(z.string()).optional(),
    estimatedTime: z.number().int().positive().optional()
  })),
  priority: z.nativeEnum(KitchenPriority).optional()
});

export const UpdateKitchenOrderStatusRequestSchema = z.object({
  status: z.nativeEnum(KitchenOrderStatus),
  assignedStation: z.string().optional(),
  estimatedCompletionTime: z.date().optional()
});

export const UpdateKitchenOrderItemStatusRequestSchema = z.object({
  itemId: z.string().uuid(),
  status: z.nativeEnum(KitchenItemStatus)
});

export type CreateKitchenOrderRequest = z.infer<typeof CreateKitchenOrderRequestSchema>;
export type UpdateKitchenOrderStatusRequest = z.infer<typeof UpdateKitchenOrderStatusRequestSchema>;
export type UpdateKitchenOrderItemStatusRequest = z.infer<typeof UpdateKitchenOrderItemStatusRequestSchema>;