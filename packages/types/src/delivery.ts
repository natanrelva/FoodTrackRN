import { TenantEntity } from './common';
import { Address } from './order';

export interface DeliveryOrder extends TenantEntity {
  orderId: string;
  customerId?: string;
  deliveryAddress: Address;
  agentId?: string;
  status: DeliveryStatus;
  estimatedDeliveryTime?: Date;
  dispatchedAt?: Date;
  deliveredAt?: Date;
  trackingCode?: string;
}

export interface DeliveryAgent extends TenantEntity {
  name: string;
  phone: string;
  email?: string;
  vehicleType: VehicleType;
  currentLocation?: Location;
  status: AgentStatus;
  rating?: number;
}

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  timestamp: Date;
}

export type DeliveryStatus = 
  | 'pending'
  | 'assigned'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export type VehicleType = 'bike' | 'motorcycle' | 'car' | 'walking';

export type AgentStatus = 'available' | 'busy' | 'offline' | 'break';