import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, Phone, RotateCcw } from 'lucide-react';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Alert } from './ui/alert';
import { 
  KitchenOrder, 
  QualityIssue
} from '../types/kitchen';

interface DelayQualityManagerProps {
  order: KitchenOrder;
  onDelayReport: (orderId: string, delayMinutes: number, reason: string) => Promise<void>;
  onQualityIssueReport: (orderId: string, issue: Omit<QualityIssue, 'id' | 'orderId' | 'reportedAt'>) => Promise<void>;
  onRemakeRequest: (orderId: string, reason: string, itemId?: string) => Promise<void>;
  onDeliveryCoordination: (orderId: string) => Promise<void>;
  className?: string;
}

export function DelayQualityManager({ 
  order, 
  onDelayReport, 
  onQualityIssueReport, 
  onRemakeRequest, 
  onDeliveryCoordination,
  className 
}: DelayQualityManagerProps) {
  const [delayNotifications, setDelayNotifications] = useState<DelayNotification[]>([]);
  const [qualityReports, setQualityReports] = useState<QualityReport[]>([]);
  const [remakeRequests, setRemakeRequests] = useState<RemakeRequest[]>([]);
  const [deliveryCoordination, setDeliveryCoordination] = useState<DeliveryCoordination | null>(null);
  const [loading, setLoading] = useState(false);

  // Delay reporting state
  const [delayMinutes, setDelayMinutes] = useState(15);
  const [delayReason, setDelayReason] = useState('');
  const [showDelayForm, setShowDelayForm] = useState(false);

  // Quality issue state
  const [qualityIssueType, setQualityIssueType] = useState<QualityIssue['type']>('temperature');
  const [qualityIssueDescription, setQualityIssueDescription] = useState('');
  const [qualityIssueSeverity, setQualityIssueSeverity] = useState<QualityIssue['severity']>('major');
  const [showQualityForm, setShowQualityForm] = useState(false);

  // Remake request state
  const [remakeReason, setRemakeReason] = useState('');
  const [showRemakeForm, setShowRemakeForm] = useState(false);

  useEffect(() => {
    loadDelayNotifications();
    loadQualityReports();
    loadRemakeRequests();
    loadDeliveryCoordination();
  }, [order.id]);

  const loadDelayNotifications = async () => {
    try {
      // Mock data - in production, would fetch from API
      setDelayNotifications([]);
    } catch (error) {
      console.error('Failed to load delay notifications:', error);
    }
  };

  const loadQualityReports = async () => {
    try {
      // Mock data - in production, would fetch from API
      setQualityReports([]);
    } catch (error) {
      console.error('Failed to load quality reports:', error);
    }
  };

  const loadRemakeRequests = async () => {
    try {
      // Mock data - in production, would fetch from API
      setRemakeRequests([]);
    } catch (error) {
      console.error('Failed to load remake requests:', error);
    }
  };

  const loadDeliveryCoordination = async () => {
    try {
      // Mock data - in production, would fetch from API
      setDeliveryCoordination(null);
    } catch (error) {
      console.error('Failed to load delivery coordination:', error);
    }
  };

  const handleDelayReport = async () => {
    if (!delayReason.trim() || delayMinutes <= 0) return;
    
    try {
      setLoading(true);
      await onDelayReport(order.id, delayMinutes, delayReason);
      
      // Add to local state for immediate feedback
      const newNotification: DelayNotification = {
        id: Date.now().toString(),
        orderId: order.id,
        delayMinutes,
        reason: delayReason,
        notifiedAt: new Date().toISOString(),
        notificationMethod: 'app',
      };
      setDelayNotifications(prev => [newNotification, ...prev]);
      
      // Reset form
      setDelayReason('');
      setDelayMinutes(15);
      setShowDelayForm(false);
    } catch (error) {
      console.error('Failed to report delay:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQualityIssueReport = async () => {
    if (!qualityIssueDescription.trim()) return;
    
    try {
      setLoading(true);
      await onQualityIssueReport(order.id, {
        type: qualityIssueType,
        description: qualityIssueDescription,
        severity: qualityIssueSeverity,
        reportedBy: 'kitchen-staff', // Would be actual user
        stationId: order.assignedStations[0]?.stationId,
        suggestedAction: qualityIssueSeverity === 'critical' ? 'remake' : 'adjust',
      });
      
      // Reset form
      setQualityIssueDescription('');
      setQualityIssueType('temperature');
      setQualityIssueSeverity('major');
      setShowQualityForm(false);
      
      // Reload quality reports
      await loadQualityReports();
    } catch (error) {
      console.error('Failed to report quality issue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemakeRequest = async () => {
    if (!remakeReason.trim()) return;
    
    try {
      setLoading(true);
      await onRemakeRequest(order.id, remakeReason);
      
      // Reset form
      setRemakeReason('');
      setShowRemakeForm(false);
      
      // Reload remake requests
      await loadRemakeRequests();
    } catch (error) {
      console.error('Failed to request remake:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeliveryCoordination = async () => {
    try {
      setLoading(true);
      await onDeliveryCoordination(order.id);
      await loadDeliveryCoordination();
    } catch (error) {
      console.error('Failed to coordinate delivery:', error);
    } finally {
      setLoading(false);
    }
  };

  const isOrderDelayed = () => {
    const estimatedTime = new Date(order.estimatedCompletionTime);
    const now = new Date();
    return now > estimatedTime && order.status !== 'ready_for_pickup' && order.status !== 'cancelled';
  };

  const getDelayMinutes = () => {
    const estimatedTime = new Date(order.estimatedCompletionTime);
    const now = new Date();
    return Math.max(0, Math.floor((now.getTime() - estimatedTime.getTime()) / (1000 * 60)));
  };

  return (
    <Card className={`p-4 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Delay & Quality Management</h3>
        <div className="flex gap-2">
          {isOrderDelayed() && (
            <Badge className="bg-red-100 text-red-800">
              <Clock className="w-3 h-3 mr-1" />
              {getDelayMinutes()}min overdue
            </Badge>
          )}
          <Badge className="bg-blue-100 text-blue-800">
            Order #{order.orderId}
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDelayForm(!showDelayForm)}
          className="flex items-center gap-1"
        >
          <Clock className="w-3 h-3" />
          Report Delay
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowQualityForm(!showQualityForm)}
          className="flex items-center gap-1"
        >
          <AlertTriangle className="w-3 h-3" />
          Quality Issue
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRemakeForm(!showRemakeForm)}
          className="flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          Request Remake
        </Button>
        
        {order.status === 'ready_for_pickup' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeliveryCoordination}
            disabled={loading}
            className="flex items-center gap-1"
          >
            <Phone className="w-3 h-3" />
            Notify Delivery
          </Button>
        )}
      </div>

      {/* Delay Reporting Form */}
      {showDelayForm && (
        <Card className="p-3 bg-yellow-50 border-yellow-200">
          <h4 className="font-medium mb-2">Report Delay</h4>
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-shrink-0">
                <label className="block text-sm font-medium mb-1">Minutes</label>
                <input
                  type="number"
                  value={delayMinutes}
                  onChange={(e) => setDelayMinutes(parseInt(e.target.value) || 0)}
                  className="w-20 px-2 py-1 border rounded text-sm"
                  min="1"
                  max="120"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Reason</label>
                <input
                  type="text"
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  placeholder="Equipment issue, ingredient shortage, etc."
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleDelayReport}
                disabled={!delayReason.trim() || delayMinutes <= 0 || loading}
              >
                Report & Notify Customer
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDelayForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Quality Issue Form */}
      {showQualityForm && (
        <Card className="p-3 bg-red-50 border-red-200">
          <h4 className="font-medium mb-2">Report Quality Issue</h4>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">Issue Type</label>
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
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Severity</label>
                <select
                  value={qualityIssueSeverity}
                  onChange={(e) => setQualityIssueSeverity(e.target.value as QualityIssue['severity'])}
                  className="w-full px-2 py-1 border rounded text-sm"
                >
                  <option value="minor">Minor</option>
                  <option value="major">Major</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={qualityIssueDescription}
                onChange={(e) => setQualityIssueDescription(e.target.value)}
                placeholder="Describe the quality issue in detail..."
                className="w-full px-2 py-1 border rounded text-sm"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleQualityIssueReport}
                disabled={!qualityIssueDescription.trim() || loading}
              >
                Report Issue
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowQualityForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Remake Request Form */}
      {showRemakeForm && (
        <Card className="p-3 bg-orange-50 border-orange-200">
          <h4 className="font-medium mb-2">Request Remake</h4>
          <div className="space-y-2">
            <div>
              <label className="block text-sm font-medium mb-1">Reason for Remake</label>
              <textarea
                value={remakeReason}
                onChange={(e) => setRemakeReason(e.target.value)}
                placeholder="Quality issue, customer complaint, preparation error, etc."
                className="w-full px-2 py-1 border rounded text-sm"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleRemakeRequest}
                disabled={!remakeReason.trim() || loading}
              >
                Request Remake
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRemakeForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Active Issues & Notifications */}
      <div className="space-y-3">
        {/* Delay Notifications */}
        {delayNotifications.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Recent Delay Notifications</h4>
            <div className="space-y-2">
              {delayNotifications.slice(0, 3).map((notification) => (
                <Alert key={notification.id} className="bg-yellow-50 border-yellow-200">
                  <Clock className="w-4 h-4" />
                  <div className="ml-2">
                    <div className="font-medium">
                      {notification.delayMinutes} minute delay reported
                    </div>
                    <div className="text-sm text-gray-600">
                      {notification.reason} • {new Date(notification.notifiedAt).toLocaleTimeString()}
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Quality Reports */}
        {qualityReports.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Quality Issues</h4>
            <div className="space-y-2">
              {qualityReports.slice(0, 3).map((report) => (
                <Alert key={report.id} className="bg-red-50 border-red-200">
                  <AlertTriangle className="w-4 h-4" />
                  <div className="ml-2">
                    <div className="font-medium">
                      {report.issue.type.replace('_', ' ')} issue ({report.issue.severity})
                    </div>
                    <div className="text-sm text-gray-600">
                      {report.issue.description}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Action taken: {report.actionTaken} • {report.resolvedAt ? 'Resolved' : 'Pending'}
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Remake Requests */}
        {remakeRequests.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Remake Requests</h4>
            <div className="space-y-2">
              {remakeRequests.slice(0, 3).map((request) => (
                <Alert key={request.id} className="bg-orange-50 border-orange-200">
                  <RotateCcw className="w-4 h-4" />
                  <div className="ml-2">
                    <div className="font-medium">
                      Remake request ({request.status})
                    </div>
                    <div className="text-sm text-gray-600">
                      {request.reason}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Requested: {new Date(request.requestedAt).toLocaleTimeString()}
                      {request.approvedAt && ` • Approved: ${new Date(request.approvedAt).toLocaleTimeString()}`}
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Delivery Coordination */}
        {deliveryCoordination && (
          <div>
            <h4 className="font-medium mb-2">Delivery Coordination</h4>
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="w-4 h-4" />
              <div className="ml-2">
                <div className="font-medium">
                  Delivery {deliveryCoordination.status}
                </div>
                <div className="text-sm text-gray-600">
                  Estimated pickup: {new Date(deliveryCoordination.estimatedPickupTime).toLocaleTimeString()}
                  {deliveryCoordination.deliveryPersonName && ` • Driver: ${deliveryCoordination.deliveryPersonName}`}
                </div>
              </div>
            </Alert>
          </div>
        )}
      </div>
    </Card>
  );
}