/**
 * WebSocket Type Definitions
 * Requirements: 1.4, 4.2, 4.3
 */

export enum QueueStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

export interface QueuedMessage {
  id: string;
  message: import('../interfaces').WebSocketMessage;
  targetSocketId: string;
  queuedAt: Date;
  attempts: number;
  maxAttempts: number;
  nextRetryAt: Date;
  status: QueueStatus;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  jitter: boolean;
}

export interface WebSocketConfig {
  port: number;
  cors: {
    origin: string[];
    methods: string[];
    credentials: boolean;
  };
  heartbeat: {
    interval: number;
    timeout: number;
    maxMissed: number;
  };
  retry: RetryConfig;
  security: {
    jwtSecret: string;
    encryptionKey?: string;
    rateLimiting: {
      windowMs: number;
      maxRequests: number;
    };
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
}

export interface PerformanceMetrics {
  connectionsPerSecond: number;
  messagesPerSecond: number;
  averageLatency: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
}