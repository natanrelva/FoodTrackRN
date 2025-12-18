/**
 * WebSocket Configuration
 * Requirements: 1.1, 2.4
 */

import { WebSocketConfig } from '../types';

export const defaultWebSocketConfig: WebSocketConfig = {
  port: parseInt(process.env.WEBSOCKET_PORT || '4001'),
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000', // Client App
      'http://localhost:3001', // Tenant Dashboard
      'http://localhost:3002', // Kitchen App
      'http://localhost:3003'  // Delivery App
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  heartbeat: {
    interval: 30000, // 30 seconds
    timeout: 10000,  // 10 seconds
    maxMissed: 3     // 3 missed heartbeats before disconnect
  },
  retry: {
    maxAttempts: 5,
    baseDelay: 1000,     // 1 second
    maxDelay: 30000,     // 30 seconds
    backoffMultiplier: 2,
    jitter: true
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    encryptionKey: process.env.WEBSOCKET_ENCRYPTION_KEY,
    rateLimiting: {
      windowMs: 60000,    // 1 minute
      maxRequests: 100    // 100 requests per minute per IP
    }
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0')
  }
};

export function createWebSocketConfig(overrides?: Partial<WebSocketConfig>): WebSocketConfig {
  return {
    ...defaultWebSocketConfig,
    ...overrides
  };
}