/**
 * Message Interfaces for WebSocket Communication
 * Requirements: 2.2, 2.4, 2.5
 */

import { ApplicationType } from './authentication';

export enum EventType {
  // Order Events
  ORDER_CREATED = 'order:created',
  ORDER_UPDATED = 'order:updated',
  ORDER_STATUS_CHANGED = 'order:status_changed',
  ORDER_ASSIGNED = 'order:assigned',
  ORDER_CANCELLED = 'order:cancelled',
  
  // Kitchen Events
  KITCHEN_ORDER_RECEIVED = 'kitchen:order_received',
  KITCHEN_PREPARATION_STARTED = 'kitchen:preparation_started',
  KITCHEN_PREPARATION_COMPLETED = 'kitchen:preparation_completed',
  KITCHEN_NOTIFICATION = 'kitchen:notification',
  KITCHEN_STATION_ASSIGNMENT = 'kitchen:station_assignment',
  
  // Delivery Events
  DELIVERY_ASSIGNED = 'delivery:assigned',
  DELIVERY_PICKED_UP = 'delivery:picked_up',
  DELIVERY_IN_TRANSIT = 'delivery:in_transit',
  DELIVERY_COMPLETED = 'delivery:completed',
  DELIVERY_DELAYED = 'delivery:delayed',
  
  // Inventory Events
  INVENTORY_LOW_STOCK = 'inventory:low_stock',
  INVENTORY_USAGE_UPDATE = 'inventory:usage_update',
  
  // Notification Events
  NOTIFICATION_ALERT = 'notification:alert',
  NOTIFICATION_INFO = 'notification:info',
  NOTIFICATION_WARNING = 'notification:warning',
  
  // System Events
  CONNECTION_ESTABLISHED = 'system:connection_established',
  HEARTBEAT = 'system:heartbeat',
  ERROR = 'system:error',
  RECONNECTION_REQUIRED = 'system:reconnection_required'
}

export enum MessagePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface WebSocketMessage {
  id: string;
  type: EventType;
  tenantId: string;
  timestamp: Date;
  source: ApplicationType;
  target?: ApplicationType | ApplicationType[];
  payload: unknown;
  priority: MessagePriority;
  retryCount?: number;
  encrypted?: boolean;
}

export interface WebSocketEvent {
  type: EventType;
  payload: unknown;
  priority: MessagePriority;
  timestamp?: Date;
}

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
}