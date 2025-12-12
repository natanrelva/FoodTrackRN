import { useState } from 'react';
import { Clock, ChefHat, AlertTriangle, Thermometer, Users, Star, Package } from 'lucide-react';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Alert } from './ui/alert';
import { Separator } from './ui/separator';
import { useRecipeManagement } from '../hooks/useRecipeManagement';

interface RecipeDisplayProps {
  dishId: string;
  modifications?: string[];
  onClose?: () => void;
  className?: string;
}

const DIFFICULTY_COLORS = {
  easy: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  hard: 'bg-orange-100 text-orange-800 border-orange-200',
  expert: 'bg-red-100 text-red-800 border-red-200'
};

const DIFFICULTY_LABELS = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert'
};

export function RecipeDisplay({ dishId, modifications = [], onClose, className }: RecipeDisplayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const {
    recipe,
    loading,
    error,
    ingredientAvailability,
    checkingAvailability,
    areIngredientsAvailable,
    unavailableIngredients,
    lowStockIngredients
  } = useRecipeManagement({ dishId, modifications });

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <div className="ml-2">
            <h4 className="text-red-800 font-medium">Recipe Error</h4>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </Alert>
        {onClose && (
          <Button variant="outline" onClick={onClose} className="mt-4">
            Close
          </Button>
        )}
      </Card>
    );
  }

  if (!recipe) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <ChefHat className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Recipe not found</p>
        </div>
      </Card>
    );
  }

  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  };

  return (
    <Card className={`p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{recipe.dishName}</h2>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{formatTime(recipe.totalTime)}</span>
            </div>
            <Badge className={DIFFICULTY_COLORS[recipe.difficulty]}>
              <Star className="w-3 h-3 mr-1" />
              {DIFFICULTY_LABELS[recipe.difficulty]}
            </Badge>
          </div>
        </div>
        {onClose && (
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Allergen Warnings */}
      {recipe.allergenWarnings.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <div className="ml-2">
            <h4 className="text-yellow-800 font-medium">Allergen Warning</h4>
            <p className="text-yellow-700 text-sm mt-1">
              Contains: {recipe.allergenWarnings.join(', ')}
            </p>
          </div>
        </Alert>
      )}

      {/* Modifications */}
      {recipe.modifications.length > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Applied Modifications</h4>
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

      {/* Ingredient Availability Alert */}
      {!areIngredientsAvailable && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <div className="ml-2">
            <h4 className="text-red-800 font-medium">Ingredient Shortage</h4>
            <p className="text-red-700 text-sm mt-1">
              {unavailableIngredients.length} ingredient{unavailableIngredients.length > 1 ? 's are' : ' is'} unavailable: {unavailableIngredients.map(ing => ing.name).join(', ')}
            </p>
          </div>
        </Alert>
      )}

      {/* Low Stock Warning */}
      {lowStockIngredients.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <Package className="h-4 w-4 text-yellow-600" />
          <div className="ml-2">
            <h4 className="text-yellow-800 font-medium">Low Stock Warning</h4>
            <p className="text-yellow-700 text-sm mt-1">
              Running low on: {lowStockIngredients.map(ing => ing.name).join(', ')}
            </p>
          </div>
        </Alert>
      )}

      {/* Ingredients */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Ingredients
          </h3>
          {checkingAvailability && (
            <div className="text-sm text-gray-500">Checking availability...</div>
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
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  isUnavailable 
                    ? 'bg-red-50 border-red-200' 
                    : isLowStock 
                    ? 'bg-yellow-50 border-yellow-200'
                    : ingredient.isOptional 
                    ? 'bg-gray-50 border-gray-200' 
                    : 'bg-white border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-medium ${isUnavailable ? 'text-red-900' : 'text-gray-900'}`}>
                    {ingredient.name}
                  </span>
                  {ingredient.isOptional && (
                    <Badge variant="outline" className="text-xs">
                      Optional
                    </Badge>
                  )}
                  {isUnavailable && (
                    <Badge className="text-xs bg-red-100 text-red-800">
                      Unavailable
                    </Badge>
                  )}
                  {isLowStock && (
                    <Badge className="text-xs bg-yellow-100 text-yellow-800">
                      Low Stock
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-700">
                    {ingredient.quantity} {ingredient.unit}
                  </div>
                  {availability && (
                    <div className="text-xs text-gray-500">
                      Available: {availability.availableQuantity} {availability.unit}
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
            Instructions
          </h3>
          <div className="text-sm text-gray-500">
            Step {currentStep + 1} of {recipe.steps.length}
          </div>
        </div>

        {/* Step Navigation */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
          {recipe.steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`flex-shrink-0 w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                index === currentStep
                  ? 'bg-blue-600 text-white'
                  : index < currentStep
                  ? 'bg-green-100 text-green-800'
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
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    {step.stepNumber}
                  </div>
                  <div className="flex-1 space-y-3">
                    <p className="text-gray-900 leading-relaxed">{step.instruction}</p>
                    
                    {/* Step Details */}
                    <div className="flex flex-wrap gap-4 text-sm">
                      {step.duration && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{step.duration} min</span>
                        </div>
                      )}
                      {step.temperature && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <Thermometer className="w-4 h-4" />
                          <span>{step.temperature}°C</span>
                        </div>
                      )}
                    </div>

                    {/* Equipment */}
                    {step.equipment.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Equipment: </span>
                        <span className="text-sm text-gray-600">
                          {step.equipment.join(', ')}
                        </span>
                      </div>
                    )}

                    {/* Notes */}
                    {step.notes && (
                      <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <span className="text-sm font-medium text-yellow-800">Note: </span>
                        <span className="text-sm text-yellow-700">{step.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            Previous Step
          </Button>
          <Button
            onClick={() => setCurrentStep(Math.min(recipe.steps.length - 1, currentStep + 1))}
            disabled={currentStep === recipe.steps.length - 1}
          >
            Next Step
          </Button>
        </div>
      </div>
    </Card>
  );
}