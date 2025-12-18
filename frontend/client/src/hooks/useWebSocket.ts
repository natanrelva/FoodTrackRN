import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { 
  WebSocketEvent, 
  WebSocketEventType,
  OrderWebSocketEvent,
  ProductWebSocketEvent,
  SystemEventPayload 
} from '@foodtrack/types';

interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

interface WebSocketState {
  socket: Socket | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;
}

export interface ClientWebSocketEvents {
  // Order events for real-time tracking
  'ORDER_CREATED': (event: OrderWebSocketEvent) => void;
  'ORDER_STATUS_CHANGED': (event: OrderWebSocketEvent) => void;
  'ORDER_UPDATED': (event: OrderWebSocketEvent) => void;
  'ORDER_CANCELLED': (event: OrderWebSocketEvent) => void;
  
  // Product events for catalog updates
  'PRODUCT_UPDATED': (event: ProductWebSocketEvent) => void;
  'PRODUCT_AVAILABILITY_CHANGED': (event: ProductWebSocketEvent) => void;
  
  // System events
  'SYSTEM_NOTIFICATION': (event: WebSocketEvent) => void;
  'SYSTEM_ALERT': (event: WebSocketEvent) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = process.env.VITE_WEBSOCKET_URL || 'http://localhost:4000',
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 1000,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<WebSocketState>({
    socket: null,
    connected: false,
    connecting: false,
    error: null,
  });

  // Get authentication token from localStorage
  const getAuthToken = useCallback(() => {
    return localStorage.getItem('authToken');
  }, []);

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    setState(prev => ({ ...prev, connecting: true, error: null }));

    const token = getAuthToken();
    if (!token) {
      setState(prev => ({ 
        ...prev, 
        connecting: false, 
        error: 'No authentication token found' 
      }));
      return;
    }

    const socket = io(url, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: reconnectAttempts,
      reconnectionDelay: reconnectDelay,
    });

    socket.on('connect', () => {
      console.log('🔌 Connected to WebSocket server');
      socketRef.current = socket;
      setState(prev => ({ ...prev, socket, connected: true, connecting: false, error: null }));
      reconnectCountRef.current = 0;
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from WebSocket server:', reason);
      setState(prev => ({ ...prev, connected: false, connecting: false }));
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        attemptReconnect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 WebSocket connection error:', error);
      setState(prev => ({ 
        ...prev, 
        connecting: false, 
        error: error.message || 'Connection failed' 
      }));
      attemptReconnect();
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
        connecting: false, 
        error: 'Failed to reconnect after maximum attempts' 
      }));
    });

    socketRef.current = socket;
  }, [url, reconnectAttempts, reconnectDelay, getAuthToken]);

  // Attempt to reconnect with exponential backoff
  const attemptReconnect = useCallback(() => {
    if (reconnectCountRef.current >= reconnectAttempts) {
      console.error('🔌 Max reconnection attempts reached');
      return;
    }

    const delay = reconnectDelay * Math.pow(2, reconnectCountRef.current);
    reconnectCountRef.current++;

    console.log(`🔌 Attempting to reconnect in ${delay}ms (attempt ${reconnectCountRef.current})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
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

    setState(prev => ({ ...prev, socket: null, connected: false, connecting: false }));
  }, []);

  // Subscribe to WebSocket events
  const subscribe = useCallback(<T extends keyof ClientWebSocketEvents>(
    event: T,
    handler: ClientWebSocketEvents[T]
  ) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
      return () => {
        if (socketRef.current) {
          socketRef.current.off(event, handler);
        }
      };
    }
    return () => {};
  }, []);

  // Emit WebSocket events
  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
      return true;
    } else {
      console.warn('🔌 Cannot emit event: WebSocket not connected');
      return false;
    }
  }, []);

  // Auto-connect on mount
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
    ...state,
    connect,
    disconnect,
    subscribe,
    emit,
  };
}

export default useWebSocket;