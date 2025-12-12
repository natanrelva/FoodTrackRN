import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertCircle, Play, Pause, RotateCcw, MessageSquare } from 'lucide-react';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Button } from './ui/button';

import { 
  KitchenOrder, 
  KitchenOrderItem, 
  ItemStatus, 
  QualityIssue
} from '../types/kitchen';
import { kitchenOperations } from '../lib/api';

interface PreparationStatusTrackerProps {
  order: KitchenOrder;
  onStatusUpdate: (orderId: string, itemId: string, status: ItemStatus, notes?: string) => void;
  onDelayReport: (orderId: string, delayMinutes: number, reason: string) => void;
  onQualityIssue: (orderId: string, itemId: string, issue: Omit<QualityIssue, 'id' | 'orderId' | 'itemId' | 'reportedAt'>) => void;
  onRemakeRequest: (orderId: string, itemId: string, reason: string) => void;
  className?: string;
}

const ITEM_STATUS_COLORS: Record<ItemStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  assigned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  ready: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
  on_hold: 'bg-red-100 text-red-800'
};

const ITEM_STATUS_ICONS: Record<ItemStatus, React.ReactNode> = {
  pending: <Clock className="w-4 h-4" />,
  assigned: <Play className="w-4 h-4" />,
  in_progress: <Play className="w-4 h-4" />,
  ready: <CheckCircle className="w-4 h-4" />,
  completed: <CheckCircle className="w-4 h-4" />,
  on_hold: <Pause className="w-4 h-4" />
};

export function PreparationStatusTracker({ 
  order, 
  onStatusUpdate, 
  onDelayReport, 
  onQualityIssue, 
  onRemakeRequest, 
  className 
}: PreparationStatusTrackerProps) {
  const [statusHistory, setStatusHistory] = useState<StatusUpdateLog[]>([]);
  const [preparationStages, setPreparationStages] = useState<PreparationStage[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [delayReason, setDelayReason] = useState('');
  const [delayMinutes, setDelayMinutes] = useState(15);
  const [qualityIssueDescription, setQualityIssueDescription] = useState('');
  const [qualityIssueType, setQualityIssueType] = useState<QualityIssue['type']>('temperature');
  const [remakeReason, setRemakeReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStatusHistory();
    loadPreparationStages();
  }, [order.id]);

  const loadStatusHistory = async () => {
    try {
      const history = await kitchenOperations.getStatusUpdateHistory(order.id);
      setStatusHistory(history);
    } catch (error) {
      console.error('Failed to load status history:', error);
    }
  };

  const loadPreparationStages = async () => {
    try {
      const stages = await kitchenOperations.getPreparationStages(order.id);
      setPreparationStages(stages);
    } catch (error) {
      console.error('Failed to load preparation stages:', error);
    }
  };

  const handleItemStatusUpdate = async (itemId: string, newStatus: ItemStatus, notes?: string) => {
    try {
      setLoading(true);
      await onStatusUpdate(order.id, itemId, newStatus, notes);
      await loadStatusHistory();
    } catch (error) {
      console.error('Failed to update item status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelayReport = async () => {
    if (!delayReason.trim()) return;
    
    try {
      setLoading(true);
      await onDelayReport(order.id, delayMinutes, delayReason);
      setDelayReason('');
      setDelayMinutes(15);
    } catch (error) {
      console.error('Failed to report delay:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQualityIssueReport = async (itemId: string) => {
    if (!qualityIssueDescription.trim()) return;
    
    try {
      setLoading(true);
      await onQualityIssue(order.id, itemId, {
        type: qualityIssueType,
        description: qualityIssueDescription,
        severity: 'major',
        reportedBy: 'kitchen-staff', // Would be actual user
        stationId: order.assignedStations[0]?.stationId,
        suggestedAction: 'remake'
      });
      setQualityIssueDescription('');
      setSelectedItem(null);
    } catch (error) {
      console.error('Failed to report quality issue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemakeRequest = async (itemId: string) => {
    if (!remakeReason.trim()) return;
    
    try {
      setLoading(true);
      await onRemakeRequest(order.id, itemId, remakeReason);
      setRemakeReason('');
      setSelectedItem(null);
    } catch (error) {
      console.error('Failed to request remake:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNextItemStatus = (currentStatus: ItemStatus): ItemStatus | null => {
    const statusFlow: Record<ItemStatus, ItemStatus | null> = {
      pending: 'assigned',
      assigned: 'in_progress',
      in_progress: 'ready',
      ready: 'completed',
      completed: null,
      on_hold: 'in_progress'
    };
    return statusFlow[currentStatus];
  };

  const getItemPreparationStages = (itemId: string): PreparationStage[] => {
    return preparationStages.filter(stage => stage.itemId === itemId);
  };

  const calculateItemProgress = (item: KitchenOrderItem): number => {
    const stages = getItemPreparationStages(item.id);
    if (stages.length === 0) return 0;
    
    const completedStages = stages.filter(stage => stage.status === 'completed').length;
    return (completedStages / stages.length) * 100;
  };

  return (
    <Card className={`p-4 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Preparation Status Tracking</h3>
        <Badge className="bg-blue-100 text-blue-800">
          Order #{order.orderId}
        </Badge>
      </div>

      {/* Order-level Actions */}
      <div className="flex gap-2 p-3 bg-gray-50 rounded">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Report Delay</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={delayMinutes}
              onChange={(e) => setDelayMinutes(parseInt(e.target.value) || 0)}
              className="w-20 px-2 py-1 border rounded text-sm"
              min="1"
              max="120"
            />
            <input
              type="text"
              value={delayReason}
              onChange={(e) => setDelayReason(e.target.value)}
              placeholder="Reason for delay..."
              className="flex-1 px-2 py-1 border rounded text-sm"
            />
            <Button
              size="sm"
              onClick={handleDelayReport}
              disabled={!delayReason.trim() || loading}
            >
              Report
            </Button>
          </div>
        </div>
      </div>

      {/* Items Status Tracking */}
      <div className="space-y-3">
        <h4 className="font-medium">Item Progress</h4>
        {order.items.map((item) => {
          const nextStatus = getNextItemStatus(item.status);
          const progress = calculateItemProgress(item);
          const itemStages = getItemPreparationStages(item.id);
          
          return (
            <div key={item.id} className="border rounded p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.quantity}x {item.name}</span>
                  <Badge className={ITEM_STATUS_COLORS[item.status]}>
                    <div className="flex items-center gap-1">
                      {ITEM_STATUS_ICONS[item.status]}
                      {item.status.replace('_', ' ').toUpperCase()}
                    </div>
                  </Badge>
                </div>
                <div className="text-sm text-gray-500">
                  {progress.toFixed(0)}% Complete
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Preparation Stages */}
              {itemStages.length > 0 && (
                <div className="grid grid-cols-5 gap-2 text-xs">
                  {itemStages.map((stage) => (
                    <div 
                      key={stage.id}
                      className={`p-2 rounded text-center ${
                        stage.status === 'completed' ? 'bg-green-100 text-green-800' :
                        stage.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        stage.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <div className="font-medium">{stage.stage.replace('_', ' ')}</div>
                      {stage.actualDuration && (
                        <div>{stage.actualDuration}min</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Item Actions */}
              <div className="flex gap-2">
                {nextStatus && (
                  <Button
                    size="sm"
                    onClick={() => handleItemStatusUpdate(item.id, nextStatus)}
                    disabled={loading}
                  >
                    {nextStatus === 'assigned' ? 'Assign' :
                     nextStatus === 'in_progress' ? 'Start' :
                     nextStatus === 'ready' ? 'Mark Ready' :
                     nextStatus === 'completed' ? 'Complete' : 'Next'}
                  </Button>
                )}
                
                {item.status !== 'completed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleItemStatusUpdate(item.id, 'on_hold', 'Put on hold')}
                    disabled={loading || item.status === 'on_hold'}
                  >
                    <Pause className="w-3 h-3 mr-1" />
                    Hold
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedItem(selectedItem === item.id ? null : item.id)}
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Issues
                </Button>
              </div>

              {/* Quality Issue & Remake Forms */}
              {selectedItem === item.id && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Quality Issue</label>
                    <div className="space-y-2">
                      <select
                        value={qualityIssueType}
                        onChange={(e) => setQualityIssueType(e.target.value as QualityIssue['type'])}
                        className="w-full px-2 py-1 border rounded text-sm"
                      >
                        <option value="temperature">Temperature</option>
                        <option value="appearance">Appearance</option>
                        <option value="taste">Taste</option>
                        <option value="texture">Texture</option>
                        <option value="presentation">Presentation</option>
                        <option value="ingredient_missing">Missing Ingredient</option>
                        <option value="contamination">Contamination</option>
                        <option value="other">Other</option>
                      </select>
                      <input
                        type="text"
                        value={qualityIssueDescription}
                        onChange={(e) => setQualityIssueDescription(e.target.value)}
                        placeholder="Describe the quality issue..."
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleQualityIssueReport(item.id)}
                        disabled={!qualityIssueDescription.trim() || loading}
                      >
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Report Issue
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Request Remake</label>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={remakeReason}
                        onChange={(e) => setRemakeReason(e.target.value)}
                        placeholder="Reason for remake..."
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemakeRequest(item.id)}
                        disabled={!remakeReason.trim() || loading}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Request Remake
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Status History */}
      {statusHistory.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Status History</h4>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {statusHistory.slice(0, 10).map((log) => (
              <div key={log.id} className="text-xs p-2 bg-gray-50 rounded">
                <div className="flex justify-between">
                  <span>
                    {log.previousStatus} → {log.newStatus}
                    {log.itemId && ` (Item)`}
                  </span>
                  <span className="text-gray-500">
                    {new Date(log.updatedAt).toLocaleTimeString()}
                  </span>
                </div>
                {log.notes && (
                  <div className="text-gray-600 mt-1">{log.notes}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}