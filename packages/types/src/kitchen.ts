import { TenantEntity } from './common';

export interface KitchenOrder extends TenantEntity {
  contractId: string;
  orderId: string;
  items: KitchenOrderItem[];
  priority: KitchenPriority;
  assignedStation?: string;
  status: KitchenOrderStatus;
  estimatedCompletionTime?: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface KitchenOrderItem {
  productionItemId: string;
  productId: string;
  recipeId?: string;
  quantity: number;
  modifications?: string[];
  status: KitchenItemStatus;
}

export interface ProductionContract extends TenantEntity {
  orderId: string;
  items: ProductionItem[];
  priority: KitchenPriority;
  specialInstructions?: string[];
  estimatedCompletionTime: Date;
  version: number;
}

export interface ProductionItem {
  productionItemId: string;
  productId: string;
  recipeId?: string;
  recipeVersion?: number;
  quantity: number;
  modifications?: string[];
  allergenAlerts?: string[];
}

export type KitchenPriority = 'low' | 'normal' | 'high' | 'urgent';

export type KitchenOrderStatus = 
  | 'pending'
  | 'assigned'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'failed';

export type KitchenItemStatus = 
  | 'pending'
  | 'preparing'
  | 'completed'
  | 'failed';

export interface Station {
  id: string;
  name: string;
  type: StationType;
  capacity: number;
  currentLoad: number;
  active: boolean;
}

export type StationType = 'grill' | 'fryer' | 'assembly' | 'cold' | 'oven' | 'prep';