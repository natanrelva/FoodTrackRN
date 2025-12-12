import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  WorkloadRedistributionSuggestion,
  CrossTrainingSuggestion 
} from '../types/kitchen';
import { kitchenOperations } from '../lib/api';
import { 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Clock, 
  ArrowRight,
  RefreshCw 
} from 'lucide-react';

export const WorkloadManagement: React.FC = () => {
  const [redistributionSuggestions, setRedistributionSuggestions] = useState<WorkloadRedistributionSuggestion[]>([]);
  const [crossTrainingSuggestions, setCrossTrainingSuggestions] = useState<CrossTrainingSuggestion[]>([]);
  const [overloads, setOverloads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWorkloadData();
  }, []);

  const loadWorkloadData = async () => {
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
    } finally {
      setLoading(false);
    }
  };

  const handleRedistribute = async (suggestion: WorkloadRedistributionSuggestion) => {
    try {
      await kitchenOperations.redistributeWorkload(
        suggestion.fromStationId,
        suggestion.toStationId,
        suggestion.orderIds
      );
      
      // Reload data to show updated state
      await loadWorkloadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to redistribute workload');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };  if (
loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workload Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Workload Management</h2>
          <p className="text-gray-600">Monitor and optimize station workloads</p>
        </div>
        <Button onClick={loadWorkloadData} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Station Overloads */}
      {overloads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Station Overloads
            </CardTitle>
            <CardDescription>
              Stations requiring immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overloads.map((overload, index) => (
                <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(overload.priority)}>
                        {overload.priority}
                      </Badge>
                      <span className="font-medium">{overload.fromStationName}</span>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleRedistribute(overload)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Redistribute Now
                    </Button>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{overload.reason}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span>{overload.orderIds.length} orders to move</span>
                    <span>Save {overload.estimatedTimeReduction}min</span>
                    <span>Move to: {overload.toStationName}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Redistribution Suggestions */}
      {redistributionSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Workload Redistribution
            </CardTitle>
            <CardDescription>
              Optimize station efficiency by redistributing orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {redistributionSuggestions.map((suggestion, index) => (
                <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge className={getPriorityColor(suggestion.priority)}>
                        {suggestion.priority}
                      </Badge>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{suggestion.fromStationName}</span>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{suggestion.toStationName}</span>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleRedistribute(suggestion)}
                      variant="outline"
                    >
                      Apply
                    </Button>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{suggestion.reason}</p>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Save {suggestion.estimatedTimeReduction}min
                    </span>
                    <span>{suggestion.orderIds.length} orders</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )} 
     {/* Cross-Training Suggestions */}
      {crossTrainingSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Cross-Training Opportunities
            </CardTitle>
            <CardDescription>
              Staff development suggestions for better flexibility
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {crossTrainingSuggestions.map((suggestion, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h5 className="font-medium">{suggestion.staffMemberName}</h5>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>{suggestion.currentStationName}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>{suggestion.suggestedStationName}</span>
                      </div>
                    </div>
                    <Badge className={getPriorityColor(suggestion.priority)}>
                      {suggestion.priority}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Skills needed:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {suggestion.skillGap.map((skill, skillIndex) => (
                          <Badge key={skillIndex} variant="outline" className="text-xs">
                            {skill.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="text-gray-600">
                      <span className="font-medium">Training time:</span> {suggestion.estimatedTrainingTime}h
                    </div>
                    
                    <div className="text-gray-600">
                      <span className="font-medium">Benefit:</span> {suggestion.benefit}
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t">
                    <Button size="sm" variant="outline" className="w-full">
                      Schedule Training
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}      
{/* Empty State */}
      {!loading && overloads.length === 0 && redistributionSuggestions.length === 0 && crossTrainingSuggestions.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">All Stations Running Smoothly</h3>
            <p className="text-gray-600">
              No workload issues detected. All stations are operating within optimal capacity.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WorkloadManagement;