import { useState } from 'react';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { RecipeQuickView } from './RecipeManagement';
import { AutomaticUsageTracker } from './AutomaticUsageTracker';
import { StationAssignment } from './StationAssignment';
import { PreparationStatusTracker } from './PreparationStatusTracker';
import { DelayQualityManager } from './DelayQualityManager';
import { 
  KitchenOrder, 
  KitchenStatus, 
  ItemStatus
} from '../types/kitchen';

interface OrderTicketProps {
  order: KitchenOrder;
  onStatusUpdate: (orderId: string, status: KitchenStatus) => void;
  onAssignStation: (orderId: string, stationId: string) => void;
  className?: string;
}

// Burger King Style - Station Colors
const STATION_COLORS: Record<string, string> = {
  grill: 'bg-red-600 text-white',
  fryer: 'bg-yellow-600 text-white', 
  assembly: 'bg-green-600 text-white',
  beverage: 'bg-blue-600 text-white',
  dessert: 'bg-purple-600 text-white'
};

const BK_STATUS_COLORS: Record<KitchenStatus, string> = {
  received: 'bg-gray-800 text-white',
  in_preparation: 'bg-yellow-500 text-black',
  ready_for_plating: 'bg-orange-500 text-white',
  plated: 'bg-blue-500 text-white',
  ready_for_pickup: 'bg-green-500 text-white',
  on_hold: 'bg-red-600 text-white animate-pulse',
  cancelled: 'bg-gray-400 text-white'
};

const BK_STATUS_LABELS: Record<KitchenStatus, string> = {
  received: 'NOVO',
  in_preparation: 'FAZENDO',
  ready_for_plating: 'MONTAR',
  plated: 'PRONTO',
  ready_for_pickup: 'ENTREGAR',
  on_hold: 'PARADO',
  cancelled: 'CANCELADO'
};



export function OrderTicket({ order, onStatusUpdate, onAssignStation, className }: OrderTicketProps) {
  const [showRecipeFor, setShowRecipeFor] = useState<string | null>(null);
  const [showUsageTracker, setShowUsageTracker] = useState(false);
  const [showStationAssignment, setShowStationAssignment] = useState(false);
  const [showStatusTracker, setShowStatusTracker] = useState(false);
  const [showDelayQualityManager, setShowDelayQualityManager] = useState(false);
  
  const { reportQualityIssue } = useWebSocketContext();
  const estimatedTime = new Date(order.estimatedCompletionTime);
  const timeRemaining = Math.max(0, Math.floor((estimatedTime.getTime() - Date.now()) / (1000 * 60)));
  const isOverdue = timeRemaining === 0 && order.status !== 'ready_for_pickup' && order.status !== 'cancelled';

  const getNextStatus = (currentStatus: KitchenStatus): KitchenStatus | null => {
    const statusFlow: Record<KitchenStatus, KitchenStatus | null> = {
      received: 'in_preparation',
      in_preparation: 'ready_for_plating',
      ready_for_plating: 'plated',
      plated: 'ready_for_pickup',
      ready_for_pickup: null,
      on_hold: 'in_preparation',
      cancelled: null
    };
    return statusFlow[currentStatus];
  };

  const nextStatus = getNextStatus(order.status);

  // Status tracking handlers
  const handleItemStatusUpdate = async (orderId: string, itemId: string, status: ItemStatus, notes?: string) => {
    try {
      // This would be implemented in the parent component or hook
      console.log(`Updating item ${itemId} in order ${orderId} to status ${status}`, notes);
    } catch (error) {
      console.error('Failed to update item status:', error);
    }
  };

  const handleDelayReport = async (orderId: string, delayMinutes: number, reason: string) => {
    try {
      // This would be implemented in the parent component or hook
      console.log(`Reporting delay for order ${orderId}: ${delayMinutes} minutes - ${reason}`);
    } catch (error) {
      console.error('Failed to report delay:', error);
    }
  };

  const handleQualityIssueReport = async (orderId: string, issue: any) => {
    try {
      // Report quality issue via WebSocket
      const success = reportQualityIssue(orderId, issue.description, issue.severity);
      if (success) {
        console.log(`Quality issue reported for order ${orderId}:`, issue);
      } else {
        console.error('Failed to report quality issue: WebSocket not connected');
      }
    } catch (error) {
      console.error('Failed to report quality issue:', error);
    }
  };

  const handleRemakeRequest = async (orderId: string, reason: string, itemId?: string) => {
    try {
      // This would be implemented in the parent component or hook
      console.log(`Requesting remake for order ${orderId}: ${reason}`, itemId);
    } catch (error) {
      console.error('Failed to request remake:', error);
    }
  };

  const handleDeliveryCoordination = async (orderId: string) => {
    try {
      // This would be implemented in the parent component or hook
      console.log(`Coordinating delivery for order ${orderId}`);
    } catch (error) {
      console.error('Failed to coordinate delivery:', error);
    }
  };

  return (
    <Card className={`relative transition-all duration-300 overflow-hidden ${
      isOverdue ? 'bg-red-50 border-4 border-red-500 shadow-2xl' :
      order.status === 'received' ? 'bg-white border-2 border-gray-300' :
      order.status === 'in_preparation' ? 'bg-yellow-50 border-2 border-yellow-400' :
      order.status === 'ready_for_plating' ? 'bg-orange-50 border-2 border-orange-400' :
      order.status === 'plated' ? 'bg-blue-50 border-2 border-blue-400' :
      order.status === 'ready_for_pickup' ? 'bg-green-50 border-2 border-green-400' :
      'bg-white border-2 border-gray-300'
    } ${className}`}>
      
      {/* Status Header Bar */}
      <div className={`px-4 py-2 text-center font-black text-sm ${BK_STATUS_COLORS[order.status]}`}>
        {BK_STATUS_LABELS[order.status]}
      </div>

      <div className="p-4 space-y-3">
        {/* Timer and Order ID */}
        <div className="text-center">
          <div className={`text-5xl font-black leading-none mb-2 ${
            isOverdue ? 'text-red-600 animate-pulse' : 
            timeRemaining <= 2 ? 'text-red-500' :
            timeRemaining <= 5 ? 'text-orange-500' :
            'text-green-600'
          }`}>
            {isOverdue ? '⚠️' : timeRemaining}
            {!isOverdue && <span className="text-xl font-normal">min</span>}
          </div>
          <div className="text-2xl font-black text-gray-900">
            #{order.orderId}
          </div>
        </div>

        {/* Critical Alerts */}
        {order.allergenAlerts.length > 0 && (
          <div className="bg-red-600 text-white p-3 rounded-lg text-center font-black animate-pulse border-2 border-red-700">
            <div className="text-lg">⚠️ ALERGIA</div>
            <div className="text-sm">{order.allergenAlerts.map(alert => alert.type.toUpperCase()).join(', ')}</div>
          </div>
        )}

        {order.specialInstructions && (
          <div className="bg-blue-600 text-white p-2 rounded-lg text-center font-bold">
            <div className="text-xs opacity-80">OBSERVAÇÕES</div>
            <div className="text-sm">{order.specialInstructions.toUpperCase()}</div>
          </div>
        )}

        {/* Items List - Organized by Category */}
        <div className="space-y-3">
          {order.items.map((item, index) => (
            <div key={item.id} className="bg-white rounded-lg border-2 border-gray-300 shadow-sm hover:shadow-md transition-shadow">
              {/* Item Header */}
              <div className="bg-gray-50 px-4 py-2 rounded-t-lg border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-black text-white rounded-lg w-12 h-12 flex items-center justify-center font-black text-xl">
                      {item.quantity}
                    </div>
                    <div className="flex-1">
                      <div className="font-black text-gray-900 text-lg leading-tight">
                        {item.name.toUpperCase()}
                      </div>
                      <div className="text-xs text-gray-500 font-medium">
                        Item #{index + 1}
                      </div>
                    </div>
                  </div>
                  
                  {/* Item Status Indicator */}
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span className="text-xs font-bold text-gray-600">PENDENTE</span>
                  </div>
                </div>
              </div>

              {/* Item Details */}
              <div className="p-4">
                {/* Modifications */}
                {item.modifications.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-bold text-gray-700 mb-1">MODIFICAÇÕES:</div>
                    <div className="flex flex-wrap gap-1">
                      {item.modifications.map((mod, modIndex) => (
                        <span key={modIndex} className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold border border-red-200">
                          {mod.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preparation Instructions */}
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="text-xs font-bold text-blue-800 mb-1">INSTRUÇÕES DE PREPARO:</div>
                  <div className="text-sm text-blue-700">
                    • Verificar temperatura<br/>
                    • Seguir receita padrão<br/>
                    • Controle de qualidade
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowRecipeFor(showRecipeFor === item.id ? null : item.id)}
                    className="text-xs font-bold flex-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    📋 RECEITA
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs font-bold flex-1 border-green-300 text-green-700 hover:bg-green-50"
                  >
                    ✅ PRONTO
                  </Button>
                </div>
              </div>
            
              {/* Recipe Quick View */}
              {showRecipeFor === item.id && (
                <div className="mx-4 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <RecipeQuickView orderItem={item} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Station Tags */}
        {order.assignedStations.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {order.assignedStations.map((station) => (
              <Badge key={station.stationId} className={`text-xs font-black px-3 py-1 ${
                station.stationName.includes('Grill') ? STATION_COLORS.grill :
                station.stationName.includes('Fryer') ? STATION_COLORS.fryer :
                station.stationName.includes('Assembly') ? STATION_COLORS.assembly :
                STATION_COLORS.assembly
              }`}>
                {station.stationName.replace('Estação ', '').toUpperCase()}
              </Badge>
            ))}
          </div>
        )}

      {/* Station Assignment */}
      {showStationAssignment && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <StationAssignment 
            order={order}
            onAssignmentComplete={(assignments) => {
              console.log(`Station assignment completed for order ${order.id}:`, assignments);
              setShowStationAssignment(false);
              // Trigger a refresh of the order data
              if (onAssignStation && assignments.length > 0) {
                onAssignStation(order.id, assignments[0].stationId);
              }
            }}
          />
        </div>
      )}

      {/* Automatic Usage Tracker */}
      {showUsageTracker && (
        <AutomaticUsageTracker 
          order={order}
          onUsageComplete={(orderId, success) => {
            console.log(`Usage tracking for order ${orderId}: ${success ? 'completed' : 'failed'}`);
            setShowUsageTracker(false);
          }}
        />
      )}

      {/* Preparation Status Tracker */}
      {showStatusTracker && (
        <PreparationStatusTracker
          order={order}
          onStatusUpdate={handleItemStatusUpdate}
          onDelayReport={handleDelayReport}
          onQualityIssue={handleQualityIssueReport}
          onRemakeRequest={handleRemakeRequest}
        />
      )}

      {/* Delay & Quality Manager */}
      {showDelayQualityManager && (
        <DelayQualityManager
          order={order}
          onDelayReport={handleDelayReport}
          onQualityIssueReport={handleQualityIssueReport}
          onRemakeRequest={handleRemakeRequest}
          onDeliveryCoordination={handleDeliveryCoordination}
        />
      )}

        {/* Action Buttons - Enhanced */}
        <div className="space-y-3 pt-4 border-t-2 border-gray-200">
          {/* Main Action Button */}
          {nextStatus && (
            <Button
              size="lg"
              onClick={() => onStatusUpdate(order.id, nextStatus)}
              className={`w-full h-16 text-xl font-black rounded-xl transition-all hover:scale-105 transform shadow-lg hover:shadow-xl ${BK_STATUS_COLORS[nextStatus]} hover:opacity-90`}
            >
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl">
                  {nextStatus === 'in_preparation' ? '▶️' :
                   nextStatus === 'ready_for_plating' ? '🍽️' :
                   nextStatus === 'plated' ? '✅' :
                   nextStatus === 'ready_for_pickup' ? '🚀' : '⏭️'}
                </span>
                <div className="text-center">
                  <div className="leading-tight">
                    {nextStatus === 'in_preparation' ? 'COMEÇAR' :
                     nextStatus === 'ready_for_plating' ? 'MONTAR' :
                     nextStatus === 'plated' ? 'PRONTO' :
                     nextStatus === 'ready_for_pickup' ? 'ENTREGAR' :
                     BK_STATUS_LABELS[nextStatus]}
                  </div>
                  <div className="text-xs opacity-80 font-medium">
                    {nextStatus === 'in_preparation' ? 'Iniciar preparo' :
                     nextStatus === 'ready_for_plating' ? 'Finalizar prato' :
                     nextStatus === 'plated' ? 'Marcar como pronto' :
                     nextStatus === 'ready_for_pickup' ? 'Liberar para entrega' :
                     'Próximo passo'}
                  </div>
                </div>
              </div>
            </Button>
          )}

          {/* Secondary Actions */}
          <div className="flex gap-2">
            {/* Hold Button */}
            {order.status !== 'cancelled' && order.status !== 'ready_for_pickup' && order.status !== 'on_hold' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusUpdate(order.id, 'on_hold')}
                className="flex-1 h-12 text-red-600 border-2 border-red-300 hover:bg-red-50 font-bold rounded-lg"
              >
                <div className="text-center">
                  <div className="text-lg">⏸️</div>
                  <div className="text-xs">PARAR</div>
                </div>
              </Button>
            )}
            
            {/* Help Button */}
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-12 text-blue-600 border-2 border-blue-300 hover:bg-blue-50 font-bold rounded-lg"
            >
              <div className="text-center">
                <div className="text-lg">🆘</div>
                <div className="text-xs">AJUDA</div>
              </div>
            </Button>
            
            {/* Notes Button */}
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-12 text-gray-600 border-2 border-gray-300 hover:bg-gray-50 font-bold rounded-lg"
            >
              <div className="text-center">
                <div className="text-lg">📝</div>
                <div className="text-xs">NOTAS</div>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}