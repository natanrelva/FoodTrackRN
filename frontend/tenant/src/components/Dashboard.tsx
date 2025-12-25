import { useState, useEffect } from 'react';
import { Search, Filter, AlertCircle, DollarSign, ShoppingCart, TrendingUp, Clock } from 'lucide-react';
import { useDashboard, useTenantOrders } from '../hooks/useTenantApi';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { DashboardProps } from '@foodtrack/types';

export function Dashboard({ onOrderClick }: DashboardProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { 
    connected, 
    recentOrders, 
    orderUpdates, 
    realTimeMetrics, 
    subscribeToOrderUpdates, 
    subscribeToMetrics 
  } = useWebSocketContext();

  const { data: dashboardData, loading: dashboardLoading, error: dashboardError, fetchDashboardStats } = useDashboard();
  const { data: ordersData, loading: ordersLoading, error: ordersError, fetchOrders } = useTenantOrders();

  // Fetch initial data
  useEffect(() => {
    fetchDashboardStats();
    fetchOrders({ limit: 50 }); // Fetch recent orders
  }, [fetchDashboardStats, fetchOrders]);

  // Subscribe to real-time updates when connected
  useEffect(() => {
    if (connected) {
      subscribeToOrderUpdates();
      subscribeToMetrics();
    }
  }, [connected, subscribeToOrderUpdates, subscribeToMetrics]);

  // Use real-time data if available, fallback to API data, then mock data
  const ordersToDisplay = recentOrders.length > 0 
    ? recentOrders.map(event => event.payload.order)
    : ordersData?.orders || [];

  const filteredOrders = ordersToDisplay.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesChannel = channelFilter === 'all' || (order as any).channel === channelFilter;
    const matchesSearch = (order.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ((order as any).customerName || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesChannel && matchesSearch;
  });

  // Use dashboard stats from API or calculate from orders
  const stats = dashboardData || {};
  const totalRevenue = realTimeMetrics?.totalRevenueToday || stats.revenueToday || 
    ordersToDisplay
      .filter(o => o.status === 'delivered' || o.status === 'confirmed')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  
  const totalOrders = realTimeMetrics?.completedOrdersToday || stats.ordersToday || ordersToDisplay.length;
  const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : stats.averageTicket || 0;
  const activeOrders = realTimeMetrics?.activeOrders || 
    ordersToDisplay.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;
  
  const delayedOrders = ordersToDisplay.filter(o => {
    const orderTime = new Date(o.createdAt).getTime();
    const now = Date.now();
    return (now - orderTime) > 60 * 60 * 1000 && o.status !== 'delivered' && o.status !== 'cancelled';
  }).length;

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      created: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800',
      in_preparation: 'bg-orange-100 text-orange-800',
      ready: 'bg-purple-100 text-purple-800',
      dispatched: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      failed: 'bg-red-100 text-red-800',
      // Legacy status mapping
      pending: 'bg-yellow-100 text-yellow-800',
      preparing: 'bg-blue-100 text-blue-800',
      delivering: 'bg-orange-100 text-orange-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      draft: 'Rascunho',
      created: 'Criado',
      confirmed: 'Confirmado',
      in_preparation: 'Em Preparação',
      ready: 'Pronto',
      dispatched: 'Saiu para Entrega',
      delivered: 'Entregue',
      cancelled: 'Cancelado',
      failed: 'Falhou',
      // Legacy status mapping
      pending: 'Pendente',
      preparing: 'Em Preparação',
      delivering: 'Saiu para Entrega'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getChannelLabel = (channel: string) => {
    const labels = {
      whatsapp: 'WhatsApp',
      instagram: 'Instagram',
      site: 'Site',
      ifood: 'iFood'
    };
    return labels[channel as keyof typeof labels] || channel;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Dashboard</h1>
        <p className="text-gray-600">Visão geral dos pedidos e métricas</p>
      </div>

      {/* Loading State */}
      {(dashboardLoading || ordersLoading) && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <span className="ml-3 text-gray-600">Carregando dados...</span>
        </div>
      )}

      {/* Error State */}
      {(dashboardError || ordersError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <p className="text-red-900">Erro ao carregar dados do dashboard</p>
            <p className="text-sm text-red-700 mt-1">{dashboardError || ordersError}</p>
            <button
              onClick={() => {
                fetchDashboardStats();
                fetchOrders({ limit: 50 });
              }}
              className="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      {!dashboardLoading && !ordersLoading && (
        <>
          {/* Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Receita do Dia</span>
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl">R$ {totalRevenue.toFixed(2)}</p>
              <p className="text-sm text-green-600 mt-1">+12% vs ontem</p>
              {connected && <span className="text-xs text-green-600">● Ao vivo</span>}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Pedidos Hoje</span>
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl">{totalOrders}</p>
              <p className="text-sm text-blue-600 mt-1">{activeOrders} em andamento</p>
              {connected && <span className="text-xs text-green-600">● Ao vivo</span>}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Ticket Médio</span>
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl">R$ {averageTicket.toFixed(2)}</p>
              <p className="text-sm text-purple-600 mt-1">+8% vs média</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Pedidos Atrasados</span>
                <Clock className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-2xl">{delayedOrders}</p>
              <p className="text-sm text-gray-600 mt-1">{'>'}1h de atraso</p>
            </div>
          </div>

          {/* Alertas */}
          {delayedOrders > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-red-900">Atenção: {delayedOrders} pedido(s) com mais de 1 hora de atraso</p>
                <p className="text-sm text-red-700 mt-1">Verifique os pedidos em preparação e entrega</p>
              </div>
            </div>
          )}

          {/* Filtros e Busca */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por pedido ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div className="flex gap-3">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none bg-white"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="pending">Pendente</option>
                    <option value="confirmed">Confirmado</option>
                    <option value="preparing">Em Preparação</option>
                    <option value="ready">Pronto</option>
                    <option value="delivering">Saiu para Entrega</option>
                    <option value="delivered">Entregue</option>
                  </select>
                </div>

                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none bg-white"
                >
                  <option value="all">Todos os Canais</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="instagram">Instagram</option>
                  <option value="site">Site</option>
                  <option value="ifood">iFood</option>
                </select>
              </div>
            </div>
          </div>

          {/* Lista de Pedidos */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl">Pedidos Recentes</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm text-gray-600">Pedido</th>
                    <th className="text-left px-6 py-3 text-sm text-gray-600">Cliente</th>
                    <th className="text-left px-6 py-3 text-sm text-gray-600">Canal</th>
                    <th className="text-left px-6 py-3 text-sm text-gray-600">Status</th>
                    <th className="text-left px-6 py-3 text-sm text-gray-600">Pagamento</th>
                    <th className="text-left px-6 py-3 text-sm text-gray-600">Valor</th>
                    <th className="text-left px-6 py-3 text-sm text-gray-600">Horário</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                      <tr 
                        key={order.id}
                        onClick={() => onOrderClick(order.id)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4">
                          <span>#{order.id.slice(-6)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p>{(order as any).customerName || 'Cliente'}</p>
                            <p className="text-sm text-gray-500">{(order as any).customerPhone || ''}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                            {getChannelLabel((order as any).channel || 'site')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-sm ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-block px-2 py-1 rounded text-sm bg-green-100 text-green-800">
                            Confirmado
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          R$ {(order.totalAmount || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(order.createdAt).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        Nenhum pedido encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
