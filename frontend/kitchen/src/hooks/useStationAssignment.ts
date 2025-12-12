import { useState, useCallback } from 'react';
import { 
  StationAssignmentResult,
  WorkloadRedistributionSuggestion,
  CrossTrainingSuggestion,
  StationAssignment
} from '../types/kitchen';
import { kitchenOperations } from '../lib/api';

export interface UseStationAssignmentReturn {
  // State
  assignmentResult: StationAssignmentResult | null;
  redistributionSuggestions: WorkloadRedistributionSuggestion[];
  crossTrainingSuggestions: CrossTrainingSuggestion[];
  overloads: any[];
  loading: boolean;
  error: string | null;
  
  // Actions
  getOptimalAssignments: (orderId: string) => Promise<void>;
  autoAssignOrder: (orderId: string) => Promise<StationAssignment[]>;
  assignToStation: (orderId: string, stationId: string) => Promise<StationAssignment>;
  loadWorkloadData: () => Promise<void>;
  redistributeWorkload: (fromStationId: string, toStationId: string, orderIds: string[]) => Promise<void>;
  updateStationCapacity: (stationId: string, capacity: number) => Promise<void>;
  assignStaffToStation: (stationId: string, staffId: string) => Promise<void>;
  clearError: () => void;
}

export const useStationAssignment = (): UseStationAssignmentReturn => {
  const [assignmentResult, setAssignmentResult] = useState<StationAssignmentResult | null>(null);
  const [redistributionSuggestions, setRedistributionSuggestions] = useState<WorkloadRedistributionSuggestion[]>([]);
  const [crossTrainingSuggestions, setCrossTrainingSuggestions] = useState<CrossTrainingSuggestion[]>([]);
  const [overloads, setOverloads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getOptimalAssignments = useCallback(async (orderId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await kitchenOperations.getOptimalStationAssignments(orderId);
      setAssignmentResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get optimal assignments');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const autoAssignOrder = useCallback(async (orderId: string): Promise<StationAssignment[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await kitchenOperations.autoAssignOrderToOptimalStation(orderId);
      
      // Refresh assignment result if it exists
      if (assignmentResult?.orderId === orderId) {
        await getOptimalAssignments(orderId);
      }
      
      return result.assignments;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to auto-assign order');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [assignmentResult, getOptimalAssignments]);

  const assignToStation = useCallback(async (orderId: string, stationId: string): Promise<StationAssignment> => {
    setError(null);
    
    try {
      const assignment = await kitchenOperations.assignOrderToStation(orderId, stationId);
      
      // Refresh assignment result if it exists
      if (assignmentResult?.orderId === orderId) {
        await getOptimalAssignments(orderId);
      }
      
      return assignment;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign to station');
      throw err;
    }
  }, [assignmentResult, getOptimalAssignments]);

  const loadWorkloadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [redistributionResult, crossTrainingResult, overloadsResult] = await Promise.all([
        kitchenOperations.getWorkloadRedistributionSuggestions(),
        kitchenOperations.getCrossTrainingSuggestions(),
        kitchenOperations.detectStationOverloads()
      ]);
      
      setRedistributionSuggestions(redistributionResult.suggestions);
      setCrossTrainingSuggestions(crossTrainingResult.suggestions);
      setOverloads(overloadsResult.overloads);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workload data');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const redistributeWorkload = useCallback(async (
    fromStationId: string, 
    toStationId: string, 
    orderIds: string[]
  ) => {
    setError(null);
    
    try {
      await kitchenOperations.redistributeWorkload(fromStationId, toStationId, orderIds);
      
      // Refresh workload data
      await loadWorkloadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to redistribute workload');
      throw err;
    }
  }, [loadWorkloadData]);

  const updateStationCapacity = useCallback(async (stationId: string, capacity: number) => {
    setError(null);
    
    try {
      await kitchenOperations.updateStationCapacity(stationId, capacity);
      
      // Refresh workload data
      await loadWorkloadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update station capacity');
      throw err;
    }
  }, [loadWorkloadData]);

  const assignStaffToStation = useCallback(async (stationId: string, staffId: string) => {
    setError(null);
    
    try {
      await kitchenOperations.assignStaffToStation(stationId, staffId);
      
      // Refresh workload data
      await loadWorkloadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign staff to station');
      throw err;
    }
  }, [loadWorkloadData]);

  return {
    // State
    assignmentResult,
    redistributionSuggestions,
    crossTrainingSuggestions,
    overloads,
    loading,
    error,
    
    // Actions
    getOptimalAssignments,
    autoAssignOrder,
    assignToStation,
    loadWorkloadData,
    redistributeWorkload,
    updateStationCapacity,
    assignStaffToStation,
    clearError,
  };
};

export default useStationAssignment;