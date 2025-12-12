import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';

import { 
  StationAssignmentResult, 
  StationAssignmentSuggestion,

  KitchenOrder 
} from '../types/kitchen';
import { kitchenOperations } from '../lib/api';
import { AlertTriangle, CheckCircle, Clock, Users, Zap, TrendingUp } from 'lucide-react';

interface StationAssignmentProps {
  order: KitchenOrder;
  onAssignmentComplete?: (assignments: any[]) => void;
}

export const StationAssignment: React.FC<StationAssignmentProps> = ({
  order,
  onAssignmentComplete
}) => {
  const [assignmentResult, setAssignmentResult] = useState<StationAssignmentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoAssigning, setAutoAssigning] = useState(false);

  useEffect(() => {
    loadStationAssignments();
  }, [order.id]);

  const loadStationAssignments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await kitchenOperations.getOptimalStationAssignments(order.id);
      setAssignmentResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load station assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoAssign = async () => {
    setAutoAssigning(true);
    setError(null);
    
    try {
      const result = await kitchenOperations.autoAssignOrderToOptimalStation(order.id);
      onAssignmentComplete?.(result.assignments);
      
      // Reload assignments to show updated state
      await loadStationAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to auto-assign order');
    } finally {
      setAutoAssigning(false);
    }
  };

  const handleManualAssign = async (suggestion: StationAssignmentSuggestion) => {
    try {
      const assignment = await kitchenOperations.assignOrderToStation(order.id, suggestion.stationId);
      onAssignmentComplete?.([assignment]);
      
      // Reload assignments to show updated state
      await loadStationAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign order to station');
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-800';
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Station Assignment</CardTitle>
          <CardDescription>Analyzing optimal station assignments...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Station Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={loadStationAssignments} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!assignmentResult) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Main Assignment Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Station Assignment</CardTitle>
              <CardDescription>
                Order #{order.orderId || order.id.slice(-6)} - {order.items.length} items
              </CardDescription>
            </div>
            <Button 
              onClick={handleAutoAssign} 
              disabled={autoAssigning || assignmentResult.assignments.length === 0}
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              {autoAssigning ? 'Assigning...' : 'Auto Assign'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Overload Warnings */}
          {assignmentResult.overloadWarnings.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-red-600 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Station Overload Warnings
              </h4>
              <div className="space-y-2">
                {assignmentResult.overloadWarnings.map((warning) => (
                  <Alert key={warning.stationId} className="border-red-200">
                    <AlertDescription>
                      <strong>{warning.stationName}</strong> is at {warning.currentUtilization.toFixed(1)}% capacity
                      {warning.severity === 'critical' && ' - Critical overload!'}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}

          {/* Station Suggestions */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">Recommended Stations</h4>
            {assignmentResult.assignments.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No suitable stations found for this order. Please check station availability and capacity.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-3">
                {assignmentResult.assignments.map((suggestion) => (
                  <div key={suggestion.stationId} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <h5 className="font-medium">{suggestion.stationName}</h5>
                        <Badge variant="outline" className="text-xs">
                          {suggestion.stationType.replace('_', ' ')}
                        </Badge>
                        <Badge className={`text-xs ${getConfidenceColor(suggestion.confidence)}`}>
                          {suggestion.confidence}% match
                        </Badge>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleManualAssign(suggestion)}
                        className="flex items-center gap-1"
                      >
                        <CheckCircle className="h-3 w-3" />
                        Assign
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-2">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Wait: {suggestion.estimatedWaitTime}min
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Load: {suggestion.currentUtilization.toFixed(1)}%
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                      <span className={suggestion.equipmentMatch ? 'text-green-600' : 'text-red-600'}>
                        Equipment: {suggestion.equipmentMatch ? '✓' : '✗'}
                      </span>
                      <span className={suggestion.skillMatch ? 'text-green-600' : 'text-red-600'}>
                        Skills: {suggestion.skillMatch ? '✓' : '✗'}
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-600">{suggestion.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Workload Redistribution Suggestions */}
      {assignmentResult.redistributionSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Workload Redistribution</CardTitle>
            <CardDescription>
              Suggestions to balance station workloads
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assignmentResult.redistributionSuggestions.map((suggestion, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(suggestion.priority)}>
                        {suggestion.priority}
                      </Badge>
                      <span className="text-sm font-medium">
                        {suggestion.fromStationName} → {suggestion.toStationName}
                      </span>
                    </div>
                    <Button size="sm" variant="outline">
                      Apply
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{suggestion.reason}</p>
                  <div className="text-xs text-gray-500">
                    {suggestion.orderIds.length} orders • Save {suggestion.estimatedTimeReduction}min
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cross-Training Suggestions */}
      {assignmentResult.crossTrainingSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Cross-Training Opportunities
            </CardTitle>
            <CardDescription>
              Staff development suggestions for peak times
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assignmentResult.crossTrainingSuggestions.map((suggestion, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h5 className="font-medium">{suggestion.staffMemberName}</h5>
                      <p className="text-sm text-gray-600">
                        {suggestion.currentStationName} → {suggestion.suggestedStationName}
                      </p>
                    </div>
                    <Badge className={getPriorityColor(suggestion.priority)}>
                      {suggestion.priority}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>Training needed:</strong> {suggestion.trainingRequired.join(', ')}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Est. training: {suggestion.estimatedTrainingTime}h</span>
                    <span>{suggestion.benefit}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StationAssignment;