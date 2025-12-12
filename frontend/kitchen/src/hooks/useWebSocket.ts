import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// WebSocket event types
export interface KitchenWebSocketEvents {
  // Incoming events (server to client)
  'order:new': (data: NewOrderData) => void;
  'order:modified': (data: OrderModification) => void;
  'order:status-update': (data: OrderStatusUpdate) => void;
  'inventory:low-stock': (data: LowStockAlert) => void;
  'inventory:usage-update': (data: InventoryUsage) => void;
  'station:assignment': (data: StationAssignment) => void;
  'station:help-request': (data: HelpRequest) => void;
  'quality:issue-reported': (data: QualityIssueReport) => void;
}

export interface NewOrderData {
  orderId: string;
  tenantId: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    specialInstructions?: string;
    allergens?: string[];
  }>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedCompletionTime: string;
  customerInfo?: {
    name?: string;
    phone?: string;
  };
}

export interface OrderModification {
  orderId: string;
  tenantId: string;
  changes: {
    items?: Array<{ id: string; action: 'add' | 'remove' | 'modify'; details: any }>;
    specialInstructions?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  };
  reason: string;
}

export interface OrderStatusUpdate {
  orderId: string;
  tenantId: string;
  status: string;
  stationId?: string;
  timestamp: string;
  estimatedCompletionTime?: string;
}

export interface LowStockAlert {
  tenantId: string;
  ingredientId: string;
  ingredientName: string;
  currentStock: number;
  minimumStock: number;
  unit: string;
  severity: 'warning' | 'critical';
}

export interface InventoryUsage {
  tenantId: string;
  ingredientId: string;
  ingredientName: string;
  quantityUsed: number;
  remainingStock: number;
  unit: string;
  orderId: string;
  timestamp: string;
}

export interface StationAssignment {
  tenantId: string;
  orderId: string;
  stationId: string;
  stationName: string;
  assignedItems: string[];
  estimatedTime: number;
  priority: number;
}

export interface HelpRequest {
  tenantId: string;
  stationId: string;
  stationName: string;
  helpType: 'technical' | 'ingredient' | 'quality' | 'general';
  message?: string;
  requestedBy: string;
  timestamp: string;
  status: 'pending' | 'acknowledged' | 'resolved';
}

export interface QualityIssueReport {
  tenantId: string;
  orderId: string;
  stationId: string;
  issue: string;
  severity: 'minor' | 'major' | 'critical';
  reportedBy: string;
  timestamp: string;
  requiresRemake: boolean;
}

interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastMessage: any;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 1000,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
    lastMessage: null,
  });

  const [eventHandlers] = useState<Map<string, Set<Function>>>(new Map());

  // Get auth token from localStorage
  const getAuthToken = useCallback(() => {
    return localStorage.getItem('authToken');
  }, []);

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setState(prev => ({ ...prev, error: 'No authentication token available' }));
      return;
    }

    setState(prev => ({ ...prev, connecting: true, error: null }));

    const socket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000', {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: reconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('🔌 Connected to kitchen WebSocket server');
      setState(prev => ({ ...prev, connected: true, connecting: false, error: null }));
      reconnectCountRef.current = 0;
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from kitchen WebSocket server:', reason);
      setState(prev => ({ ...prev, connected: false, connecting: false }));
      
      // Auto-reconnect if not manually disconnected
      if (reason !== 'io client disconnect' && reconnectCountRef.current < reconnectAttempts) {
        scheduleReconnect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 WebSocket connection error:', error);
      setState(prev => ({ 
        ...prev, 
        connected: false, 
        connecting: false, 
        error: error.message 
      }));
      
      if (reconnectCountRef.current < reconnectAttempts) {
        scheduleReconnect();
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`🔌 Reconnected to WebSocket server after ${attemptNumber} attempts`);
      setState(prev => ({ ...prev, connected: true, connecting: false, error: null }));
    });

    socket.on('reconnect_error', (error) => {
      console.error('🔌 WebSocket reconnection error:', error);
    });

    socket.on('reconnect_failed', () => {
      console.error('🔌 WebSocket reconnection failed after max attempts');
      setState(prev => ({ 
        ...prev, 
        connected: false, 
        connecting: false, 
        error: 'Failed to reconnect after maximum attempts' 
      }));
    });

    // Set up event listeners for all registered handlers
    eventHandlers.forEach((handlers, eventName) => {
      handlers.forEach(handler => {
        socket.on(eventName, handler as any);
      });
    });

    socketRef.current = socket;
  }, [getAuthToken, reconnectAttempts, eventHandlers]);

  // Schedule reconnection
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectCountRef.current++;
    const delay = reconnectDelay * Math.pow(2, reconnectCountRef.current - 1); // Exponential backoff

    console.log(`🔌 Scheduling reconnect attempt ${reconnectCountRef.current}/${reconnectAttempts} in ${delay}ms`);

    reconnectTimeoutRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, connecting: true }));
      connect();
    }, delay);
  }, [connect, reconnectAttempts, reconnectDelay]);

  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setState(prev => ({ ...prev, connected: false, connecting: false }));
  }, []);

  // Subscribe to WebSocket events
  const subscribe = useCallback((
    event: string,
    handler: (data: any) => void
  ) => {
    if (!eventHandlers.has(event)) {
      eventHandlers.set(event, new Set());
    }
    
    eventHandlers.get(event)!.add(handler);

    // If socket is already connected, add the listener immediately
    if (socketRef.current?.connected) {
      socketRef.current.on(event, handler);
    }

    // Return unsubscribe function
    return () => {
      const handlers = eventHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          eventHandlers.delete(event);
        }
      }

      if (socketRef.current) {
        socketRef.current.off(event, handler);
      }
    };
  }, [eventHandlers]);

  // Emit events to server
  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
      return true;
    } else {
      console.warn('🔌 Cannot emit event: WebSocket not connected');
      return false;
    }
  }, []);

  // Update order status
  const updateOrderStatus = useCallback((orderId: string, status: string, stationId?: string) => {
    return emit('order:update-status', { orderId, status, stationId });
  }, [emit]);

  // Update inventory usage
  const updateInventoryUsage = useCallback((ingredientId: string, quantity: number, orderId: string) => {
    return emit('inventory:update-usage', { ingredientId, quantity, orderId });
  }, [emit]);

  // Request help from station
  const requestHelp = useCallback((stationId: string, helpType: string, message?: string) => {
    return emit('station:request-help', { stationId, helpType, message });
  }, [emit]);

  // Report quality issue
  const reportQualityIssue = useCallback((orderId: string, issue: string, severity: string) => {
    return emit('quality:report-issue', { orderId, issue, severity });
  }, [emit]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Connection state
    connected: state.connected,
    connecting: state.connecting,
    error: state.error,
    
    // Connection methods
    connect,
    disconnect,
    
    // Event methods
    subscribe,
    emit,
    
    // Kitchen-specific methods
    updateOrderStatus,
    updateInventoryUsage,
    requestHelp,
    reportQualityIssue,
  };
}

export default useWebSocket;