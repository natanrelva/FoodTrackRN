import { useState } from 'react';
import { Clock, ChefHat, AlertTriangle, Thermometer, Users, Star, Package, Eye, Settings, Book, Maximize2, Minimize2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Alert } from './ui/alert';
import { Separator } from './ui/separator';
import { Dialog, DialogHeader, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { useRecipeManagement } from '../hooks/useRecipeManagement';
import { RecipeModifications } from './RecipeModifications';
import { QualityStandards } from './QualityStandards';
import { QualityModal } from './QualityModal';
import { IngredientModal } from './IngredientModal';
import { KitchenOrderItem } from '../types/kitchen';

interface RecipeModalProps {
  open: boolean;
  onClose: () => void;
  orderItem: KitchenOrderItem;
  onStartPreparation?: () => void;
}

type ViewMode = 'recipe' | 'modifications' | 'quality';

const DIFFICULTY_COLORS = {
  easy: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  hard: 'bg-orange-100 text-orange-800 border-orange-200',
  expert: 'bg-red-100 text-red-800 border-red-200'
};

const DIFFICULTY_LABELS = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
  expert: 'Expert'
};

export function RecipeModal({ open, onClose, orderItem, onStartPreparation }: RecipeModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('recipe');
  const [currentStep, setCurrentStep] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [modifications, setModifications] = useState<string[]>(orderItem.modifications || []);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<any>(null);

  const {
    recipe,
    loading,
    error,
    ingredientAvailability,
    checkingAvailability,
    areIngredientsAvailable,
    unavailableIngredients,
    lowStockIngredients
  } = useRecipeManagement({ dishId: orderItem.productId, modifications });

  // Mock quality standards
  const mockQualityStandards = [
    {
      id: '1',
      dishId: orderItem.productId,
      dishName: orderItem.name,
      criteria: [
        {
          aspect: 'cor',
          requirement: 'Exterior dourado',
          tolerance: '±10% variação de cor',
          checkMethod: 'Inspeção visual',
          importance: 'medium' as const
        },
        {
          aspect: 'textura',
          requirement: 'Crocante por fora, macio por dentro',
          checkMethod: 'Teste tátil',
          importance: 'high' as const
        },
        {
          aspect: 'temperatura',
          requirement: 'Temperatura interna 74°C',
          tolerance: '±3°C',
          checkMethod: 'Termômetro digital',
          importance: 'critical' as const
        }
      ],
      visualReference: '/images/quality-reference.jpg',
      temperatureRequirements: {
        min: 71,
        max: 77,
        unit: 'celsius' as const
      },
      presentationGuidelines: 'Servir imediatamente em prato aquecido. Guarnecer com ervas frescas. Molho deve ser colocado ao redor do prato, não sobre o prato.',
      commonIssues: [
        {
          issue: 'Exterior muito cozido',
          solution: 'Reduzir o fogo e aumentar o tempo de cozimento',
          prevention: 'Monitorar temperatura de perto e usar timer',
          frequency: 'occasional' as const
        }
      ],
      lastUpdated: new Date(),
      version: '1.0'
    }
  ];

  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  };

  const ViewModeButton = ({ mode, icon: Icon, label, count }: {
    mode: ViewMode;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    count?: number;
  }) => (
    <Button
      variant={viewMode === mode ? "default" : "outline"}
      size="sm"
      onClick={() => setViewMode(mode)}
      className="flex items-center gap-2"
    >
      <Icon className="w-4 h-4" />
      {label}
      {count !== undefined && count > 0 && (
        <Badge variant="secondary" className="ml-1 text-xs">
          {count}
        </Badge>
      )}
    </Button>
  );

  const renderRecipeContent = () => {
    if (loading) {
      return (
        <div className="animate-pulse space-y-4 p-6">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-6">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <div className="ml-2">
              <h4 className="text-red-800 font-medium">Erro na Receita</h4>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </Alert>
        </div>
      );
    }

    if (!recipe) {
      return (
        <div className="p-6 text-center text-gray-500">
          <ChefHat className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Receita não encontrada</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Allergen Warnings */}
        {recipe.allergenWarnings.length > 0 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <div className="ml-2">
              <h4 className="text-yellow-800 font-medium">Aviso de Alérgenos</h4>
              <p className="text-yellow-700 text-sm mt-1">
                Contém: {recipe.allergenWarnings.join(', ')}
              </p>
            </div>
          </Alert>
        )}

        {/* Applied Modifications */}
        {recipe.modifications.length > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Modificações Aplicadas</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              {recipe.modifications.map((mod, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span className="font-medium">{mod}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Ingredient Availability Alerts */}
        {!areIngredientsAvailable && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <div className="ml-2">
              <h4 className="text-red-800 font-medium">Falta de Ingredientes</h4>
              <p className="text-red-700 text-sm mt-1">
                {unavailableIngredients.length} ingrediente{unavailableIngredients.length > 1 ? 's não disponíveis' : ' não disponível'}: {unavailableIngredients.map(ing => ing.name).join(', ')}
              </p>
            </div>
          </Alert>
        )}

        {lowStockIngredients.length > 0 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <Package className="h-4 w-4 text-yellow-600" />
            <div className="ml-2">
              <h4 className="text-yellow-800 font-medium">Aviso de Estoque Baixo</h4>
              <p className="text-yellow-700 text-sm mt-1">
                Estoque baixo: {lowStockIngredients.map(ing => ing.name).join(', ')}
              </p>
            </div>
          </Alert>
        )}

        {/* Ingredients */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Ingredientes
            </h3>
            {checkingAvailability && (
              <div className="text-sm text-gray-500">Verificando disponibilidade...</div>
            )}
          </div>
          <div className="grid gap-2">
            {recipe.ingredients.map((ingredient, index) => {
              const availability = ingredientAvailability[ingredient.name];
              const isUnavailable = availability && !availability.isAvailable;
              const isLowStock = availability && availability.isAvailable && 
                                availability.availableQuantity < availability.requiredQuantity * 1.5;
              
              return (
                <div 
                  key={index} 
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                    isUnavailable 
                      ? 'bg-red-50 border-red-200' 
                      : isLowStock 
                      ? 'bg-yellow-50 border-yellow-200'
                      : ingredient.isOptional 
                      ? 'bg-gray-50 border-gray-200' 
                      : 'bg-white border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    setSelectedIngredient({
                      id: `ingredient-${index}`,
                      name: ingredient.name,
                      quantity: ingredient.quantity,
                      unit: ingredient.unit,
                      category: 'outros',
                      storageLocation: 'Estoque Principal',
                      isOptional: ingredient.isOptional
                    });
                    setShowIngredientModal(true);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-medium ${isUnavailable ? 'text-red-900' : 'text-gray-900'}`}>
                      {ingredient.name}
                    </span>
                    {ingredient.isOptional && (
                      <Badge variant="outline" className="text-xs">
                        Opcional
                      </Badge>
                    )}
                    {isUnavailable && (
                      <Badge className="text-xs bg-red-100 text-red-800">
                        Indisponível
                      </Badge>
                    )}
                    {isLowStock && (
                      <Badge className="text-xs bg-yellow-100 text-yellow-800">
                        Estoque Baixo
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-700">
                      {ingredient.quantity} {ingredient.unit}
                    </div>
                    {availability && (
                      <div className="text-xs text-gray-500">
                        Disponível: {availability.availableQuantity} {availability.unit}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Instructions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ChefHat className="w-5 h-5" />
              Instruções
            </h3>
            <div className="text-sm text-gray-500">
              Passo {currentStep + 1} de {recipe.steps.length}
            </div>
          </div>

          {/* Step Navigation */}
          <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
            {recipe.steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`flex-shrink-0 w-10 h-10 rounded-full text-sm font-medium transition-all duration-200 ${
                  index === currentStep
                    ? 'bg-blue-600 text-white shadow-lg scale-110'
                    : index < currentStep
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {/* Current Step */}
          <div className="space-y-4">
            {recipe.steps.map((step, index) => (
              <div
                key={index}
                className={`transition-all duration-300 ${
                  index === currentStep ? 'block' : 'hidden'
                }`}
              >
                <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-lg font-bold shadow-lg">
                      {step.stepNumber}
                    </div>
                    <div className="flex-1 space-y-4">
                      <p className="text-gray-900 leading-relaxed text-lg">{step.instruction}</p>
                      
                      {/* Step Details */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        {step.duration && (
                          <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">{step.duration} min</span>
                          </div>
                        )}
                        {step.temperature && (
                          <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border">
                            <Thermometer className="w-4 h-4 text-red-500" />
                            <span className="font-medium">{step.temperature}°C</span>
                          </div>
                        )}
                      </div>

                      {/* Equipment */}
                      {step.equipment.length > 0 && (
                        <div className="p-3 bg-white rounded-lg border">
                          <span className="text-sm font-medium text-gray-700">Equipamentos: </span>
                          <span className="text-sm text-gray-600">
                            {step.equipment.join(', ')}
                          </span>
                        </div>
                      )}

                      {/* Notes */}
                      {step.notes && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <span className="text-sm font-medium text-yellow-800">Nota: </span>
                          <span className="text-sm text-yellow-700">{step.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="px-6"
            >
              Passo Anterior
            </Button>
            <Button
              onClick={() => setCurrentStep(Math.min(recipe.steps.length - 1, currentStep + 1))}
              disabled={currentStep === recipe.steps.length - 1}
              className="px-6"
            >
              Próximo Passo
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      size={isFullscreen ? 'full' : 'xl'}
      className={isFullscreen ? 'h-screen' : ''}
    >
      <DialogHeader>
        <div className="flex items-start justify-between pr-8">
          <div>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="w-6 h-6 text-blue-600" />
              {orderItem.name}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-4 mt-2">
              <span>Quantidade: {orderItem.quantity}</span>
              {orderItem.estimatedTime && (
                <>
                  <span>•</span>
                  <span>Tempo Est.: {orderItem.estimatedTime} min</span>
                </>
              )}
              {recipe && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{formatTime(recipe.totalTime)}</span>
                  </div>
                  <Badge className={DIFFICULTY_COLORS[recipe.difficulty]}>
                    <Star className="w-3 h-3 mr-1" />
                    {DIFFICULTY_LABELS[recipe.difficulty]}
                  </Badge>
                </>
              )}
            </DialogDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>

        {/* View Mode Selector */}
        <div className="flex gap-2 mt-4 border-t pt-4">
          <ViewModeButton
            mode="recipe"
            icon={Book}
            label="Receita"
          />
          <ViewModeButton
            mode="modifications"
            icon={Settings}
            label="Modificações"
            count={modifications.length}
          />
          <ViewModeButton
            mode="quality"
            icon={Eye}
            label="Padrões de Qualidade"
            count={mockQualityStandards.length}
          />
        </div>
      </DialogHeader>

      <DialogContent className="max-h-[60vh] overflow-y-auto">
        {viewMode === 'recipe' && renderRecipeContent()}
        
        {viewMode === 'modifications' && (
          <RecipeModifications
            dishId={orderItem.productId}
            currentModifications={modifications}
            onModificationsChange={setModifications}
          />
        )}

        {viewMode === 'quality' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Padrões de Qualidade</h3>
              <Button
                onClick={() => setShowQualityModal(true)}
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Abrir Padrões Detalhados
              </Button>
            </div>
            <QualityStandards
              qualityStandards={mockQualityStandards}
              dishName={orderItem.name}
            />
          </div>
        )}
      </DialogContent>

      <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Imprimir Receita
          </Button>
          <Button variant="outline" size="sm">
            Reportar Problema
          </Button>
        </div>
        <div className="flex gap-2">
          {onStartPreparation && (
            <Button onClick={onStartPreparation} className="px-6">
              Iniciar Preparo
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>

      {/* Modals */}
      {selectedIngredient && (
        <IngredientModal
          open={showIngredientModal}
          onClose={() => {
            setShowIngredientModal(false);
            setSelectedIngredient(null);
          }}
          ingredient={selectedIngredient}
          availability={{
            available: 100,
            reserved: 10,
            minimum: 20,
            status: 'available'
          }}
          onReserve={(quantity) => {
            console.log(`Reserving ${quantity} ${selectedIngredient.unit} of ${selectedIngredient.name}`);
          }}
          onRequestRestock={() => {
            console.log(`Requesting restock for ${selectedIngredient.name}`);
          }}
        />
      )}

      {mockQualityStandards.length > 0 && (
        <QualityModal
          open={showQualityModal}
          onClose={() => setShowQualityModal(false)}
          qualityStandard={mockQualityStandards[0]}
          onReportIssue={(issue) => {
            console.log('Quality issue reported:', issue);
          }}
          onMarkAsChecked={() => {
            console.log('Quality standards checked');
            setShowQualityModal(false);
          }}
        />
      )}
    </Dialog>
  );
}