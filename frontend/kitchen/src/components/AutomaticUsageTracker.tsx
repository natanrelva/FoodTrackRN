import React, { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Alert } from './ui/alert';
import { Button } from './ui/button';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Package,
  ArrowRight,
  X
} from 'lucide-react';
import { useInventoryTracking } from '../hooks/useInventoryTracking';
import { KitchenOrder, AvailabilityCheck } from '@foodtrack/types';
import { kitchenOperations } from '../lib/api';

interface AutomaticUsageTrackerProps {
  order: KitchenOrder;
  onUsageComplete?: (orderId: string, success: boolean) => void;
  className?: string;
}

interface IngredientRequirement {
  ingredientId: string;
  ingredientName: string;
  requiredQuantity: number;
  unit: string;
  availableQuantity: number;
  isAvailable: boolean;
  alternatives?: Array<{
    ingredientId: string;
    name: string;
    availableQuantity: number;
    substitutionRatio: number;
  }>;
}

interface UsageStatus {
  ingredientId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'insufficient';
  error?: string;
}

export const AutomaticUsageTracker: React.FC<AutomaticUsageTrackerProps> = ({
  order,
  onUsageComplete,
  className = ''
}) => {
  const { updateIngredientUsage, checkIngredientAvailability } = useInventoryTracking();
  
  const [ingredientRequirements, setIngredientRequirements] = useState<IngredientRequirement[]>([]);
  const [usageStatuses, setUsageStatuses] = useState<Map<string, UsageStatus>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Load ingredient requirements for the order
  useEffect(() => {
    const loadIngredientRequirements = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const requirements: IngredientRequirement[] = [];
        
        // Get ingredient requirements for each item in the order
        for (const item of order.items) {
          try {
            const ingredientReqs = await kitchenOperations.getIngredientRequirements(
              item.productId, 
              item.quantity
            );
            
            // Check availability for each ingredient
            for (const req of ingredientReqs.ingredients || []) {
              const availability = await checkIngredientAvailability(
                req.ingredientId, 
                req.quantity
              );
              
              requirements.push({
                ingredientId: req.ingredientId,
                ingredientName: req.name,
                requiredQuantity: req.quantity,
                unit: req.unit,
                availableQuantity: availability.availableQuantity,
                isAvailable: availability.isAvailable,
                alternatives: availability.alternatives,
              });
              
              // Initialize usage status
              setUsageStatuses(prev => new Map(prev.set(req.ingredientId, {
                ingredientId: req.ingredientId,
                status: availability.isAvailable ? 'pending' : 'insufficient'
              })));
            }
          } catch (err) {
            console.error(`Failed to get ingredients for item ${item.productId}:`, err);
          }
        }
        
        setIngredientRequirements(requirements);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load ingredient requirements');
      } finally {
        setIsLoading(false);
      }
    };

    if (order && order.items.length > 0) {
      loadIngredientRequirements();
    }
  }, [order, checkIngredientAvailability]);

  // Process automatic usage tracking
  const processAutomaticUsage = async () => {
    setIsProcessing(true);
    setError(null);
    
    let allSuccessful = true;
    
    try {
      for (const requirement of ingredientRequirements) {
        if (!requirement.isAvailable) {
          allSuccessful = false;
          continue;
        }
        
        // Update status to processing
        setUsageStatuses(prev => new Map(prev.set(requirement.ingredientId, {
          ingredientId: requirement.ingredientId,
          status: 'processing'
        })));
        
        try {
          await updateIngredientUsage(
            requirement.ingredientId,
            requirement.requiredQuantity,
            order.orderId
          );
          
          // Update status to completed
          setUsageStatuses(prev => new Map(prev.set(requirement.ingredientId, {
            ingredientId: requirement.ingredientId,
            status: 'completed'
          })));
        } catch (err) {
          allSuccessful = false;
          
          // Update status to failed
          setUsageStatuses(prev => new Map(prev.set(requirement.ingredientId, {
            ingredientId: requirement.ingredientId,
            status: 'failed',
            error: err instanceof Error ? err.message : 'Usage update failed'
          })));
        }
      }
      
      onUsageComplete?.(order.orderId, allSuccessful);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process ingredient usage');
      allSuccessful = false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Get overall status
  const getOverallStatus = () => {
    const statuses = Array.from(usageStatuses.values());
    
    if (statuses.some(s => s.status === 'insufficient')) {
      return { status: 'insufficient', color: 'bg-red-100 border-red-200 text-red-800' };
    }
    
    if (statuses.some(s => s.status === 'failed')) {
      return { status: 'failed', color: 'bg-red-100 border-red-200 text-red-800' };
    }
    
    if (statuses.every(s => s.status === 'completed')) {
      return { status: 'completed', color: 'bg-green-100 border-green-200 text-green-800' };
    }
    
    if (statuses.some(s => s.status === 'processing')) {
      return { status: 'processing', color: 'bg-blue-100 border-blue-200 text-blue-800' };
    }
    
    return { status: 'pending', color: 'bg-gray-100 border-gray-200 text-gray-800' };
  };

  const overallStatus = getOverallStatus();
  const hasInsufficientStock = ingredientRequirements.some(req => !req.isAvailable);
  const canProcess = !hasInsufficientStock && !isProcessing && overallStatus.status === 'pending';

  if (isLoading) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-gray-400 animate-pulse" />
          <span className="text-gray-600">Loading ingredient requirements...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <div className="ml-2">
          <h4 className="text-red-800 font-medium">Usage Tracking Error</h4>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </Alert>
    );
  }

  if (ingredientRequirements.length === 0) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-gray-400" />
          <span className="text-gray-600">No ingredient requirements found for this order</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-gray-600" />
            <div>
              <h3 className="font-medium text-gray-900">Ingredient Usage Tracking</h3>
              <p className="text-sm text-gray-600">
                Order #{order.orderId.slice(-8)} • {ingredientRequirements.length} ingredients
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={overallStatus.color}>
              {overallStatus.status.charAt(0).toUpperCase() + overallStatus.status.slice(1)}
            </Badge>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
          </div>
        </div>

        {/* Insufficient Stock Warning */}
        {hasInsufficientStock && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <div className="ml-2">
              <h4 className="text-orange-800 font-medium">Insufficient Stock</h4>
              <p className="text-orange-700 text-sm">
                Some ingredients are not available in sufficient quantities. Check alternatives or restock.
              </p>
            </div>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {canProcess && (
            <Button
              onClick={processAutomaticUsage}
              disabled={isProcessing}
              className="flex items-center gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              Process Usage
            </Button>
          )}
          
          {overallStatus.status === 'completed' && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Usage tracking completed</span>
            </div>
          )}
        </div>

        {/* Detailed Ingredient List */}
        {showDetails && (
          <div className="space-y-2 pt-2 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 text-sm">Ingredient Details</h4>
            
            {ingredientRequirements.map(requirement => {
              const status = usageStatuses.get(requirement.ingredientId);
              
              return (
                <IngredientUsageItem
                  key={requirement.ingredientId}
                  requirement={requirement}
                  status={status}
                />
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};

// Individual ingredient usage item
const IngredientUsageItem: React.FC<{
  requirement: IngredientRequirement;
  status?: UsageStatus;
}> = ({ requirement, status }) => {
  const getStatusIcon = () => {
    switch (status?.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'failed':
        return <X className="h-4 w-4 text-red-500" />;
      case 'insufficient':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <Package className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status?.status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'processing':
        return 'bg-blue-50 border-blue-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      case 'insufficient':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`p-3 border rounded-lg ${getStatusColor()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h5 className="font-medium text-gray-900 text-sm">{requirement.ingredientName}</h5>
            <p className="text-xs text-gray-600">
              Required: {requirement.requiredQuantity} {requirement.unit} • 
              Available: {requirement.availableQuantity} {requirement.unit}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          {!requirement.isAvailable && (
            <Badge variant="outline" className="text-orange-600 border-orange-200 text-xs">
              Insufficient
            </Badge>
          )}
          
          {status?.status === 'failed' && status.error && (
            <p className="text-xs text-red-600 mt-1">{status.error}</p>
          )}
        </div>
      </div>
      
      {/* Show alternatives if ingredient is not available */}
      {!requirement.isAvailable && requirement.alternatives && requirement.alternatives.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-600 mb-1">Alternatives available:</p>
          <div className="space-y-1">
            {requirement.alternatives.slice(0, 2).map(alt => (
              <div key={alt.ingredientId} className="flex items-center justify-between text-xs">
                <span className="text-gray-700">{alt.name}</span>
                <span className="text-gray-500">
                  {alt.availableQuantity} available (ratio: {alt.substitutionRatio})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomaticUsageTracker;