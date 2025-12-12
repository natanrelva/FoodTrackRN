import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert } from './ui/alert';
import { Progress } from './ui/progress';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { 
  Package, 
  AlertTriangle, 
  Clock, 
  TrendingDown, 
  Scan,
  Plus,
  RefreshCw,

  Search
} from 'lucide-react';
import { useInventoryTracking } from '../hooks/useInventoryTracking';
import { InventoryItem, StockAlert, ExpirationAlert } from '@foodtrack/types';

interface InventoryManagementProps {
  className?: string;
}

export const InventoryManagement: React.FC<InventoryManagementProps> = ({ className }) => {
  const {
    inventory,
    lowStockAlerts,
    expirationAlerts,
    reorderSuggestions,
    isLoading,
    error,
    loadInventoryData,
    updateIngredientUsage,
    processBarcodeScann,

    getTotalAlertCount,
    getCriticalAlertCount,
    getLowStockItems,
    getExpiringItems,
  } = useInventoryTracking();

  const { updateInventoryUsage, lowStockAlerts: realtimeLowStockAlerts } = useWebSocketContext();

  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'delivery' | 'usage'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // Handle real-time inventory usage updates
  const _handleInventoryUsage = (ingredientId: string, quantity: number, orderId: string) => {
    // Update via WebSocket
    const success = updateInventoryUsage(ingredientId, quantity, orderId);
    if (success) {
      // Also update local state
      updateIngredientUsage(ingredientId, quantity, orderId);
    }
  };

  // Refresh inventory data when real-time alerts change
  useEffect(() => {
    if (realtimeLowStockAlerts.length > 0) {
      // Refresh inventory data to get latest stock levels
      loadInventoryData();
    }
  }, [realtimeLowStockAlerts, loadInventoryData]);

  // Filter inventory based on search and category
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(inventory.map(item => item.category)))];

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold">{inventory.length}</p>
            </div>
            <Package className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-orange-600">{getLowStockItems().length}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-red-600">{getExpiringItems().length}</p>
            </div>
            <Clock className="h-8 w-8 text-red-500" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Alerts</p>
              <p className="text-2xl font-bold text-red-600">{getTotalAlertCount()}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search ingredients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
            </option>
          ))}
        </select>
        
        <Button
          onClick={() => setShowBarcodeScanner(true)}
          className="flex items-center gap-2"
        >
          <Scan className="h-4 w-4" />
          Scan Barcode
        </Button>
      </div>

      {/* Inventory List */}
      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Inventory Items</h3>
          
          {filteredInventory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No inventory items found</p>
          ) : (
            <div className="space-y-3">
              {filteredInventory.map(item => (
                <InventoryItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  const renderAlertsTab = () => (
    <div className="space-y-6">
      {/* Critical Alerts */}
      {getCriticalAlertCount() > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <div className="ml-2">
            <h4 className="text-red-800 font-medium">Critical Alerts</h4>
            <p className="text-red-700">
              You have {getCriticalAlertCount()} critical inventory issues that need immediate attention.
            </p>
          </div>
        </Alert>
      )}

      {/* Low Stock Alerts */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-orange-500" />
          Low Stock Alerts ({lowStockAlerts.length})
        </h3>
        
        {lowStockAlerts.length === 0 ? (
          <p className="text-gray-500">No low stock alerts</p>
        ) : (
          <div className="space-y-3">
            {lowStockAlerts.map(alert => (
              <StockAlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </Card>

      {/* Expiration Alerts */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-red-500" />
          Expiration Alerts ({expirationAlerts.length})
        </h3>
        
        {expirationAlerts.length === 0 ? (
          <p className="text-gray-500">No expiration alerts</p>
        ) : (
          <div className="space-y-3">
            {expirationAlerts.map(alert => (
              <ExpirationAlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );

  const renderDeliveryTab = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Record New Delivery</h3>
        <DeliveryForm onDeliveryRecorded={loadInventoryData} />
      </Card>
      
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Reorder Suggestions</h3>
        
        {reorderSuggestions.length === 0 ? (
          <p className="text-gray-500">No reorder suggestions at this time</p>
        ) : (
          <div className="space-y-3">
            {reorderSuggestions.map((suggestion, index) => (
              <ReorderSuggestionCard key={index} suggestion={suggestion} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );

  const renderUsageTab = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Manual Usage Entry</h3>
        <UsageForm onUsageRecorded={loadInventoryData} />
      </Card>
    </div>
  );

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <div className="ml-2">
          <h4 className="text-red-800 font-medium">Error Loading Inventory</h4>
          <p className="text-red-700">{error}</p>
          <Button 
            onClick={loadInventoryData} 
            className="mt-2"
            size="sm"
          >
            Retry
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory Management</h2>
          <p className="text-gray-600">Track ingredients, manage stock levels, and handle deliveries</p>
        </div>
        
        <Button
          onClick={loadInventoryData}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Package },
            { id: 'alerts', label: `Alerts (${getTotalAlertCount()})`, icon: AlertTriangle },
            { id: 'delivery', label: 'Delivery', icon: Plus },
            { id: 'usage', label: 'Usage', icon: TrendingDown },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading inventory...</span>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'alerts' && renderAlertsTab()}
          {activeTab === 'delivery' && renderDeliveryTab()}
          {activeTab === 'usage' && renderUsageTab()}
        </>
      )}

      {/* Barcode Scanner Modal */}
      {showBarcodeScanner && (
        <BarcodeScanner
          onClose={() => setShowBarcodeScanner(false)}
          onScanned={(barcode) => {
            processBarcodeScann(barcode);
            setShowBarcodeScanner(false);
          }}
        />
      )}
    </div>
  );
};

// Individual component for inventory items
const InventoryItemCard: React.FC<{ item: InventoryItem }> = ({ item }) => {
  const stockPercentage = (item.currentStock / item.minimumStock) * 100;
  const isLowStock = item.currentStock <= item.minimumStock;
  const isOutOfStock = item.currentStock === 0;
  
  const getStockStatus = () => {
    if (isOutOfStock) return { label: 'Out of Stock', color: 'bg-red-500' };
    if (isLowStock) return { label: 'Low Stock', color: 'bg-orange-500' };
    return { label: 'In Stock', color: 'bg-green-500' };
  };
  
  const status = getStockStatus();
  
  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h4 className="font-medium text-gray-900">{item.name}</h4>
          <Badge className={`${status.color} text-white`}>
            {status.label}
          </Badge>
          {item.expirationDate && (
            <Badge variant="outline" className="text-xs">
              Expires: {new Date(item.expirationDate).toLocaleDateString()}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
          <span>Category: {item.category}</span>
          <span>Supplier: {item.supplier}</span>
          <span>Unit: {item.unit}</span>
        </div>
        
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span>Stock Level</span>
            <span>{item.currentStock} / {item.minimumStock} minimum</span>
          </div>
          <Progress 
            value={Math.min(stockPercentage, 100)} 
            className={`h-2 ${isLowStock ? 'bg-red-100' : 'bg-green-100'}`}
          />
        </div>
      </div>
    </div>
  );
};

// Stock Alert Card Component
const StockAlertCard: React.FC<{ alert: StockAlert }> = ({ alert }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-200 text-red-800';
      case 'high': return 'bg-orange-100 border-orange-200 text-orange-800';
      case 'medium': return 'bg-yellow-100 border-yellow-200 text-yellow-800';
      default: return 'bg-blue-100 border-blue-200 text-blue-800';
    }
  };
  
  return (
    <div className={`p-4 border rounded-lg ${getSeverityColor(alert.severity)}`}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">{alert.itemName}</h4>
          <p className="text-sm mt-1">
            Current: {alert.currentStock} | Minimum: {alert.minimumStock}
          </p>
        </div>
        <Badge className={getSeverityColor(alert.severity)}>
          {alert.severity.toUpperCase()}
        </Badge>
      </div>
    </div>
  );
};

// Expiration Alert Card Component
const ExpirationAlertCard: React.FC<{ alert: ExpirationAlert }> = ({ alert }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'expired': return 'bg-red-100 border-red-200 text-red-800';
      case 'urgent': return 'bg-orange-100 border-orange-200 text-orange-800';
      default: return 'bg-yellow-100 border-yellow-200 text-yellow-800';
    }
  };
  
  return (
    <div className={`p-4 border rounded-lg ${getSeverityColor(alert.severity)}`}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">{alert.itemName}</h4>
          <p className="text-sm mt-1">
            {alert.daysUntilExpiration < 0 
              ? `Expired ${Math.abs(alert.daysUntilExpiration)} days ago`
              : `Expires in ${alert.daysUntilExpiration} days`
            }
          </p>
          <p className="text-sm">Stock: {alert.currentStock} {alert.unit}</p>
        </div>
        <div className="text-right">
          <Badge className={getSeverityColor(alert.severity)}>
            {alert.severity.toUpperCase()}
          </Badge>
          <p className="text-xs mt-1 capitalize">{alert.suggestedAction.replace('_', ' ')}</p>
        </div>
      </div>
    </div>
  );
};

// Placeholder components for forms and scanner
const DeliveryForm: React.FC<{ onDeliveryRecorded: () => void }> = ({ onDeliveryRecorded: _onDeliveryRecorded }) => (
  <div className="text-center py-8 text-gray-500">
    Delivery form component would be implemented here
  </div>
);

const UsageForm: React.FC<{ onUsageRecorded: () => void }> = ({ onUsageRecorded: _onUsageRecorded }) => (
  <div className="text-center py-8 text-gray-500">
    Usage form component would be implemented here
  </div>
);

const ReorderSuggestionCard: React.FC<{ suggestion: any }> = ({ suggestion }) => (
  <div className="p-4 border border-gray-200 rounded-lg">
    <div className="flex items-center justify-between">
      <div>
        <h4 className="font-medium">{suggestion.ingredientName}</h4>
        <p className="text-sm text-gray-600">
          Current: {suggestion.currentStock} | Suggested: {suggestion.suggestedOrderQuantity}
        </p>
      </div>
      <Badge className={`${
        suggestion.priority === 'critical' ? 'bg-red-500' :
        suggestion.priority === 'high' ? 'bg-orange-500' :
        suggestion.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
      } text-white`}>
        {suggestion.priority.toUpperCase()}
      </Badge>
    </div>
  </div>
);

const BarcodeScanner: React.FC<{ 
  onClose: () => void; 
  onScanned: (barcode: string) => void; 
}> = ({ onClose, onScanned }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <Card className="p-6 max-w-md w-full mx-4">
      <h3 className="text-lg font-semibold mb-4">Barcode Scanner</h3>
      <p className="text-gray-600 mb-4">
        Barcode scanner integration would be implemented here
      </p>
      <div className="flex gap-2">
        <Button onClick={onClose} variant="outline" className="flex-1">
          Cancel
        </Button>
        <Button 
          onClick={() => onScanned('mock-barcode-123')} 
          className="flex-1"
        >
          Mock Scan
        </Button>
      </div>
    </Card>
  </div>
);

export default InventoryManagement;