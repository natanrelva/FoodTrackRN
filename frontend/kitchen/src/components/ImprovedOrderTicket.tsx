import { useState } from 'react';
import { Clock, ChefHat, AlertTriangle, Users, Eye, Play, CheckCircle } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { RecipeModal } from './RecipeModal';
import { RecipeQuickView } from './RecipeQuickView';
import { KitchenOrderItem, KitchenOrder } from '../types/kitchen';

interface ImprovedOrderTicketProps {
  order: KitchenOrder;
  onStatusUpdate?: (orderId: string, status: string) => void;
  onStartItem?: (orderItem: KitchenOrderItem) => void;
  onCompleteItem?: (orderItem: KitchenOrderItem) => void;
  className?: string;
  compact?: boolean;
}

const STATUS_COLORS = {
  received: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  in_preparation: 'bg-blue-100 text-blue-800 border-blue-200',
  ready_for_plating: 'bg-orange-100 text-orange-800 border-orange-200',
  plated: 'bg-green-100 text-green-800 border-green-200',
  ready_for_pickup: 'bg-green-100 text-green-800 border-green-200',
  on_hold: 'bg-red-100 text-red-800 border-red-200',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-200'
};

const STATUS_LABELS = {
  received: 'Recebido',
  in_preparation: 'Preparando',
  ready_for_plating: 'Pronto para Empratar',
  plated: 'Empratado',
  ready_for_pickup: 'Pronto para Entrega',
  on_hold: 'Em Espera',
  cancelled: 'Cancelado'
};

const ITEM_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  assigned: 'bg-blue-100 text-blue-800 border-blue-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  ready: 'bg-green-100 text-green-800 border-green-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  on_hold: 'bg-red-100 text-red-800 border-red-200'
};

const ITEM_STATUS_LABELS = {
  pending: 'Pendente',
  assigned: 'Atribuído',
  in_progress: 'Em Progresso',
  ready: 'Pronto',
  completed: 'Concluído',
  on_hold: 'Em Espera'
};

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

const PRIORITY_LABELS = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente'
};

export function ImprovedOrderTicket({ 
  order, 
  onStatusUpdate, 
  onStartItem, 
  onCompleteItem,
  className = '',
  compact = false 
}: ImprovedOrderTicketProps) {
  const [selectedItem, setSelectedItem] = useState<KitchenOrderItem | null>(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const formatTime = (date: Date | undefined): string => {
    if (!date) return '--:--';
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getTimeElapsed = (orderTime: Date | undefined): number => {
    if (!orderTime) return 0;
    return Math.floor((Date.now() - orderTime.getTime()) / (1000 * 60));
  };

  const getEstimatedCompletion = (): Date => {
    const totalTime = order.items.reduce((sum, item) => sum + (item.estimatedTime || 0), 0);
    const baseTime = order.order?.createdAt ? new Date(order.order.createdAt) : new Date();
    return new Date(baseTime.getTime() + totalTime * 60 * 1000);
  };

  const getOrderProgress = (): number => {
    const completedItems = order.items.filter(item => item.status === 'ready' || item.status === 'completed').length;
    return (completedItems / order.items.length) * 100;
  };

  const toggleItemExpansion = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleItemAction = (item: KitchenOrderItem, action: 'start' | 'complete') => {
    if (action === 'start') {
      onStartItem?.(item);
    } else {
      onCompleteItem?.(item);
    }
  };

  const openRecipeModal = (item: KitchenOrderItem) => {
    setSelectedItem(item);
    setShowRecipeModal(true);
  };

  // Use order creation time from the original order or current time as fallback
  const orderTime = order.order?.createdAt ? new Date(order.order.createdAt) : new Date();
  const timeElapsed = getTimeElapsed(orderTime);
  const estimatedCompletion = getEstimatedCompletion();
  const progress = getOrderProgress();
  const isOverdue = timeElapsed > 30; // Default 30 minutes if no estimate

  if (compact) {
    return (
      <>
        <Card className={`p-4 hover:shadow-md transition-all duration-200 ${isOverdue ? 'border-red-300 bg-red-50' : ''} ${className}`}>
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg">#{order.id}</h3>
                  <Badge className={STATUS_COLORS[order.status]}>
                    {STATUS_LABELS[order.status]}
                  </Badge>
                  <Badge className={PRIORITY_COLORS[order.priority]}>
                    {PRIORITY_LABELS[order.priority]}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <span>{formatTime(orderTime)}</span>
                  <span>•</span>
                  <span>{order.items.length} item{order.items.length > 1 ? 's' : ''}</span>
                  {order.order?.customer && (
                    <>
                      <span>•</span>
                      <span>{order.order.customer.name}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
                  {timeElapsed}min decorridos
                </div>
                <div className="text-xs text-gray-500">
                  Est: {formatTime(estimatedCompletion)}
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Progresso</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Items Summary */}
            <div className="space-y-2">
              {order.items.slice(0, 2).map((item) => (
                <div key={`${item.id}-${item.productId}`} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-xs text-gray-500">x{item.quantity}</span>
                    {(item.modifications?.length || 0) > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {item.modifications!.length} mod
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openRecipeModal(item)}
                      className="h-6 w-6 p-0"
                    >
                      <ChefHat className="w-3 h-3" />
                    </Button>
                    {item.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleItemAction(item, 'start')}
                        className="h-6 w-6 p-0"
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                    )}
                    {item.status === 'in_progress' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleItemAction(item, 'complete')}
                        className="h-6 w-6 p-0"
                      >
                        <CheckCircle className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {order.items.length > 2 && (
                <div className="text-center text-sm text-gray-500">
                  +{order.items.length - 2} item{order.items.length - 2 > 1 ? 's' : ''} adicional{order.items.length - 2 > 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        </Card>

        {selectedItem && (
          <RecipeModal
            open={showRecipeModal}
            onClose={() => {
              setShowRecipeModal(false);
              setSelectedItem(null);
            }}
            orderItem={selectedItem}
            onStartPreparation={() => handleItemAction(selectedItem, 'start')}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Card className={`p-6 hover:shadow-lg transition-all duration-200 ${isOverdue ? 'border-red-300 bg-red-50' : ''} ${className}`}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-xl">Pedido #{order.id}</h3>
                <Badge className={STATUS_COLORS[order.status]}>
                  {STATUS_LABELS[order.status]}
                </Badge>
                <Badge className={PRIORITY_COLORS[order.priority]}>
                  {PRIORITY_LABELS[order.priority]}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(orderTime)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{order.items.length} item{order.items.length > 1 ? 's' : ''}</span>
                </div>
                {order.order?.customer && (
                  <div className="flex items-center gap-1">
                    <span>{order.order.customer.name}</span>
                  </div>
                )}
                {/* Mesa não disponível no tipo Order atual */}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                {timeElapsed}min
              </div>
              <div className="text-sm text-gray-500">
                Est: {formatTime(estimatedCompletion)}
              </div>
              {isOverdue && (
                <div className="flex items-center gap-1 text-red-600 text-sm mt-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Atrasado</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Progresso do Pedido</span>
              <span className="font-medium">{Math.round(progress)}% concluído</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Special Instructions */}
          {order.specialInstructions && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div>
                  <span className="text-sm font-medium text-yellow-800">Instruções Especiais:</span>
                  <p className="text-sm text-yellow-700 mt-1">{order.specialInstructions}</p>
                </div>
              </div>
            </div>
          )}

          {/* Order Items */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Itens do Pedido</h4>
            {order.items.map((item) => {
              const itemId = `${item.id}-${item.productId}`;
              const isExpanded = expandedItems.has(itemId);
              
              return (
                <Card key={itemId} className="p-4 bg-gray-50">
                  <div className="space-y-3">
                    {/* Item Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h5 className="font-medium text-gray-900">{item.name}</h5>
                          <Badge variant="outline" className="text-xs">
                            x{item.quantity}
                          </Badge>
                          <Badge className={ITEM_STATUS_COLORS[item.status]}>
                            {ITEM_STATUS_LABELS[item.status]}
                          </Badge>
                          {item.estimatedTime && (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Clock className="w-3 h-3" />
                              <span>{item.estimatedTime}min</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Modifications */}
                        {(item.modifications?.length || 0) > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                            <span className="text-sm text-orange-700">
                              {item.modifications!.length} modificação{item.modifications!.length > 1 ? 'ões' : ''}:
                            </span>
                            <span className="text-sm text-orange-600">
                              {item.modifications!.slice(0, 2).join(', ')}
                              {item.modifications!.length > 2 && ` +${item.modifications!.length - 2}`}
                            </span>
                          </div>
                        )}

                        {/* Preparation Notes */}
                        {item.preparationNotes && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Nota:</span> {item.preparationNotes}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openRecipeModal(item)}
                          className="flex items-center gap-2"
                        >
                          <ChefHat className="w-4 h-4" />
                          Receita
                        </Button>
                        
                        {item.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleItemAction(item, 'start')}
                            className="flex items-center gap-2"
                          >
                            <Play className="w-4 h-4" />
                            Iniciar
                          </Button>
                        )}
                        
                        {item.status === 'in_progress' && (
                          <Button
                            size="sm"
                            onClick={() => handleItemAction(item, 'complete')}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Concluir
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleItemExpansion(itemId)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Recipe Quick View */}
                    {isExpanded && (
                      <div className="pt-3 border-t">
                        <RecipeQuickView
                          orderItem={item}
                          compact={true}
                          onStartPreparation={() => handleItemAction(item, 'start')}
                        />
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Order Actions */}
          <div className="flex justify-between pt-4 border-t">
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Imprimir Pedido
              </Button>
              <Button variant="outline" size="sm">
                Reportar Problema
              </Button>
            </div>
            <div className="flex gap-2">
              {order.status === 'received' && (
                <Button onClick={() => onStatusUpdate?.(order.id, 'in_preparation')}>
                  Iniciar Pedido
                </Button>
              )}
              {order.status === 'in_preparation' && progress === 100 && (
                <Button 
                  onClick={() => onStatusUpdate?.(order.id, 'ready')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Marcar como Pronto
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {selectedItem && (
        <RecipeModal
          open={showRecipeModal}
          onClose={() => {
            setShowRecipeModal(false);
            setSelectedItem(null);
          }}
          orderItem={selectedItem}
          onStartPreparation={() => handleItemAction(selectedItem, 'start')}
        />
      )}
    </>
  );
}