import React from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Alert } from './ui/alert';
import { 
  AlertTriangle, 
  Clock, 
  TrendingDown, 
  Package,
  RefreshCw
} from 'lucide-react';
import { useInventoryTracking } from '../hooks/useInventoryTracking';

interface InventoryAlertsProps {
  className?: string;
  compact?: boolean;
}

export const InventoryAlerts: React.FC<InventoryAlertsProps> = ({ 
  className = '', 
  compact = false 
}) => {
  const {
    lowStockAlerts,
    expirationAlerts,
    isLoading,
    error,
    getTotalAlertCount,
    getCriticalAlertCount,
    loadAlerts,
  } = useInventoryTracking();

  const totalAlerts = getTotalAlertCount();
  const criticalAlerts = getCriticalAlertCount();

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <div className="ml-2">
          <h4 className="text-red-800 font-medium">Inventory Alert Error</h4>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </Alert>
    );
  }

  if (compact) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Package className="h-6 w-6 text-gray-600" />
              {criticalAlerts > 0 && (
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">!</span>
                </div>
              )}
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Inventory Alerts</h3>
              <p className="text-sm text-gray-600">
                {totalAlerts === 0 ? 'All good' : `${totalAlerts} alert${totalAlerts > 1 ? 's' : ''}`}
                {criticalAlerts > 0 && ` (${criticalAlerts} critical)`}
              </p>
            </div>
          </div>
          
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
          ) : (
            <div className="flex gap-2">
              {lowStockAlerts.length > 0 && (
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  {lowStockAlerts.length} Low Stock
                </Badge>
              )}
              {expirationAlerts.length > 0 && (
                <Badge variant="outline" className="text-red-600 border-red-200">
                  {expirationAlerts.length} Expiring
                </Badge>
              )}
            </div>
          )}
        </div>
        
        {/* Quick preview of critical alerts */}
        {criticalAlerts > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="space-y-2">
              {lowStockAlerts
                .filter(alert => alert.severity === 'critical')
                .slice(0, 2)
                .map(alert => (
                  <div key={alert.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{alert.itemName}</span>
                    <Badge className="bg-red-100 text-red-800 text-xs">
                      Out of Stock
                    </Badge>
                  </div>
                ))}
              
              {expirationAlerts
                .filter(alert => alert.severity === 'expired')
                .slice(0, 2)
                .map(alert => (
                  <div key={alert.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{alert.itemName}</span>
                    <Badge className="bg-red-100 text-red-800 text-xs">
                      Expired
                    </Badge>
                  </div>
                ))}
            </div>
          </div>
        )}
      </Card>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Inventory Alerts</h2>
        <button
          onClick={loadAlerts}
          disabled={isLoading}
          className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {totalAlerts === 0 ? (
        <Card className="p-6 text-center">
          <Package className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">All Good!</h3>
          <p className="text-gray-600">No inventory alerts at this time.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Critical Alert Summary */}
          {criticalAlerts > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div className="ml-2">
                <h4 className="text-red-800 font-medium">Critical Inventory Issues</h4>
                <p className="text-red-700">
                  {criticalAlerts} item{criticalAlerts > 1 ? 's' : ''} require immediate attention.
                </p>
              </div>
            </Alert>
          )}

          {/* Low Stock Alerts */}
          {lowStockAlerts.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="h-5 w-5 text-orange-500" />
                <h3 className="font-medium text-gray-900">
                  Low Stock Items ({lowStockAlerts.length})
                </h3>
              </div>
              
              <div className="space-y-2">
                {lowStockAlerts.slice(0, 5).map(alert => (
                  <LowStockAlertItem key={alert.id} alert={alert} />
                ))}
                
                {lowStockAlerts.length > 5 && (
                  <p className="text-sm text-gray-500 pt-2">
                    And {lowStockAlerts.length - 5} more items...
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* Expiration Alerts */}
          {expirationAlerts.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-5 w-5 text-red-500" />
                <h3 className="font-medium text-gray-900">
                  Expiring Items ({expirationAlerts.length})
                </h3>
              </div>
              
              <div className="space-y-2">
                {expirationAlerts.slice(0, 5).map(alert => (
                  <ExpirationAlertItem key={alert.id} alert={alert} />
                ))}
                
                {expirationAlerts.length > 5 && (
                  <p className="text-sm text-gray-500 pt-2">
                    And {expirationAlerts.length - 5} more items...
                  </p>
                )}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

// Individual alert item components
const LowStockAlertItem: React.FC<{ alert: any }> = ({ alert }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <h4 className="font-medium text-gray-900">{alert.itemName}</h4>
        <p className="text-sm text-gray-600">
          Current: {alert.currentStock} | Minimum: {alert.minimumStock}
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <Badge className={`${getSeverityColor(alert.severity)} text-white text-xs`}>
          {alert.alertType === 'out_of_stock' ? 'Out' : 'Low'}
        </Badge>
      </div>
    </div>
  );
};

const ExpirationAlertItem: React.FC<{ alert: any }> = ({ alert }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'expired': return 'bg-red-500';
      case 'urgent': return 'bg-orange-500';
      default: return 'bg-yellow-500';
    }
  };

  const getTimeText = (daysUntilExpiration: number) => {
    if (daysUntilExpiration < 0) {
      return `Expired ${Math.abs(daysUntilExpiration)} day${Math.abs(daysUntilExpiration) > 1 ? 's' : ''} ago`;
    } else if (daysUntilExpiration === 0) {
      return 'Expires today';
    } else if (daysUntilExpiration === 1) {
      return 'Expires tomorrow';
    } else {
      return `Expires in ${daysUntilExpiration} days`;
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <h4 className="font-medium text-gray-900">{alert.itemName}</h4>
        <p className="text-sm text-gray-600">
          {getTimeText(alert.daysUntilExpiration)} • {alert.currentStock} {alert.unit}
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <Badge className={`${getSeverityColor(alert.severity)} text-white text-xs`}>
          {alert.severity === 'expired' ? 'Expired' : 
           alert.severity === 'urgent' ? 'Urgent' : 'Warning'}
        </Badge>
      </div>
    </div>
  );
};

export default InventoryAlerts;