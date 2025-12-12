// Order and Item Types - Unified Interfaces
import { PaymentMethod, PaymentStatus, NotificationStatus, AdminOrderStatus, ChannelType, TransactionStatus } from './status';

// Base item interface
export interface BaseItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  extras?: string[];
}

// Cart item (Web) - extends base with image
export interface CartItem extends BaseItem {
  image: string;
}

// Order item (Admin) - same as base for now, can be extended
export interface OrderItem extends BaseItem {}

// Customer information
export interface Customer {
  name: string;
  phone: string;
  address: string;
}

// Payment information
export interface Payment {
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
}

// Notification
export interface Notification {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  status: NotificationStatus;
}

// Complete Order interface (Admin)
export interface Order {
  id: string;
  number: string;
  customer: Customer;
  items: OrderItem[];
  status: AdminOrderStatus;
  channel: ChannelType;
  payment: Payment;
  createdAt: string;
  notifications: Notification[];
}

// Transaction interface (Admin)
export interface Transaction {
  id: string;
  orderId: string;
  date: string;
  amount: number;
  method: string;
  status: TransactionStatus;
}