import { TenantEntity } from './common';

export interface Order extends TenantEntity {
  customerId?: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  deliveryAddress?: Address;
  specialInstructions?: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  modifications?: string[];
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  modifications?: string[];
  imageUrl?: string;
}

export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export type OrderStatus = 
  | 'draft'
  | 'created' 
  | 'confirmed'
  | 'in_preparation'
  | 'ready'
  | 'dispatched'
  | 'delivered'
  | 'cancelled'
  | 'failed';

export interface CreateOrderRequest {
  customerId?: string;
  items: Omit<OrderItem, 'price'>[];
  deliveryAddress?: Address;
  specialInstructions?: string;
}