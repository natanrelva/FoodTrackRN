import { ArrowLeft, MapPin, Phone, CreditCard, Clock, CheckCircle } from 'lucide-react';
import { mockOrders } from '../data/mockData';
import { OrderDetailsProps } from '@foodtrack/types';

export function OrderDetails({ orderId, onBack }: OrderDetailsProps) {
  const order = mockOrders.find(o => o.id === orderId);

  if (!order) {
    return (
      <div className="p-8">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>
        <p>Pedido não encontrado</p>
      </div>
    );
  }

  const statusOptions = [
    { value: 'pending', label: 'Pendente' },
    { value: 'preparing', label: 'Em Preparação' },
    { value: 'ready', label: 'Pronto' },
    { value: 'delivering', label: 'Saiu para Entrega' },
    { value: 'delivered', label: 'Entregue' },
    { value: 'cancelled', label: 'Cancelado' }
  ];

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-500',
      preparing: 'bg-blue-500',
      ready: 'bg-purple-500',
      delivering: 'bg-orange-500',
      delivered: 'bg-green-500',
      cancelled: 'bg-red-500'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  const totalItems = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="p-8">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-5 h-5" />
        Voltar ao Dashboard
      </button>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl">Pedido {order.number}</h1>
          <span className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg">
            {order.channel.toUpperCase()}
          </span>
        </div>
        <p className="text-gray-600">
          Criado em {new Date(order.createdAt).toLocaleString('pt-BR')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status do Pedido */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl mb-4">Status do Pedido</h2>
            
            <div className="flex items-center gap-4 mb-6">
              {statusOptions.map((statusOption, index) => {
                const isActive = order.status === statusOption.value;
                const isPast = statusOptions.findIndex(s => s.value === order.status) > index;
                
                return (
                  <div key={statusOption.value} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isActive || isPast ? getStatusColor(statusOption.value) : 'bg-gray-200'
                      }`}>
                        {(isActive || isPast) && <CheckCircle className="w-6 h-6 text-white" />}
                      </div>
                      <span className="text-xs mt-2 text-center max-w-[80px]">
                        {statusOption.label}
                      </span>
                    </div>
                    {index < statusOptions.length - 1 && (
                      <div className={`w-12 h-1 ${isPast ? getStatusColor(order.status) : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                Avançar Status
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Cancelar Pedido
              </button>
            </div>
          </div>

          {/* Itens do Pedido */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl mb-4">Itens do Pedido</h2>
            
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between pb-4 border-b border-gray-200 last:border-0">
                  <div className="flex-1">
                    <p>{item.name}</p>
                    {item.extras && item.extras.length > 0 && (
                      <p className="text-sm text-gray-600 mt-1">
                        + {item.extras.join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-600">x{item.quantity}</span>
                    <span className="w-24 text-right">R$ {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              ))}
              
              <div className="pt-4 border-t-2 border-gray-300">
                <div className="flex items-center justify-between text-lg">
                  <span>Total</span>
                  <span>R$ {totalItems.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Histórico de Notificações */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl mb-4">Histórico de Notificações</h2>
            
            <div className="space-y-3">
              {order.notifications.length > 0 ? (
                order.notifications.map((notification) => (
                  <div key={notification.id} className="flex items-start gap-3 pb-3 border-b border-gray-200 last:border-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      notification.status === 'sent' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <CheckCircle className={`w-4 h-4 ${
                        notification.status === 'sent' ? 'text-green-600' : 'text-red-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notification.timestamp).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">Nenhuma notificação enviada ainda</p>
              )}
            </div>
            
            <button className="w-full mt-4 px-4 py-2 border border-orange-500 text-orange-500 rounded-lg hover:bg-orange-50 transition-colors">
              Enviar Notificação Manual
            </button>
          </div>
        </div>

        {/* Coluna Lateral */}
        <div className="space-y-6">
          {/* Informações do Cliente */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl mb-4">Cliente</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Nome</p>
                <p>{order.customer.name}</p>
              </div>
              
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">Telefone</p>
                  <p>{order.customer.phone}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">Endereço</p>
                  <p>{order.customer.address}</p>
                </div>
              </div>
            </div>
            
            <button className="w-full mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
              Abrir no WhatsApp
            </button>
          </div>

          {/* Informações de Pagamento */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl mb-4">Pagamento</h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Método</p>
                  <p className="capitalize">{order.payment.method === 'pix' ? 'Pix' : 
                    order.payment.method === 'credit' ? 'Cartão de Crédito' :
                    order.payment.method === 'debit' ? 'Cartão de Débito' : 'Dinheiro'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                    order.payment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    order.payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {order.payment.status === 'confirmed' ? 'Confirmado' :
                     order.payment.status === 'pending' ? 'Pendente' : 'Falhou'}
                  </span>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Valor Total</span>
                  <span className="text-xl">R$ {order.payment.amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
