import { useState, useEffect } from 'react';
import { Edit3, AlertTriangle, CheckCircle, X, Plus } from 'lucide-react';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Alert } from './ui/alert';

interface ModificationValidation {
  modification: string;
  isValid: boolean;
  affectedIngredients: string[];
  affectedSteps: number[];
  warnings: string[];
}

interface RecipeModificationsProps {
  dishId: string;
  currentModifications: string[];
  onModificationsChange: (modifications: string[]) => void;
  onValidationChange?: (validations: ModificationValidation[]) => void;
  className?: string;
}

// Common modification templates
const COMMON_MODIFICATIONS = [
  'No onions',
  'No garlic',
  'Extra cheese',
  'Light salt',
  'No salt',
  'Well done',
  'Medium rare',
  'Extra spicy',
  'Mild spice',
  'No dairy',
  'Gluten-free',
  'Vegan option',
  'Extra sauce',
  'Sauce on side',
  'No sauce'
];

const DIETARY_MODIFICATIONS = [
  { label: 'Vegetarian', value: 'vegetarian option' },
  { label: 'Vegan', value: 'vegan option' },
  { label: 'Gluten-Free', value: 'gluten-free' },
  { label: 'Dairy-Free', value: 'no dairy' },
  { label: 'Nut-Free', value: 'no nuts' },
  { label: 'Low Sodium', value: 'low sodium' },
  { label: 'Sugar-Free', value: 'no sugar' }
];

export function RecipeModifications({ 
  dishId, 
  currentModifications, 
  onModificationsChange,
  onValidationChange,
  className 
}: RecipeModificationsProps) {
  const [modifications, setModifications] = useState<string[]>(currentModifications);
  const [customModification, setCustomModification] = useState('');
  const [validations, setValidations] = useState<ModificationValidation[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [validating, setValidating] = useState(false);

  // Validate modifications when they change
  useEffect(() => {
    if (modifications.length > 0) {
      validateModifications();
    } else {
      setValidations([]);
      onValidationChange?.([]);
    }
  }, [modifications, dishId]);

  const validateModifications = async () => {
    setValidating(true);
    try {
      // In a real implementation, this would call the API
      // For now, we'll simulate validation
      const mockValidations: ModificationValidation[] = modifications.map(mod => {
        const lowerMod = mod.toLowerCase();
        const isRemoval = lowerMod.includes('no ') || lowerMod.includes('without');
        const isAddition = lowerMod.includes('extra') || lowerMod.includes('add');
        
        return {
          modification: mod,
          isValid: true,
          affectedIngredients: isRemoval ? [extractIngredient(lowerMod)] : [],
          affectedSteps: isAddition ? [1, 2] : [],
          warnings: generateWarnings(mod)
        };
      });

      setValidations(mockValidations);
      onValidationChange?.(mockValidations);
    } catch (error) {
      console.error('Failed to validate modifications:', error);
    } finally {
      setValidating(false);
    }
  };

  const extractIngredient = (modification: string): string => {
    const ingredients = ['onion', 'garlic', 'cheese', 'salt', 'dairy', 'nuts', 'sugar'];
    return ingredients.find(ing => modification.includes(ing)) || 'ingredient';
  };

  const generateWarnings = (modification: string): string[] => {
    const warnings: string[] = [];
    const lowerMod = modification.toLowerCase();

    if (lowerMod.includes('no salt')) {
      warnings.push('Removing salt may significantly affect taste');
    }
    if (lowerMod.includes('vegan') || lowerMod.includes('no dairy')) {
      warnings.push('May require ingredient substitutions');
    }
    if (lowerMod.includes('gluten-free')) {
      warnings.push('Check all ingredients for gluten content');
    }
    if (lowerMod.includes('well done')) {
      warnings.push('Increase cooking time accordingly');
    }

    return warnings;
  };

  const addModification = (modification: string) => {
    if (modification && !modifications.includes(modification)) {
      const newModifications = [...modifications, modification];
      setModifications(newModifications);
      onModificationsChange(newModifications);
    }
  };

  const removeModification = (index: number) => {
    const newModifications = modifications.filter((_, i) => i !== index);
    setModifications(newModifications);
    onModificationsChange(newModifications);
  };

  const addCustomModification = () => {
    if (customModification.trim()) {
      addModification(customModification.trim());
      setCustomModification('');
      setShowCustomInput(false);
    }
  };

  const getModificationValidation = (modification: string): ModificationValidation | undefined => {
    return validations.find(v => v.modification === modification);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Edit3 className="w-5 h-5 text-blue-600" />
          Recipe Modifications
        </h3>
        {validating && (
          <div className="text-sm text-gray-500">Validating...</div>
        )}
      </div>

      {/* Current Modifications */}
      {modifications.length > 0 && (
        <Card className="p-4">
          <h4 className="font-medium text-gray-900 mb-3">Applied Modifications</h4>
          <div className="space-y-2">
            {modifications.map((modification, index) => {
              const validation = getModificationValidation(modification);
              return (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{modification}</span>
                    {validation && (
                      <div className="flex items-center gap-1">
                        {validation.isValid ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                        {validation.warnings.length > 0 && (
                          <Badge variant="outline" className="text-xs text-orange-600">
                            {validation.warnings.length} warning{validation.warnings.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeModification(index)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Validation Warnings */}
          {validations.some(v => v.warnings.length > 0) && (
            <div className="mt-3 space-y-2">
              {validations
                .filter(v => v.warnings.length > 0)
                .map((validation, index) => (
                  <Alert key={index} className="border-orange-200 bg-orange-50">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <div className="ml-2">
                      <h5 className="text-orange-800 font-medium text-sm">
                        {validation.modification}
                      </h5>
                      <ul className="text-orange-700 text-xs mt-1 space-y-1">
                        {validation.warnings.map((warning, wIndex) => (
                          <li key={wIndex}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  </Alert>
                ))}
            </div>
          )}
        </Card>
      )}

      {/* Quick Modifications */}
      <Card className="p-4">
        <h4 className="font-medium text-gray-900 mb-3">Common Modifications</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {COMMON_MODIFICATIONS.map((mod) => (
            <Button
              key={mod}
              variant="outline"
              size="sm"
              onClick={() => addModification(mod)}
              disabled={modifications.includes(mod)}
              className="justify-start text-left h-auto py-2"
            >
              {mod}
            </Button>
          ))}
        </div>
      </Card>

      {/* Dietary Modifications */}
      <Card className="p-4">
        <h4 className="font-medium text-gray-900 mb-3">Dietary Restrictions</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {DIETARY_MODIFICATIONS.map((diet) => (
            <Button
              key={diet.value}
              variant="outline"
              size="sm"
              onClick={() => addModification(diet.value)}
              disabled={modifications.includes(diet.value)}
              className="justify-start text-left h-auto py-2"
            >
              {diet.label}
            </Button>
          ))}
        </div>
      </Card>

      {/* Custom Modification */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">Custom Modification</h4>
          {!showCustomInput && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomInput(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Custom
            </Button>
          )}
        </div>

        {showCustomInput && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={customModification}
                onChange={(e) => setCustomModification(e.target.value)}
                placeholder="Enter custom modification..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addCustomModification();
                  }
                }}
              />
              <Button
                size="sm"
                onClick={addCustomModification}
                disabled={!customModification.trim()}
              >
                Add
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomModification('');
                }}
              >
                Cancel
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Be specific about the modification (e.g., "Extra cheese on top", "Cook for 2 minutes longer")
            </p>
          </div>
        )}
      </Card>

      {/* Modification Impact Summary */}
      {validations.length > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">Modification Impact</h4>
          <div className="text-sm text-blue-800 space-y-1">
            {validations.some(v => v.affectedIngredients.length > 0) && (
              <div>
                <span className="font-medium">Affected ingredients: </span>
                {Array.from(new Set(validations.flatMap(v => v.affectedIngredients))).join(', ')}
              </div>
            )}
            {validations.some(v => v.affectedSteps.length > 0) && (
              <div>
                <span className="font-medium">Affected steps: </span>
                {Array.from(new Set(validations.flatMap(v => v.affectedSteps))).join(', ')}
              </div>
            )}
            <div className="mt-2 text-xs">
              Review the recipe instructions to ensure all modifications are properly applied.
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}