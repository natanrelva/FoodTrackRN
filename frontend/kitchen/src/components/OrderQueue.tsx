import { useState, useMemo } from 'react';
import { Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { OrderTicket } from './OrderTicket';
import { 
  KitchenOrder, 
  KitchenStatus, 
  OrderPriority 
} from '../types/kitchen';

interface OrderQueueProps {
  orders: KitchenOrder[];
  onStatusUpdate: (orderId: string, status: KitchenStatus) => void;
  onAssignStation: (orderId: string, stationId: string) => void;
  className?: string;
}

type SortOption = 'priority' | 'time' | 'status' | 'channel';
type SortDirection = 'asc' | 'desc';

interface GroupedOrders {
  [key: string]: KitchenOrder[];
}

export function OrderQueue({ orders, onStatusUpdate, onAssignStation, className }: OrderQueueProps) {
  const [sortBy, setSortBy] = useState<SortOption>('priority');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [statusFilter, setStatusFilter] = useState<KitchenStatus[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<OrderPriority[]>([]);
  const [groupByDish, setGroupByDish] = useState(false);

  // Priority weights for sorting
  const priorityWeights: Record<OrderPriority, number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1
  };

  // Status weights for sorting
  const statusWeights: Record<KitchenStatus, number> = {
    received: 1,
    in_preparation: 2,
    ready_for_plating: 3,
    plated: 4,
    ready_for_pickup: 5,
    on_hold: 0,
    cancelled: -1
  };

  // Filter orders based on selected filters
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const statusMatch = statusFilter.length === 0 || statusFilter.includes(order.status);
      const priorityMatch = priorityFilter.length === 0 || priorityFilter.includes(order.priority);
      return statusMatch && priorityMatch;
    });
  }, [orders, statusFilter, priorityFilter]);

  // Sort orders based on selected criteria
  const sortedOrders = useMemo(() => {
    const sorted = [...filteredOrders].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'priority':
          comparison = priorityWeights[b.priority] - priorityWeights[a.priority];
          break;
        case 'time':
          const timeA = new Date(a.estimatedCompletionTime).getTime();
          const timeB = new Date(b.estimatedCompletionTime).getTime();
          comparison = timeA - timeB;
          break;
        case 'status':
          comparison = statusWeights[b.status] - statusWeights[a.status];
          break;
        case 'channel':
          const aChannel = (a as any).channel || 'app';
          const bChannel = (b as any).channel || 'app';
          comparison = aChannel.localeCompare(bChannel);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [filteredOrders, sortBy, sortDirection, priorityWeights, statusWeights]);

  // BK Style - Group orders by status (columns)
  const groupedOrders = useMemo(() => {
    if (!groupByDish) {
      // BK Style - Group by status for column layout
      const statusGroups: GroupedOrders = {
        'NOVOS': sortedOrders.filter(order => order.status === 'received'),
        'FAZENDO': sortedOrders.filter(order => order.status === 'in_preparation'),
        'MONTAR': sortedOrders.filter(order => order.status === 'ready_for_plating'),
        'PRONTO': sortedOrders.filter(order => order.status === 'plated' || order.status === 'ready_for_pickup'),
        'PARADOS': sortedOrders.filter(order => order.status === 'on_hold')
      };
      
      // Remove empty groups
      Object.keys(statusGroups).forEach(key => {
        if (statusGroups[key].length === 0) {
          delete statusGroups[key];
        }
      });
      
      return statusGroups;
    }

    // Original dish grouping
    const groups: GroupedOrders = {};
    sortedOrders.forEach(order => {
      order.items.forEach(item => {
        const dishKey = `${item.name}${item.modifications.length > 0 ? ' (MOD)' : ''}`;
        if (!groups[dishKey]) {
          groups[dishKey] = [];
        }
        const existingOrder = groups[dishKey].find(o => o.id === order.id);
        if (!existingOrder) {
          groups[dishKey].push(order);
        }
      });
    });

    return groups;
  }, [sortedOrders, groupByDish]);

  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(option);
      setSortDirection('desc');
    }
  };

  const toggleStatusFilter = (status: KitchenStatus) => {
    setStatusFilter(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const togglePriorityFilter = (priority: OrderPriority) => {
    setPriorityFilter(prev => 
      prev.includes(priority) 
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
  };

  const getOrderStats = () => {
    const total = filteredOrders.length;
    const overdue = filteredOrders.filter(order => {
      const estimatedTime = new Date(order.estimatedCompletionTime);
      return estimatedTime.getTime() < Date.now() && 
             order.status !== 'ready_for_pickup' && 
             order.status !== 'cancelled';
    }).length;
    const urgent = filteredOrders.filter(order => order.priority === 'urgent').length;
    
    return { total, overdue, urgent };
  };

  const stats = getOrderStats();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Enhanced Stats Dashboard */}
      <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-6 rounded-xl border-2 border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-black text-gray-900">PAINEL DA COZINHA</h2>
          <div className="text-sm text-gray-500 font-medium">
            Atualizado em tempo real • {new Date().toLocaleTimeString('pt-BR')}
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
            <div className="text-2xl font-black text-gray-900">{stats.total}</div>
            <div className="text-xs font-bold text-gray-600 uppercase">Total Pedidos</div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-center">
            <div className="text-2xl font-black text-yellow-800">
              {sortedOrders.filter(o => o.status === 'in_preparation').length}
            </div>
            <div className="text-xs font-bold text-yellow-700 uppercase">Em Preparo</div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
            <div className="text-2xl font-black text-green-800">
              {sortedOrders.filter(o => o.status === 'ready_for_pickup').length}
            </div>
            <div className="text-xs font-bold text-green-700 uppercase">Prontos</div>
          </div>
          
          <div className={`p-4 rounded-lg border text-center ${
            stats.overdue > 0 ? 'bg-red-50 border-red-200 animate-pulse' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className={`text-2xl font-black ${stats.overdue > 0 ? 'text-red-800' : 'text-gray-600'}`}>
              {stats.overdue}
            </div>
            <div className={`text-xs font-bold uppercase ${stats.overdue > 0 ? 'text-red-700' : 'text-gray-600'}`}>
              Atrasados
            </div>
          </div>
          
          <div className={`p-4 rounded-lg border text-center ${
            stats.urgent > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className={`text-2xl font-black ${stats.urgent > 0 ? 'text-orange-800' : 'text-gray-600'}`}>
              {stats.urgent}
            </div>
            <div className={`text-xs font-bold uppercase ${stats.urgent > 0 ? 'text-orange-700' : 'text-gray-600'}`}>
              Urgentes
            </div>
          </div>
        </div>
      </div>

      {/* Kitchen Control Bar */}
      <div className="bg-slate-900 text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-black tracking-wide">COZINHA</h1>
            <div className="flex items-center gap-4">
              <div className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
                <span className="font-bold">{filteredOrders.length} PEDIDOS</span>
              </div>
              {stats.overdue > 0 && (
                <div className="bg-red-500 px-3 py-1 rounded-full animate-pulse">
                  <span className="font-bold">⚠️ {stats.overdue} ATRASADOS</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant={groupByDish ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setGroupByDish(!groupByDish)}
              className="font-bold bg-white text-black hover:bg-gray-200 border-0"
            >
              {groupByDish ? '📋 PRATOS' : '📊 STATUS'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort('time')}
              className="font-bold bg-white text-black hover:bg-gray-200 border-0"
            >
              ⏰ TEMPO
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-gray-100 p-3 rounded-lg border">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-700">FILTROS:</span>
            {([
              { key: 'received', label: 'NOVOS', color: 'bg-gray-600' },
              { key: 'in_preparation', label: 'FAZENDO', color: 'bg-yellow-500' },
              { key: 'ready_for_plating', label: 'MONTAR', color: 'bg-orange-500' },
              { key: 'on_hold', label: 'PARADOS', color: 'bg-red-600' }
            ] as { key: KitchenStatus; label: string; color: string }[]).map(status => (
              <Button
                key={status.key}
                variant={statusFilter.includes(status.key) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleStatusFilter(status.key)}
                className={`text-xs font-bold ${
                  statusFilter.includes(status.key) 
                    ? `${status.color} text-white hover:opacity-80` 
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                }`}
              >
                {status.label}
              </Button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-700">ORDENAR:</span>
            <Button
              variant={sortBy === 'priority' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('priority')}
              className="text-xs font-bold"
            >
              🔥 PRIORIDADE
            </Button>
            <Button
              variant={sortBy === 'time' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('time')}
              className="text-xs font-bold"
            >
              ⏰ TEMPO
            </Button>
          </div>
        </div>
      </div>



      {/* Order Groups - Kanban Style */}
      <div className={!groupByDish ? 'flex gap-4 overflow-x-auto pb-6 min-h-screen' : 'space-y-8'}>
        {Object.entries(groupedOrders).map(([groupName, groupOrders]) => (
          <div key={groupName} className={!groupByDish ? 'flex-shrink-0 w-96' : ''}>
            {/* Group Header - Enhanced */}
            <div className={`mb-4 p-4 rounded-xl shadow-lg border-2 ${
              groupName === 'NOVOS' ? 'bg-gradient-to-r from-gray-800 to-gray-700 text-white border-gray-600' :
              groupName === 'FAZENDO' ? 'bg-gradient-to-r from-yellow-500 to-yellow-400 text-black border-yellow-300' :
              groupName === 'MONTAR' ? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white border-orange-300' :
              groupName === 'PRONTO' ? 'bg-gradient-to-r from-green-500 to-green-400 text-white border-green-300' :
              groupName === 'PARADOS' ? 'bg-gradient-to-r from-red-600 to-red-500 text-white border-red-400 animate-pulse' :
              'bg-gradient-to-r from-blue-600 to-blue-500 text-white border-blue-400'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {groupName === 'NOVOS' ? '📥' :
                     groupName === 'FAZENDO' ? '👨‍🍳' :
                     groupName === 'MONTAR' ? '🍽️' :
                     groupName === 'PRONTO' ? '✅' :
                     groupName === 'PARADOS' ? '⏸️' : '📋'}
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-wide">{groupName}</h3>
                    <div className="text-sm opacity-80 font-medium">
                      {groupName === 'NOVOS' ? 'Aguardando início' :
                       groupName === 'FAZENDO' ? 'Em preparação' :
                       groupName === 'MONTAR' ? 'Finalizar prato' :
                       groupName === 'PRONTO' ? 'Aguardando entrega' :
                       groupName === 'PARADOS' ? 'Requer atenção' : 'Outros'}
                    </div>
                  </div>
                </div>
                <div className="bg-black bg-opacity-30 px-4 py-2 rounded-full border border-white border-opacity-20">
                  <span className="font-black text-2xl">{groupOrders.length}</span>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-3 bg-black bg-opacity-20 rounded-full h-2">
                <div 
                  className="bg-white bg-opacity-60 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (groupOrders.length / Math.max(1, orders.length)) * 100)}%` }}
                ></div>
              </div>
            </div>
            
            {/* Orders Container */}
            <div className={`${
              !groupByDish ? 
              'space-y-4 max-h-screen overflow-y-auto pr-2' : 
              'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            }`}>
              {groupOrders
                .sort((a, b) => {
                  // Sort by priority within each group
                  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
                  return priorityOrder[a.priority] - priorityOrder[b.priority];
                })
                .map((order, index) => (
                <div key={order.id} className="relative">
                  {/* Priority Indicator */}
                  {order.priority === 'urgent' && (
                    <div className="absolute -top-2 -right-2 z-10 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-black animate-pulse">
                      🔥
                    </div>
                  )}
                  
                  <OrderTicket
                    order={order}
                    onStatusUpdate={onStatusUpdate}
                    onAssignStation={onAssignStation}
                    className={`${!groupByDish ? 'w-full' : ''} ${
                      index === 0 ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
                    }`}
                  />
                </div>
              ))}
              
              {/* Empty State for Column */}
              {groupOrders.length === 0 && !groupByDish && (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-2">📭</div>
                  <div className="text-sm font-medium">Nenhum pedido</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <Card className="p-8 text-center bg-gradient-to-br from-gray-50 to-slate-100">
          <div className="text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2 text-gray-700">Nenhum pedido encontrado</h3>
            <p className="text-gray-600">Nenhum pedido corresponde aos filtros atuais.</p>
          </div>
        </Card>
      )}
    </div>
  );
}