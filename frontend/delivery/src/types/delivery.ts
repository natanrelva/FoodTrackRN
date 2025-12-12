// Local delivery types for the frontend application
import type {
  DeliveryStatus,
  AgentStatus,
  GeoLocation,
  Route
} from '@foodtrack/types';

// Re-export all shared types for convenience
export type {
  Delivery,
  DeliveryAgent,
  DeliveryStatus,
  AgentStatus,
  GeoLocation,
  Route,
  DeliveryMetrics,
  AgentPerformance,
  VehicleType,
  DeliveryZone,
  NavigationStep,
  TrafficData,
  DeliveryIssue,
  DeliveryConfirmation,
  Address,
  TimePeriod,
  DeliveryFilters,
  RouteConstraints
} from '@foodtrack/types';

// Dashboard-specific types
export interface DashboardStats {
  activeDeliveries: number;
  availableAgents: number;
  averageDeliveryTime: number;
  pendingOrders: number;
  onTimeDeliveryRate: number;
  totalDeliveriesToday: number;
}

export interface OrderQueueItem {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  address: string;
  distance: number;
  preparationTime: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'ready' | 'preparing';
  estimatedReadyTime: Date;
  items: OrderItemSummary[];
  specialInstructions?: string;
}

export interface OrderItemSummary {
  name: string;
  quantity: number;
  notes?: string;
}

export interface ActiveDeliveryItem {
  id: string;
  deliveryId: string;
  agentId: string;
  agentName: string;
  orderNumber: string;
  customerName: string;
  customerAddress: string;
  estimatedArrival: number; // minutes from now
  status: DeliveryStatus;
  currentLocation?: GeoLocation;
  route?: Route;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface AgentSummary {
  id: string;
  name: string;
  status: AgentStatus;
  currentLocation?: GeoLocation;
  activeDeliveries: number;
  maxDeliveries: number;
  vehicleType: string;
  rating: number;
  estimatedAvailability?: Date;
}

// Assignment and routing types
export interface DeliveryAssignment {
  orderId: string;
  agentId: string;
  estimatedPickupTime: Date;
  estimatedDeliveryTime: Date;
  route?: Route;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface BatchAssignment {
  agentId: string;
  orderIds: string[];
  optimizedRoute: Route;
  totalEstimatedTime: number;
  totalDistance: number;
}

export interface RouteOptimizationRequest {
  agentId: string;
  orderIds: string[];
  constraints?: {
    maxDistance?: number;
    maxDuration?: number;
    avoidTolls?: boolean;
    avoidHighways?: boolean;
  };
}

export interface RouteOptimizationResult {
  optimizedRoute: Route;
  estimatedTotalTime: number;
  totalDistance: number;
  waypoints: Array<{
    orderId: string;
    type: 'pickup' | 'delivery';
    address: string;
    estimatedArrival: Date;
  }>;
}

// Real-time tracking types
export interface LiveTrackingData {
  agentId: string;
  deliveryId: string;
  currentLocation: GeoLocation;
  speed: number; // km/h
  heading: number; // degrees
  accuracy: number; // meters
  timestamp: Date;
  batteryLevel?: number;
  isOnline: boolean;
}

export interface DeliveryUpdate {
  deliveryId: string;
  status: DeliveryStatus;
  timestamp: Date;
  location?: GeoLocation;
  notes?: string;
  photo?: string;
  estimatedArrival?: Date;
}

// Map and visualization types
export interface MapMarker {
  id: string;
  position: GeoLocation;
  type: 'agent' | 'pickup' | 'delivery' | 'restaurant';
  title: string;
  subtitle?: string;
  status?: string;
  icon?: string;
  color?: string;
  onClick?: () => void;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapViewport {
  center: GeoLocation;
  zoom: number;
  bounds?: MapBounds;
}

// Analytics and reporting types
export interface DeliveryAnalytics {
  period: {
    start: Date;
    end: Date;
  };
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  averageDeliveryTime: number;
  onTimeDeliveryRate: number;
  customerSatisfactionScore: number;
  topPerformingAgents: AgentPerformanceSummary[];
  deliveryTrends: DeliveryTrendData[];
  zonePerformance: ZonePerformanceData[];
}

export interface AgentPerformanceSummary {
  agentId: string;
  name: string;
  deliveriesCompleted: number;
  averageDeliveryTime: number;
  onTimeRate: number;
  customerRating: number;
  totalDistance: number;
  hoursWorked: number;
}

export interface DeliveryTrendData {
  date: string;
  deliveries: number;
  averageTime: number;
  successRate: number;
  revenue: number;
}

export interface ZonePerformanceData {
  zoneId: string;
  zoneName: string;
  deliveries: number;
  averageTime: number;
  successRate: number;
  agentCount: number;
}

// Form and input types
export interface DeliverySearchFilters {
  status?: DeliveryStatus[];
  agentId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  zone?: string;
  priority?: ('low' | 'normal' | 'high' | 'urgent')[];
  search?: string;
}

export interface AgentFilters {
  status?: AgentStatus[];
  vehicleType?: string[];
  zone?: string;
  availability?: 'available' | 'busy' | 'all';
}

// API response types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

// WebSocket event types
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: Date;
}

export interface LocationUpdateMessage extends WebSocketMessage {
  type: 'location_update';
  payload: {
    agentId: string;
    location: GeoLocation;
    accuracy: number;
  };
}

export interface StatusUpdateMessage extends WebSocketMessage {
  type: 'status_update';
  payload: {
    deliveryId: string;
    status: DeliveryStatus;
    location?: GeoLocation;
    notes?: string;
  };
}

export interface AssignmentMessage extends WebSocketMessage {
  type: 'assignment';
  payload: {
    deliveryId: string;
    agentId: string;
    orderDetails: OrderQueueItem;
  };
}

// Error types
export interface DeliveryError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Configuration types
export interface DeliveryConfig {
  mapProvider: 'google' | 'mapbox' | 'osm';
  apiKey?: string;
  defaultZoom: number;
  maxDeliveryRadius: number;
  trackingInterval: number;
  routeOptimization: boolean;
  realTimeUpdates: boolean;
  autoAssignment: boolean;
  notifications: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
  };
}

// Mobile agent specific types
export interface MobileAgentState {
  agentId: string;
  isOnline: boolean;
  currentLocation?: GeoLocation;
  assignedDeliveries: string[];
  activeDelivery?: string;
  batteryLevel?: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
}

export interface DeliveryAction {
  type: 'pickup' | 'delivery' | 'issue' | 'location_update';
  deliveryId: string;
  timestamp: Date;
  location: GeoLocation;
  data?: {
    photo?: string;
    signature?: string;
    notes?: string;
    issueType?: string;
    issueDescription?: string;
  };
}

// Notification types
export interface DeliveryNotification {
  id: string;
  type: 'assignment' | 'status_change' | 'issue' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  data?: Record<string, any>;
  actions?: Array<{
    label: string;
    action: string;
    style?: 'primary' | 'secondary' | 'danger';
  }>;
}