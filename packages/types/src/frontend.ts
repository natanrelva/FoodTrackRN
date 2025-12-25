// Frontend-specific types for client applications

import { Product, Order, CartItem } from './index';

// Screen navigation types
export type WebScreen = 'menu' | 'cart' | 'checkout' | 'tracking';

// Component props types
export interface MenuScreenProps {
  onNavigate: (screen: WebScreen, orderId?: string) => void;
}

export interface CartScreenProps {
  onNavigate: (screen: WebScreen, orderId?: string) => void;
}

export interface CheckoutScreenProps {
  onNavigate: (screen: WebScreen, orderId?: string) => void;
}

export interface OrderTrackingScreenProps {
  orderId: string;
  onNavigate: (screen: WebScreen, orderId?: string) => void;
}

export interface ProductCardProps {
  product: Product & {
    image?: string; // For backward compatibility with mock data
    extras?: Array<{ name: string; price: number }>; // For backward compatibility
  };
}

// Category type for frontend
export interface Category {
  id: string;
  name: string;
  icon: string;
}

// Cart context type
export interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
}

// Extended CartItem for frontend compatibility
export interface ExtendedCartItem extends CartItem {
  image?: string; // For backward compatibility
  extras?: string[]; // For backward compatibility
  notes?: string;
}

// Customer info for orders
export interface CustomerInfo {
  id?: string;
  name: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    complement?: string;
  };
}

// Order filters for API
export interface OrderFilters {
  status?: string[];
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  page?: number;
  limit?: number;
}

// Paginated orders response
export interface PaginatedOrders {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Order status for frontend tracking
export type WebOrderStatus = 
  | 'awaiting_payment'
  | 'paid'
  | 'processing'
  | 'in_delivery'
  | 'delivered'
  | 'cancelled';

// WebSocket event types for frontend
export interface WebSocketEvent {
  id: string;
  type: string;
  timestamp: Date;
  payload: any;
}

export interface OrderWebSocketEvent extends WebSocketEvent {
  type: 'ORDER_CREATED' | 'ORDER_STATUS_CHANGED' | 'ORDER_UPDATED' | 'ORDER_CANCELLED';
  payload: {
    order: Order;
    previousStatus?: string;
  };
}

export interface ProductWebSocketEvent extends WebSocketEvent {
  type: 'PRODUCT_UPDATED' | 'PRODUCT_AVAILABILITY_CHANGED';
  payload: {
    product: Product;
    changes: string[];
  };
}

export type WebSocketEventType = 
  | 'ORDER_CREATED'
  | 'ORDER_STATUS_CHANGED' 
  | 'ORDER_UPDATED'
  | 'ORDER_CANCELLED'
  | 'PRODUCT_UPDATED'
  | 'PRODUCT_AVAILABILITY_CHANGED'
  | 'SYSTEM_NOTIFICATION'
  | 'SYSTEM_ALERT';

export interface SystemEventPayload {
  message: string;
  level: 'info' | 'warning' | 'error';
  data?: any;
}

// Task and milestone types for project management components
export interface Task {
  id: string;
  name: string;
  startDay: number;
  duration: number;
  progress: number;
  dependencies?: string[];
  assignee?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface MilestoneData {
  day: number;
  label: string;
  icon: string;
}

export interface MilestoneProps extends MilestoneData {
  leftMargin: number;
  dayWidth: number;
  topOffset: number;
}