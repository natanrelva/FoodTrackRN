// Component Props Types - Shared Interface Definitions

import { AdminScreen, WebScreen } from './navigation';
import { Product, Order, CartItem } from './index';

// Admin Component Props
export interface SidebarProps {
  currentScreen: AdminScreen;
  onNavigate: (screen: AdminScreen) => void;
}

export interface DashboardProps {
  onOrderClick: (orderId: string) => void;
}

export interface OrderDetailsProps {
  orderId: string | null;
  onBack: () => void;
}

// Web Component Props
export interface ProductCardProps {
  product: Product;
}

export interface MenuScreenProps {
  onNavigate: (screen: WebScreen) => void;
}

export interface CartScreenProps {
  onNavigate: (screen: WebScreen) => void;
}

export interface CheckoutScreenProps {
  onNavigate: (screen: WebScreen, orderId?: string) => void;
}

export interface OrderTrackingScreenProps {
  orderId: string;
  onNavigate: (screen: WebScreen) => void;
}

// Gantt Chart Components (Web)
export interface Task {
  id: string;
  name: string;
  startDay: number;
  duration: number;
  color: string;
}

export interface MilestoneData {
  day: number;
  label: string;
}

export interface MilestoneProps {
  day: number;
  label: string;
}

export interface GanttBarProps {
  task: Task;
  dayWidth: number;
}

// Cart Context Type
export interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
}