/**
 * WebSocket Utility Functions
 * Requirements: 1.4, 4.2, 4.3
 */

import { v4 as uuidv4 } from 'uuid';
import { RetryConfig } from '../types';

/**
 * Generate unique message ID
 */
export function generateMessageId(): string {
  return uuidv4();
}

/**
 * Calculate retry delay with exponential backoff and jitter
 */
export function calculateRetryDelay(attempt: number, config: RetryConfig): number {
  const delay = Math.min(
    config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelay
  );

  if (config.jitter) {
    // Add random jitter (±25% of delay)
    const jitterRange = delay * 0.25;
    const jitter = (Math.random() - 0.5) * 2 * jitterRange;
    return Math.max(0, delay + jitter);
  }

  return delay;
}

/**
 * Create room name for tenant isolation
 */
export function createTenantRoom(tenantId: string): string {
  return `tenant:${tenantId}`;
}

/**
 * Create room name for application-specific communication
 */
export function createApplicationRoom(tenantId: string, applicationType: string): string {
  return `app:${tenantId}:${applicationType}`;
}

/**
 * Create room name for order-specific communication
 */
export function createOrderRoom(tenantId: string, orderId: string): string {
  return `order:${tenantId}:${orderId}`;
}

/**
 * Validate tenant ID format
 */
export function isValidTenantId(tenantId: string): boolean {
  return typeof tenantId === 'string' && tenantId.length > 0 && /^[a-zA-Z0-9-_]+$/.test(tenantId);
}

/**
 * Validate socket ID format
 */
export function isValidSocketId(socketId: string): boolean {
  return typeof socketId === 'string' && socketId.length > 0;
}

/**
 * Get current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Check if a timestamp is within a given time window
 */
export function isWithinTimeWindow(timestamp: Date, windowMs: number): boolean {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  return diff <= windowMs;
}