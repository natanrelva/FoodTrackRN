import { 
  DeliveryStatus, 
  DELIVERY_STATUS_LABELS
} from '@foodtrack/types';

// Local types for delivery app
export type AgentStatus = 'available' | 'busy' | 'offline' | 'break';
export type VehicleType = 'bike' | 'motorcycle' | 'car' | 'walking';

export interface GeoLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: Date;
}

export interface DeliveryAgent {
  id: string;
  name: string;
  phone: string;
  status: AgentStatus;
  vehicleType: VehicleType;
  currentLocation?: GeoLocation;
  rating: number;
  totalDeliveries: number;
  currentDeliveries: string[]; // Array of delivery IDs
  maxConcurrentDeliveries: number;
}

export interface Delivery {
  id: string;
  orderId: string;
  agentId?: string;
  status: DeliveryStatus;
  pickupLocation: GeoLocation;
  deliveryLocation: GeoLocation;
  estimatedTime?: number;
  actualTime?: number;
  distance?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Local constants
export const AGENT_STATUS_LABELS: Record<AgentStatus, string> = {
  available: 'Available',
  busy: 'Busy',
  offline: 'Offline',
  break: 'On Break',
};

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  bike: 'Bicycle',
  motorcycle: 'Motorcycle',
  car: 'Car',
  walking: 'Walking',
};

// Status validation utilities
export class DeliveryStatusUtils {
  static isValidTransition(currentStatus: DeliveryStatus, newStatus: DeliveryStatus): boolean {
    const validTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
      pending: ['assigned'],
      assigned: ['picked_up'],
      picked_up: ['in_transit'],
      in_transit: ['delivered', 'failed'],
      delivered: [], // Terminal state
      failed: ['assigned'], // Can be reassigned
    };

    return validTransitions[currentStatus]?.includes(newStatus) ?? false;
  }

  static getStatusLabel(status: DeliveryStatus): string {
    return DELIVERY_STATUS_LABELS[status] || status;
  }

  static getStatusColor(status: DeliveryStatus): string {
    const colors: Record<DeliveryStatus, string> = {
      pending: 'bg-gray-100 text-gray-800',
      assigned: 'bg-blue-100 text-blue-800',
      picked_up: 'bg-yellow-100 text-yellow-800',
      in_transit: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  static isTerminalStatus(status: DeliveryStatus): boolean {
    return ['delivered', 'failed'].includes(status);
  }

  static isActiveStatus(status: DeliveryStatus): boolean {
    return ['assigned', 'accepted', 'picked_up', 'in_transit'].includes(status);
  }
}

// Agent utilities
export class AgentUtils {
  static getStatusLabel(status: AgentStatus): string {
    return AGENT_STATUS_LABELS[status] || status;
  }

  static getStatusColor(status: AgentStatus): string {
    const colors: Record<AgentStatus, string> = {
      offline: 'bg-gray-100 text-gray-800',
      available: 'bg-green-100 text-green-800',
      busy: 'bg-red-100 text-red-800',
      break: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  static getVehicleLabel(vehicleType: VehicleType): string {
    return VEHICLE_TYPE_LABELS[vehicleType] || vehicleType;
  }

  static isAvailable(agent: DeliveryAgent): boolean {
    return agent.status === 'available' && 
           agent.currentDeliveries.length < agent.maxConcurrentDeliveries;
  }

  static getCapacityPercentage(agent: DeliveryAgent): number {
    return (agent.currentDeliveries.length / agent.maxConcurrentDeliveries) * 100;
  }
}

// Location utilities
export class LocationUtils {
  // Calculate distance between two points using Haversine formula
  static calculateDistance(point1: GeoLocation, point2: GeoLocation): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLon = this.toRadians(point2.lng - point1.lng);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.lat)) * 
      Math.cos(this.toRadians(point2.lat)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  static formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`;
    }
    return `${distanceKm.toFixed(1)}km`;
  }

  static isValidCoordinate(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  static formatCoordinates(location: GeoLocation): string {
    return `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
  }
}

// Time utilities
export class TimeUtils {
  static formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  static formatETA(date: Date): string {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    
    if (diffMinutes < 0) {
      return 'Overdue';
    }
    
    return `${this.formatDuration(diffMinutes)}`;
  }

  static isOverdue(estimatedTime: Date): boolean {
    return new Date() > estimatedTime;
  }

  static addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60000);
  }
}

// Delivery utilities
export class DeliveryUtils {
  static getPriorityColor(priority: 'low' | 'normal' | 'high' | 'urgent'): string {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      normal: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };
    return colors[priority] || colors.normal;
  }

  static getPriorityLabel(priority: 'low' | 'normal' | 'high' | 'urgent'): string {
    const labels = {
      low: 'Low',
      normal: 'Normal',
      high: 'High',
      urgent: 'Urgent',
    };
    return labels[priority] || labels.normal;
  }

  static calculateEstimatedDeliveryTime(
    pickupTime: Date, 
    distance: number, 
    vehicleType: VehicleType
  ): Date {
    // Average speeds in km/h for different vehicle types
    const speeds: Record<VehicleType, number> = {
      walking: 5,
      bike: 15,
      motorcycle: 35,
      car: 30, // Considering city traffic
    };

    const speed = speeds[vehicleType] || speeds.bike;
    const travelTimeHours = distance / speed;
    const travelTimeMinutes = travelTimeHours * 60;
    
    // Add buffer time (20% of travel time, minimum 5 minutes)
    const bufferMinutes = Math.max(5, travelTimeMinutes * 0.2);
    const totalMinutes = travelTimeMinutes + bufferMinutes;

    return new Date(pickupTime.getTime() + totalMinutes * 60 * 1000);
  }

  static getDeliveryProgress(delivery: Delivery): number {
    const statusProgress: Record<DeliveryStatus, number> = {
      pending: 0,
      assigned: 20,
      picked_up: 60,
      in_transit: 80,
      delivered: 100,
      failed: 0,
    };
    return statusProgress[delivery.status] || 0;
  }

  static canAssignToAgent(agent: DeliveryAgent, _deliveryLocation: GeoLocation): boolean {
    // Check if agent is available
    return agent.status === 'available';
  }
}

// Validation utilities
export class ValidationUtils {
  static validateGeoLocation(location: Partial<GeoLocation>): string[] {
    const errors: string[] = [];
    
    if (typeof location.lat !== 'number') {
      errors.push('Latitude is required and must be a number');
    } else if (location.lat < -90 || location.lat > 90) {
      errors.push('Latitude must be between -90 and 90');
    }
    
    if (typeof location.lng !== 'number') {
      errors.push('Longitude is required and must be a number');
    } else if (location.lng < -180 || location.lng > 180) {
      errors.push('Longitude must be between -180 and 180');
    }
    
    return errors;
  }

  static validatePhoneNumber(phone: string): boolean {
    // Basic phone validation - adjust regex based on your requirements
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Constants for UI
export const DELIVERY_CONSTANTS = {
  DEFAULT_MAP_ZOOM: 13,
  MAX_DELIVERY_RADIUS: 50, // km
  TRACKING_INTERVAL: 30, // seconds
  ROUTE_REFRESH_INTERVAL: 300, // seconds (5 minutes)
  MAX_CONCURRENT_DELIVERIES: 5,
  DEFAULT_DELIVERY_FEE: 5.00,
} as const;

export const PRIORITY_ORDER: Record<'low' | 'normal' | 'high' | 'urgent', number> = {
  urgent: 4,
  high: 3,
  normal: 2,
  low: 1,
};

// Sort deliveries by priority and estimated time
export function sortDeliveriesByPriority(deliveries: Delivery[]): Delivery[] {
  return [...deliveries].sort((a, b) => {
    // Sort by creation time (newest first)
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

// Filter deliveries by status
export function filterDeliveriesByStatus(
  deliveries: Delivery[], 
  statuses: DeliveryStatus[]
): Delivery[] {
  if (statuses.length === 0) return deliveries;
  return deliveries.filter(delivery => statuses.includes(delivery.status));
}

// Filter agents by availability
export function filterAvailableAgents(agents: DeliveryAgent[]): DeliveryAgent[] {
  return agents.filter(agent => agent.status === 'available');
}