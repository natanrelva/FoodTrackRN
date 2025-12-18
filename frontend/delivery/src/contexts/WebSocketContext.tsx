import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import type {
  OrderWebSocketEvent,
  DeliveryWebSocketEvent,
  WebSocketEvent
} from '@foodtrack/types';

interface WebSocketContextType {
  // Connection state
  connected: boolean;
  connecting: boolean;
  error: string | null;
  
  // Real-time data
  availableDeliveries: OrderWebSocketEvent[];
  assignedDeliveries: DeliveryWebSocketEvent[];
  deliveryUpdates: DeliveryWebSocketEvent[];
  completedDeliveries: DeliveryWebSocketEvent[];
  systemNotifications: WebSocketEvent[];
  
  // Actions
  connect: () => void;
  disconnect: () => void;
  clearNotifications: () => void;
  
  // Delivery actions
  acceptDelivery: (orderId: string) => void;
  startDelivery: (orderId: string) => void;
  updateLocation: (orderId: string, location: { lat: number; lng: number }) => void;
  completeDelivery: (orderId: string) => void;
  
  // Current delivery tracking
  currentDelivery: DeliveryWebSocketEvent | null;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const webSocket = useWebSocket({ autoConnect: true });
  
  // Real-time data state
  const [availableDeliveries, setAvailableDeliveries] = useState<OrderWebSocketEvent[]>([]);
  const [assignedDeliveries, setAssignedDeliveries] = useState<DeliveryWebSocketEvent[]>([]);
  const [deliveryUpdates, setDeliveryUpdates] = useState<DeliveryWebSocketEvent[]>([]);
  const [completedDeliveries, setCompletedDeliveries] = useState<DeliveryWebSocketEvent[]>([]);
  const [systemNotifications, setSystemNotifications] = useState<WebSocketEvent[]>([]);
  const [currentDelivery, setCurrentDelivery] = useState<DeliveryWebSocketEvent | null>(null);

  // Subscribe to WebSocket events
  useEffect(() => {
    if (!webSocket.connected) return;

    const unsubscribers: (() => void)[] = [];

    // Delivery-specific events
    unsubscribers.push(
      webSocket.subscribe('DELIVERY_ASSIGNED', (event: DeliveryWebSocketEvent) => {
        console.log('🚚 Delivery assigned:', event);
        setAssignedDeliveries(prev => [event, ...prev.slice(0, 19)]);
        setDeliveryUpdates(prev => [event, ...prev.slice(0, 49)]);
        
        // Set as current delivery if it's assigned to this agent
        const deliveryAgentId = localStorage.getItem('userId');
        if (event.payload.deliveryAgentId === deliveryAgentId) {
          setCurrentDelivery(event);
          showDeliveryNotification('Nova entrega atribuída!', event);
        }
      })
    );

    unsubscribers.push(
      webSocket.subscribe('DELIVERY_STARTED', (event: DeliveryWebSocketEvent) => {
        console.log('🚚 Delivery started:', event);
        setDeliveryUpdates(prev => [event, ...prev.slice(0, 49)]);
        
        // Update current delivery if it matches
        if (currentDelivery?.payload.orderId === event.payload.orderId) {
          setCurrentDelivery(event);
        }
      })
    );

    unsubscribers.push(
      webSocket.subscribe('DELIVERY_LOCATION_UPDATE', (event: DeliveryWebSocketEvent) => {
        console.log('📍 Delivery location updated:', event);
        setDeliveryUpdates(prev => [event, ...prev.slice(0, 49)]);
      })
    );

    unsubscribers.push(
      webSocket.subscribe('DELIVERY_COMPLETED', (event: DeliveryWebSocketEvent) => {
        console.log('✅ Delivery completed:', event);
        setCompletedDeliveries(prev => [event, ...prev.slice(0, 19)]);
        setDeliveryUpdates(prev => [event, ...prev.slice(0, 49)]);
        
        // Clear current delivery if it matches
        if (currentDelivery?.payload.orderId === event.payload.orderId) {
          setCurrentDelivery(null);
          showDeliveryNotification('Entrega concluída!', event);
        }
        
        // Remove from assigned deliveries
        setAssignedDeliveries(prev => 
          prev.filter(delivery => delivery.payload.orderId !== event.payload.orderId)
        );
      })
    );

    // Order events relevant to delivery
    unsubscribers.push(
      webSocket.subscribe('ORDER_CREATED', (event: OrderWebSocketEvent) => {
        console.log('📦 New order for potential delivery:', event);
        // Orders become available for delivery when they're ready
      })
    );

    unsubscribers.push(
      webSocket.subscribe('ORDER_STATUS_CHANGED', (event: OrderWebSocketEvent) => {
        console.log('🔄 Order status changed:', event);
        
        // If order is ready for delivery, add to available deliveries
        if (event.payload.order.status === 'ready') {
          setAvailableDeliveries(prev => [event, ...prev.slice(0, 19)]);
          showDeliveryNotification('Nova entrega disponível!', null);
        }
      })
    );

    unsubscribers.push(
      webSocket.subscribe('ORDER_CANCELLED', (event: OrderWebSocketEvent) => {
        console.log('❌ Order cancelled:', event);
        
        // Remove from available deliveries
        setAvailableDeliveries(prev => 
          prev.filter(delivery => delivery.payload.order.id !== event.payload.order.id)
        );
        
        // Remove from assigned deliveries and clear current if matches
        setAssignedDeliveries(prev => 
          prev.filter(delivery => delivery.payload.orderId !== event.payload.order.id)
        );
        
        if (currentDelivery?.payload.orderId === event.payload.order.id) {
          setCurrentDelivery(null);
          showDeliveryNotification('Entrega cancelada', null);
        }
      })
    );

    // Kitchen events for delivery coordination
    unsubscribers.push(
      webSocket.subscribe('KITCHEN_ORDER_COMPLETED', (event: WebSocketEvent) => {
        console.log('👨‍🍳 Kitchen order completed - ready for delivery:', event);
        // This could trigger adding the order to available deliveries
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
  }, [webSocket, currentDelivery]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Helper function to show delivery notifications
  const showDeliveryNotification = (title: string, event: DeliveryWebSocketEvent | null) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const body = event 
        ? `Pedido #${event.payload.orderId.slice(0, 8)}`
        : 'Verifique o painel de entregas';
      
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'delivery-notification',
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

  // Accept delivery assignment
  const acceptDelivery = (orderId: string) => {
    webSocket.emit('accept_delivery', { orderId });
  };

  // Start delivery
  const startDelivery = (orderId: string) => {
    webSocket.emit('start_delivery', { orderId });
  };

  // Update location during delivery
  const updateLocation = (orderId: string, location: { lat: number; lng: number }) => {
    webSocket.emit('update_delivery_location', { orderId, location });
  };

  // Complete delivery
  const completeDelivery = (orderId: string) => {
    webSocket.emit('complete_delivery', { orderId });
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
    availableDeliveries,
    assignedDeliveries,
    deliveryUpdates,
    completedDeliveries,
    systemNotifications,
    
    // Actions
    connect: webSocket.connect,
    disconnect: webSocket.disconnect,
    clearNotifications,
    
    // Delivery actions
    acceptDelivery,
    startDelivery,
    updateLocation,
    completeDelivery,
    
    // Current delivery tracking
    currentDelivery,
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