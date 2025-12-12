import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Settings, AlertTriangle, Clock, ChefHat, Package } from 'lucide-react';
import { Button } from '../components/ui/button';

import { Card } from '../components/ui/card';
import { Alert } from '../components/ui/alert';
import { OrderQueue } from '../components/OrderQueue';
import { InventoryManagement } from '../components/InventoryManagement';
import { WorkloadManagement } from '../components/WorkloadManagement';
import { useKitchenOrders } from '../hooks/useKitchenOrders';
import { usePriorityAdjustment } from '../hooks/usePriorityAdjustment';
import { KitchenStatus } from '../types/kitchen';

export function KitchenDashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'inventory' | 'workload'>('dashboard');
  
  const {
    orders,
    loading,
    error,
    refreshOrders,
    updateOrderStatus,
    updateOrderPriority,
    assignOrderToStation
  } = useKitchenOrders({
    autoRefresh: true,
    refreshInterval: 30000 // 30 seconds
  });

  // Set up dynamic priority adjustment
  usePriorityAdjustment(orders, updateOrderPriority);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshOrders();
    } finally {
      setRefreshing(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, status: KitchenStatus) => {
    try {
      await updateOrderStatus(orderId, status);
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const handleStationAssignment = async (orderId: string, stationId: string) => {
    try {
      await assignOrderToStation(orderId, stationId);
    } catch (error) {
      console.error('Failed to assign order to station:', error);
    }
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-lg border">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Painel da Cozinha</h2>
          <div className="text-sm text-gray-600 mt-1">
            Gestão de pedidos em tempo real e operações da cozinha
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-white hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          
          <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50">
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <div className="text-red-800">
            <strong>Erro de Conexão:</strong> {error}
          </div>
        </Alert>
      )}





      {/* Main Content Area - Reorganized for Better Cohesion */}
      {activeView === 'dashboard' ? (
        <>
          {/* Integrated Alerts Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-blue-900">Notificações</h3>
                  <p className="text-sm text-blue-700">Tempo real ativo</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 bg-gradient-to-r from-red-50 to-red-100 border-red-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-red-900">Estoque</h3>
                  <p className="text-sm text-red-700">Alertas ativos</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 bg-gradient-to-r from-green-50 to-green-100 border-green-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <ChefHat className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-green-900">Sistema</h3>
                  <p className="text-sm text-green-700">Operacional</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Order Queue - Full Width */}
          {loading ? (
            <Card className="p-8 text-center bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                <span className="text-gray-700">Carregando pedidos...</span>
              </div>
            </Card>
          ) : (
            <OrderQueue
              orders={orders}
              onStatusUpdate={handleStatusUpdate}
              onAssignStation={handleStationAssignment}
            />
          )}

          {/* Bottom Action Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-shadow">
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-purple-900 mb-2">Estoque Completo</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setActiveView('inventory')}
                  className="w-full bg-white hover:bg-purple-50 text-purple-700 border-purple-300"
                >
                  Visualizar
                </Button>
              </div>
            </Card>
            
            <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ChefHat className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-blue-900 mb-2">Estações</h3>
                <Link to="/station/grill" className="block">
                  <Button variant="outline" size="sm" className="w-full bg-white hover:bg-blue-50 text-blue-700 border-blue-300">
                    Acessar
                  </Button>
                </Link>
              </div>
            </Card>
            
            <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-lg transition-shadow">
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-orange-900 mb-2">Carga de Trabalho</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setActiveView('workload')}
                  className="w-full bg-white hover:bg-orange-50 text-orange-700 border-orange-300"
                >
                  Gerenciar
                </Button>
              </div>
            </Card>
            
            <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <RefreshCw className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-green-900 mb-2">Atualizar</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="w-full bg-white hover:bg-green-50 text-green-700 border-green-300"
                >
                  {refreshing ? 'Atualizando...' : 'Refresh'}
                </Button>
              </div>
            </Card>
          </div>
        </>
      ) : activeView === 'inventory' ? (
        <>
          {/* Inventory Management View */}
          <div className="flex items-center justify-between mb-4">
            <Button 
              variant="outline" 
              onClick={() => setActiveView('dashboard')}
            >
              ← Back to Dashboard
            </Button>
          </div>
          
          <InventoryManagement />
        </>
      ) : activeView === 'workload' ? (
        <>
          {/* Workload Management View */}
          <div className="flex items-center justify-between mb-4">
            <Button 
              variant="outline" 
              onClick={() => setActiveView('dashboard')}
            >
              ← Back to Dashboard
            </Button>
          </div>
          
          <WorkloadManagement />
        </>
      ) : null}
    </div>
  );
}