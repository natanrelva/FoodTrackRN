import { useState, useEffect, useCallback } from 'react';
import { RecipeInstructions, AvailabilityCheck } from '@foodtrack/types';
import { kitchenOperations } from '../lib/api';

interface UseRecipeManagementProps {
  dishId: string;
  modifications?: string[];
}

interface RecipeManagementState {
  recipe: RecipeInstructions | null;
  loading: boolean;
  error: string | null;
  ingredientAvailability: Record<string, AvailabilityCheck>;
  checkingAvailability: boolean;
}

export function useRecipeManagement({ dishId, modifications = [] }: UseRecipeManagementProps) {
  const [state, setState] = useState<RecipeManagementState>({
    recipe: null,
    loading: false,
    error: null,
    ingredientAvailability: {},
    checkingAvailability: false
  });

  // Fetch recipe instructions
  const fetchRecipe = useCallback(async () => {
    if (!dishId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const recipe = await kitchenOperations.getRecipeInstructions(dishId, modifications);
      setState(prev => ({ ...prev, recipe, loading: false }));
      
      // Check ingredient availability after loading recipe
      if (recipe) {
        checkIngredientAvailability(recipe);
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load recipe'
      }));
    }
  }, [dishId, modifications]);

  // Check ingredient availability
  const checkIngredientAvailability = useCallback(async (recipe: RecipeInstructions) => {
    setState(prev => ({ ...prev, checkingAvailability: true }));
    
    try {
      const availabilityChecks = await Promise.allSettled(
        recipe.ingredients.map(async (ingredient) => {
          // In a real implementation, you'd have ingredient IDs
          // For now, we'll simulate the check
          const mockAvailability: AvailabilityCheck = {
            ingredientId: `ingredient-${ingredient.name.toLowerCase().replace(/\s+/g, '-')}`,
            ingredientName: ingredient.name,
            requiredQuantity: ingredient.quantity,
            availableQuantity: ingredient.quantity * (Math.random() > 0.1 ? 2 : 0.5), // 90% chance of having enough
            unit: ingredient.unit,
            isAvailable: Math.random() > 0.1,
            shortfall: Math.random() > 0.1 ? undefined : ingredient.quantity * 0.3,
            alternatives: []
          };
          
          return {
            ingredientName: ingredient.name,
            availability: mockAvailability
          };
        })
      );

      const availabilityMap: Record<string, AvailabilityCheck> = {};
      availabilityChecks.forEach((result) => {
        if (result.status === 'fulfilled') {
          availabilityMap[result.value.ingredientName] = result.value.availability;
        }
      });

      setState(prev => ({
        ...prev,
        ingredientAvailability: availabilityMap,
        checkingAvailability: false
      }));
    } catch (error) {
      console.error('Failed to check ingredient availability:', error);
      setState(prev => ({ ...prev, checkingAvailability: false }));
    }
  }, []);

  // Get ingredient requirements for a specific quantity
  const getIngredientRequirements = useCallback(async (quantity: number = 1) => {
    if (!dishId) return null;

    try {
      return await kitchenOperations.getIngredientRequirements(dishId, quantity);
    } catch (error) {
      console.error('Failed to get ingredient requirements:', error);
      return null;
    }
  }, [dishId]);

  // Update ingredient usage
  const updateIngredientUsage = useCallback(async (ingredientId: string, quantity: number, orderId?: string) => {
    try {
      await kitchenOperations.updateIngredientUsage(ingredientId, quantity, orderId);
      
      // Refresh ingredient availability after usage update
      if (state.recipe) {
        checkIngredientAvailability(state.recipe);
      }
    } catch (error) {
      console.error('Failed to update ingredient usage:', error);
      throw error;
    }
  }, [state.recipe, checkIngredientAvailability]);

  // Validate recipe modifications
  const validateModifications = useCallback(async (newModifications: string[]) => {
    // In a real implementation, this would call the API
    // For now, return mock validation
    return newModifications.map(modification => ({
      modification,
      isValid: true,
      affectedIngredients: [],
      affectedSteps: [],
      warnings: modification.toLowerCase().includes('no salt') 
        ? ['Removing salt may significantly affect taste'] 
        : []
    }));
  }, []);

  // Get recipe with modifications applied
  const getRecipeWithModifications = useCallback(async (newModifications: string[]) => {
    if (!dishId) return null;

    try {
      return await kitchenOperations.getRecipeInstructions(dishId, newModifications);
    } catch (error) {
      console.error('Failed to get recipe with modifications:', error);
      return null;
    }
  }, [dishId]);

  // Check if all ingredients are available
  const areIngredientsAvailable = useCallback(() => {
    if (!state.recipe) return true;
    
    return state.recipe.ingredients.every(ingredient => {
      const availability = state.ingredientAvailability[ingredient.name];
      return !availability || availability.isAvailable;
    });
  }, [state.recipe, state.ingredientAvailability]);

  // Get unavailable ingredients
  const getUnavailableIngredients = useCallback(() => {
    if (!state.recipe) return [];
    
    return state.recipe.ingredients.filter(ingredient => {
      const availability = state.ingredientAvailability[ingredient.name];
      return availability && !availability.isAvailable;
    });
  }, [state.recipe, state.ingredientAvailability]);

  // Get low stock ingredients
  const getLowStockIngredients = useCallback(() => {
    if (!state.recipe) return [];
    
    return state.recipe.ingredients.filter(ingredient => {
      const availability = state.ingredientAvailability[ingredient.name];
      return availability && 
             availability.isAvailable && 
             availability.availableQuantity < availability.requiredQuantity * 1.5; // Less than 1.5x required
    });
  }, [state.recipe, state.ingredientAvailability]);

  // Refresh recipe data
  const refresh = useCallback(() => {
    fetchRecipe();
  }, [fetchRecipe]);

  // Load recipe on mount and when dependencies change
  useEffect(() => {
    fetchRecipe();
  }, [fetchRecipe]);

  return {
    // State
    recipe: state.recipe,
    loading: state.loading,
    error: state.error,
    ingredientAvailability: state.ingredientAvailability,
    checkingAvailability: state.checkingAvailability,
    
    // Actions
    refresh,
    getIngredientRequirements,
    updateIngredientUsage,
    validateModifications,
    getRecipeWithModifications,
    
    // Computed values
    areIngredientsAvailable: areIngredientsAvailable(),
    unavailableIngredients: getUnavailableIngredients(),
    lowStockIngredients: getLowStockIngredients(),
    
    // Utilities
    checkIngredientAvailability: () => state.recipe && checkIngredientAvailability(state.recipe)
  };
}

// Hook for managing multiple recipes (for batch cooking)
export function useMultipleRecipes(dishIds: string[]) {
  const [recipes, setRecipes] = useState<Record<string, RecipeInstructions>>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchAllRecipes = useCallback(async () => {
    if (dishIds.length === 0) return;

    setLoading(true);
    setErrors({});

    const results = await Promise.allSettled(
      dishIds.map(async (dishId) => {
        const recipe = await kitchenOperations.getRecipeInstructions(dishId);
        return { dishId, recipe };
      })
    );

    const newRecipes: Record<string, RecipeInstructions> = {};
    const newErrors: Record<string, string> = {};

    results.forEach((result, index) => {
      const dishId = dishIds[index];
      if (result.status === 'fulfilled') {
        newRecipes[dishId] = result.value.recipe;
      } else {
        newErrors[dishId] = result.reason?.message || 'Failed to load recipe';
      }
    });

    setRecipes(newRecipes);
    setErrors(newErrors);
    setLoading(false);
  }, [dishIds]);

  useEffect(() => {
    fetchAllRecipes();
  }, [fetchAllRecipes]);

  return {
    recipes,
    loading,
    errors,
    refresh: fetchAllRecipes,
    hasErrors: Object.keys(errors).length > 0,
    loadedCount: Object.keys(recipes).length,
    totalCount: dishIds.length
  };
}