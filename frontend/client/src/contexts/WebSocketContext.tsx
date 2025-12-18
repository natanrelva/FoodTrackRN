import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import type {
  OrderWebSocketEvent,
  ProductWebSocketEvent,
  WebSocketEvent,
  Order,
  Product
} from '@foodtrack/types';

interface WebSocketContextType {
  // Connection state
  connected: boolean;
  connecting: boolean;
  error: string | null;
  
  // Real-time data
  recentOrderUpdates: OrderWebSocketEvent[];
  productUpdates: ProductWebSocketEvent[];
  systemNotifications: WebSocketEvent[];
  
  // Actions
  connect: () => void;
  disconnect: () => void;
  clearNotifications: () => void;
  
  // Order tracking
  trackOrder: (orderId: string) => void;
  stopTrackingOrder: (orderId: string) => void;
  trackedOrders: Set<string>;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const webSocket = useWebSocket({ autoConnect: true });
  
  // Real-time data state
  const [recentOrderUpdates, setRecentOrderUpdates] = useState<OrderWebSocketEvent[]>([]);
  const [productUpdates, setProductUpdates] = useState<ProductWebSocketEvent[]>([]);
  const [systemNotifications, setSystemNotifications] = useState<WebSocketEvent[]>([]);
  const [trackedOrders, setTrackedOrders] = useState<Set<string>>(new Set());

  // Subscribe to WebSocket events
  useEffect(() => {
    if (!webSocket.connected) return;

    const unsubscribers: (() => void)[] = [];

    // Order events for real-time tracking
    unsubscribers.push(
      webSocket.subscribe('ORDER_CREATED', (event: OrderWebSocketEvent) => {
        console.log('📦 Order created:', event);
        setRecentOrderUpdates(prev => [event, ...prev.slice(0, 9)]); // Keep last 10 updates
      })
    );

    unsubscribers.push(
      webSocket.subscribe('ORDER_STATUS_CHANGED', (event: OrderWebSocketEvent) => {
        console.log('🔄 Order status changed:', event);
        setRecentOrderUpdates(prev => [event, ...prev.slice(0, 9)]);
        
        // Show notification for tracked orders
        if (trackedOrders.has(event.payload.order.id)) {
          showOrderNotification(event);
        }
      })
    );

    unsubscribers.push(
      webSocket.subscribe('ORDER_UPDATED', (event: OrderWebSocketEvent) => {
        console.log('📝 Order updated:', event);
        setRecentOrderUpdates(prev => [event, ...prev.slice(0, 9)]);
      })
    );

    unsubscribers.push(
      webSocket.subscribe('ORDER_CANCELLED', (event: OrderWebSocketEvent) => {
        console.log('❌ Order cancelled:', event);
        setRecentOrderUpdates(prev => [event, ...prev.slice(0, 9)]);
        
        if (trackedOrders.has(event.payload.order.id)) {
          showOrderNotification(event);
        }
      })
    );

    // Product events for catalog updates
    unsubscribers.push(
      webSocket.subscribe('PRODUCT_UPDATED', (event: ProductWebSocketEvent) => {
        console.log('🛍️ Product updated:', event);
        setProductUpdates(prev => [event, ...prev.slice(0, 19)]); // Keep last 20 updates
      })
    );

    unsubscribers.push(
      webSocket.subscribe('PRODUCT_AVAILABILITY_CHANGED', (event: ProductWebSocketEvent) => {
        console.log('📦 Product availability changed:', event);
        setProductUpdates(prev => [event, ...prev.slice(0, 19)]);
      })
    );

    // System events
    unsubscribers.push(
      webSocket.subscribe('SYSTEM_NOTIFICATION', (event: WebSocketEvent) => {
        console.log('📢 System notification:', event);
        setSystemNotifications(prev => [event, ...prev.slice(0, 9)]); // Keep last 10 notifications
        showSystemNotification(event);
      })
    );

    unsubscribers.push(
      webSocket.subscribe('SYSTEM_ALERT', (event: WebSocketEvent) => {
        console.log('🚨 System alert:', event);
        setSystemNotifications(prev => [event, ...prev.slice(0, 9)]);
        showSystemNotification(event);
      })
    );

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [webSocket, trackedOrders]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Helper function to show order notifications
  const showOrderNotification = (event: OrderWebSocketEvent) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const order = event.payload.order;
      const title = getOrderNotificationTitle(event.type);
      const body = `Order #${order.orderNumber || order.id.slice(0, 8)} - ${order.status}`;
      
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: `order-${order.id}`,
      });
    }
  };

  // Helper function to show system notifications
  const showSystemNotification = (event: WebSocketEvent) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const payload = event.payload as any;
      const title = event.type === 'SYSTEM_ALERT' ? '🚨 System Alert' : '📢 Notification';
      
      new Notification(title, {
        body: payload.message || 'System notification',
        icon: '/favicon.ico',
        tag: `system-${event.id}`,
      });
    }
  };

  // Helper function to get notification titles
  const getOrderNotificationTitle = (eventType: string): string => {
    switch (eventType) {
      case 'ORDER_CREATED':
        return '📦 Order Placed';
      case 'ORDER_STATUS_CHANGED':
        return '🔄 Order Update';
      case 'ORDER_UPDATED':
        return '📝 Order Modified';
      case 'ORDER_CANCELLED':
        return '❌ Order Cancelled';
      default:
        return '📦 Order Update';
    }
  };

  // Track specific order for notifications
  const trackOrder = (orderId: string) => {
    setTrackedOrders(prev => new Set([...prev, orderId]));
    
    // Join order-specific room for real-time updates
    webSocket.emit('join_order_room', { orderId });
  };

  // Stop tracking order
  const stopTrackingOrder = (orderId: string) => {
    setTrackedOrders(prev => {
      const newSet = new Set(prev);
      newSet.delete(orderId);
      return newSet;
    });
    
    // Leave order-specific room
    webSocket.emit('leave_order_room', { orderId });
  };

  // Clear notifications
  const clearNotifications = () => {
    setSystemNotifications([]);
  };

  const contextValue: WebSocketContextType = {
    // Connection state
    connected: webSocket.connected,
    connecting: webSocket.connecting,
    error: webSocket.error,
    
    // Real-time data
    recentOrderUpdates,
    productUpdates,
    systemNotifications,
    
    // Actions
    connect: webSocket.connect,
    disconnect: webSocket.disconnect,
    clearNotifications,
    
    // Order tracking
    trackOrder,
    stopTrackingOrder,
    trackedOrders,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}

export default WebSocketContext;