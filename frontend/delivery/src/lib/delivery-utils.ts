import { 
  DeliveryStatus, 
  AgentStatus, 
  VehicleType, 
  GeoLocation,
  DeliveryAgent,
  Delivery,
  DELIVERY_STATUS_LABELS,
  AGENT_STATUS_LABELS,
  VEHICLE_TYPE_LABELS
} from '@foodtrack/types';

// Status validation utilities
export class DeliveryStatusUtils {
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

  static getStatusLabel(status: DeliveryStatus): string {
    return DELIVERY_STATUS_LABELS[status] || status;
  }

  static getStatusColor(status: DeliveryStatus): string {
    const colors: Record<DeliveryStatus, string> = {
      pending: 'bg-gray-100 text-gray-800',
      assigned: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      picked_up: 'bg-yellow-100 text-yellow-800',
      in_transit: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  static isTerminalStatus(status: DeliveryStatus): boolean {
    return ['delivered', 'cancelled'].includes(status);
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
      on_break: 'bg-yellow-100 text-yellow-800',
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
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.latitude)) * 
      Math.cos(this.toRadians(point2.latitude)) * 
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
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
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
      bicycle: 15,
      scooter: 25,
      motorcycle: 35,
      car: 30, // Considering city traffic
    };

    const speed = speeds[vehicleType] || speeds.bicycle;
    const travelTimeHours = distance / speed;
    const travelTimeMinutes = travelTimeHours * 60;
    
    // Add buffer time (20% of travel time, minimum 5 minutes)
    const bufferMinutes = Math.max(5, travelTimeMinutes * 0.2);
    const totalMinutes = travelTimeMinutes + bufferMinutes;

    return TimeUtils.addMinutes(pickupTime, totalMinutes);
  }

  static getDeliveryProgress(delivery: Delivery): number {
    const statusProgress: Record<DeliveryStatus, number> = {
      pending: 0,
      assigned: 20,
      accepted: 40,
      picked_up: 60,
      in_transit: 80,
      delivered: 100,
      failed: 0,
      cancelled: 0,
    };
    return statusProgress[delivery.status] || 0;
  }

  static canAssignToAgent(agent: DeliveryAgent, _deliveryLocation: GeoLocation): boolean {
    // Check if agent is available
    if (!AgentUtils.isAvailable(agent)) {
      return false;
    }

    // Check if delivery location is within agent's zones (simplified check)
    if (agent.deliveryZones.length === 0) {
      return true; // No zone restrictions
    }

    // For now, just check if any zone is active
    return agent.deliveryZones.some(zone => zone.isActive);
  }
}

// Validation utilities
export class ValidationUtils {
  static validateGeoLocation(location: Partial<GeoLocation>): string[] {
    const errors: string[] = [];
    
    if (typeof location.latitude !== 'number') {
      errors.push('Latitude is required and must be a number');
    } else if (!LocationUtils.isValidCoordinate(location.latitude, 0)) {
      errors.push('Latitude must be between -90 and 90');
    }
    
    if (typeof location.longitude !== 'number') {
      errors.push('Longitude is required and must be a number');
    } else if (!LocationUtils.isValidCoordinate(0, location.longitude)) {
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
    // First sort by priority
    const priorityDiff = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Then by estimated delivery time
    return a.estimatedDeliveryTime.getTime() - b.estimatedDeliveryTime.getTime();
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
  return agents.filter(agent => AgentUtils.isAvailable(agent));
}