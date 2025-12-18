/**
 * Connection Management Interfaces
 * Requirements: 1.3, 4.1
 */

import { Socket } from 'socket.io';
import { ApplicationType, AuthenticatedUser, AuthResult } from './authentication';

export interface Connection {
  socketId: string;
  userId: string;
  tenantId: string;
  applicationType: ApplicationType;
  connectedAt: Date;
  lastHeartbeat: Date;
  isActive: boolean;
  metadata: ConnectionMetadata;
}

export interface ConnectionMetadata {
  userAgent: string;
  ipAddress: string;
  version: string;
  features: string[];
}

export interface ConnectionManager {
  authenticateConnection(socket: Socket, token: string): Promise<AuthResult>;
  registerConnection(socket: Socket, user: AuthenticatedUser): void;
  removeConnection(socketId: string): void;
  getConnectionsByTenant(tenantId: string): Connection[];
  getConnectionsByApplication(applicationType: ApplicationType, tenantId: string): Connection[];
  startHeartbeat(socket: Socket): void;
  stopHeartbeat(socketId: string): void;
  isConnectionActive(socketId: string): boolean;
  getConnectionCount(tenantId?: string): number;
}

export interface HeartbeatConfig {
  interval: number; // milliseconds
  timeout: number; // milliseconds
  maxMissed: number; // number of missed heartbeats before disconnect
}
