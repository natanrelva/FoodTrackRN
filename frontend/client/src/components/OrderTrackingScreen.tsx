import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, CheckCircle2, Package, Truck, Home, MessageCircle, Instagram } from 'lucide-react';
import { motion } from 'motion/react';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { useOrders } from '../hooks/useClientApi';

import { OrderTrackingScreenProps, WebOrderStatus } from '@foodtrack/types';

type OrderStatus = WebOrderStatus;

const statusConfig = {
  awaiting_payment: {
    label: 'Aguardando pagamento',
    icon: Clock,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50'
  },
  paid: {
    label: 'Pago',
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-50'
  },
  processing: {
    label: 'Processando',
    icon: Package,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50'
  },
  in_delivery: {
    label: 'Em entrega',
    icon: Truck,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50'
  },
  delivered: {
    label: 'Entregue',
    icon: Home,
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  }
};

export function OrderTrackingScreen({ orderId, onNavigate }: OrderTrackingScreenProps) {
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>('awaiting_payment');
  const [estimatedTime, setEstimatedTime] = useState(45);
  const [notifications, setNotifications] = useState<Array<{ time: string; message: string }>>([]);

  const { connected, recentOrderUpdates, trackOrder, stopTrackingOrder } = useWebSocketContext();
  const { getOrder } = useOrders();

  // Fetch initial order data
  useEffect(() => {
    const fetchOrderData = async () => {
      if (orderId) {
        try {
          const order = await getOrder(orderId);
          if (order) {
            setCurrentStatus(order.status as OrderStatus);
            
            // Add initial notification
            const now = new Date();
            const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
            setNotifications([
              { time: timeStr, message: 'Pedido criado' },
              { time: timeStr, message: statusConfig[order.status as OrderStatus]?.label || 'Status atualizado' }
            ]);

            // Set estimated time if available (mock for now)
            setEstimatedTime(45);
          }
        } catch (error) {
          console.error('Error fetching order:', error);
          // Fallback to default state
          setNotifications([
            { time: '14:23', message: 'Pedido confirmado' },
            { time: '14:25', message: 'Pagamento aprovado' }
          ]);
        }
      }
    };

    fetchOrderData();
  }, [orderId, getOrder]);

  // Track this order for real-time updates
  useEffect(() => {
    if (connected && orderId) {
      trackOrder(orderId);
      
      return () => {
        stopTrackingOrder(orderId);
      };
    }
  }, [connected, orderId, trackOrder, stopTrackingOrder]);

  // Listen for real-time order updates
  useEffect(() => {
    const orderUpdate = recentOrderUpdates.find(
      update => update.payload.order.id === orderId
    );

    if (orderUpdate) {
      const order = orderUpdate.payload.order;
      
      // Update status based on order status
      if (order.status) {
        setCurrentStatus(order.status as OrderStatus);
      }

      // Add notification for the update
      const now = new Date();
      const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
      const message = getStatusMessage(orderUpdate.type, order.status);
      
      setNotifications(prev => [
        ...prev,
        { time: timeStr, message }
      ]);

      // Update estimated time if available
      if (order.estimatedDeliveryTime) {
        const now = new Date();
        const estimatedDelivery = new Date(order.estimatedDeliveryTime);
        const diffMinutes = Math.max(0, Math.floor((estimatedDelivery.getTime() - now.getTime()) / (1000 * 60)));
        setEstimatedTime(diffMinutes);
      }
    }
  }, [recentOrderUpdates, orderId]);

  // Helper function to get status message
  const getStatusMessage = (eventType: string, status: string): string => {
    switch (eventType) {
      case 'ORDER_STATUS_CHANGED':
        return statusConfig[status as OrderStatus]?.label || `Status atualizado: ${status}`;
      case 'ORDER_UPDATED':
        return 'Pedido atualizado';
      case 'ORDER_CANCELLED':
        return 'Pedido cancelado';
      default:
        return 'Atualização do pedido';
    }
  };

  // Fallback: Simulate status progression if no real-time updates
  useEffect(() => {
    if (!connected) {
      const statuses: OrderStatus[] = ['paid', 'processing', 'in_delivery', 'delivered'];
      let currentIndex = 0;

      const interval = setInterval(() => {
        if (currentIndex < statuses.length - 1) {
          currentIndex++;
          setCurrentStatus(statuses[currentIndex]);
          
          // Add notification
          const now = new Date();
          const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
          setNotifications((prev) => [
            ...prev,
            { time: timeStr, message: statusConfig[statuses[currentIndex]].label }
          ]);

          // Update estimated time
          setEstimatedTime((prev) => Math.max(0, prev - 15));
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [connected]);

  const StatusIcon = statusConfig[currentStatus].icon;

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* Header */}
      <header className="bg-white px-4 py-4 border-b flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => onNavigate('menu')}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-slate-900">Acompanhar pedido</h2>
          <p className="text-sm text-slate-600">#{orderId}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Status Card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-lg p-6 text-center"
        >
          <motion.div
            key={currentStatus}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-24 h-24 ${statusConfig[currentStatus].bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}
          >
            <StatusIcon className={`w-12 h-12 ${statusConfig[currentStatus].color}`} />
          </motion.div>
          
          <h3 className="text-slate-900 mb-2">
            {statusConfig[currentStatus].label}
          </h3>
          
          {currentStatus !== 'delivered' && (
            <div className="flex items-center justify-center gap-2 text-slate-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Tempo estimado: {estimatedTime} min</span>
            </div>
          )}

          {currentStatus === 'delivered' && (
            <p className="text-green-600">
              Seu pedido foi entregue com sucesso! 🎉
            </p>
          )}
        </motion.div>

        {/* Progress Timeline */}
        <div className="bg-white rounded-3xl shadow-lg p-6">
          <h4 className="text-slate-900 mb-4">Status do pedido</h4>
          <div className="space-y-6">
            {Object.entries(statusConfig).map(([status, config], index) => {
              const isCompleted = Object.keys(statusConfig).indexOf(currentStatus) >= index;
              const isCurrent = currentStatus === status;
              const Icon = config.icon;

              return (
                <div key={status} className="flex gap-4 relative">
                  {/* Connecting Line */}
                  {index < Object.keys(statusConfig).length - 1 && (
                    <div
                      className={`absolute left-5 top-12 w-0.5 h-10 ${
                        isCompleted ? 'bg-orange-500' : 'bg-slate-200'
                      }`}
                    />
                  )}

                  {/* Icon */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 ${
                      isCompleted
                        ? 'border-orange-500 bg-orange-500'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        isCompleted ? 'text-white' : 'text-slate-400'
                      }`}
                    />
                  </div>

                  {/* Label */}
                  <div className="flex-1">
                    <p
                      className={`${
                        isCurrent ? 'text-slate-900' : 'text-slate-600'
                      }`}
                    >
                      {config.label}
                    </p>
                    {isCurrent && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm text-orange-500 mt-1"
                      >
                        Em andamento...
                      </motion.p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notifications History */}
        <div className="bg-white rounded-3xl shadow-lg p-6">
          <h4 className="text-slate-900 mb-4">Histórico de notificações</h4>
          <div className="space-y-3">
            {notifications.map((notification, index) => (
              <motion.div
                key={index}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl"
              >
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2" />
                <div className="flex-1">
                  <p className="text-slate-900 text-sm">{notification.message}</p>
                  <p className="text-xs text-slate-500 mt-1">{notification.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Support Section */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl shadow-lg p-6 text-white">
          <h4 className="mb-3">Precisa de ajuda?</h4>
          <p className="text-orange-100 text-sm mb-4">
            Entre em contato conosco através dos nossos canais de atendimento
          </p>
          <div className="space-y-2">
            <button className="w-full bg-white/20 backdrop-blur-sm text-white py-3 rounded-xl hover:bg-white/30 transition-colors flex items-center justify-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Fale conosco no WhatsApp
            </button>
            <button className="w-full bg-white/20 backdrop-blur-sm text-white py-3 rounded-xl hover:bg-white/30 transition-colors flex items-center justify-center gap-2">
              <Instagram className="w-5 h-5" />
              Instagram @saborexpress
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
