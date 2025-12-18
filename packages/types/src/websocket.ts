import { z } from 'zod';
import { OrderSchema } from './order';
import { ProductSchema } from './product';
import { UserSchema } from './user';

// WebSocket Event Types
export const WebSocketEventTypeSchema = z.enum([
  // Order Events
  'ORDER_CREATED',
  'ORDER_UPDATED',
  'ORDER_STATUS_CHANGED',
  'ORDER_CANCELLED',
  'ORDER_ASSIGNED',
  
  // Product Events
  'PRODUCT_CREATED',
  'PRODUCT_UPDATED',
  'PRODUCT_DELETED',
  'PRODUCT_AVAILABILITY_CHANGED',
  
  // Kitchen Events
  'KITCHEN_ORDER_RECEIVED',
  'KITCHEN_ORDER_STARTED',
  'KITCHEN_ORDER_COMPLETED',
  'KITCHEN_STATION_UPDATE',
  
  // Delivery Events
  'DELIVERY_ASSIGNED',
  'DELIVERY_STARTED',
  'DELIVERY_LOCATION_UPDATE',
  'DELIVERY_COMPLETED',
  
  // User Events
  'USER_CONNECTED',
  'USER_DISCONNECTED',
  'USER_STATUS_CHANGED',
  
  // System Events
  'SYSTEM_NOTIFICATION',
  'SYSTEM_ALERT',
  'SYSTEM_MAINTENANCE',
  
  // Real-time Updates
  'REAL_TIME_METRICS',
  'INVENTORY_ALERT',
  'QUEUE_UPDATE'
]);

export type WebSocketEventType = z.infer<typeof WebSocketEventTypeSchema>;

// Base WebSocket Event Schema
export const BaseWebSocketEventSchema = z.object({
  id: z.string().uuid(),
  type: WebSocketEventTypeSchema,
  tenantId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  timestamp: z.date(),
  version: z.string().default('1.0'),
});

export type BaseWebSocketEvent = z.infer<typeof BaseWebSocketEventSchema>;

// Order Event Payloads
export const OrderEventPayloadSchema = z.object({
  order: OrderSchema,
  previousStatus: z.string().optional(),
  updatedFields: z.array(z.string()).optional(),
});

export type OrderEventPayload = z.infer<typeof OrderEventPayloadSchema>;

// Product Event Payloads
export const ProductEventPayloadSchema = z.object({
  product: ProductSchema,
  previousAvailability: z.boolean().optional(),
  updatedFields: z.array(z.string()).optional(),
});

export type ProductEventPayload = z.infer<typeof ProductEventPayloadSchema>;

// Kitchen Event Payloads
export const KitchenEventPayloadSchema = z.object({
  orderId: z.string().uuid(),
  stationId: z.string().uuid().optional(),
  estimatedCompletionTime: z.date().optional(),
  preparationProgress: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

export type KitchenEventPayload = z.infer<typeof KitchenEventPayloadSchema>;

// Delivery Event Payloads
export const DeliveryEventPayloadSchema = z.object({
  orderId: z.string().uuid(),
  deliveryAgentId: z.string().uuid().optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
  estimatedArrival: z.date().optional(),
  status: z.string(),
});

export type DeliveryEventPayload = z.infer<typeof DeliveryEventPayloadSchema>;

// User Event Payloads
export const UserEventPayloadSchema = z.object({
  user: UserSchema,
  connectionId: z.string().optional(),
  lastSeen: z.date().optional(),
});

export type UserEventPayload = z.infer<typeof UserEventPayloadSchema>;

// System Event Payloads
export const SystemEventPayloadSchema = z.object({
  message: z.string(),
  severity: z.enum(['info', 'warning', 'error', 'critical']),
  category: z.string(),
  metadata: z.record(z.any()).optional(),
});

export type SystemEventPayload = z.infer<typeof SystemEventPayloadSchema>;

// Real-time Metrics Payload
export const MetricsEventPayloadSchema = z.object({
  activeOrders: z.number().int().min(0),
  pendingOrders: z.number().int().min(0),
  completedOrdersToday: z.number().int().min(0),
  totalRevenueToday: z.number().min(0),
  averagePreparationTime: z.number().min(0),
  activeUsers: z.number().int().min(0),
});

export type MetricsEventPayload = z.infer<typeof MetricsEventPayloadSchema>;

// Generic WebSocket Event Schema
export const WebSocketEventSchema = BaseWebSocketEventSchema.extend({
  payload: z.union([
    OrderEventPayloadSchema,
    ProductEventPayloadSchema,
    KitchenEventPayloadSchema,
    DeliveryEventPayloadSchema,
    UserEventPayloadSchema,
    SystemEventPayloadSchema,
    MetricsEventPayloadSchema,
    z.record(z.any()), // Fallback for custom payloads
  ]),
});

export type WebSocketEvent = z.infer<typeof WebSocketEventSchema>;

// Specific Event Schemas
export const OrderWebSocketEventSchema = BaseWebSocketEventSchema.extend({
  payload: OrderEventPayloadSchema,
});

export type OrderWebSocketEvent = z.infer<typeof OrderWebSocketEventSchema>;

export const ProductWebSocketEventSchema = BaseWebSocketEventSchema.extend({
  payload: ProductEventPayloadSchema,
});

export type ProductWebSocketEvent = z.infer<typeof ProductWebSocketEventSchema>;

export const KitchenWebSocketEventSchema = BaseWebSocketEventSchema.extend({
  payload: KitchenEventPayloadSchema,
});

export type KitchenWebSocketEvent = z.infer<typeof KitchenWebSocketEventSchema>;

export const DeliveryWebSocketEventSchema = BaseWebSocketEventSchema.extend({
  payload: DeliveryEventPayloadSchema,
});

export type DeliveryWebSocketEvent = z.infer<typeof DeliveryWebSocketEventSchema>;

// WebSocket Connection Schema
export const WebSocketConnectionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  userRole: z.string(),
  connectedAt: z.date(),
  lastActivity: z.date(),
  isActive: z.boolean().default(true),
  metadata: z.record(z.any()).optional(),
});

export type WebSocketConnection = z.infer<typeof WebSocketConnectionSchema>;

// WebSocket Room Schema
export const WebSocketRoomSchema = z.object({
  id: z.string(),
  tenantId: z.string().uuid(),
  type: z.enum(['tenant', 'kitchen', 'delivery', 'admin']),
  connections: z.array(z.string().uuid()),
  createdAt: z.date(),
});

export type WebSocketRoom = z.infer<typeof WebSocketRoomSchema>;

// WebSocket Message Schema (for client-server communication)
export const WebSocketMessageSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['subscribe', 'unsubscribe', 'ping', 'pong', 'event', 'ack', 'error']),
  eventType: WebSocketEventTypeSchema.optional(),
  payload: z.any().optional(),
  timestamp: z.date(),
  correlationId: z.string().uuid().optional(),
});

export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;

// WebSocket Error Schema
export const WebSocketErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.any()).optional(),
  timestamp: z.date(),
  correlationId: z.string().uuid().optional(),
});

export type WebSocketError = z.infer<typeof WebSocketErrorSchema>;

// WebSocket Validation Utilities
export class WebSocketValidationUtils {
  static validateEvent(data: unknown): { isValid: boolean; errors: string[] } {
    const result = WebSocketEventSchema.safeParse(data);
    return {
      isValid: result.success,
      errors: result.success ? [] : result.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`),
    };
  }

  static validateMessage(data: unknown): { isValid: boolean; errors: string[] } {
    const result = WebSocketMessageSchema.safeParse(data);
    return {
      isValid: result.success,
      errors: result.success ? [] : result.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`),
    };
  }

  static validateConnection(data: unknown): { isValid: boolean; errors: string[] } {
    const result = WebSocketConnectionSchema.safeParse(data);
    return {
      isValid: result.success,
      errors: result.success ? [] : result.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`),
    };
  }

  static isValidEventType(type: string): type is WebSocketEventType {
    return WebSocketEventTypeSchema.safeParse(type).success;
  }

  static createEvent(
    type: WebSocketEventType,
    tenantId: string,
    payload: any,
    userId?: string
  ): WebSocketEvent {
    return {
      id: crypto.randomUUID(),
      type,
      tenantId,
      userId,
      payload,
      timestamp: new Date(),
      version: '1.0',
    };
  }

  static createOrderEvent(
    type: WebSocketEventType,
    tenantId: string,
    payload: OrderEventPayload,
    userId?: string
  ): OrderWebSocketEvent {
    return {
      id: crypto.randomUUID(),
      type,
      tenantId,
      userId,
      payload,
      timestamp: new Date(),
      version: '1.0',
    };
  }
}

// Constants
export const WEBSOCKET_EVENT_LABELS: Record<WebSocketEventType, string> = {
  ORDER_CREATED: 'Order Created',
  ORDER_UPDATED: 'Order Updated',
  ORDER_STATUS_CHANGED: 'Order Status Changed',
  ORDER_CANCELLED: 'Order Cancelled',
  ORDER_ASSIGNED: 'Order Assigned',
  PRODUCT_CREATED: 'Product Created',
  PRODUCT_UPDATED: 'Product Updated',
  PRODUCT_DELETED: 'Product Deleted',
  PRODUCT_AVAILABILITY_CHANGED: 'Product Availability Changed',
  KITCHEN_ORDER_RECEIVED: 'Kitchen Order Received',
  KITCHEN_ORDER_STARTED: 'Kitchen Order Started',
  KITCHEN_ORDER_COMPLETED: 'Kitchen Order Completed',
  KITCHEN_STATION_UPDATE: 'Kitchen Station Update',
  DELIVERY_ASSIGNED: 'Delivery Assigned',
  DELIVERY_STARTED: 'Delivery Started',
  DELIVERY_LOCATION_UPDATE: 'Delivery Location Update',
  DELIVERY_COMPLETED: 'Delivery Completed',
  USER_CONNECTED: 'User Connected',
  USER_DISCONNECTED: 'User Disconnected',
  USER_STATUS_CHANGED: 'User Status Changed',
  SYSTEM_NOTIFICATION: 'System Notification',
  SYSTEM_ALERT: 'System Alert',
  SYSTEM_MAINTENANCE: 'System Maintenance',
  REAL_TIME_METRICS: 'Real-time Metrics',
  INVENTORY_ALERT: 'Inventory Alert',
  QUEUE_UPDATE: 'Queue Update',
};

export const WEBSOCKET_ROOM_TYPES = {
  TENANT: 'tenant',
  KITCHEN: 'kitchen', 
  DELIVERY: 'delivery',
  ADMIN: 'admin',
} as const;

export const WEBSOCKET_MESSAGE_TYPES = {
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  PING: 'ping',
  PONG: 'pong',
  EVENT: 'event',
  ACK: 'ack',
  ERROR: 'error',
} as const;