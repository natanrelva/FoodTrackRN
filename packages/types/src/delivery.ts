// Delivery Types - Frontend Interfaces

// Core Delivery Types (matching backend models)
export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: Date;
}

export type VehicleType = 'bicycle' | 'motorcycle' | 'car' | 'scooter' | 'walking';

export type AgentStatus = 'offline' | 'available' | 'busy' | 'on_break';

export type DeliveryStatus = 
  | 'pending'      // Maps to Order.pending
  | 'assigned'     // New delivery status
  | 'accepted'     // New delivery status  
  | 'picked_up'    // Maps to Order.ready
  | 'in_transit'   // Maps to Order.delivering
  | 'delivered'    // Maps to Order.delivered
  | 'failed'       // New delivery status
  | 'cancelled';   // Maps to Order.cancelled

export interface DeliveryZone {
  id: string;
  name: string;
  coordinates: GeoLocation[];
  isActive: boolean;
}

export interface NavigationStep {
  instruction: string;
  distance: number;
  duration: number;
  startLocation: GeoLocation;
  endLocation: GeoLocation;
}

export interface TrafficData {
  level: 'low' | 'moderate' | 'heavy' | 'severe';
  delayMinutes: number;
  updatedAt: Date;
}

export interface Route {
  id: string;
  waypoints: GeoLocation[];
  optimizedSequence: number[];
  totalDistance: number;
  estimatedDuration: number;
  navigationSteps: NavigationStep[];
  trafficConditions?: TrafficData;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryAgent {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  vehicleType: VehicleType;
  currentLocation: GeoLocation | null;
  status: AgentStatus;
  deliveryZones: DeliveryZone[];
  maxConcurrentDeliveries: number;
  currentDeliveries: string[];
  rating: number;
  totalDeliveries: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryIssue {
  id: string;
  deliveryId: string;
  type: 'address_not_found' | 'customer_unavailable' | 'vehicle_breakdown' | 'weather' | 'other';
  description: string;
  reportedBy: string;
  reportedAt: Date;
  resolvedAt?: Date;
  resolution?: string;
}

export interface DeliveryConfirmation {
  deliveryId: string;
  type: 'pickup' | 'delivery';
  timestamp: Date;
  location: GeoLocation;
  photo?: string;
  signature?: string;
  notes?: string;
  confirmedBy: string;
}

export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates?: GeoLocation;
}

export interface Delivery {
  id: string;
  orderId: string;
  tenantId: string;
  agentId: string | null;
  status: DeliveryStatus;
  pickupLocation: Address;
  deliveryLocation: Address;
  estimatedPickupTime: Date;
  estimatedDeliveryTime: Date;
  actualPickupTime: Date | null;
  actualDeliveryTime: Date | null;
  route: Route | null;
  specialInstructions?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  deliveryFee: number;
  pickupConfirmation: DeliveryConfirmation | null;
  deliveryConfirmation: DeliveryConfirmation | null;
  issues: DeliveryIssue[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TimePeriod {
  start: Date;
  end: Date;
}

export interface DeliveryMetrics {
  totalDeliveries: number;
  successfulDeliveries: number;
  averageDeliveryTime: number;
  onTimeDeliveryRate: number;
  customerSatisfactionScore: number;
  agentUtilizationRate: number;
  routeEfficiencyScore: number;
  period: TimePeriod;
}

export interface AgentPerformance {
  agentId: string;
  deliveriesCompleted: number;
  averageDeliveryTime: number;
  onTimeRate: number;
  customerRating: number;
  distanceTraveled: number;
  hoursWorked: number;
  period: TimePeriod;
}

export interface DeliveryFilters {
  status?: DeliveryStatus[];
  agentId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  zone?: string;
  priority?: ('low' | 'normal' | 'high' | 'urgent')[];
  page?: number;
  limit?: number;
}

export interface RouteConstraints {
  maxDistance?: number;
  maxDuration?: number;
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  vehicleType?: VehicleType;
}

// Frontend-specific delivery interfaces
export interface DeliveryDashboardData {
  activeDeliveries: number;
  availableAgents: number;
  averageDeliveryTime: number;
  pendingOrders: number;
}

export interface OrderQueueItem {
  id: string;
  orderNumber: string;
  customerName: string;
  address: string;
  distance: number;
  preparationTime: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'ready' | 'preparing';
}

export interface ActiveDeliveryItem {
  id: string;
  agentName: string;
  orderNumber: string;
  customerAddress: string;
  estimatedArrival: number; // minutes
  status: DeliveryStatus;
  currentLocation?: GeoLocation;
}

export interface AgentLocationData {
  agentId: string;
  location: GeoLocation;
  timestamp: Date;
  accuracy?: number;
}

export interface DeliveryStatusData {
  deliveryId: string;
  status: DeliveryStatus;
  timestamp: Date;
  location?: GeoLocation;
  notes?: string;
}

export interface OrderAssignmentData {
  orderId: string;
  agentId: string;
  estimatedPickupTime: Date;
  estimatedDeliveryTime: Date;
  route?: Route;
}

export interface AssignmentData {
  deliveryId: string;
  agentId: string;
  agentName: string;
  estimatedTime: number;
  route: Route;
}

export interface RouteData {
  deliveryId: string;
  route: Route;
  updatedAt: Date;
}

// Mobile Agent Interface Types
export interface AssignedOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  pickupAddress: string;
  deliveryAddress: string;
  items: OrderItemSummary[];
  specialInstructions?: string;
  estimatedTime: number;
  distance: number;
  status: DeliveryStatus;
}

export interface OrderItemSummary {
  name: string;
  quantity: number;
  notes?: string;
}

export interface OrderAcceptance {
  deliveryId: string;
  accepted: boolean;
  estimatedArrival?: number;
  reason?: string; // if declined
}

export interface PickupConfirmation {
  deliveryId: string;
  timestamp: Date;
  location: GeoLocation;
  photo?: string;
  notes?: string;
}

export interface DeliveryConfirmationRequest {
  deliveryId: string;
  timestamp: Date;
  location: GeoLocation;
  signature?: string;
  photo?: string;
  notes?: string;
}

export interface IssueReport {
  deliveryId: string;
  type: 'address_not_found' | 'customer_unavailable' | 'vehicle_breakdown' | 'weather' | 'other';
  description: string;
  location?: GeoLocation;
  photo?: string;
}

// Real-time Communication Types
export interface LocationUpdate {
  agentId: string;
  location: GeoLocation;
  timestamp: Date;
}

export interface StatusChange {
  deliveryId: string;
  status: DeliveryStatus;
  timestamp: Date;
  location?: GeoLocation;
}

export interface OrderAssignment {
  deliveryId: string;
  agentId: string;
  orderDetails: AssignedOrder;
}

// Analytics and Performance Types
export interface DeliveryAnalytics {
  totalDeliveries: number;
  successRate: number;
  averageTime: number;
  onTimeRate: number;
  customerSatisfaction: number;
  topPerformingAgents: AgentPerformanceSummary[];
  deliveryTrends: DeliveryTrendData[];
}

export interface AgentPerformanceSummary {
  agentId: string;
  name: string;
  deliveriesCompleted: number;
  averageTime: number;
  rating: number;
  onTimeRate: number;
}

export interface DeliveryTrendData {
  date: string;
  deliveries: number;
  averageTime: number;
  successRate: number;
}

// Map and Navigation Types
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapMarker {
  id: string;
  position: GeoLocation;
  type: 'agent' | 'pickup' | 'delivery' | 'restaurant';
  title: string;
  status?: string;
  icon?: string;
}

export interface NavigationRequest {
  from: GeoLocation;
  to: GeoLocation;
  waypoints?: GeoLocation[];
  vehicleType?: VehicleType;
  avoidTolls?: boolean;
  avoidHighways?: boolean;
}

export interface NavigationResponse {
  route: Route;
  alternativeRoutes?: Route[];
  estimatedTime: number;
  distance: number;
}

// Error and Validation Types
export interface DeliveryError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface DeliveryValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Filter and Search Types
export interface DeliverySearchFilters {
  status?: DeliveryStatus[];
  agentId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  zone?: string;
  priority?: ('low' | 'normal' | 'high' | 'urgent')[];
}

export interface AgentSearchFilters {
  status?: AgentStatus[];
  vehicleType?: VehicleType[];
  zone?: string;
  availability?: boolean;
}

// Pagination Types
export interface PaginatedDeliveries {
  deliveries: Delivery[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PaginatedAgents {
  agents: DeliveryAgent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// WebSocket Event Types
export interface DeliveryWebSocketEvents {
  // Outgoing events
  'agent:location-update': LocationUpdate;
  'delivery:status-change': StatusChange;
  'order:assignment': OrderAssignment;
  
  // Incoming events
  'agent:location-updated': AgentLocationData;
  'delivery:status-updated': DeliveryStatusData;
  'order:assigned': AssignmentData;
  'route:optimized': RouteData;
}

// Configuration Types
export interface DeliveryConfig {
  mapProvider: 'google' | 'mapbox' | 'osm';
  apiKey?: string;
  defaultZoom: number;
  maxDeliveryRadius: number; // in kilometers
  trackingInterval: number; // in seconds
  routeOptimization: boolean;
  realTimeUpdates: boolean;
}

// Constants
export const DELIVERY_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export const ISSUE_TYPES = ['address_not_found', 'customer_unavailable', 'vehicle_breakdown', 'weather', 'other'] as const;
export const CONFIRMATION_TYPES = ['pickup', 'delivery'] as const;

// Status Labels for UI
export const DELIVERY_STATUS_LABELS = {
  pending: 'Pending Assignment',
  assigned: 'Assigned',
  accepted: 'Accepted by Agent',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  failed: 'Failed',
  cancelled: 'Cancelled',
} as const;

export const AGENT_STATUS_LABELS = {
  offline: 'Offline',
  available: 'Available',
  busy: 'Busy',
  on_break: 'On Break',
} as const;

export const VEHICLE_TYPE_LABELS = {
  bicycle: 'Bicycle',
  motorcycle: 'Motorcycle',
  car: 'Car',
  scooter: 'Scooter',
  walking: 'Walking',
} as const;