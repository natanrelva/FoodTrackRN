import { z } from 'zod';
import { OrderSchema, OrderItemSchema } from './order';
import { ProductSchema } from './product';

// Kitchen Status enum - maps to existing OrderStatus
export const KitchenStatusSchema = z.enum([
  'received',           // Maps to 'confirmed'
  'in_preparation',     // Maps to 'preparing'
  'ready_for_plating',  // Internal kitchen status
  'plated',            // Maps to 'ready'
  'ready_for_pickup',  // Maps to 'ready'
  'on_hold',           // Internal kitchen status
  'cancelled'          // Maps to 'cancelled'
]);

export type KitchenStatus = z.infer<typeof KitchenStatusSchema>;

// Order Priority enum
export const OrderPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export type OrderPriority = z.infer<typeof OrderPrioritySchema>;

// Item Status enum
export const ItemStatusSchema = z.enum([
  'pending',
  'assigned',
  'in_progress',
  'ready',
  'completed',
  'on_hold'
]);
export type ItemStatus = z.infer<typeof ItemStatusSchema>;

// Allergen Info Model
export const AllergenInfoSchema = z.object({
  type: z.string().min(1),
  severity: z.enum(['mild', 'moderate', 'severe']),
  description: z.string(),
});
export type AllergenInfo = z.infer<typeof AllergenInfoSchema>;

// Station Assignment Model
export const StationAssignmentSchema = z.object({
  stationId: z.string().uuid(),
  stationName: z.string().min(1),
  assignedAt: z.date(),
  estimatedDuration: z.number().int().positive(), // minutes
  items: z.array(z.string().uuid()), // Item IDs
});
export type StationAssignment = z.infer<typeof StationAssignmentSchema>;

// Kitchen Order Item Model (extends OrderItem)
export const KitchenOrderItemSchema = OrderItemSchema.extend({
  modifications: z.array(z.string()).default([]),
  allergens: z.array(z.string()).default([]),
  preparationNotes: z.string().default(''),
  stationId: z.string().uuid().optional(),
  status: ItemStatusSchema.default('pending'),
  estimatedTime: z.number().int().positive(), // minutes
  actualTime: z.number().int().positive().optional(), // minutes
});
export type KitchenOrderItem = z.infer<typeof KitchenOrderItemSchema>;

// Kitchen Order Model (extends Order)
export const KitchenOrderSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  tenantId: z.string().uuid(),
  items: z.array(KitchenOrderItemSchema).min(1),
  status: KitchenStatusSchema,
  priority: OrderPrioritySchema.default('medium'),
  specialInstructions: z.string().default(''),
  allergenAlerts: z.array(AllergenInfoSchema).default([]),
  estimatedCompletionTime: z.date(),
  actualStartTime: z.date().optional(),
  actualCompletionTime: z.date().optional(),
  assignedStations: z.array(StationAssignmentSchema).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type KitchenOrder = z.infer<typeof KitchenOrderSchema>;

// Station Type enum
export const StationTypeSchema = z.enum([
  'grill',
  'salad',
  'dessert',
  'beverage',
  'appetizer',
  'main_course',
  'plating'
]);
export type StationType = z.infer<typeof StationTypeSchema>;

// Station Status enum
export const StationStatusSchema = z.enum([
  'active',
  'busy',
  'overloaded',
  'maintenance',
  'offline'
]);
export type StationStatus = z.infer<typeof StationStatusSchema>;

// Specialization Model
export const SpecializationSchema = z.object({
  type: z.string().min(1),
  level: z.enum(['basic', 'intermediate', 'advanced']),
});
export type Specialization = z.infer<typeof SpecializationSchema>;

// Equipment Model
export const EquipmentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: z.string().min(1),
  status: z.enum(['operational', 'maintenance', 'broken']),
});
export type Equipment = z.infer<typeof EquipmentSchema>;

// Staff Member Model
export const StaffMemberSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  role: z.string().min(1),
  skills: z.array(SpecializationSchema).default([]),
  currentStation: z.string().uuid().optional(),
});
export type StaffMember = z.infer<typeof StaffMemberSchema>;

// Preparation Station Model
export const PreparationStationSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  type: StationTypeSchema,
  capacity: z.number().int().positive(),
  currentWorkload: z.number().int().min(0).default(0),
  specializations: z.array(SpecializationSchema).default([]),
  equipment: z.array(EquipmentSchema).default([]),
  assignedStaff: z.array(StaffMemberSchema).default([]),
  status: StationStatusSchema.default('active'),
  averageProcessingTime: z.number().positive().default(15), // minutes
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type PreparationStation = z.infer<typeof PreparationStationSchema>;

// Station Workload Model
export const StationWorkloadSchema = z.object({
  stationId: z.string().uuid(),
  activeOrders: z.number().int().min(0),
  queuedOrders: z.number().int().min(0),
  estimatedWaitTime: z.number().int().min(0), // minutes
  utilizationRate: z.number().min(0).max(100), // percentage
  lastUpdated: z.date(),
});
export type StationWorkload = z.infer<typeof StationWorkloadSchema>;

// Station Assignment Suggestion Model
export const StationAssignmentSuggestionSchema = z.object({
  stationId: z.string().uuid(),
  stationName: z.string().min(1),
  stationType: StationTypeSchema,
  confidence: z.number().min(0).max(100), // percentage
  reason: z.string().min(1),
  estimatedWaitTime: z.number().int().min(0), // minutes
  currentUtilization: z.number().min(0).max(100), // percentage
  equipmentMatch: z.boolean(),
  skillMatch: z.boolean(),
});
export type StationAssignmentSuggestion = z.infer<typeof StationAssignmentSuggestionSchema>;

// Workload Redistribution Suggestion Model
export const WorkloadRedistributionSuggestionSchema = z.object({
  fromStationId: z.string().uuid(),
  toStationId: z.string().uuid(),
  fromStationName: z.string().min(1),
  toStationName: z.string().min(1),
  orderIds: z.array(z.string().uuid()),
  estimatedTimeReduction: z.number().int().min(0), // minutes
  reason: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});
export type WorkloadRedistributionSuggestion = z.infer<typeof WorkloadRedistributionSuggestionSchema>;

// Cross-Training Suggestion Model
export const CrossTrainingSuggestionSchema = z.object({
  staffMemberId: z.string().uuid(),
  staffMemberName: z.string().min(1),
  currentStationId: z.string().uuid(),
  suggestedStationId: z.string().uuid(),
  currentStationName: z.string().min(1),
  suggestedStationName: z.string().min(1),
  skillGap: z.array(z.string()),
  trainingRequired: z.array(z.string()),
  estimatedTrainingTime: z.number().int().min(0), // hours
  benefit: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high']),
});
export type CrossTrainingSuggestion = z.infer<typeof CrossTrainingSuggestionSchema>;

// Station Assignment Algorithm Result Model
export const StationAssignmentResultSchema = z.object({
  orderId: z.string().uuid(),
  assignments: z.array(StationAssignmentSuggestionSchema),
  redistributionSuggestions: z.array(WorkloadRedistributionSuggestionSchema),
  crossTrainingSuggestions: z.array(CrossTrainingSuggestionSchema),
  overloadWarnings: z.array(z.object({
    stationId: z.string().uuid(),
    stationName: z.string().min(1),
    currentUtilization: z.number().min(0).max(100),
    estimatedUtilization: z.number().min(0).max(100),
    severity: z.enum(['warning', 'critical']),
  })),
});
export type StationAssignmentResult = z.infer<typeof StationAssignmentResultSchema>;

// Kitchen Status Mapping Utilities
export class KitchenStatusMapper {
  private static readonly statusMap: Record<KitchenStatus, string> = {
    'received': 'confirmed',
    'in_preparation': 'preparing',
    'ready_for_plating': 'preparing', // Internal status, maps to preparing
    'plated': 'ready',
    'ready_for_pickup': 'ready',
    'on_hold': 'preparing', // Internal status, maps to preparing
    'cancelled': 'cancelled'
  };

  private static readonly reverseMap: Record<string, KitchenStatus> = {
    'confirmed': 'received',
    'preparing': 'in_preparation',
    'ready': 'ready_for_pickup',
    'cancelled': 'cancelled'
  };

  static toOrderStatus(kitchenStatus: KitchenStatus): string {
    return this.statusMap[kitchenStatus];
  }

  static fromOrderStatus(orderStatus: string): KitchenStatus {
    return this.reverseMap[orderStatus] || 'received';
  }

  static isValidTransition(currentStatus: KitchenStatus, newStatus: KitchenStatus): boolean {
    const validTransitions: Record<KitchenStatus, KitchenStatus[]> = {
      'received': ['in_preparation', 'on_hold', 'cancelled'],
      'in_preparation': ['ready_for_plating', 'on_hold', 'cancelled'],
      'ready_for_plating': ['plated', 'on_hold', 'cancelled'],
      'plated': ['ready_for_pickup', 'cancelled'],
      'ready_for_pickup': [], // Terminal state
      'on_hold': ['in_preparation', 'cancelled'],
      'cancelled': [] // Terminal state
    };

    return validTransitions[currentStatus]?.includes(newStatus) ?? false;
  }
}

// Status Update Log Model
export const StatusUpdateLogSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  itemId: z.string().uuid().optional(),
  previousStatus: z.union([KitchenStatusSchema, ItemStatusSchema]),
  newStatus: z.union([KitchenStatusSchema, ItemStatusSchema]),
  updatedBy: z.string().min(1),
  updatedAt: z.date(),
  stationId: z.string().uuid().optional(),
  notes: z.string().optional(),
  estimatedDelay: z.number().int().min(0).optional(), // minutes
});
export type StatusUpdateLog = z.infer<typeof StatusUpdateLogSchema>;

// Delay Notification Model
export const DelayNotificationSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  delayMinutes: z.number().int().positive(),
  reason: z.string().min(1),
  notifiedAt: z.date(),
  notificationMethod: z.enum(['sms', 'email', 'app', 'call']),
  customerResponse: z.enum(['acknowledged', 'cancelled', 'modified']).optional(),
  newEstimatedTime: z.date().optional(),
});
export type DelayNotification = z.infer<typeof DelayNotificationSchema>;

// Quality Issue Model
export const QualityIssueSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  itemId: z.string().uuid().optional(),
  type: z.enum(['temperature', 'appearance', 'taste', 'texture', 'presentation', 'ingredient_missing', 'contamination', 'other']),
  description: z.string().min(1),
  severity: z.enum(['minor', 'major', 'critical']),
  reportedBy: z.string().min(1),
  reportedAt: z.date(),
  stationId: z.string().uuid().optional(),
  suggestedAction: z.enum(['remake', 'adjust', 'continue', 'discard', 'manager_review']),
  photos: z.array(z.string().url()).default([]),
});
export type QualityIssue = z.infer<typeof QualityIssueSchema>;

// Quality Report Model
export const QualityReportSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  issue: QualityIssueSchema,
  resolution: z.string().min(1),
  actionTaken: z.enum(['remade', 'adjusted', 'continued', 'discarded', 'escalated']),
  resolvedBy: z.string().min(1).optional(),
  resolvedAt: z.date().optional(),
  remakeOrderId: z.string().uuid().optional(),
  customerNotified: z.boolean().default(false),
  customerSatisfied: z.boolean().optional(),
  additionalNotes: z.string().optional(),
});
export type QualityReport = z.infer<typeof QualityReportSchema>;

// Remake Request Model
export const RemakeRequestSchema = z.object({
  id: z.string().uuid(),
  originalOrderId: z.string().uuid(),
  originalItemId: z.string().uuid().optional(),
  reason: z.string().min(1),
  requestedBy: z.string().min(1),
  requestedAt: z.date(),
  priority: OrderPrioritySchema.default('high'),
  status: z.enum(['pending', 'approved', 'in_progress', 'completed', 'cancelled']).default('pending'),
  approvedBy: z.string().min(1).optional(),
  approvedAt: z.date().optional(),
  newOrderId: z.string().uuid().optional(),
  estimatedTime: z.number().int().positive().optional(), // minutes
});
export type RemakeRequest = z.infer<typeof RemakeRequestSchema>;

// Delivery Coordination Model
export const DeliveryCoordinationSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  status: z.enum(['pending', 'notified', 'dispatched', 'picked_up', 'delivered']).default('pending'),
  estimatedPickupTime: z.date(),
  actualPickupTime: z.date().optional(),
  deliveryPersonId: z.string().uuid().optional(),
  deliveryPersonName: z.string().optional(),
  coordinatedBy: z.string().min(1),
  coordinatedAt: z.date(),
  notes: z.string().optional(),
});
export type DeliveryCoordination = z.infer<typeof DeliveryCoordinationSchema>;

// Preparation Stage Tracking Model
export const PreparationStageSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  itemId: z.string().uuid(),
  stage: z.enum(['prep', 'cooking', 'plating', 'quality_check', 'ready']),
  status: z.enum(['pending', 'in_progress', 'completed', 'on_hold', 'failed']).default('pending'),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  estimatedDuration: z.number().int().positive(), // minutes
  actualDuration: z.number().int().positive().optional(), // minutes
  stationId: z.string().uuid(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
});
export type PreparationStage = z.infer<typeof PreparationStageSchema>;

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

export const STATION_TYPE_LABELS: Record<StationType, string> = {
  'grill': 'Grill Station',
  'salad': 'Salad Station',
  'dessert': 'Dessert Station',
  'beverage': 'Beverage Station',
  'appetizer': 'Appetizer Station',
  'main_course': 'Main Course Station',
  'plating': 'Plating Station'
};