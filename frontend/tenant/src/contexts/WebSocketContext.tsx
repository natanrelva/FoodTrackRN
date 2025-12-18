import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import type {
  OrderWebSocketEvent,
  ProductWebSocketEvent,
  WebSocketEvent,
  Order,
  Product,
  MetricsEventPayload
} from '@foodtrack/types';

interface WebSocketContextType {
  // Connection state
  connected: boolean;
  connecting: boolean;
  error: string | null;
  
  // Real-time data
  recentOrders: OrderWebSocketEvent[];
  orderUpdates: OrderWebSocketEvent[];
  productUpdates: ProductWebSocketEvent[];
  kitchenUpdates: WebSocketEvent[];
  deliveryUpdates: WebSocketEvent[];
  realTimeMetrics: MetricsEventPayload | null;
  systemNotifications: WebSocketEvent[];
  
  // Actions
  connect: () => void;
  disconnect: () => void;
  clearNotifications: () => void;
  
  // Dashboard subscriptions
  subscribeToOrderUpdates: () => void;
  subscribeToMetrics: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const webSocket = useWebSocket({ autoConnect: true });
  
  // Real-time data state
  const [recentOrders, setRecentOrders] = useState<OrderWebSocketEvent[]>([]);
  const [orderUpdates, setOrderUpdates] = useState<OrderWebSocketEvent[]>([]);
  const [productUpdates, setProductUpdates] = useState<ProductWebSocketEvent[]>([]);
  const [kitchenUpdates, setKitchenUpdates] = useState<WebSocketEvent[]>([]);
  const [deliveryUpdates, setDeliveryUpdates] = useState<WebSocketEvent[]>([]);
  const [realTimeMetrics, setRealTimeMetrics] = useState<MetricsEventPayload | null>(null);
  const [systemNotifications, setSystemNotifications] = useState<WebSocketEvent[]>([]);

  // Subscribe to WebSocket events
  useEffect(() => {
    if (!webSocket.connected) return;

    const unsubscribers: (() => void)[] = [];

    // Order events for dashboard updates
    unsubscribers.push(
      webSocket.subscribe('ORDER_CREATED', (event: OrderWebSocketEvent) => {
        console.log('📦 New order created:', event);
        setRecentOrders(prev => [event, ...prev.slice(0, 19)]); // Keep last 20 orders
        setOrderUpdates(prev => [event, ...prev.slice(0, 49)]); // Keep last 50 updates
        
        // Show notification for new orders
        showOrderNotification(event, 'Nova ordem recebida!');
      })
    );

    unsubscribers.push(
      webSocket.subscribe('ORDER_STATUS_CHANGED', (event: OrderWebSocketEvent) => {
        console.log('🔄 Order status changed:', event);
        setOrderUpdates(prev => [event, ...prev.slice(0, 49)]);
      })
    );

    unsubscribers.push(
      webSocket.subscribe('ORDER_UPDATED', (event: OrderWebSocketEvent) => {
        console.log('📝 Order updated:', event);
        setOrderUpdates(prev => [event, ...prev.slice(0, 49)]);
      })
    );

    unsubscribers.push(
      webSocket.subscribe('ORDER_CANCELLED', (event: OrderWebSocketEvent) => {
        console.log('❌ Order cancelled:', event);
        setOrderUpdates(prev => [event, ...prev.slice(0, 49)]);
        
        showOrderNotification(event, 'Ordem cancelada');
      })
    );

    unsubscribers.push(
      webSocket.subscribe('ORDER_ASSIGNED', (event: OrderWebSocketEvent) => {
        console.log('👨‍🍳 Order assigned:', event);
        setOrderUpdates(prev => [event, ...prev.slice(0, 49)]);
      })
    );

    // Product events for catalog management
    unsubscribers.push(
      webSocket.subscribe('PRODUCT_CREATED', (event: ProductWebSocketEvent) => {
        console.log('🛍️ Product created:', event);
        setProductUpdates(prev => [event, ...prev.slice(0, 19)]);
      })
    );

    unsubscribers.push(
      webSocket.subscribe('PRODUCT_UPDATED', (event: ProductWebSocketEvent) => {
        console.log('🛍️ Product updated:', event);
        setProductUpdates(prev => [event, ...prev.slice(0, 19)]);
      })
    );

    unsubscribers.push(
      webSocket.subscribe('PRODUCT_DELETED', (event: ProductWebSocketEvent) => {
        console.log('🗑️ Product deleted:', event);
        setProductUpdates(prev => [event, ...prev.slice(0, 19)]);
      })
    );

    unsubscribers.push(
      webSocket.subscribe('PRODUCT_AVAILABILITY_CHANGED', (event: ProductWebSocketEvent) => {
        console.log('📦 Product availability changed:', event);
        setProductUpdates(prev => [event, ...prev.slice(0, 19)]);
      })
    );

    // Kitchen events for operational awareness
    unsubscribers.push(
      webSocket.subscribe('KITCHEN_ORDER_RECEIVED', (event: WebSocketEvent) => {
        console.log('👨‍🍳 Kitchen order received:', event);
        setKitchenUpdates(prev => [event, ...prev.slice(0, 19)]);
      })
    );

    unsubscribers.push(
      webSocket.subscribe('KITCHEN_ORDER_STARTED', (event: WebSocketEvent) => {
        console.log('👨‍🍳 Kitchen order started:', event);
        setKitchenUpdates(prev => [event, ...prev.slice(0, 19)]);
      })
    );

    unsubscribers.push(
      webSocket.subscribe('KITCHEN_ORDER_COMPLETED', (event: WebSocketEvent) => {
        console.log('✅ Kitchen order completed:', event);
        setKitchenUpdates(prev => [event, ...prev.slice(0, 19)]);
      })
    );

    // Delivery events for fulfillment tracking
    unsubscribers.push(
      webSocket.subscribe('DELIVERY_ASSIGNED', (event: WebSocketEvent) => {
        console.log('🚚 Delivery assigned:', event);
        setDeliveryUpdates(prev => [event, ...prev.slice(0, 19)]);
      })
    );

    unsubscribers.push(
      webSocket.subscribe('DELIVERY_STARTED', (event: WebSocketEvent) => {
        console.log('🚚 Delivery started:', event);
        setDeliveryUpdates(prev => [event, ...prev.slice(0, 19)]);
      })
    );

    unsubscribers.push(
      webSocket.subscribe('DELIVERY_COMPLETED', (event: WebSocketEvent) => {
        console.log('✅ Delivery completed:', event);
        setDeliveryUpdates(prev => [event, ...prev.slice(0, 19)]);
      })
    );

    // Real-time metrics
    unsubscribers.push(
      webSocket.subscribe('REAL_TIME_METRICS', (event: WebSocketEvent) => {
        console.log('📊 Real-time metrics update:', event);
        setRealTimeMetrics(event.payload as MetricsEventPayload);
      })
    );

    // System events
    unsubscribers.push(
      webSocket.subscribe('SYSTEM_NOTIFICATION', (event: WebSocketEvent) => {
        console.log('📢 System notification:', event);
        setSystemNotifications(prev => [event, ...prev.slice(0, 9)]);
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
  }, [webSocket]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Helper function to show order notifications
  const showOrderNotification = (event: OrderWebSocketEvent, title: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const order = event.payload.order;
      const body = `Pedido #${order.orderNumber || order.id.slice(0, 8)} - ${order.status}`;
      
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
      const title = event.type === 'SYSTEM_ALERT' ? '🚨 Alerta do Sistema' : '📢 Notificação';
      
      new Notification(title, {
        body: payload.message || 'Notificação do sistema',
        icon: '/favicon.ico',
        tag: `system-${event.id}`,
      });
    }
  };

  // Subscribe to order updates for dashboard
  const subscribeToOrderUpdates = () => {
    webSocket.emit('subscribe_to_orders');
  };

  // Subscribe to real-time metrics
  const subscribeToMetrics = () => {
    webSocket.emit('subscribe_to_metrics');
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
    recentOrders,
    orderUpdates,
    productUpdates,
    kitchenUpdates,
    deliveryUpdates,
    realTimeMetrics,
    systemNotifications,
    
    // Actions
    connect: webSocket.connect,
    disconnect: webSocket.disconnect,
    clearNotifications,
    
    // Dashboard subscriptions
    subscribeToOrderUpdates,
    subscribeToMetrics,
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