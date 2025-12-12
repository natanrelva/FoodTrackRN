import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import type {
  NewOrderData,
  OrderModification,
  OrderStatusUpdate,
  LowStockAlert,
  InventoryUsage,
  StationAssignment,
  HelpRequest,
  QualityIssueReport,
} from '../hooks/useWebSocket';

interface WebSocketContextType {
  // Connection state
  connected: boolean;
  connecting: boolean;
  error: string | null;
  
  // Connection methods
  connect: () => void;
  disconnect: () => void;
  
  // Event subscription
  subscribe: (event: string, handler: (data: any) => void) => () => void;
  
  // Kitchen-specific methods
  updateOrderStatus: (orderId: string, status: string, stationId?: string) => boolean;
  updateInventoryUsage: (ingredientId: string, quantity: number, orderId: string) => boolean;
  requestHelp: (stationId: string, helpType: string, message?: string) => boolean;
  reportQualityIssue: (orderId: string, issue: string, severity: string) => boolean;
  
  // Real-time data
  recentOrders: NewOrderData[];
  recentStatusUpdates: OrderStatusUpdate[];
  lowStockAlerts: LowStockAlert[];
  helpRequests: HelpRequest[];
  qualityIssues: QualityIssueReport[];
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const webSocket = useWebSocket({ autoConnect: true });
  
  // Real-time data state
  const [recentOrders, setRecentOrders] = useState<NewOrderData[]>([]);
  const [recentStatusUpdates, setRecentStatusUpdates] = useState<OrderStatusUpdate[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [qualityIssues, setQualityIssues] = useState<QualityIssueReport[]>([]);

  // Set up event listeners
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // New order events
    unsubscribers.push(
      webSocket.subscribe('order:new', (data: NewOrderData) => {
        console.log('📦 New order received:', data);
        setRecentOrders(prev => [data, ...prev.slice(0, 9)]); // Keep last 10 orders
        
        // Show notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`New Order: ${data.orderId}`, {
            body: `${data.items.length} items - Priority: ${data.priority}`,
            icon: '/kitchen-icon.png',
          });
        }
      })
    );

    // Order modification events
    unsubscribers.push(
      webSocket.subscribe('order:modified', (data: OrderModification) => {
        console.log('📝 Order modified:', data);
        
        // Show notification for modifications
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Order Modified: ${data.orderId}`, {
            body: data.reason,
            icon: '/kitchen-icon.png',
          });
        }
      })
    );

    // Order status update events
    unsubscribers.push(
      webSocket.subscribe('order:status-update', (data: OrderStatusUpdate) => {
        console.log('🔄 Order status updated:', data);
        setRecentStatusUpdates(prev => [data, ...prev.slice(0, 19)]); // Keep last 20 updates
      })
    );

    // Low stock alert events
    unsubscribers.push(
      webSocket.subscribe('inventory:low-stock', (data: LowStockAlert) => {
        console.log('⚠️ Low stock alert:', data);
        setLowStockAlerts(prev => {
          // Remove existing alert for same ingredient and add new one
          const filtered = prev.filter(alert => alert.ingredientId !== data.ingredientId);
          return [data, ...filtered];
        });
        
        // Show critical stock notifications
        if (data.severity === 'critical' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(`Critical Stock Alert: ${data.ingredientName}`, {
            body: `Only ${data.currentStock} ${data.unit} remaining!`,
            icon: '/kitchen-icon.png',
          });
        }
      })
    );

    // Inventory usage update events
    unsubscribers.push(
      webSocket.subscribe('inventory:usage-update', (data: InventoryUsage) => {
        console.log('📊 Inventory usage updated:', data);
        // Update local inventory state if needed
      })
    );

    // Station assignment events
    unsubscribers.push(
      webSocket.subscribe('station:assignment', (data: StationAssignment) => {
        console.log('🏭 Station assignment:', data);
        
        // Show notification for high priority assignments
        if (data.priority <= 2 && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(`High Priority Assignment: ${data.stationName}`, {
            body: `Order ${data.orderId} assigned`,
            icon: '/kitchen-icon.png',
          });
        }
      })
    );

    // Help request events
    unsubscribers.push(
      webSocket.subscribe('station:help-request', (data: HelpRequest) => {
        console.log('🆘 Help request:', data);
        setHelpRequests(prev => [data, ...prev.slice(0, 9)]); // Keep last 10 requests
        
        // Show notification for help requests
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Help Request: ${data.stationName}`, {
            body: `${data.helpType}: ${data.message || 'Assistance needed'}`,
            icon: '/kitchen-icon.png',
          });
        }
      })
    );

    // Quality issue events
    unsubscribers.push(
      webSocket.subscribe('quality:issue-reported', (data: QualityIssueReport) => {
        console.log('🔍 Quality issue reported:', data);
        setQualityIssues(prev => [data, ...prev.slice(0, 9)]); // Keep last 10 issues
        
        // Show notification for quality issues
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Quality Issue: Order ${data.orderId}`, {
            body: `${data.severity}: ${data.issue}`,
            icon: '/kitchen-icon.png',
          });
        }
      })
    );

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [webSocket]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }, []);

  const contextValue: WebSocketContextType = {
    // Connection state
    connected: webSocket.connected,
    connecting: webSocket.connecting,
    error: webSocket.error,
    
    // Connection methods
    connect: webSocket.connect,
    disconnect: webSocket.disconnect,
    
    // Event subscription
    subscribe: webSocket.subscribe,
    
    // Kitchen-specific methods
    updateOrderStatus: webSocket.updateOrderStatus,
    updateInventoryUsage: webSocket.updateInventoryUsage,
    requestHelp: webSocket.requestHelp,
    reportQualityIssue: webSocket.reportQualityIssue,
    
    // Real-time data
    recentOrders,
    recentStatusUpdates,
    lowStockAlerts,
    helpRequests,
    qualityIssues,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext(): WebSocketContextType {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}

export default WebSocketContext;