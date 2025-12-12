import { z } from 'zod';
import { OrderSchema, OrderStatus, OrderStatusSchema, AddressSchema } from './order.js';

// GeoLocation Model
export const GeoLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
  timestamp: z.date().optional(),
});

export type GeoLocation = z.infer<typeof GeoLocationSchema>;

// Vehicle Type enum
export const VehicleTypeSchema = z.enum([
  'bicycle',
  'motorcycle',
  'car',
  'scooter',
  'walking'
]);

export type VehicleType = z.infer<typeof VehicleTypeSchema>;

// Agent Status enum
export const AgentStatusSchema = z.enum([
  'offline',
  'available',
  'busy',
  'on_break'
]);

export type AgentStatus = z.infer<typeof AgentStatusSchema>;

// Delivery Status enum (extends existing OrderStatus)
export const DeliveryStatusSchema = z.enum([
  'pending',      // Maps to Order.pending
  'assigned',     // New delivery status
  'accepted',     // New delivery status  
  'picked_up',    // Maps to Order.ready
  'in_transit',   // Maps to Order.delivering
  'delivered',    // Maps to Order.delivered
  'failed',       // New delivery status
  'cancelled'     // Maps to Order.cancelled
]);

export type DeliveryStatus = z.infer<typeof DeliveryStatusSchema>;

// Delivery Zone Model
export const DeliveryZoneSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  coordinates: z.array(GeoLocationSchema).min(3), // Polygon coordinates
  isActive: z.boolean().default(true),
});

export type DeliveryZone = z.infer<typeof DeliveryZoneSchema>;

// Navigation Step Model
export const NavigationStepSchema = z.object({
  instruction: z.string().min(1),
  distance: z.number().positive(),
  duration: z.number().positive(), // in seconds
  startLocation: GeoLocationSchema,
  endLocation: GeoLocationSchema,
});

export type NavigationStep = z.infer<typeof NavigationStepSchema>;

// Traffic Data Model
export const TrafficDataSchema = z.object({
  level: z.enum(['low', 'moderate', 'heavy', 'severe']),
  delayMinutes: z.number().min(0),
  updatedAt: z.date(),
});

export type TrafficData = z.infer<typeof TrafficDataSchema>;

// Route Model
export const RouteSchema = z.object({
  id: z.string().uuid(),
  waypoints: z.array(GeoLocationSchema).min(2),
  optimizedSequence: z.array(z.number().int().min(0)),
  totalDistance: z.number().positive(), // in meters
  estimatedDuration: z.number().positive(), // in seconds
  navigationSteps: z.array(NavigationStepSchema),
  trafficConditions: TrafficDataSchema.optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Route = z.infer<typeof RouteSchema>;

// Delivery Agent Model
export const DeliveryAgentSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  vehicleType: VehicleTypeSchema,
  currentLocation: GeoLocationSchema.nullable(),
  status: AgentStatusSchema,
  deliveryZones: z.array(DeliveryZoneSchema),
  maxConcurrentDeliveries: z.number().int().positive().default(3),
  currentDeliveries: z.array(z.string().uuid()),
  rating: z.number().min(0).max(5).default(0),
  totalDeliveries: z.number().int().min(0).default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type DeliveryAgent = z.infer<typeof DeliveryAgentSchema>;

// Delivery Issue Model
export const DeliveryIssueSchema = z.object({
  id: z.string().uuid(),
  deliveryId: z.string().uuid(),
  type: z.enum(['address_not_found', 'customer_unavailable', 'vehicle_breakdown', 'weather', 'other']),
  description: z.string().min(1),
  reportedBy: z.string().uuid(), // Agent ID
  reportedAt: z.date(),
  resolvedAt: z.date().optional(),
  resolution: z.string().optional(),
});

export type DeliveryIssue = z.infer<typeof DeliveryIssueSchema>;

// Delivery Confirmation Model
export const DeliveryConfirmationSchema = z.object({
  deliveryId: z.string().uuid(),
  type: z.enum(['pickup', 'delivery']),
  timestamp: z.date(),
  location: GeoLocationSchema,
  photo: z.string().url().optional(),
  signature: z.string().optional(), // Base64 encoded signature
  notes: z.string().optional(),
  confirmedBy: z.string().uuid(), // Agent ID
});

export type DeliveryConfirmation = z.infer<typeof DeliveryConfirmationSchema>;

// Extended Delivery Model (extends Order)
export const DeliverySchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  tenantId: z.string().uuid(),
  agentId: z.string().uuid().nullable(),
  status: DeliveryStatusSchema,
  pickupLocation: AddressSchema,
  deliveryLocation: AddressSchema,
  estimatedPickupTime: z.date(),
  estimatedDeliveryTime: z.date(),
  actualPickupTime: z.date().nullable(),
  actualDeliveryTime: z.date().nullable(),
  route: RouteSchema.nullable(),
  specialInstructions: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  deliveryFee: z.number().min(0),
  // Relationship to order
  order: OrderSchema,
  // Confirmations
  pickupConfirmation: DeliveryConfirmationSchema.nullable(),
  deliveryConfirmation: DeliveryConfirmationSchema.nullable(),
  // Issues
  issues: z.array(DeliveryIssueSchema).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Delivery = z.infer<typeof DeliverySchema>;

// Time Period Model for analytics
export const TimePeriodSchema = z.object({
  start: z.date(),
  end: z.date(),
});

export type TimePeriod = z.infer<typeof TimePeriodSchema>;

// Delivery Metrics Model
export const DeliveryMetricsSchema = z.object({
  totalDeliveries: z.number().int().min(0),
  successfulDeliveries: z.number().int().min(0),
  averageDeliveryTime: z.number().min(0), // in minutes
  onTimeDeliveryRate: z.number().min(0).max(100), // percentage
  customerSatisfactionScore: z.number().min(0).max(5),
  agentUtilizationRate: z.number().min(0).max(100), // percentage
  routeEfficiencyScore: z.number().min(0).max(100), // percentage
  period: TimePeriodSchema,
});

export type DeliveryMetrics = z.infer<typeof DeliveryMetricsSchema>;

// Agent Performance Model
export const AgentPerformanceSchema = z.object({
  agentId: z.string().uuid(),
  deliveriesCompleted: z.number().int().min(0),
  averageDeliveryTime: z.number().min(0), // in minutes
  onTimeRate: z.number().min(0).max(100), // percentage
  customerRating: z.number().min(0).max(5),
  distanceTraveled: z.number().min(0), // in kilometers
  hoursWorked: z.number().min(0),
  period: TimePeriodSchema,
});

export type AgentPerformance = z.infer<typeof AgentPerformanceSchema>;

// Delivery Filters Model
export const DeliveryFiltersSchema = z.object({
  status: z.array(DeliveryStatusSchema).optional(),
  agentId: z.string().uuid().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  zone: z.string().optional(),
  priority: z.array(z.enum(['low', 'normal', 'high', 'urgent'])).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type DeliveryFilters = z.infer<typeof DeliveryFiltersSchema>;

// Route Constraints Model
export const RouteConstraintsSchema = z.object({
  maxDistance: z.number().positive().optional(),
  maxDuration: z.number().positive().optional(), // in seconds
  avoidTolls: z.boolean().default(false),
  avoidHighways: z.boolean().default(false),
  vehicleType: VehicleTypeSchema.optional(),
});

export type RouteConstraints = z.infer<typeof RouteConstraintsSchema>;

// Delivery Status Mapping Utilities
export class DeliveryStatusMapper {
  // Map delivery status to order status
  static toOrderStatus(deliveryStatus: DeliveryStatus): OrderStatus {
    const mapping: Record<DeliveryStatus, OrderStatus> = {
      pending: 'pending',
      assigned: 'confirmed',
      accepted: 'confirmed',
      picked_up: 'ready',
      in_transit: 'delivering',
      delivered: 'delivered',
      failed: 'cancelled',
      cancelled: 'cancelled',
    };
    return mapping[deliveryStatus];
  }

  // Map order status to delivery status
  static fromOrderStatus(orderStatus: OrderStatus): DeliveryStatus {
    const mapping: Record<OrderStatus, DeliveryStatus> = {
      pending: 'pending',
      confirmed: 'assigned',
      preparing: 'assigned',
      ready: 'picked_up',
      delivering: 'in_transit',
      delivered: 'delivered',
      cancelled: 'cancelled',
    };
    return mapping[orderStatus];
  }

  // Check if status transition is valid
  static isValidTransition(currentStatus: DeliveryStatus, newStatus: DeliveryStatus): boolean {
    const validTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
      pending: ['assigned', 'cancelled'],
      assigned: ['accepted', 'cancelled'],
      accepted: ['picked_up', 'cancelled'],
      picked_up: ['in_transit', 'cancelled'],
      in_transit: ['delivered', 'failed', 'cancelled'],
      delivered: [], // Terminal state
      failed: ['assigned'], // Can be reassigned
      cancelled: [], // Terminal state
    };

    return validTransitions[currentStatus]?.includes(newStatus) ?? false;
  }
}

// Validation Utilities
export class DeliveryValidationUtils {
  static validateGeoLocation(data: unknown): { isValid: boolean; errors: string[] } {
    const result = GeoLocationSchema.safeParse(data);
    return {
      isValid: result.success,
      errors: result.success ? [] : result.error.errors.map(e => e.message),
    };
  }

  static validateDeliveryAgent(data: unknown): { isValid: boolean; errors: string[] } {
    const result = DeliveryAgentSchema.safeParse(data);
    return {
      isValid: result.success,
      errors: result.success ? [] : result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
    };
  }

  static validateRoute(data: unknown): { isValid: boolean; errors: string[] } {
    const result = RouteSchema.safeParse(data);
    return {
      isValid: result.success,
      errors: result.success ? [] : result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
    };
  }

  static validateDelivery(data: unknown): { isValid: boolean; errors: string[] } {
    const result = DeliverySchema.safeParse(data);
    return {
      isValid: result.success,
      errors: result.success ? [] : result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
    };
  }

  static validateStatusTransition(currentStatus: DeliveryStatus, newStatus: DeliveryStatus): { isValid: boolean; errors: string[] } {
    const isValid = DeliveryStatusMapper.isValidTransition(currentStatus, newStatus);
    return {
      isValid,
      errors: isValid ? [] : [`Invalid status transition from ${currentStatus} to ${newStatus}`],
    };
  }

  // Validate that agent can handle delivery based on zones and capacity
  static validateAgentAssignment(agent: DeliveryAgent, deliveryLocation: GeoLocation): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if agent is available
    if (agent.status !== 'available') {
      errors.push(`Agent is not available (current status: ${agent.status})`);
    }

    // Check capacity
    if (agent.currentDeliveries.length >= agent.maxConcurrentDeliveries) {
      errors.push(`Agent has reached maximum concurrent deliveries (${agent.maxConcurrentDeliveries})`);
    }

    // Check if delivery location is within agent's zones
    const isInZone = agent.deliveryZones.some(zone => 
      zone.isActive && this.isPointInPolygon(deliveryLocation, zone.coordinates)
    );

    if (!isInZone) {
      errors.push('Delivery location is outside agent\'s delivery zones');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Helper method to check if a point is within a polygon (simplified)
  private static isPointInPolygon(point: GeoLocation, polygon: GeoLocation[]): boolean {
    // Simplified point-in-polygon algorithm (ray casting)
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if (((polygon[i].latitude > point.latitude) !== (polygon[j].latitude > point.latitude)) &&
          (point.longitude < (polygon[j].longitude - polygon[i].longitude) * (point.latitude - polygon[i].latitude) / (polygon[j].latitude - polygon[i].latitude) + polygon[i].longitude)) {
        inside = !inside;
      }
    }
    return inside;
  }
}

// Constants
export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'Pending Assignment',
  assigned: 'Assigned',
  accepted: 'Accepted by Agent',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export const AGENT_STATUS_LABELS: Record<AgentStatus, string> = {
  offline: 'Offline',
  available: 'Available',
  busy: 'Busy',
  on_break: 'On Break',
};

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  bicycle: 'Bicycle',
  motorcycle: 'Motorcycle',
  car: 'Car',
  scooter: 'Scooter',
  walking: 'Walking',
};

// Type Guards
export const isValidDeliveryStatus = (status: string): status is DeliveryStatus => {
  return DeliveryStatusSchema.safeParse(status).success;
};

export const isValidAgentStatus = (status: string): status is AgentStatus => {
  return AgentStatusSchema.safeParse(status).success;
};

export const isValidVehicleType = (type: string): type is VehicleType => {
  return VehicleTypeSchema.safeParse(type).success;
};