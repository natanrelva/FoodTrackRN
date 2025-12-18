import { z } from 'zod';
import { 
  OrderStatusSchema, 
  OrderStatus,
  PaymentMethodSchema,
  PaymentMethod,
  PaymentStatusSchema,
  PaymentStatus,
  ChannelTypeSchema,
  ChannelType
} from './status';
import { CustomerAddressSchema, CustomerAddress } from './user';

// Order Item Extra Schema
export const OrderItemExtraSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  price: z.number().min(0),
});

export type OrderItemExtra = z.infer<typeof OrderItemExtraSchema>;

// Order Item Schema
export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  productId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  extras: z.array(OrderItemExtraSchema).default([]),
  modifications: z.array(z.string()).default([]),
  notes: z.string().optional(),
  preparationTime: z.number().int().positive().optional(),
});

export type OrderItem = z.infer<typeof OrderItemSchema>;

// Cart Item Schema (for client app)
export const CartItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  image: z.string().url().optional(),
  extras: z.array(OrderItemExtraSchema).default([]),
  modifications: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

export type CartItem = z.infer<typeof CartItemSchema>;

// Re-export CustomerAddress from user module
export { CustomerAddressSchema, CustomerAddress } from './user';

// Customer Info Schema (embedded in order)
export const CustomerInfoSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().min(1),
  address: CustomerAddressSchema.optional(),
});

export type CustomerInfo = z.infer<typeof CustomerInfoSchema>;

// Payment Info Schema
export const PaymentInfoSchema = z.object({
  method: PaymentMethodSchema,
  status: PaymentStatusSchema,
  amount: z.number().positive(),
  transactionId: z.string().optional(),
  paidAt: z.date().optional(),
});

export type PaymentInfo = z.infer<typeof PaymentInfoSchema>;

// Delivery Info Schema
export const DeliveryInfoSchema = z.object({
  type: z.enum(['pickup', 'delivery']),
  address: CustomerAddressSchema.optional(),
  fee: z.number().min(0).default(0),
  estimatedTime: z.number().int().positive().optional(),
  instructions: z.string().optional(),
  agentId: z.string().uuid().optional(),
});

export type DeliveryInfo = z.infer<typeof DeliveryInfoSchema>;

// Order Schema
export const OrderSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  number: z.string().min(1),
  customerId: z.string().uuid(),
  customer: CustomerInfoSchema,
  items: z.array(OrderItemSchema).min(1),
  status: OrderStatusSchema,
  channel: ChannelTypeSchema,
  payment: PaymentInfoSchema,
  delivery: DeliveryInfoSchema.optional(),
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

// Create Order Item Request Schema
export const CreateOrderItemRequestSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  extras: z.array(z.string().uuid()).default([]),
  modifications: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

export type CreateOrderItemRequest = z.infer<typeof CreateOrderItemRequestSchema>;

// Create Order Request Schema
export const CreateOrderRequestSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(CreateOrderItemRequestSchema).min(1),
  channel: ChannelTypeSchema,
  delivery: DeliveryInfoSchema.optional(),
  notes: z.string().optional(),
  couponCode: z.string().optional(),
});

export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;

// Update Order Status Request Schema
export const UpdateOrderStatusRequestSchema = z.object({
  status: OrderStatusSchema,
  notes: z.string().optional(),
});

export type UpdateOrderStatusRequest = z.infer<typeof UpdateOrderStatusRequestSchema>;

// Order Filters Schema
export const OrderFiltersSchema = z.object({
  status: z.array(OrderStatusSchema).optional(),
  channel: z.array(ChannelTypeSchema).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  customerId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type OrderFilters = z.infer<typeof OrderFiltersSchema>;

// Paginated Orders Schema
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

// Order Metrics Schema
export const OrderMetricsSchema = z.object({
  totalOrders: z.number().int().min(0),
  totalRevenue: z.number().min(0),
  averageTicket: z.number().min(0),
  delayedOrders: z.number().int().min(0),
  ordersByStatus: z.record(OrderStatusSchema, z.number().int().min(0)),
  ordersByChannel: z.record(ChannelTypeSchema, z.number().int().min(0)),
});

export type OrderMetrics = z.infer<typeof OrderMetricsSchema>;

// Notification Schema
export const NotificationSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  type: z.string(),
  message: z.string(),
  timestamp: z.date(),
  status: z.enum(['sent', 'failed', 'pending']),
});

export type Notification = z.infer<typeof NotificationSchema>;

// Transaction Schema
export const TransactionSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  tenantId: z.string().uuid(),
  date: z.date(),
  amount: z.number().positive(),
  method: PaymentMethodSchema,
  status: z.enum(['confirmed', 'pending', 'failed']),
  transactionId: z.string().optional(),
  createdAt: z.date(),
});

export type Transaction = z.infer<typeof TransactionSchema>;

// Order Validation Utilities
export class OrderValidationUtils {
  static validateOrder(data: unknown): { isValid: boolean; errors: string[] } {
    const result = OrderSchema.safeParse(data);
    return {
      isValid: result.success,
      errors: result.success ? [] : result.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`),
    };
  }

  static validateCreateOrderRequest(data: unknown): { isValid: boolean; errors: string[] } {
    const result = CreateOrderRequestSchema.safeParse(data);
    return {
      isValid: result.success,
      errors: result.success ? [] : result.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`),
    };
  }

  static validateOrderItems(items: unknown[]): { isValid: boolean; errors: string[] } {
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
        result.error.errors.forEach((e: any) => {
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
      delivered: [],
      cancelled: [],
    };

    return validTransitions[currentStatus]?.includes(newStatus) ?? false;
  }

  static validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): { isValid: boolean; errors: string[] } {
    const isValid = this.isValidStatusTransition(currentStatus, newStatus);
    return {
      isValid,
      errors: isValid ? [] : [`Invalid status transition from ${currentStatus} to ${newStatus}`],
    };
  }

  static calculateOrderTotal(items: OrderItem[], deliveryFee: number = 0, discount: number = 0): number {
    const subtotal = items.reduce((sum, item) => {
      const itemTotal = item.unitPrice * item.quantity;
      const extrasTotal = item.extras.reduce((extraSum: number, extra: any) => extraSum + extra.price, 0) * item.quantity;
      return sum + itemTotal + extrasTotal;
    }, 0);

    return Math.max(0, subtotal + deliveryFee - discount);
  }

  static isValidOrderStatus(status: string): status is OrderStatus {
    return OrderStatusSchema.safeParse(status).success;
  }

  static isValidPaymentMethod(method: string): method is PaymentMethod {
    return PaymentMethodSchema.safeParse(method).success;
  }

  static isValidChannelType(channel: string): channel is ChannelType {
    return ChannelTypeSchema.safeParse(channel).success;
  }
}

// Re-export constants from status module for convenience
export {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  CHANNEL_TYPE_LABELS
} from './status';