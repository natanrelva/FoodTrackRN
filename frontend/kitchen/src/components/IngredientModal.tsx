import { useState } from 'react';
import { Package, AlertTriangle, Thermometer, Scale, Eye } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Dialog, DialogHeader, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';

interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expirationDate?: Date;
  batchNumber?: string;
  supplier?: string;
  storageLocation: string;
  storageTemperature?: number;
  isOptional?: boolean;
  allergens?: string[];
  nutritionalInfo?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface IngredientAvailability {
  available: number;
  reserved: number;
  minimum: number;
  status: 'available' | 'low' | 'critical' | 'unavailable';
}

interface IngredientModalProps {
  open: boolean;
  onClose: () => void;
  ingredient: Ingredient;
  availability: IngredientAvailability;
  onReserve?: (quantity: number) => void;
  onRequestRestock?: () => void;
}

const CATEGORY_COLORS = {
  'proteína': 'bg-red-100 text-red-800',
  'vegetal': 'bg-green-100 text-green-800',
  'laticínio': 'bg-blue-100 text-blue-800',
  'grão': 'bg-yellow-100 text-yellow-800',
  'tempero': 'bg-purple-100 text-purple-800',
  'molho': 'bg-orange-100 text-orange-800',
  'outros': 'bg-gray-100 text-gray-800'
};

const STATUS_COLORS = {
  available: 'bg-green-100 text-green-800',
  low: 'bg-yellow-100 text-yellow-800',
  critical: 'bg-orange-100 text-orange-800',
  unavailable: 'bg-red-100 text-red-800'
};

const STATUS_LABELS = {
  available: 'Disponível',
  low: 'Estoque Baixo',
  critical: 'Crítico',
  unavailable: 'Indisponível'
};

export function IngredientModal({ 
  open, 
  onClose, 
  ingredient, 
  availability, 
  onReserve, 
  onRequestRestock 
}: IngredientModalProps) {
  const [reserveQuantity, setReserveQuantity] = useState(1);

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const getDaysUntilExpiration = (): number | null => {
    if (!ingredient.expirationDate) return null;
    const today = new Date();
    const expiration = new Date(ingredient.expirationDate);
    const diffTime = expiration.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getExpirationStatus = (): 'fresh' | 'warning' | 'critical' | 'expired' => {
    const days = getDaysUntilExpiration();
    if (days === null) return 'fresh';
    if (days < 0) return 'expired';
    if (days <= 1) return 'critical';
    if (days <= 3) return 'warning';
    return 'fresh';
  };

  const getStockPercentage = (): number => {
    if (availability.minimum === 0) return 100;
    return (availability.available / availability.minimum) * 100;
  };

  const handleReserve = () => {
    if (reserveQuantity > 0 && reserveQuantity <= availability.available) {
      onReserve?.(reserveQuantity);
      onClose();
    }
  };

  const daysUntilExpiration = getDaysUntilExpiration();
  const expirationStatus = getExpirationStatus();
  const stockPercentage = getStockPercentage();

  return (
    <Dialog open={open} onClose={onClose} size="lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <span>{ingredient.name}</span>
            <Badge className={`ml-2 ${CATEGORY_COLORS[ingredient.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.outros}`}>
              {ingredient.category}
            </Badge>
          </div>
        </DialogTitle>
        <DialogDescription>
          Informações detalhadas do ingrediente e disponibilidade
        </DialogDescription>
      </DialogHeader>

      <DialogContent className="space-y-6">
        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Disponibilidade</span>
              <Badge className={STATUS_COLORS[availability.status]}>
                {STATUS_LABELS[availability.status]}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Disponível:</span>
                <span className="font-medium">{availability.available} {ingredient.unit}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Reservado:</span>
                <span className="font-medium">{availability.reserved} {ingredient.unit}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Mínimo:</span>
                <span className="font-medium">{availability.minimum} {ingredient.unit}</span>
              </div>
              <Progress value={stockPercentage} className="h-2 mt-2" />
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Validade</span>
              {ingredient.expirationDate && (
                <Badge className={
                  expirationStatus === 'expired' ? 'bg-red-100 text-red-800' :
                  expirationStatus === 'critical' ? 'bg-orange-100 text-orange-800' :
                  expirationStatus === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }>
                  {expirationStatus === 'expired' ? 'Vencido' :
                   expirationStatus === 'critical' ? 'Crítico' :
                   expirationStatus === 'warning' ? 'Atenção' : 'Fresco'}
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              {ingredient.expirationDate ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Vencimento:</span>
                    <span className="font-medium">{formatDate(ingredient.expirationDate)}</span>
                  </div>
                  {daysUntilExpiration !== null && (
                    <div className="flex justify-between text-sm">
                      <span>Dias restantes:</span>
                      <span className={`font-medium ${
                        daysUntilExpiration < 0 ? 'text-red-600' :
                        daysUntilExpiration <= 1 ? 'text-orange-600' :
                        daysUntilExpiration <= 3 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {daysUntilExpiration < 0 ? 'Vencido' : `${daysUntilExpiration} dias`}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-gray-500">Sem data de validade</div>
              )}
            </div>
          </div>
        </div>

        {/* Expiration Warning */}
        {expirationStatus === 'expired' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">
                Ingrediente vencido - não deve ser usado
              </span>
            </div>
          </div>
        )}

        {expirationStatus === 'critical' && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">
                Ingrediente vence hoje ou amanhã - usar com prioridade
              </span>
            </div>
          </div>
        )}

        {/* Allergen Warning */}
        {ingredient.allergens && ingredient.allergens.length > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Alérgenos</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {ingredient.allergens.map((allergen) => (
                <Badge key={allergen} variant="outline" className="text-xs">
                  {allergen}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Storage Information */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Informações de Armazenamento</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Local:</span>
                <span className="font-medium">{ingredient.storageLocation}</span>
              </div>
              {ingredient.storageTemperature && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Temperatura:</span>
                  <span className="font-medium flex items-center gap-1">
                    <Thermometer className="w-3 h-3" />
                    {ingredient.storageTemperature}°C
                  </span>
                </div>
              )}
              {ingredient.batchNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Lote:</span>
                  <span className="font-medium">{ingredient.batchNumber}</span>
                </div>
              )}
              {ingredient.supplier && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Fornecedor:</span>
                  <span className="font-medium">{ingredient.supplier}</span>
                </div>
              )}
            </div>
          </div>

          {/* Nutritional Information */}
          {ingredient.nutritionalInfo && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Informação Nutricional (100g)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Calorias:</span>
                  <span className="font-medium">{ingredient.nutritionalInfo.calories} kcal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Proteína:</span>
                  <span className="font-medium">{ingredient.nutritionalInfo.protein}g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Carboidratos:</span>
                  <span className="font-medium">{ingredient.nutritionalInfo.carbs}g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Gordura:</span>
                  <span className="font-medium">{ingredient.nutritionalInfo.fat}g</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reserve Section */}
        {availability.status !== 'unavailable' && expirationStatus !== 'expired' && onReserve && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-3">Reservar Ingrediente</h4>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-600" />
                <input
                  type="number"
                  min="1"
                  max={availability.available}
                  value={reserveQuantity}
                  onChange={(e) => setReserveQuantity(Number(e.target.value))}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <span className="text-sm text-gray-600">{ingredient.unit}</span>
              </div>
              <Button
                size="sm"
                onClick={handleReserve}
                disabled={reserveQuantity <= 0 || reserveQuantity > availability.available}
              >
                Reservar
              </Button>
            </div>
            <p className="text-xs text-blue-700 mt-2">
              Máximo disponível: {availability.available} {ingredient.unit}
            </p>
          </div>
        )}

        {/* Low Stock Alert */}
        {availability.status === 'low' || availability.status === 'critical' && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">
                  Estoque baixo - considere reabastecer
                </span>
              </div>
              {onRequestRestock && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRequestRestock}
                >
                  Solicitar Reposição
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>

      <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            Histórico
          </Button>
          <Button variant="outline" size="sm">
            Imprimir Etiqueta
          </Button>
        </div>
        <Button variant="outline" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </Dialog>
  );
}