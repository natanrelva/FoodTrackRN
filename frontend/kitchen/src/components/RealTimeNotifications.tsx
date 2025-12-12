import { useState } from 'react';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Bell, 
  Package, 
  AlertTriangle, 
  HelpCircle, 
  AlertCircle,
  X,
  Clock,
  User
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function RealTimeNotifications() {
  const {
    recentOrders,
    lowStockAlerts,
    helpRequests,
    qualityIssues,
  } = useWebSocketContext();

  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const dismissAlert = (id: string) => {
    setDismissedAlerts(prev => new Set([...prev, id]));
  };

  const activeLowStockAlerts = lowStockAlerts.filter(
    alert => !dismissedAlerts.has(`stock-${alert.ingredientId}`)
  );

  const activeHelpRequests = helpRequests.filter(
    request => request.status === 'pending' && !dismissedAlerts.has(`help-${request.stationId}-${request.timestamp}`)
  );

  const activeQualityIssues = qualityIssues.filter(
    issue => !dismissedAlerts.has(`quality-${issue.orderId}-${issue.timestamp}`)
  );

  const totalNotifications = activeLowStockAlerts.length + activeHelpRequests.length + activeQualityIssues.length;

  return (
    <div className="space-y-4">
      {/* Notification Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="w-5 h-5" />
            Real-Time Notifications
            {totalNotifications > 0 && (
              <Badge variant="destructive" className="ml-2">
                {totalNotifications}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {totalNotifications === 0 ? (
            <p className="text-muted-foreground text-sm">No active notifications</p>
          ) : (
            <>
              {/* Critical Stock Alerts */}
              {activeLowStockAlerts.map((alert) => (
                <Alert 
                  key={`stock-${alert.ingredientId}`}
                  variant={alert.severity === 'critical' ? 'destructive' : 'default'}
                  className="relative"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="pr-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <strong>{alert.ingredientName}</strong> is running low
                        <div className="text-sm text-muted-foreground">
                          {alert.currentStock} {alert.unit} remaining (min: {alert.minimumStock})
                        </div>
                      </div>
                      <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                        {alert.severity}
                      </Badge>
                    </div>
                  </AlertDescription>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0"
                    onClick={() => dismissAlert(`stock-${alert.ingredientId}`)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Alert>
              ))}

              {/* Help Requests */}
              {activeHelpRequests.map((request) => (
                <Alert 
                  key={`help-${request.stationId}-${request.timestamp}`}
                  className="relative"
                >
                  <HelpCircle className="h-4 w-4" />
                  <AlertDescription className="pr-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <strong>{request.stationName}</strong> needs help
                        <div className="text-sm text-muted-foreground">
                          {request.helpType}: {request.message || 'Assistance requested'}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <User className="h-3 w-3" />
                          {request.requestedBy}
                          <Clock className="h-3 w-3 ml-2" />
                          {formatDistanceToNow(new Date(request.timestamp), { addSuffix: true })}
                        </div>
                      </div>
                      <Badge variant="outline">
                        {request.helpType}
                      </Badge>
                    </div>
                  </AlertDescription>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0"
                    onClick={() => dismissAlert(`help-${request.stationId}-${request.timestamp}`)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Alert>
              ))}

              {/* Quality Issues */}
              {activeQualityIssues.map((issue) => (
                <Alert 
                  key={`quality-${issue.orderId}-${issue.timestamp}`}
                  variant={issue.severity === 'critical' ? 'destructive' : 'default'}
                  className="relative"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="pr-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <strong>Quality Issue</strong> - Order {issue.orderId}
                        <div className="text-sm text-muted-foreground">
                          {issue.issue}
                          {issue.requiresRemake && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              Remake Required
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <User className="h-3 w-3" />
                          {issue.reportedBy}
                          <Clock className="h-3 w-3 ml-2" />
                          {formatDistanceToNow(new Date(issue.timestamp), { addSuffix: true })}
                        </div>
                      </div>
                      <Badge variant={issue.severity === 'critical' ? 'destructive' : 'secondary'}>
                        {issue.severity}
                      </Badge>
                    </div>
                  </AlertDescription>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0"
                    onClick={() => dismissAlert(`quality-${issue.orderId}-${issue.timestamp}`)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Alert>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="w-5 h-5" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentOrders.slice(0, 5).map((order) => (
                <div 
                  key={order.orderId}
                  className="flex items-center justify-between p-2 bg-muted rounded-lg"
                >
                  <div>
                    <div className="font-medium">Order {order.orderId}</div>
                    <div className="text-sm text-muted-foreground">
                      {order.items.length} items
                      {order.customerInfo?.name && ` • ${order.customerInfo.name}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={
                        order.priority === 'urgent' ? 'destructive' :
                        order.priority === 'high' ? 'default' :
                        'secondary'
                      }
                    >
                      {order.priority}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      ETA: {new Date(order.estimatedCompletionTime).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default RealTimeNotifications;