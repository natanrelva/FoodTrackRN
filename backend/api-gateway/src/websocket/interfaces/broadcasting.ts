/**
 * Event Broadcasting Interfaces
 * Requirements: 7.1, 7.2, 7.3
 */

import { ApplicationType } from './authentication';
import { WebSocketEvent } from './message';

export interface EventBroadcaster {
  broadcastToTenant(tenantId: string, event: WebSocketEvent): Promise<void>;
  broadcastToRoom(room: string, event: WebSocketEvent): Promise<void>;
  broadcastToSocket(socketId: string, event: WebSocketEvent): Promise<void>;
  broadcastToApplication(appType: ApplicationType, tenantId: string, event: WebSocketEvent): Promise<void>;
  broadcastToMultipleApplications(appTypes: ApplicationType[], tenantId: string, event: WebSocketEvent): Promise<void>;
}

export enum RoomType {
  TENANT = 'tenant',
  APPLICATION = 'application',
  ORDER = 'order',
  KITCHEN_STATION = 'kitchen_station',
  DELIVERY_ROUTE = 'delivery_route'
}

export interface Room {
  name: string;
  tenantId: string;
  type: RoomType;
  members: string[]; // socket IDs
  createdAt: Date;
  metadata: RoomMetadata;
}

export interface RoomMetadata {
  description?: string;
  maxMembers?: number;
  isPrivate?: boolean;
  tags?: string[];
}