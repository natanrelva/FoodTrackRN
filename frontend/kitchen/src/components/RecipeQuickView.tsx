import { useState } from 'react';
import { Book, ChefHat, Clock, AlertTriangle, Eye, Settings, Maximize2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { RecipeModal } from './RecipeModal';
import { KitchenOrderItem } from '../types/kitchen';

interface RecipeQuickViewProps {
  orderItem: KitchenOrderItem;
  className?: string;
  onStartPreparation?: () => void;
  compact?: boolean;
}

export function RecipeQuickView({ 
  orderItem, 
  className = '', 
  onStartPreparation,
  compact = false 
}: RecipeQuickViewProps) {
  const [showRecipeModal, setShowRecipeModal] = useState(false);

  const hasModifications = orderItem.modifications && orderItem.modifications.length > 0;
  const hasNotes = orderItem.preparationNotes;

  if (compact) {
    return (
      <>
        <div className={`flex items-center justify-between p-2 bg-gray-50 rounded-lg ${className}`}>
          <div className="flex items-center gap-2">
            <ChefHat className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Receita</span>
            {hasModifications && (
              <Badge variant="outline" className="text-xs text-orange-600">
                {orderItem.modifications!.length} mod{orderItem.modifications!.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRecipeModal(true)}
            className="h-6 text-xs px-2"
          >
            <Eye className="w-3 h-3 mr-1" />
            Ver
          </Button>
        </div>

        <RecipeModal
          open={showRecipeModal}
          onClose={() => setShowRecipeModal(false)}
          orderItem={orderItem}
          onStartPreparation={onStartPreparation}
        />
      </>
    );
  }

  return (
    <>
      <Card className={`p-4 hover:shadow-md transition-shadow ${className}`}>
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ChefHat className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Receita Disponível</h4>
                <p className="text-sm text-gray-600">{orderItem.name}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRecipeModal(true)}
              className="flex items-center gap-2"
            >
              <Maximize2 className="w-4 h-4" />
              Abrir Receita
            </Button>
          </div>

          {/* Quick Info */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {orderItem.estimatedTime && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{orderItem.estimatedTime} min</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <span>Qtd: {orderItem.quantity}</span>
            </div>
          </div>

          {/* Modifications Alert */}
          {hasModifications && (
            <div className="p-2 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">
                  {orderItem.modifications!.length} Modificação{orderItem.modifications!.length > 1 ? 'ões' : ''}
                </span>
              </div>
              <div className="mt-1 text-xs text-orange-700">
                {orderItem.modifications!.slice(0, 2).join(', ')}
                {orderItem.modifications!.length > 2 && ` +${orderItem.modifications!.length - 2} mais`}
              </div>
            </div>
          )}

          {/* Preparation Notes */}
          {hasNotes && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm">
                <span className="font-medium text-blue-800">Nota: </span>
                <span className="text-blue-700">{orderItem.preparationNotes}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRecipeModal(true)}
              className="flex-1 flex items-center gap-2"
            >
              <Book className="w-4 h-4" />
              Ver Receita
            </Button>
            {hasModifications && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRecipeModal(true)}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Modificações
              </Button>
            )}
          </div>
        </div>
      </Card>

      <RecipeModal
        open={showRecipeModal}
        onClose={() => setShowRecipeModal(false)}
        orderItem={orderItem}
        onStartPreparation={onStartPreparation}
      />
    </>
  );
}

// Componente para lista de receitas em cards menores
export function RecipeCardGrid({ 
  orderItems, 
  onStartPreparation,
  className = '' 
}: {
  orderItems: KitchenOrderItem[];
  onStartPreparation?: (orderItem: KitchenOrderItem) => void;
  className?: string;
}) {
  return (
    <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {orderItems.map((orderItem) => (
        <RecipeQuickView
          key={`${orderItem.orderId}-${orderItem.productId}`}
          orderItem={orderItem}
          onStartPreparation={() => onStartPreparation?.(orderItem)}
        />
      ))}
    </div>
  );
}

// Componente para botão flutuante de receita
export function RecipeFloatingButton({ 
  orderItem, 
  className = '' 
}: { 
  orderItem: KitchenOrderItem;
  className?: string;
}) {
  const [showRecipeModal, setShowRecipeModal] = useState(false);

  return (
    <>
      <Button
        onClick={() => setShowRecipeModal(true)}
        className={`fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 ${className}`}
        size="sm"
      >
        <ChefHat className="w-6 h-6" />
      </Button>

      <RecipeModal
        open={showRecipeModal}
        onClose={() => setShowRecipeModal(false)}
        orderItem={orderItem}
      />
    </>
  );
}