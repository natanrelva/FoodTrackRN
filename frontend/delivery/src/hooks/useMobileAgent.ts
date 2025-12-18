import { useState, useCallback, useEffect } from 'react';
import { mobileAgentService, MobileAgentHelpers } from '../services/api/mobileAgent';
import type {
  GeoLocation,
} from '@foodtrack/types';
import type {
  OrderQueueItem,
} from '../types';

interface MobileAgentState {
  agentId: string | null;
  isOnline: boolean;
  currentLocation: GeoLocation | null;
  assignedDeliveries: OrderQueueItem[];
  activeDelivery: string | null;
  isTrackingLocation: boolean;
  loading: boolean;
  error: string | null;
}

interface LocationState {
  current: GeoLocation | null;
  accuracy: number | null;
  lastUpdate: Date | null;
  permissionGranted: boolean;
  error: string | null;
}

// Main hook for mobile agent functionality
export function useMobileAgent() {
  const [state, setState] = useState<MobileAgentState>({
    agentId: mobileAgentService.getAgentId(),
    isOnline: navigator.onLine,
    currentLocation: null,
    assignedDeliveries: [],
    activeDelivery: null,
    isTrackingLocation: false,
    loading: false,
    error: null,
  });

  const [locationState, setLocationState] = useState<LocationState>({
    current: null,
    accuracy: null,
    lastUpdate: null,
    permissionGranted: false,
    error: null,
  });

  // Initialize agent
  const initializeAgent = useCallback(async (agentId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      mobileAgentService.setAgentId(agentId);
      
      // Check location permission
      const permission = await MobileAgentHelpers.checkLocationPermission();
      setLocationState(prev => ({ 
        ...prev, 
        permissionGranted: permission.granted,
        error: permission.error || null,
      }));
      
      setState(prev => ({ 
        ...prev, 
        agentId, 
        loading: false,
      }));
      
      // Fetch initial assignments
      await fetchMyAssignments();
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize agent';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, []);

  // Requirement 4.1: Fetch available assignments
  const fetchMyAssignments = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await mobileAgentService.getMyAssignments();
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          assignedDeliveries: response.data!,
          loading: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: response.error?.message || 'Failed to fetch assignments',
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch assignments',
      }));
    }
  }, []);

  const fetchAvailableOrders = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await mobileAgentService.getAvailableOrders();
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          assignedDeliveries: response.data!,
          loading: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: response.error?.message || 'Failed to fetch available orders',
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch available orders',
      }));
    }
  }, []);

  // Requirement 4.2: Accept/decline assignments
  const acceptDelivery = useCallback(async (deliveryId: string) => {
    try {
      const response = await mobileAgentService.acceptDelivery(deliveryId);
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          activeDelivery: deliveryId,
          assignedDeliveries: prev.assignedDeliveries.filter(d => d.id !== deliveryId),
        }));
        
        return { success: true, delivery: response.data };
      } else {
        return { 
          success: false, 
          error: response.error?.message || 'Failed to accept delivery' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to accept delivery' 
      };
    }
  }, []);

  const declineDelivery = useCallback(async (deliveryId: string, reason: string) => {
    try {
      const response = await mobileAgentService.declineDelivery(deliveryId, reason);
      
      if (response.success) {
        setState(prev => ({
          ...prev,
          assignedDeliveries: prev.assignedDeliveries.filter(d => d.id !== deliveryId),
        }));
        
        return { success: true };
      } else {
        return { 
          success: false, 
          error: response.error?.message || 'Failed to decline delivery' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to decline delivery' 
      };
    }
  }, []);

  // Requirement 4.5: Location tracking
  const startLocationTracking = useCallback(() => {
    const success = mobileAgentService.startLocationTracking(
      (location) => {
        setLocationState(prev => ({
          ...prev,
          current: location,
          accuracy: location.accuracy || null,
          lastUpdate: new Date(),
          error: null,
        }));
        
        setState(prev => ({ ...prev, currentLocation: location }));
      },
      (error) => {
        setLocationState(prev => ({
          ...prev,
          error: error.message,
        }));
      }
    );
    
    if (success) {
      setState(prev => ({ ...prev, isTrackingLocation: true }));
    }
    
    return success;
  }, []);

  const stopLocationTracking = useCallback(() => {
    mobileAgentService.stopLocationTracking();
    setState(prev => ({ ...prev, isTrackingLocation: false }));
  }, []);

  const getCurrentLocation = useCallback(async () => {
    try {
      const location = await mobileAgentService.getCurrentLocation();
      setLocationState(prev => ({
        ...prev,
        current: location,
        accuracy: location.accuracy || null,
        lastUpdate: new Date(),
        error: null,
      }));
      
      setState(prev => ({ ...prev, currentLocation: location }));
      
      return { success: true, location };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get current location';
      setLocationState(prev => ({ ...prev, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, []);

  // Requirement 4.4: Delivery completion workflow
  const startDeliveryWorkflow = useCallback(async (deliveryId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await mobileAgentService.startDeliveryWorkflow(deliveryId);
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          activeDelivery: deliveryId,
          isTrackingLocation: true,
          loading: false,
        }));
        
        if (result.location) {
          setLocationState(prev => ({
            ...prev,
            current: result.location!,
            lastUpdate: new Date(),
          }));
        }
        
        return { success: true };
      } else {
        setState(prev => ({ ...prev, loading: false, error: result.error || null }));
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start delivery workflow';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, []);

  const completeDeliveryWorkflow = useCallback(async (
    deliveryId: string,
    completionData: {
      signature?: string;
      photo?: string;
      notes?: string;
      customerRating?: number;
    }
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Validate completion data
      const validation = MobileAgentHelpers.validateDeliveryCompletion(completionData);
      if (!validation.valid) {
        setState(prev => ({ ...prev, loading: false, error: validation.errors.join(', ') }));
        return { success: false, error: validation.errors.join(', ') };
      }
      
      const result = await mobileAgentService.completeDeliveryWorkflow(deliveryId, completionData);
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          activeDelivery: null,
          isTrackingLocation: false,
          loading: false,
        }));
        
        // Refresh assignments
        await fetchMyAssignments();
        
        return { success: true, delivery: result.delivery };
      } else {
        setState(prev => ({ ...prev, loading: false, error: result.error || null }));
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete delivery workflow';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, [fetchMyAssignments]);

  const confirmPickup = useCallback(async (
    deliveryId: string,
    photo?: string,
    notes?: string
  ) => {
    try {
      const locationResult = await getCurrentLocation();
      if (!locationResult.success || !locationResult.location) {
        return { success: false, error: 'Location required for pickup confirmation' };
      }
      
      const response = await mobileAgentService.confirmPickup(
        deliveryId,
        locationResult.location,
        photo,
        notes
      );
      
      if (response.success && response.data) {
        return { success: true, delivery: response.data };
      } else {
        return { 
          success: false, 
          error: response.error?.message || 'Failed to confirm pickup' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to confirm pickup' 
      };
    }
  }, [getCurrentLocation]);

  const confirmDelivery = useCallback(async (
    deliveryId: string,
    signature?: string,
    photo?: string,
    notes?: string
  ) => {
    try {
      const locationResult = await getCurrentLocation();
      if (!locationResult.success || !locationResult.location) {
        return { success: false, error: 'Location required for delivery confirmation' };
      }
      
      const response = await mobileAgentService.confirmDelivery(
        deliveryId,
        locationResult.location,
        signature,
        photo,
        notes
      );
      
      if (response.success && response.data) {
        return { success: true, delivery: response.data };
      } else {
        return { 
          success: false, 
          error: response.error?.message || 'Failed to confirm delivery' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to confirm delivery' 
      };
    }
  }, [getCurrentLocation]);

  const reportIssue = useCallback(async (
    deliveryId: string,
    issueType: string,
    description: string,
    photo?: string
  ) => {
    try {
      const locationResult = await getCurrentLocation();
      
      const response = await mobileAgentService.reportIssue(
        deliveryId,
        issueType,
        description,
        locationResult.location || undefined,
        photo
      );
      
      if (response.success) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: response.error?.message || 'Failed to report issue' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to report issue' 
      };
    }
  }, [getCurrentLocation]);

  // Agent status management
  const updateStatus = useCallback(async (status: string) => {
    try {
      const response = await mobileAgentService.updateMyStatus(status);
      
      if (response.success) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: response.error?.message || 'Failed to update status' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update status' 
      };
    }
  }, []);

  // Request location permission
  const requestLocationPermission = useCallback(async () => {
    const result = await MobileAgentHelpers.requestLocationPermission();
    setLocationState(prev => ({
      ...prev,
      permissionGranted: result.granted,
      error: result.error || null,
    }));
    return result;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mobileAgentService.cleanup();
    };
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    // State
    ...state,
    locationState,
    
    // Actions
    initializeAgent,
    fetchMyAssignments,
    fetchAvailableOrders,
    acceptDelivery,
    declineDelivery,
    startLocationTracking,
    stopLocationTracking,
    getCurrentLocation,
    startDeliveryWorkflow,
    completeDeliveryWorkflow,
    confirmPickup,
    confirmDelivery,
    reportIssue,
    updateStatus,
    requestLocationPermission,
  };
}

// Hook for location-specific functionality
export function useLocationTracking() {
  const [locationState, setLocationState] = useState<LocationState>({
    current: null,
    accuracy: null,
    lastUpdate: null,
    permissionGranted: false,
    error: null,
  });

  const [isTracking, setIsTracking] = useState(false);

  const startTracking = useCallback(() => {
    const success = mobileAgentService.startLocationTracking(
      (location) => {
        setLocationState(prev => ({
          ...prev,
          current: location,
          accuracy: location.accuracy || null,
          lastUpdate: new Date(),
          error: null,
        }));
      },
      (error) => {
        setLocationState(prev => ({
          ...prev,
          error: error.message,
        }));
      }
    );
    
    setIsTracking(success);
    return success;
  }, []);

  const stopTracking = useCallback(() => {
    mobileAgentService.stopLocationTracking();
    setIsTracking(false);
  }, []);

  const getCurrentLocation = useCallback(async () => {
    try {
      const location = await mobileAgentService.getCurrentLocation();
      setLocationState(prev => ({
        ...prev,
        current: location,
        accuracy: location.accuracy || null,
        lastUpdate: new Date(),
        error: null,
      }));
      
      return { success: true, location };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get location';
      setLocationState(prev => ({ ...prev, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, []);

  const checkPermission = useCallback(async () => {
    const result = await MobileAgentHelpers.checkLocationPermission();
    setLocationState(prev => ({
      ...prev,
      permissionGranted: result.granted,
      error: result.error || null,
    }));
    return result;
  }, []);

  const requestPermission = useCallback(async () => {
    const result = await MobileAgentHelpers.requestLocationPermission();
    setLocationState(prev => ({
      ...prev,
      permissionGranted: result.granted,
      error: result.error || null,
    }));
    return result;
  }, []);

  return {
    locationState,
    isTracking,
    startTracking,
    stopTracking,
    getCurrentLocation,
    checkPermission,
    requestPermission,
  };
}

// Hook for delivery workflow management
export function useDeliveryWorkflow() {
  const [activeDelivery, setActiveDelivery] = useState<string | null>(null);
  const [workflowState, setWorkflowState] = useState<{
    stage: 'idle' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered';
    loading: boolean;
    error: string | null;
  }>({
    stage: 'idle',
    loading: false,
    error: null,
  });

  const startWorkflow = useCallback(async (deliveryId: string) => {
    setWorkflowState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await mobileAgentService.startDeliveryWorkflow(deliveryId);
      
      if (result.success) {
        setActiveDelivery(deliveryId);
        setWorkflowState({
          stage: 'picked_up',
          loading: false,
          error: null,
        });
        
        return { success: true };
      } else {
        setWorkflowState(prev => ({
          ...prev,
          loading: false,
          error: result.error || 'Failed to start workflow',
        }));
        
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start workflow';
      setWorkflowState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, []);

  const completeWorkflow = useCallback(async (
    deliveryId: string,
    completionData: {
      signature?: string;
      photo?: string;
      notes?: string;
      customerRating?: number;
    }
  ) => {
    setWorkflowState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await mobileAgentService.completeDeliveryWorkflow(deliveryId, completionData);
      
      if (result.success) {
        setActiveDelivery(null);
        setWorkflowState({
          stage: 'delivered',
          loading: false,
          error: null,
        });
        
        // Reset to idle after a short delay
        setTimeout(() => {
          setWorkflowState(prev => ({ ...prev, stage: 'idle' }));
        }, 2000);
        
        return { success: true, delivery: result.delivery };
      } else {
        setWorkflowState(prev => ({
          ...prev,
          loading: false,
          error: result.error || 'Failed to complete workflow',
        }));
        
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete workflow';
      setWorkflowState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, []);

  const updateStage = useCallback((stage: typeof workflowState.stage) => {
    setWorkflowState(prev => ({ ...prev, stage }));
  }, []);

  return {
    activeDelivery,
    workflowState,
    startWorkflow,
    completeWorkflow,
    updateStage,
  };
}