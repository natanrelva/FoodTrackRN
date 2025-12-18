/**
 * Message Routing Interfaces
 * Requirements: 1.2, 3.1, 3.2, 3.3, 3.4
 */

import { EventType, WebSocketMessage, ValidationResult } from './message';
import { ApplicationType } from './authentication';

export interface RoutingRule {
  eventType: EventType;
  sourceApplication: ApplicationType;
  targetApplications: ApplicationType[];
  requiresAuthentication: boolean;
  tenantIsolated: boolean;
  priority: number;
}

export interface RoutingResult {
  success: boolean;
  targetSockets: string[];
  errors?: string[];
}

export interface MessageRouter {
  routeMessage(message: WebSocketMessage): Promise<RoutingResult>;
  validateMessage(message: unknown): ValidationResult;
  getRoutingRules(eventType: EventType): RoutingRule[];
  addRoutingRule(rule: RoutingRule): void;
  removeRoutingRule(eventType: EventType, sourceApplication: ApplicationType): void;
}