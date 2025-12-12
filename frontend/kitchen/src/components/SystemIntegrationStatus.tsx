import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Alert } from './ui/alert';
import { kitchenOperations } from '../lib/api';

interface IntegrationSystem {
  connected: boolean;
  lastSync?: string;
  lastNotification?: string;
  lastRecipeSync?: string;
  lastDataSent?: string;
  lastReorderRequest?: string;
  status: 'healthy' | 'warning' | 'error';
  autoReorderingEnabled?: boolean;
}

interface IntegrationStatus {
  orderManagementSystem: IntegrationSystem;
  deliverySystem: IntegrationSystem;
  productService: IntegrationSystem;
  analyticsSystem: IntegrationSystem;
  procurementSystem: IntegrationSystem;
}

interface SystemIntegrationStatusProps {
  className?: string;
}

export function SystemIntegrationStatus({ className }: SystemIntegrationStatusProps) {
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [overallHealth, setOverallHealth] = useState<string>('unknown');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntegrationStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await kitchenOperations.getIntegrationStatus();
      setIntegrationStatus(response.integrationStatus);
      setOverallHealth(response.overallHealth);
      setLastUpdated(response.lastUpdated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch integration status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrationStatus();
    
    // Refresh status every 30 seconds
    const interval = setInterval(fetchIntegrationStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConnectionStatus = (connected: boolean) => {
    return connected ? (
      <Badge className="bg-green-100 text-green-800">Connected</Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">Disconnected</Badge>
    );
  };

  const formatLastActivity = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  const handleRefresh = () => {
    fetchIntegrationStatus();
  };

  const handleSendAnalytics = async () => {
    try {
      await kitchenOperations.sendAnalyticsData();
      // Refresh status after sending analytics
      setTimeout(fetchIntegrationStatus, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send analytics data');
    }
  };

  const handleProcessReordering = async () => {
    try {
      await kitchenOperations.processAutomaticReordering();
      // Refresh status after processing reordering
      setTimeout(fetchIntegrationStatus, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process automatic reordering');
    }
  };

  const handleUpdateProductAvailability = async () => {
    try {
      await kitchenOperations.updateProductAvailability();
      // Refresh status after updating availability
      setTimeout(fetchIntegrationStatus, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product availability');
    }
  };

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <Alert className="mb-4">
          <div className="font-medium">Integration Status Error</div>
          <div className="text-sm text-gray-600 mt-1">{error}</div>
        </Alert>
        <Button onClick={handleRefresh} size="sm">
          Retry
        </Button>
      </Card>
    );
  }

  if (!integrationStatus) {
    return null;
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">System Integration Status</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={getStatusColor(overallHealth)}>
              {overallHealth.charAt(0).toUpperCase() + overallHealth.slice(1)}
            </Badge>
            <span className="text-sm text-gray-500">
              Last updated: {formatLastActivity(lastUpdated)}
            </span>
          </div>
        </div>
        <Button onClick={handleRefresh} size="sm" variant="outline">
          Refresh
        </Button>
      </div>

      <div className="space-y-4">
        {/* Order Management System */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <div className="font-medium">Order Management System</div>
            <div className="text-sm text-gray-600">
              Last sync: {formatLastActivity(integrationStatus.orderManagementSystem.lastSync)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getConnectionStatus(integrationStatus.orderManagementSystem.connected)}
            <Badge className={getStatusColor(integrationStatus.orderManagementSystem.status)}>
              {integrationStatus.orderManagementSystem.status}
            </Badge>
          </div>
        </div>

        {/* Delivery System */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <div className="font-medium">Delivery System</div>
            <div className="text-sm text-gray-600">
              Last notification: {formatLastActivity(integrationStatus.deliverySystem.lastNotification)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getConnectionStatus(integrationStatus.deliverySystem.connected)}
            <Badge className={getStatusColor(integrationStatus.deliverySystem.status)}>
              {integrationStatus.deliverySystem.status}
            </Badge>
          </div>
        </div>

        {/* Product Service */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <div className="font-medium">Product Service</div>
            <div className="text-sm text-gray-600">
              Last recipe sync: {formatLastActivity(integrationStatus.productService.lastRecipeSync)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getConnectionStatus(integrationStatus.productService.connected)}
            <Badge className={getStatusColor(integrationStatus.productService.status)}>
              {integrationStatus.productService.status}
            </Badge>
            <Button 
              onClick={handleUpdateProductAvailability} 
              size="sm" 
              variant="outline"
              className="text-xs"
            >
              Update Availability
            </Button>
          </div>
        </div>

        {/* Analytics System */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <div className="font-medium">Analytics System</div>
            <div className="text-sm text-gray-600">
              Last data sent: {formatLastActivity(integrationStatus.analyticsSystem.lastDataSent)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getConnectionStatus(integrationStatus.analyticsSystem.connected)}
            <Badge className={getStatusColor(integrationStatus.analyticsSystem.status)}>
              {integrationStatus.analyticsSystem.status}
            </Badge>
            <Button 
              onClick={handleSendAnalytics} 
              size="sm" 
              variant="outline"
              className="text-xs"
            >
              Send Data
            </Button>
          </div>
        </div>

        {/* Procurement System */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <div className="font-medium">Procurement System</div>
            <div className="text-sm text-gray-600">
              Last reorder: {formatLastActivity(integrationStatus.procurementSystem.lastReorderRequest)}
              {integrationStatus.procurementSystem.autoReorderingEnabled && (
                <span className="ml-2 text-green-600">• Auto-reordering enabled</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getConnectionStatus(integrationStatus.procurementSystem.connected)}
            <Badge className={getStatusColor(integrationStatus.procurementSystem.status)}>
              {integrationStatus.procurementSystem.status}
            </Badge>
            <Button 
              onClick={handleProcessReordering} 
              size="sm" 
              variant="outline"
              className="text-xs"
            >
              Process Reordering
            </Button>
          </div>
        </div>
      </div>

      {/* Integration Actions */}
      <div className="mt-6 pt-4 border-t">
        <div className="text-sm font-medium text-gray-700 mb-3">Quick Actions</div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={handleSendAnalytics} 
            size="sm" 
            variant="outline"
          >
            Send Analytics Data
          </Button>
          <Button 
            onClick={handleProcessReordering} 
            size="sm" 
            variant="outline"
          >
            Process Auto-Reordering
          </Button>
          <Button 
            onClick={handleUpdateProductAvailability} 
            size="sm" 
            variant="outline"
          >
            Update Product Availability
          </Button>
        </div>
      </div>
    </Card>
  );
}