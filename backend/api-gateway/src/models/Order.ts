import { z } from 'zod';

// Order Status enum
export const OrderStatusSchema = z.enum([
  'draft',
  'confirmed', 
  'in_preparation',
  'ready',
  'delivering',
  'delivered',
  'cancelled'
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

// Order Channel enum
export const OrderChannelSchema = z.enum([
  'whatsapp',
  'instagram', 
  'website',
  'site', // Legacy support
  'ifood',
  'uber_eats',
  'rappi'
]);
export type OrderChannel = z.infer<typeof OrderChannelSchema>;

// Payment Method enum
export const PaymentMethodSchema = z.enum([
  'pix',
  'credit',
  'debit', 
  'cash'
]);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

// Payment Status enum
export const PaymentStatusSchema = z.enum([
  'pending',
  'confirmed',
  'failed'
]);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

// Order Item Schema
export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
  extras: z.array(z.string()).default([]),
  modifications: z.array(z.string()).default([]),
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

// Customer Schema (embedded in order)
export const OrderCustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  address: z.string().min(1),
});
export type OrderCustomer = z.infer<typeof OrderCustomerSchema>;

// Payment Schema
export const PaymentSchema = z.object({
  method: PaymentMethodSchema,
  status: PaymentStatusSchema,
  amount: z.number().positive(),
  transactionId: z.string().optional(),
  paidAt: z.date().optional(),
});
export type Payment = z.infer<typeof PaymentSchema>;

// Delivery Schema
export const DeliverySchema = z.object({
  type: z.enum(['pickup', 'delivery']),
  address: z.string().optional(),
  fee: z.number().min(0).default(0),
  estimatedTime: z.number().int().positive().optional(), // minutes
  instructions: z.string().optional(),
});
export type Delivery = z.infer<typeof DeliverySchema>;

// Order Model
export const OrderSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  number: z.string().min(1),
  customerId: z.string().uuid().optional(),
  customer: OrderCustomerSchema,
  items: z.array(OrderItemSchema).min(1),
  status: OrderStatusSchema,
  channel: OrderChannelSchema,
  payment: PaymentSchema,
  delivery: DeliverySchema,
  subtotal: z.number().positive(),
  deliveryFee: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  total: z.number().positive(),
  notes: z.string().optional(),
  specialInstructions: z.string().optional(),
  estimatedDeliveryTime: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Order = z.infer<typeof OrderSchema>;

// Create Order Request Schema
export const CreateOrderSchema = z.object({
  customer: OrderCustomerSchema,
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    modifications: z.array(z.string()).default([]),
  })).min(1),
  channel: OrderChannelSchema,
  payment: z.object({
    method: PaymentMethodSchema,
  }),
  delivery: DeliverySchema,
  notes: z.string().optional(),
  specialInstructions: z.string().optional(),
});
export type CreateOrderRequest = z.infer<typeof CreateOrderSchema>;

// Update Order Status Schema
export const UpdateOrderStatusSchema = z.object({
  status: OrderStatusSchema,
  notes: z.string().optional(),
});
export type UpdateOrderStatusRequest = z.infer<typeof UpdateOrderStatusSchema>;

// Order Filters Schema
export const OrderFiltersSchema = z.object({
  status: OrderStatusSchema.optional(),
  channel: OrderChannelSchema.optional(),
  customerId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(), // customer name or order number
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});
export type OrderFilters = z.infer<typeof OrderFiltersSchema>;

// API Response Schemas
export const OrderResponseSchema = z.object({
  success: z.boolean(),
  data: OrderSchema.optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }).optional(),
});

export const OrderListResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    orders: z.array(OrderSchema),
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
    totalPages: z.number().int(),
  }).optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }).optional(),
});

export type OrderResponse = z.infer<typeof OrderResponseSchema>;
export type OrderListResponse = z.infer<typeof OrderListResponseSchema>;

// Domain Events
export const OrderCreatedEventSchema = z.object({
  eventType: z.literal('OrderCreated'),
  payload: z.object({
    orderId: z.string().uuid(),
    tenantId: z.string().uuid(),
    customerId: z.string().uuid().optional(),
    number: z.string(),
    items: z.array(OrderItemSchema),
    total: z.number(),
    channel: OrderChannelSchema,
    createdAt: z.date(),
  }),
});

export const OrderConfirmedEventSchema = z.object({
  eventType: z.literal('OrderConfirmed'),
  payload: z.object({
    orderId: z.string().uuid(),
    tenantId: z.string().uuid(),
    number: z.string(),
    confirmedAt: z.date(),
  }),
});

export const OrderStatusUpdatedEventSchema = z.object({
  eventType: z.literal('OrderStatusUpdated'),
  payload: z.object({
    orderId: z.string().uuid(),
    tenantId: z.string().uuid(),
    previousStatus: OrderStatusSchema,
    newStatus: OrderStatusSchema,
    updatedAt: z.date(),
  }),
});

export const OrderCancelledEventSchema = z.object({
  eventType: z.literal('OrderCancelled'),
  payload: z.object({
    orderId: z.string().uuid(),
    tenantId: z.string().uuid(),
    reason: z.string(),
    cancelledAt: z.date(),
  }),
});

export type OrderCreatedEvent = z.infer<typeof OrderCreatedEventSchema>;
export type OrderConfirmedEvent = z.infer<typeof OrderConfirmedEventSchema>;
export type OrderStatusUpdatedEvent = z.infer<typeof OrderStatusUpdatedEventSchema>;
export type OrderCancelledEvent = z.infer<typeof OrderCancelledEventSchema>;

// Order State Machine
export class OrderStateMachine {
  private static readonly validTransitions: Record<OrderStatus, OrderStatus[]> = {
    draft: ['confirmed', 'cancelled'],
    confirmed: ['in_preparation', 'cancelled'],
    in_preparation: ['ready', 'cancelled'],
    ready: ['delivering', 'delivered', 'cancelled'],
    delivering: ['delivered', 'cancelled'],
    delivered: [], // Terminal state
    cancelled: [], // Terminal state
  };

  static canTransition(from: OrderStatus, to: OrderStatus): boolean {
    return this.validTransitions[from]?.includes(to) ?? false;
  }

  static getValidTransitions(status: OrderStatus): OrderStatus[] {
    return this.validTransitions[status] ?? [];
  }

  static isTerminalState(status: OrderStatus): boolean {
    return ['delivered', 'cancelled'].includes(status);
  }

  static validateTransition(from: OrderStatus, to: OrderStatus): void {
    if (!this.canTransition(from, to)) {
      throw new Error(`Invalid status transition from ${from} to ${to}`);
    }
  }
}

// Order Number Generator
export class OrderNumberGenerator {
  static generate(tenantId: string): string {
    const timestamp = Date.now().toString().slice(-6);
    const tenantPrefix = tenantId.slice(-4).toUpperCase();
    return `#${tenantPrefix}${timestamp}`;
  }
}