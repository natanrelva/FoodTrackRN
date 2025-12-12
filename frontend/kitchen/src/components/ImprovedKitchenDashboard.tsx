import { useState, useEffect } from 'react';
import { Clock, ChefHat, AlertTriangle, Grid, List, Search, Bell, Settings, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ImprovedOrderTicket } from './ImprovedOrderTicket';
import { RecipeCardGrid } from './RecipeQuickView';
import { useKitchenOrders } from '../hooks/useKitchenOrders';
import { KitchenOrderItem } from '../types/kitchen';

type ViewMode = 'grid' | 'list' | 'recipes';
type FilterMode = 'all' | 'pending' | 'preparing' | 'ready' | 'urgent';

export function ImprovedKitchenDashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  const {
    orders,
    loading,
    error,
    updateOrderStatus,
    refreshOrders
  } = useKitchenOrders();

  // Auto-refresh orders every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshOrders, 30000);
    return () => clearInterval(interval);
  }, [refreshOrders]);

  const filteredOrders = orders.filter(order => {
    // Filter by status
    if (filterMode === 'pending' && order.status !== 'received') return false;
    if (filterMode === 'preparing' && order.status !== 'in_preparation') return false;
    if (filterMode === 'ready' && order.status !== 'ready_for_pickup') return false;
    if (filterMode === 'urgent' && order.priority !== 'urgent' && order.priority !== 'high') return false;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        order.id.toLowerCase().includes(query) ||
        order.items.some(item => item.name.toLowerCase().includes(query))
      );
    }

    return true;
  });

  const getOrderStats = () => {
    const pending = orders.filter(o => o.status === 'received').length;
    const preparing = orders.filter(o => o.status === 'in_preparation').length;
    const ready = orders.filter(o => o.status === 'ready_for_pickup').length;
    const urgent = orders.filter(o => o.priority === 'urgent' || o.priority === 'high').length;
    
    return { pending, preparing, ready, urgent };
  };

  const getAllOrderItems = (): KitchenOrderItem[] => {
    return orders.flatMap(order => order.items);
  };

  const handleOrderStatusUpdate = async (orderId: string, status: string) => {
    try {
      await updateOrderStatus(orderId, status as any);
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const handleItemStart = async (orderItem: KitchenOrderItem) => {
    try {
      // In a real implementation, this would call an API to update item status
      console.log('Starting item:', orderItem.name);
    } catch (error) {
      console.error('Failed to start item:', error);
    }
  };

  const handleItemComplete = async (orderItem: KitchenOrderItem) => {
    try {
      // In a real implementation, this would call an API to update item status
      console.log('Completing item:', orderItem.name);
    } catch (error) {
      console.error('Failed to complete item:', error);
    }
  };

  // Função para seleção múltipla de pedidos (para uso futuro)
  // const toggleOrderSelection = (orderId: string) => {
  //   const newSelected = new Set(selectedOrders);
  //   if (newSelected.has(orderId)) {
  //     newSelected.delete(orderId);
  //   } else {
  //     newSelected.add(orderId);
  //   }
  //   setSelectedOrders(newSelected);
  // };

  const stats = getOrderStats();

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-medium">Erro ao carregar pedidos</h3>
          </div>
          <p className="text-red-700 text-sm mt-2">{error}</p>
          <Button 
            variant="outline" 
            onClick={refreshOrders}
            className="mt-4"
          >
            Tentar Novamente
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ChefHat className="w-8 h-8 text-blue-600" />
            Dashboard da Cozinha
          </h1>
          <p className="text-gray-600 mt-1">
            Gerencie pedidos e receitas em tempo real
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Bell className="w-4 h-4 mr-2" />
            Notificações
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pendentes</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Preparando</p>
              <p className="text-2xl font-bold text-blue-600">{stats.preparing}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <ChefHat className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Prontos</p>
              <p className="text-2xl font-bold text-green-600">{stats.ready}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Urgentes</p>
              <p className="text-2xl font-bold text-red-600">{stats.urgent}</p>
            </div>
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar pedidos, clientes ou pratos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filters and View Controls */}
        <div className="flex items-center gap-2">
          {/* Filter Buttons */}
          <div className="flex items-center gap-1">
            {[
              { key: 'all', label: 'Todos', count: orders.length },
              { key: 'pending', label: 'Pendentes', count: stats.pending },
              { key: 'preparing', label: 'Preparando', count: stats.preparing },
              { key: 'ready', label: 'Prontos', count: stats.ready },
              { key: 'urgent', label: 'Urgentes', count: stats.urgent }
            ].map(({ key, label, count }) => (
              <Button
                key={key}
                variant={filterMode === key ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterMode(key as FilterMode)}
                className="flex items-center gap-1"
              >
                {label}
                {count > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {count}
                  </Badge>
                )}
              </Button>
            ))}
          </div>

          <div className="h-6 w-px bg-gray-300" />

          {/* View Mode Buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === 'list' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'recipes' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('recipes')}
            >
              <ChefHat className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <Card className="p-12 text-center">
            <ChefHat className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum pedido encontrado
            </h3>
            <p className="text-gray-600">
              {searchQuery 
                ? 'Tente ajustar sua busca ou filtros'
                : 'Não há pedidos no momento'
              }
            </p>
          </Card>
        ) : (
          <>
            {viewMode === 'list' && (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <ImprovedOrderTicket
                    key={order.id}
                    order={order}
                    onStatusUpdate={handleOrderStatusUpdate}
                    onStartItem={handleItemStart}
                    onCompleteItem={handleItemComplete}
                  />
                ))}
              </div>
            )}

            {viewMode === 'grid' && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredOrders.map((order) => (
                  <ImprovedOrderTicket
                    key={order.id}
                    order={order}
                    onStatusUpdate={handleOrderStatusUpdate}
                    onStartItem={handleItemStart}
                    onCompleteItem={handleItemComplete}
                    compact={true}
                  />
                ))}
              </div>
            )}

            {viewMode === 'recipes' && (
              <RecipeCardGrid
                orderItems={getAllOrderItems()}
                onStartPreparation={handleItemStart}
              />
            )}
          </>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedOrders.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedOrders.size} pedido{selectedOrders.size > 1 ? 's' : ''} selecionado{selectedOrders.size > 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                Imprimir Todos
              </Button>
              <Button size="sm">
                Iniciar Todos
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setSelectedOrders(new Set())}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}