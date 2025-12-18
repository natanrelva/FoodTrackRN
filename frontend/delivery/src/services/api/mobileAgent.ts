import type {
  Delivery,
  GeoLocation,
} from '@foodtrack/types';

import type {
  OrderQueueItem,
  ApiResponse
} from '../../types';

import { deliveryApiService, DeliveryApiHelpers } from './delivery';

// Mobile Agent specific service for delivery personnel
class MobileAgentService {
  private agentId: string | null = null;
  private locationWatchId: number | null = null;
  private isTrackingLocation = false;

  constructor() {
    // Get agent ID from localStorage or authentication context
    this.agentId = localStorage.getItem('currentAgentId');
  }

  setAgentId(agentId: string) {
    this.agentId = agentId;
    localStorage.setItem('currentAgentId', agentId);
  }

  getAgentId(): string | null {
    return this.agentId;
  }

  // Requirement 4.1: Get available assignments for mobile agent
  async getMyAssignments(): Promise<ApiResponse<OrderQueueItem[]>> {
    if (!this.agentId) {
      return {
        success: false,
        error: { code: 'NO_AGENT_ID', message: 'Agent ID not set' }
      };
    }

    return deliveryApiService.getAgentAssignedOrders(this.agentId);
  }

  async getAvailableOrders(): Promise<ApiResponse<OrderQueueItem[]>> {
    return deliveryApiService.getAvailableAssignments(this.agentId || undefined);
  }

  // Requirement 4.2: Accept/decline delivery assignments
  async acceptDelivery(deliveryId: string): Promise<ApiResponse<Delivery>> {
    if (!this.agentId) {
      return {
        success: false,
        error: { code: 'NO_AGENT_ID', message: 'Agent ID not set' }
      };
    }

    return deliveryApiService.acceptDeliveryAssignment(deliveryId, this.agentId);
  }

  async declineDelivery(deliveryId: string, reason: string): Promise<ApiResponse<void>> {
    if (!this.agentId) {
      return {
        success: false,
        error: { code: 'NO_AGENT_ID', message: 'Agent ID not set' }
      };
    }

    return deliveryApiService.declineDeliveryAssignment(deliveryId, this.agentId, reason);
  }

  // Requirement 4.5: Location tracking and status updates
  async updateMyLocation(location: GeoLocation): Promise<ApiResponse<void>> {
    if (!this.agentId) {
      return {
        success: false,
        error: { code: 'NO_AGENT_ID', message: 'Agent ID not set' }
      };
    }

    return deliveryApiService.updateAgentLocation(this.agentId, location);
  }

  async updateDeliveryStatus(
    deliveryId: string,
    status: string,
    location?: GeoLocation,
    notes?: string
  ): Promise<ApiResponse<Delivery>> {
    return deliveryApiService.updateDeliveryStatus(deliveryId, status, location, notes);
  }

  async trackDelivery(deliveryId: string, location: GeoLocation): Promise<ApiResponse<void>> {
    if (!this.agentId) {
      return {
        success: false,
        error: { code: 'NO_AGENT_ID', message: 'Agent ID not set' }
      };
    }

    return deliveryApiService.trackDeliveryLocation(deliveryId, this.agentId, location);
  }

  // Requirement 4.4: Delivery completion workflow
  async confirmPickup(
    deliveryId: string,
    location: GeoLocation,
    photo?: string,
    notes?: string
  ): Promise<ApiResponse<Delivery>> {
    if (!this.agentId) {
      return {
        success: false,
        error: { code: 'NO_AGENT_ID', message: 'Agent ID not set' }
      };
    }

    return deliveryApiService.confirmPickup(deliveryId, this.agentId, location, photo, notes);
  }

  async confirmDelivery(
    deliveryId: string,
    location: GeoLocation,
    signature?: string,
    photo?: string,
    notes?: string
  ): Promise<ApiResponse<Delivery>> {
    if (!this.agentId) {
      return {
        success: false,
        error: { code: 'NO_AGENT_ID', message: 'Agent ID not set' }
      };
    }

    return deliveryApiService.confirmDelivery(deliveryId, this.agentId, location, signature, photo, notes);
  }

  async finalizeDelivery(
    deliveryId: string,
    completionData: {
      location: GeoLocation;
      signature?: string;
      photo?: string;
      notes?: string;
      customerRating?: number;
      deliveryTime: number;
    }
  ): Promise<ApiResponse<Delivery>> {
    if (!this.agentId) {
      return {
        success: false,
        error: { code: 'NO_AGENT_ID', message: 'Agent ID not set' }
      };
    }

    return deliveryApiService.finalizeDelivery(deliveryId, this.agentId, completionData);
  }

  async reportIssue(
    deliveryId: string,
    issueType: string,
    description: string,
    location?: GeoLocation,
    photo?: string
  ): Promise<ApiResponse<void>> {
    if (!this.agentId) {
      return {
        success: false,
        error: { code: 'NO_AGENT_ID', message: 'Agent ID not set' }
      };
    }

    return deliveryApiService.reportDeliveryIssue(deliveryId, this.agentId, issueType, description, location, photo);
  }

  // Agent status management
  async updateMyStatus(status: string): Promise<ApiResponse<any>> {
    if (!this.agentId) {
      return {
        success: false,
        error: { code: 'NO_AGENT_ID', message: 'Agent ID not set' }
      };
    }

    return deliveryApiService.updateAgentStatus(this.agentId, status);
  }

  // Location tracking utilities
  startLocationTracking(
    onLocationUpdate?: (location: GeoLocation) => void,
    onError?: (error: GeolocationPositionError) => void
  ): boolean {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser');
      return false;
    }

    if (this.isTrackingLocation) {
      console.warn('Location tracking is already active');
      return true;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000, // 30 seconds
    };

    this.locationWatchId = navigator.geolocation.watchPosition(
      (position) => {
        const location: GeoLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp),
        };

        // Update agent location on server
        this.updateMyLocation(location).catch(error => {
          console.error('Failed to update agent location:', error);
        });

        // Call callback if provided
        if (onLocationUpdate) {
          onLocationUpdate(location);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        if (onError) {
          onError(error);
        }
      },
      options
    );

    this.isTrackingLocation = true;
    return true;
  }

  stopLocationTracking(): void {
    if (this.locationWatchId !== null) {
      navigator.geolocation.clearWatch(this.locationWatchId);
      this.locationWatchId = null;
    }
    this.isTrackingLocation = false;
  }

  isLocationTrackingActive(): boolean {
    return this.isTrackingLocation;
  }

  // Get current location once
  async getCurrentLocation(): Promise<GeoLocation> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // 1 minute
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: GeoLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp),
          };
          resolve(location);
        },
        (error) => {
          reject(error);
        },
        options
      );
    });
  }

  // Utility methods for mobile workflow
  async startDeliveryWorkflow(deliveryId: string): Promise<{
    success: boolean;
    error?: string;
    location?: GeoLocation;
  }> {
    try {
      // Get current location
      const location = await this.getCurrentLocation();
      
      // Update delivery status to "picked_up"
      const response = await this.updateDeliveryStatus(deliveryId, 'picked_up', location);
      
      if (response.success) {
        // Start location tracking for this delivery
        this.startLocationTracking((location) => {
          this.trackDelivery(deliveryId, location).catch(error => {
            console.error('Failed to track delivery location:', error);
          });
        });
        
        return { success: true, location };
      } else {
        return { 
          success: false, 
          error: DeliveryApiHelpers.formatError(response.error) 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to start delivery workflow' 
      };
    }
  }

  async completeDeliveryWorkflow(
    deliveryId: string,
    completionData: {
      signature?: string;
      photo?: string;
      notes?: string;
      customerRating?: number;
    }
  ): Promise<{
    success: boolean;
    error?: string;
    delivery?: Delivery;
  }> {
    try {
      // Get current location
      const location = await this.getCurrentLocation();
      
      // Calculate delivery time (this would typically come from the delivery start time)
      // const deliveryTime = Date.now(); // Simplified for this example
      
      // Finalize the delivery
      const response = await this.finalizeDelivery(deliveryId, {
        location,
        deliveryTime: 0, // This should be calculated properly
        ...completionData,
      });
      
      if (response.success) {
        // Stop location tracking
        this.stopLocationTracking();
        
        return { success: true, delivery: response.data };
      } else {
        return { 
          success: false, 
          error: DeliveryApiHelpers.formatError(response.error) 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to complete delivery workflow' 
      };
    }
  }

  // Batch operations for efficiency
  async syncPendingActions(): Promise<{
    success: boolean;
    syncedActions: number;
    errors: string[];
  }> {
    // This would sync any offline actions when connection is restored
    // For now, it's a placeholder for future offline functionality
    return {
      success: true,
      syncedActions: 0,
      errors: [],
    };
  }

  // Cleanup method
  cleanup(): void {
    this.stopLocationTracking();
    this.agentId = null;
    localStorage.removeItem('currentAgentId');
  }
}

// Create and export a singleton instance
export const mobileAgentService = new MobileAgentService();

// Export the class for testing or custom instances
export { MobileAgentService };

// Mobile Agent specific helpers
export const MobileAgentHelpers = {
  // Format delivery status for mobile display
  formatStatusForMobile(status: string): { text: string; color: string; icon: string } {
    const statusMap: Record<string, { text: string; color: string; icon: string }> = {
      'pending': { text: 'Pendente', color: 'text-yellow-600', icon: '⏳' },
      'assigned': { text: 'Atribuído', color: 'text-blue-600', icon: '📋' },
      'picked_up': { text: 'Coletado', color: 'text-orange-600', icon: '📦' },
      'in_transit': { text: 'Em Trânsito', color: 'text-purple-600', icon: '🚗' },
      'delivered': { text: 'Entregue', color: 'text-green-600', icon: '✅' },
      'failed': { text: 'Falhou', color: 'text-red-600', icon: '❌' },
      'cancelled': { text: 'Cancelado', color: 'text-gray-600', icon: '🚫' },
    };
    
    return statusMap[status] || { text: status, color: 'text-gray-600', icon: '❓' };
  },

  // Calculate estimated arrival time
  calculateETA(distance: number, averageSpeed: number = 30): number {
    // distance in km, speed in km/h, returns minutes
    return Math.round((distance / averageSpeed) * 60);
  },

  // Format distance for mobile display
  formatDistance(distance: number): string {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    } else {
      return `${distance.toFixed(1)}km`;
    }
  },

  // Validate required fields for delivery completion
  validateDeliveryCompletion(data: {
    signature?: string;
    photo?: string;
    notes?: string;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Add validation rules as needed
    if (!data.signature && !data.photo) {
      errors.push('Either signature or photo is required for delivery confirmation');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  },

  // Check if location permissions are granted
  async checkLocationPermission(): Promise<{
    granted: boolean;
    error?: string;
  }> {
    if (!navigator.geolocation) {
      return { granted: false, error: 'Geolocation not supported' };
    }

    if (!navigator.permissions) {
      // Fallback for browsers without permissions API
      return { granted: true };
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return { granted: permission.state === 'granted' };
    } catch (error) {
      return { granted: false, error: 'Failed to check location permission' };
    }
  },

  // Request location permission
  async requestLocationPermission(): Promise<{
    granted: boolean;
    error?: string;
  }> {
    try {
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
        });
      });
      
      return { granted: true };
    } catch (error) {
      return { 
        granted: false, 
        error: error instanceof Error ? error.message : 'Location permission denied' 
      };
    }
  },
};