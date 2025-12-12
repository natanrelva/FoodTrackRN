// Kitchen Types for Frontend - Simplified versions of backend types
import { Order, OrderItem } from './order';
import { Product } from './product';

// Kitchen Status enum - simplified for frontend
export type KitchenStatus = 
  | 'received'
  | 'in_preparation' 
  | 'ready_for_plating'
  | 'plated'
  | 'ready_for_pickup'
  | 'on_hold'
  | 'cancelled';

// Order Priority
export type OrderPriority = 'low' | 'medium' | 'high' | 'urgent';

// Item Status
export type ItemStatus = 'pending' | 'assigned' | 'in_progress' | 'ready' | 'completed' | 'on_hold';

// Station Type
export type StationType = 'grill' | 'salad' | 'dessert' | 'beverage' | 'appetizer' | 'main_course' | 'plating';

// Station Status
export type StationStatus = 'active' | 'busy' | 'overloaded' | 'maintenance' | 'offline';

// Allergen Info
export interface AllergenInfo {
  type: string;
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
}

// Kitchen Order Item (extends OrderItem)
export interface KitchenOrderItem extends OrderItem {
  productId: string;
  modifications: string[];
  allergens: string[];
  preparationNotes: string;
  stationId?: string;
  status: ItemStatus;
  estimatedTime: number;
  actualTime?: number;
}

// Kitchen Order (extends Order)
export interface KitchenOrder {
  id: string;
  orderId: string;
  items: KitchenOrderItem[];
  status: KitchenStatus;
  priority: OrderPriority;
  specialInstructions: string;
  allergenAlerts: AllergenInfo[];
  estimatedCompletionTime: string; // ISO date string
  actualStartTime?: string;
  actualCompletionTime?: string;
  assignedStations: StationAssignment[];
  // Reference to original order
  order?: Order;
}

// Station Assignment
export interface StationAssignment {
  stationId: string;
  stationName: string;
  assignedAt: string; // ISO date string
  estimatedDuration: number;
  items: string[]; // Item IDs
}

// Preparation Station
export interface PreparationStation {
  id: string;
  name: string;
  type: StationType;
  capacity: number;
  currentWorkload: number;
  status: StationStatus;
  averageProcessingTime: number;
}

// Recipe (simplified for frontend)
export interface Recipe {
  id: string;
  dishId: string;
  name: string;
  description: string;
  preparationTime: number;
  cookingTime: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  allergens: string[];
  servings: number;
}

// Inventory Item (simplified for frontend)
export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  unit: string;
  minimumStock: number;
  supplier: string;
  barcode?: string;
  expirationDate?: string; // ISO date string
}

// Kitchen Status Labels
export const KITCHEN_STATUS_LABELS: Record<KitchenStatus, string> = {
  'received': 'Received',
  'in_preparation': 'In Preparation',
  'ready_for_plating': 'Ready for Plating',
  'plated': 'Plated',
  'ready_for_pickup': 'Ready for Pickup',
  'on_hold': 'On Hold',
  'cancelled': 'Cancelled'
};

// Station Workload
export interface StationWorkload {
  stationId: string;
  activeOrders: number;
  queuedOrders: number;
  estimatedWaitTime: number;
  utilizationRate: number;
  lastUpdated: string; // ISO date string
}

// Recipe Instructions (for display)
export interface RecipeInstructions {
  recipeId: string;
  dishName: string;
  totalTime: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    isOptional: boolean;
  }>;
  steps: Array<{
    stepNumber: number;
    instruction: string;
    duration?: number;
    temperature?: number;
    equipment: string[];
    notes?: string;
  }>;
  modifications: string[];
  allergenWarnings: string[];
}

// Stock Alert
export interface StockAlert {
  id: string;
  itemName: string;
  alertType: 'low_stock' | 'out_of_stock' | 'expiring_soon' | 'expired' | 'overstock';
  currentStock: number;
  minimumStock: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string; // ISO date string
}

// Expiration Alert
export interface ExpirationAlert {
  id: string;
  itemName: string;
  expirationDate: string; // ISO date string
  daysUntilExpiration: number;
  currentStock: number;
  unit: string;
  severity: 'warning' | 'urgent' | 'expired';
  suggestedAction: 'use_first' | 'discount' | 'dispose' | 'return';
}

// Availability Check
export interface AvailabilityCheck {
  ingredientId: string;
  ingredientName: string;
  requiredQuantity: number;
  availableQuantity: number;
  unit: string;
  isAvailable: boolean;
  shortfall?: number;
  alternatives: Array<{
    ingredientId: string;
    name: string;
    availableQuantity: number;
    substitutionRatio: number;
  }>;
}

// Station Assignment Suggestion
export interface StationAssignmentSuggestion {
  stationId: string;
  stationName: string;
  stationType: StationType;
  confidence: number; // 0-100 percentage
  reason: string;
  estimatedWaitTime: number; // minutes
  currentUtilization: number; // 0-100 percentage
  equipmentMatch: boolean;
  skillMatch: boolean;
}

// Workload Redistribution Suggestion
export interface WorkloadRedistributionSuggestion {
  fromStationId: string;
  toStationId: string;
  fromStationName: string;
  toStationName: string;
  orderIds: string[];
  estimatedTimeReduction: number; // minutes
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

// Cross-Training Suggestion
export interface CrossTrainingSuggestion {
  staffMemberId: string;
  staffMemberName: string;
  currentStationId: string;
  suggestedStationId: string;
  currentStationName: string;
  suggestedStationName: string;
  skillGap: string[];
  trainingRequired: string[];
  estimatedTrainingTime: number; // hours
  benefit: string;
  priority: 'low' | 'medium' | 'high';
}

// Status Update Tracking
export interface StatusUpdateLog {
  id: string;
  orderId: string;
  itemId?: string;
  previousStatus: KitchenStatus | ItemStatus;
  newStatus: KitchenStatus | ItemStatus;
  updatedBy: string;
  updatedAt: string; // ISO date string
  stationId?: string;
  notes?: string;
  estimatedDelay?: number; // minutes
}

// Delay Notification
export interface DelayNotification {
  id: string;
  orderId: string;
  delayMinutes: number;
  reason: string;
  notifiedAt: string; // ISO date string
  notificationMethod: 'sms' | 'email' | 'app' | 'call';
  customerResponse?: 'acknowledged' | 'cancelled' | 'modified';
  newEstimatedTime?: string; // ISO date string
}

// Quality Issue
export interface QualityIssue {
  id: string;
  orderId: string;
  itemId?: string;
  type: 'temperature' | 'presentation' | 'taste' | 'missing_ingredient' | 'contamination' | 'other';
  description: string;
  severity: 'minor' | 'major' | 'critical';
  reportedBy: string;
  reportedAt: string; // ISO date string
  stationId?: string;
  suggestedAction: 'remake' | 'adjust' | 'continue' | 'discard' | 'manager_review';
  photos?: string[]; // URLs to photos
}

// Quality Report
export interface QualityReport {
  id: string;
  orderId: string;
  issueId: string;
  resolution: string;
  actionTaken: 'remade' | 'adjusted' | 'continued' | 'discarded' | 'escalated';
  resolvedBy?: string;
  resolvedAt?: string; // ISO date string
  remakeOrderId?: string; // If a remake was created
  customerNotified: boolean;
  customerSatisfied?: boolean;
  additionalNotes?: string;
}

// Remake Request
export interface RemakeRequest {
  id: string;
  originalOrderId: string;
  originalItemId?: string;
  reason: string;
  requestedBy: string;
  requestedAt: string; // ISO date string
  priority: OrderPriority;
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  approvedBy?: string;
  approvedAt?: string; // ISO date string
  newOrderId?: string;
  estimatedTime?: number; // minutes
}

// Delivery Coordination
export interface DeliveryCoordination {
  id: string;
  orderId: string;
  status: 'pending' | 'delivered' | 'failed';
  estimatedPickupTime: string; // ISO date string
  actualPickupTime?: string; // ISO date string
  deliveryPersonId?: string;
  deliveryPersonName?: string;
  coordinatedBy: string;
  coordinatedAt: string; // ISO date string
  notes?: string;
}

// Preparation Stage Tracking
export interface PreparationStage {
  id: string;
  orderId: string;
  itemId: string;
  stage: 'prep' | 'cooking' | 'plating' | 'quality_check' | 'ready';
  status: 'pending' | 'failed';
  startedAt?: string; // ISO date string
  completedAt?: string; // ISO date string
  estimatedDuration: number; // minutes
  actualDuration?: number; // minutes
  stationId: string;
  assignedTo?: string;
  notes?: string;
}

// Station Assignment Result
export interface StationAssignmentResult {
  orderId: string;
  assignments: StationAssignmentSuggestion[];
  redistributionSuggestions: WorkloadRedistributionSuggestion[];
  crossTrainingSuggestions: CrossTrainingSuggestion[];
  overloadWarnings: Array<{
    stationId: string;
    stationName: string;
    currentUtilization: number;
    estimatedUtilization: number;
    severity: 'warning' | 'critical';
  }>;
}

// Station Type Labels
export const STATION_TYPE_LABELS: Record<StationType, string> = {
  'grill': 'Grill Station',
  'salad': 'Salad Station',
  'dessert': 'Dessert Station',
  'beverage': 'Beverage Station',
  'appetizer': 'Appetizer Station',
  'main_course': 'Main Course Station',
  'plating': 'Plating Station'
};