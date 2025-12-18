import { z } from 'zod';

// Order Status Schema
export const OrderStatusSchema = z.enum([
  'pending',
  'confirmed', 
  'preparing',
  'ready',
  'delivering',
  'delivered',
  'cancelled'
]);

export type OrderStatus = z.infer<typeof OrderStatusSchema>;

// Legacy aliases for backward compatibility
export type AdminOrderStatus = OrderStatus;
export type WebOrderStatus = 'awaiting_payment' | 'paid' | 'processing' | 'in_delivery' | 'delivered';

// Payment Method Schema
export const PaymentMethodSchema = z.enum([
  'pix',
  'credit', 
  'debit',
  'cash'
]);

export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

// Payment Status Schema
export const PaymentStatusSchema = z.enum([
  'pending',
  'confirmed',
  'failed',
  'refunded'
]);

export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

// Transaction Status Schema
export const TransactionStatusSchema = z.enum([
  'confirmed',
  'pending', 
  'failed'
]);

export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;

// Notification Status Schema
export const NotificationStatusSchema = z.enum([
  'sent',
  'failed',
  'pending'
]);

export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;

// Channel Type Schema
export const ChannelTypeSchema = z.enum([
  'whatsapp',
  'instagram',
  'website',
  'ifood',
  'uber_eats',
  'rappi'
]);

export type ChannelType = z.infer<typeof ChannelTypeSchema>;

// Channel Status Schema
export const ChannelStatusSchema = z.enum([
  'connected',
  'disconnected',
  'error',
  'maintenance'
]);

export type ChannelStatus = z.infer<typeof ChannelStatusSchema>;

// User Status Schema
export const UserStatusSchema = z.enum([
  'online',
  'offline',
  'away',
  'busy'
]);

export type UserStatus = z.infer<typeof UserStatusSchema>;

// System Status Schema
export const SystemStatusSchema = z.enum([
  'operational',
  'degraded',
  'maintenance',
  'outage'
]);

export type SystemStatus = z.infer<typeof SystemStatusSchema>;

// Delivery Status Schema
export const DeliveryStatusSchema = z.enum([
  'pending',
  'assigned',
  'picked_up',
  'in_transit',
  'delivered',
  'failed'
]);

export type DeliveryStatus = z.infer<typeof DeliveryStatusSchema>;

// Kitchen Status Schema
export const KitchenStatusSchema = z.enum([
  'idle',
  'busy',
  'overloaded',
  'offline'
]);

export type KitchenStatus = z.infer<typeof KitchenStatusSchema>;

// Status Validation Utilities
export class StatusValidationUtils {
  static isValidOrderStatus(status: string): status is OrderStatus {
    return OrderStatusSchema.safeParse(status).success;
  }

  static isValidPaymentMethod(method: string): method is PaymentMethod {
    return PaymentMethodSchema.safeParse(method).success;
  }

  static isValidPaymentStatus(status: string): status is PaymentStatus {
    return PaymentStatusSchema.safeParse(status).success;
  }

  static isValidChannelType(channel: string): channel is ChannelType {
    return ChannelTypeSchema.safeParse(channel).success;
  }

  static isValidChannelStatus(status: string): status is ChannelStatus {
    return ChannelStatusSchema.safeParse(status).success;
  }

  static isValidUserStatus(status: string): status is UserStatus {
    return UserStatusSchema.safeParse(status).success;
  }

  static isValidDeliveryStatus(status: string): status is DeliveryStatus {
    return DeliveryStatusSchema.safeParse(status).success;
  }

  static isValidKitchenStatus(status: string): status is KitchenStatus {
    return KitchenStatusSchema.safeParse(status).success;
  }
}

// Status Labels
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  delivering: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'PIX',
  credit: 'Credit Card',
  debit: 'Debit Card',
  cash: 'Cash',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  failed: 'Failed',
  refunded: 'Refunded',
};

export const CHANNEL_TYPE_LABELS: Record<ChannelType, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  website: 'Website',
  ifood: 'iFood',
  uber_eats: 'Uber Eats',
  rappi: 'Rappi',
};

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'Pending Assignment',
  assigned: 'Assigned',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  failed: 'Failed',
};