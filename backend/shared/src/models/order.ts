import { z } from 'zod';

// Order Item Extra Model
export const OrderItemExtraSchema = z.object({
  name: z.string().min(1),
  price: z.number().min(0),
});

export type OrderItemExtra = z.infer<typeof OrderItemExtraSchema>;

// Order Item Model
export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  extras: z.array(OrderItemExtraSchema).default([]),
  notes: z.string().optional(),
  preparationTime: z.number().int().positive().optional(), // minutes
});

export type OrderItem = z.infer<typeof OrderItemSchema>;

// Create Order Item Model (for requests)
export const CreateOrderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  extras: z.array(z.string()).default([]), // Extra names to be resolved to prices
  notes: z.string().optional(),
});

export type CreateOrderItem = z.infer<typeof CreateOrderItemSchema>;

// Address Model
export const AddressSchema = z.object({
  street: z.string().min(1),
  number: z.string().min(1),
  complement: z.string().optional(),
  neighborhood: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zipCode: z.string().min(1),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
});

export type Address = z.infer<typeof AddressSchema>;

// Payment Info Model
export const PaymentInfoSchema = z.object({
  method: z.enum(['pix', 'credit', 'debit', 'cash']),
  status: z.enum(['pending', 'confirmed', 'failed', 'refunded']),
  amount: z.number().positive(),
  transactionId: z.string().optional(),
  paidAt: z.date().optional(),
});

export type PaymentInfo = z.infer<typeof PaymentInfoSchema>;

// Delivery Info Model
export const DeliveryInfoSchema = z.object({
  type: z.enum(['pickup', 'delivery']),
  address: AddressSchema.optional(),
  fee: z.number().min(0).default(0),
  estimatedTime: z.number().int().positive().optional(), // minutes
  instructions: z.string().optional(),
});

export type DeliveryInfo = z.infer<typeof DeliveryInfoSchema>;

// Order Status enum
export const OrderStatusSchema = z.enum([
  'pending',      // Just created, awaiting confirmation
  'confirmed',    // Payment confirmed, order accepted
  'preparing',    // Kitchen is preparing the order
  'ready',        // Order ready for pickup/delivery
  'delivering',   // Out for delivery (delivery orders only)
  'delivered',    // Order completed successfully
  'cancelled'     // Order cancelled
]);

export type OrderStatus = z.infer<typeof OrderStatusSchema>;

// Channel Type enum
export const ChannelTypeSchema = z.enum([
  'whatsapp', 
  'instagram', 
  'website', 
  'ifood', 
  'uber_eats', 
  'rappi'
]);

export type ChannelType = z.infer<typeof ChannelTypeSchema>;

// Order Model
export const OrderSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  number: z.string().min(1),                    // Sequential number like #1001
  customerId: z.string().uuid(),
  customer: z.object({                          // Embedded customer data
    id: z.string().uuid(),
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().min(1),
  }).optional(),
  items: z.array(OrderItemSchema).min(1),
  status: OrderStatusSchema,
  channel: ChannelTypeSchema,
  payment: PaymentInfoSchema,
  delivery: DeliveryInfoSchema,
  subtotal: z.number().positive(),
  deliveryFee: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  total: z.number().positive(),
  notes: z.string().optional(),
  estimatedCompletionTime: z.date().optional(),
  actualCompletionTime: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Order = z.infer<typeof OrderSchema>;

// Create Order Request Model
export const CreateOrderRequestSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(CreateOrderItemSchema).min(1),
  channel: ChannelTypeSchema,
  delivery: DeliveryInfoSchema,
  notes: z.string().optional(),
  couponCode: z.string().optional(),
});

export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;

// Order Filters Model
export const OrderFiltersSchema = z.object({
  status: z.array(OrderStatusSchema).optional(),
  channel: z.array(ChannelTypeSchema).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  customerId: z.string().uuid().optional(),
  search: z.string().optional(),               // Search in customer name or order number
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type OrderFilters = z.infer<typeof OrderFiltersSchema>;

// Paginated Orders Model
export const PaginatedOrdersSchema = z.object({
  orders: z.array(OrderSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().min(0),
    pages: z.number().int().min(0),
  }),
});

export type PaginatedOrders = z.infer<typeof PaginatedOrdersSchema>;

// Order Metrics Model
export const OrderMetricsSchema = z.object({
  totalOrders: z.number().int().min(0),
  totalRevenue: z.number().min(0),
  averageTicket: z.number().min(0),
  delayedOrders: z.number().int().min(0),
  ordersByStatus: z.record(OrderStatusSchema, z.number().int().min(0)),
  ordersByChannel: z.record(ChannelTypeSchema, z.number().int().min(0)),
});

export type OrderMetrics = z.infer<typeof OrderMetricsSchema>;

// Order Totals Model (for calculations)
export const OrderTotalsSchema = z.object({
  subtotal: z.number().min(0),
  deliveryFee: z.number().min(0),
  discount: z.number().min(0),
  total: z.number().min(0),
});

export type OrderTotals = z.infer<typeof OrderTotalsSchema>;

// Validation Result Model
export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.string()).default([]),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// Type Guards
export const isValidOrderStatus = (status: string): status is OrderStatus => {
  return OrderStatusSchema.safeParse(status).success;
};

export const isValidChannelType = (channel: string): channel is ChannelType => {
  return ChannelTypeSchema.safeParse(channel).success;
};

export const isValidOrder = (data: unknown): data is Order => {
  return OrderSchema.safeParse(data).success;
};

export const isValidCreateOrderRequest = (data: unknown): data is CreateOrderRequest => {
  return CreateOrderRequestSchema.safeParse(data).success;
};

// Validation Utilities
export class OrderValidationUtils {
  static validateOrderStatus(status: string): ValidationResult {
    const result = OrderStatusSchema.safeParse(status);
    return {
      isValid: result.success,
      errors: result.success ? [] : result.error.errors.map(e => e.message),
    };
  }

  static validateChannelType(channel: string): ValidationResult {
    const result = ChannelTypeSchema.safeParse(channel);
    return {
      isValid: result.success,
      errors: result.success ? [] : result.error.errors.map(e => e.message),
    };
  }

  static validateCreateOrderRequest(data: unknown): ValidationResult {
    const result = CreateOrderRequestSchema.safeParse(data);
    return {
      isValid: result.success,
      errors: result.success ? [] : result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
    };
  }

  static validateOrderFilters(data: unknown): ValidationResult {
    const result = OrderFiltersSchema.safeParse(data);
    return {
      isValid: result.success,
      errors: result.success ? [] : result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
    };
  }

  static validateOrderItems(items: unknown[]): ValidationResult {
    const errors: string[] = [];
    
    if (!Array.isArray(items) || items.length === 0) {
      return {
        isValid: false,
        errors: ['Order must contain at least one item'],
      };
    }

    items.forEach((item, index) => {
      const result = OrderItemSchema.safeParse(item);
      if (!result.success) {
        result.error.errors.forEach(e => {
          errors.push(`Item ${index + 1} - ${e.path.join('.')}: ${e.message}`);
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static isValidStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['ready', 'cancelled'],
      ready: ['delivering', 'delivered', 'cancelled'],
      delivering: ['delivered', 'cancelled'],
      delivered: [], // Terminal state
      cancelled: [], // Terminal state
    };

    return validTransitions[currentStatus]?.includes(newStatus) ?? false;
  }

  static validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): ValidationResult {
    const isValid = this.isValidStatusTransition(currentStatus, newStatus);
    return {
      isValid,
      errors: isValid ? [] : [`Invalid status transition from ${currentStatus} to ${newStatus}`],
    };
  }
}

// Constants
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  delivering: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const CHANNEL_TYPE_LABELS: Record<ChannelType, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  website: 'Website',
  ifood: 'iFood',
  uber_eats: 'Uber Eats',
  rappi: 'Rappi',
};

export const PAYMENT_METHOD_LABELS = {
  pix: 'PIX',
  credit: 'Credit Card',
  debit: 'Debit Card',
  cash: 'Cash',
} as const;