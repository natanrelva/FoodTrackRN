import { useEffect, useCallback } from 'react';
import { KitchenOrder, OrderPriority } from '../types/kitchen';

interface PriorityAdjustmentConfig {
  urgentThresholdMinutes: number;
  highThresholdMinutes: number;
  complexityMultiplier: number;
  channelPriorityBoost: Record<string, number>;
}

const DEFAULT_CONFIG: PriorityAdjustmentConfig = {
  urgentThresholdMinutes: 15, // Orders due in 15 minutes become urgent
  highThresholdMinutes: 30,   // Orders due in 30 minutes become high priority
  complexityMultiplier: 1.5,  // Complex orders get priority boost
  channelPriorityBoost: {
    'uber_eats': 0.2,
    'ifood': 0.2,
    'rappi': 0.2,
    'whatsapp': 0.1,
    'instagram': 0.1,
    'website': 0
  }
};

export function usePriorityAdjustment(
  orders: KitchenOrder[],
  onPriorityUpdate: (orderId: string, newPriority: OrderPriority) => void,
  config: Partial<PriorityAdjustmentConfig> = {}
) {
  const adjustmentConfig = { ...DEFAULT_CONFIG, ...config };

  const calculateOrderComplexity = useCallback((order: KitchenOrder): number => {
    let complexity = 0;
    
    // Base complexity from number of items
    complexity += order.items.length * 0.5;
    
    // Complexity from modifications
    const totalModifications = order.items.reduce((sum, item) => sum + item.modifications.length, 0);
    complexity += totalModifications * 0.3;
    
    // Complexity from allergen requirements
    complexity += order.allergenAlerts.length * 0.4;
    
    // Complexity from special instructions
    if (order.specialInstructions) {
      complexity += 0.5;
    }
    
    // Complexity from estimated preparation time
    const totalEstimatedTime = order.items.reduce((sum, item) => sum + item.estimatedTime, 0);
    complexity += totalEstimatedTime / 30; // 30 minutes = 1 complexity point
    
    return Math.min(complexity, 5); // Cap at 5 for reasonable scaling
  }, []);

  const calculateDynamicPriority = useCallback((order: KitchenOrder): OrderPriority => {
    const now = Date.now();
    const estimatedTime = new Date(order.estimatedCompletionTime).getTime();
    const minutesRemaining = Math.max(0, (estimatedTime - now) / (1000 * 60));
    
    // Calculate base priority score (higher = more urgent)
    let priorityScore = 0;
    
    // Time-based urgency (most important factor)
    if (minutesRemaining <= adjustmentConfig.urgentThresholdMinutes) {
      priorityScore += 4;
    } else if (minutesRemaining <= adjustmentConfig.highThresholdMinutes) {
      priorityScore += 3;
    } else if (minutesRemaining <= 60) {
      priorityScore += 2;
    } else {
      priorityScore += 1;
    }
    
    // Complexity adjustment
    const complexity = calculateOrderComplexity(order);
    priorityScore += complexity * adjustmentConfig.complexityMultiplier;
    
    // Channel priority boost
    const channel = (order as any).channel || 'app'; // Default to app channel
    const channelBoost = adjustmentConfig.channelPriorityBoost[channel] || 0;
    priorityScore += channelBoost;
    
    // Current status consideration
    if (order.status === 'on_hold') {
      priorityScore += 1; // Held orders get slight boost when resumed
    }
    
    // Convert score to priority level
    if (priorityScore >= 6) {
      return 'urgent';
    } else if (priorityScore >= 4) {
      return 'high';
    } else if (priorityScore >= 2) {
      return 'medium';
    } else {
      return 'low';
    }
  }, [adjustmentConfig, calculateOrderComplexity]);

  const adjustPriorities = useCallback(() => {
    orders.forEach(order => {
      // Skip completed or cancelled orders
      if (order.status === 'ready_for_pickup' || order.status === 'cancelled') {
        return;
      }
      
      const newPriority = calculateDynamicPriority(order);
      
      // Only update if priority has changed
      if (newPriority !== order.priority) {
        onPriorityUpdate(order.id, newPriority);
      }
    });
  }, [orders, calculateDynamicPriority, onPriorityUpdate]);

  // Run priority adjustment every minute
  useEffect(() => {
    // Initial adjustment
    adjustPriorities();
    
    // Set up interval for continuous adjustment
    const interval = setInterval(adjustPriorities, 60000); // Every minute
    
    return () => clearInterval(interval);
  }, [adjustPriorities]);

  // Manual priority adjustment function
  const manualAdjustPriority = useCallback((orderId: string, priority: OrderPriority) => {
    onPriorityUpdate(orderId, priority);
  }, [onPriorityUpdate]);

  // Get priority recommendation for an order
  const getPriorityRecommendation = useCallback((order: KitchenOrder) => {
    const recommended = calculateDynamicPriority(order);
    const current = order.priority;
    
    return {
      current,
      recommended,
      shouldUpdate: current !== recommended,
      reason: getPriorityReason(order, recommended)
    };
  }, [calculateDynamicPriority]);

  const getPriorityReason = (order: KitchenOrder, priority: OrderPriority): string => {
    const now = Date.now();
    const estimatedTime = new Date(order.estimatedCompletionTime).getTime();
    const minutesRemaining = Math.max(0, (estimatedTime - now) / (1000 * 60));
    const complexity = calculateOrderComplexity(order);
    
    const reasons: string[] = [];
    
    if (minutesRemaining <= adjustmentConfig.urgentThresholdMinutes) {
      reasons.push(`Due in ${Math.round(minutesRemaining)} minutes`);
    }
    
    if (complexity > 3) {
      reasons.push('High complexity order');
    }
    
    if (order.allergenAlerts.length > 0) {
      reasons.push('Contains allergens');
    }
    
    const channel = (order as any).channel || 'app';
    if (adjustmentConfig.channelPriorityBoost[channel] > 0) {
      reasons.push(`${channel.toUpperCase()} delivery partner`);
    }
    
    if (order.status === 'on_hold') {
      reasons.push('Previously on hold');
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'Standard priority';
  };

  return {
    adjustPriorities,
    manualAdjustPriority,
    getPriorityRecommendation,
    calculateOrderComplexity
  };
}