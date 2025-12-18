/**
 * WebSocket Server Interfaces
 * Requirements: 1.1, 1.2
 */

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  connections: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  lastError?: {
    message: string;
    timestamp: Date;
  };
}

export interface WebSocketServer {
  start(port: number): Promise<void>;
  stop(): Promise<void>;
  getConnectionCount(): number;
  getHealthStatus(): HealthStatus;
  isRunning(): boolean;
}