import { Order, OrderStatus, ValidationResult } from '../models/order';
import { Product } from '../models/product';
import { 
  KitchenOrder, 
  KitchenStatus, 
  KitchenStatusMapper,
  KitchenOrderItem,
  PreparationStation
} from '../models/kitchen';
import { Recipe, Allergen } from '../models/recipe';
import { InventoryItem } from '../models/inventory';

/**
 * Kitchen Validation Utilities
 * Provides validation for kitchen-specific operations and data integrity
 */
export class KitchenValidationUtils {
  
  /**
   * Validates that a kitchen order is properly synchronized with its base order
   */
  static validateKitchenOrderSync(kitchenOrder: KitchenOrder, baseOrder: Order): ValidationResult {
    const errors: string[] = [];

    // Check if order IDs match
    if (kitchenOrder.orderId !== baseOrder.id) {
      errors.push('Kitchen order ID does not match base order ID');
    }

    // Check if tenant IDs match
    if (kitchenOrder.tenantId !== baseOrder.tenantId) {
      errors.push('Kitchen order tenant ID does not match base order tenant ID');
    }

    // Validate status mapping
    const expectedOrderStatus = KitchenStatusMapper.toOrderStatus(kitchenOrder.status);
    if (baseOrder.status !== expectedOrderStatus) {
      errors.push(`Kitchen status ${kitchenOrder.status} does not map to order status ${baseOrder.status}`);
    }

    // Check if item counts match
    if (kitchenOrder.items.length !== baseOrder.items.length) {
      errors.push('Kitchen order item count does not match base order item count');
    }

    // Validate individual items
    kitchenOrder.items.forEach((kitchenItem, index) => {
      const baseItem = baseOrder.items.find(item => item.id === kitchenItem.id);
      if (!baseItem) {
        errors.push(`Kitchen item ${kitchenItem.id} not found in base order`);
      } else {
        // Validate item properties
        if (kitchenItem.productId !== baseItem.productId) {
          errors.push(`Kitchen item ${kitchenItem.id} product ID mismatch`);
        }
        if (kitchenItem.quantity !== baseItem.quantity) {
          errors.push(`Kitchen item ${kitchenItem.id} quantity mismatch`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates kitchen order item against product and recipe requirements
   */
  static validateKitchenOrderItem(
    item: KitchenOrderItem, 
    product: Product, 
    recipe?: Recipe
  ): ValidationResult {
    const errors: string[] = [];

    // Validate product reference
    if (item.productId !== product.id) {
      errors.push('Kitchen item product ID does not match product');
    }

    // Validate quantity
    if (item.quantity <= 0) {
      errors.push('Kitchen item quantity must be positive');
    }

    // Validate estimated time
    if (item.estimatedTime <= 0) {
      errors.push('Kitchen item estimated time must be positive');
    }

    // If recipe is provided, validate against recipe requirements
    if (recipe) {
      if (recipe.dishId !== product.id) {
        errors.push('Recipe dish ID does not match product ID');
      }

      // Check if estimated time is reasonable compared to recipe
      const recipeTime = recipe.preparationTime + recipe.cookingTime;
      if (item.estimatedTime < recipeTime * 0.5 || item.estimatedTime > recipeTime * 2) {
        errors.push(`Kitchen item estimated time (${item.estimatedTime}min) significantly differs from recipe time (${recipeTime}min)`);
      }

      // Validate allergens
      const recipeAllergens = recipe.allergens.map((a: Allergen) => a.type);
      item.allergens.forEach(allergen => {
        if (!recipeAllergens.includes(allergen)) {
          errors.push(`Allergen ${allergen} not found in recipe`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates station assignment for kitchen order items
   */
  static validateStationAssignment(
    items: KitchenOrderItem[], 
    station: PreparationStation
  ): ValidationResult {
    const errors: string[] = [];

    // Check station capacity
    const assignedItems = items.filter(item => item.stationId === station.id);
    if (assignedItems.length > station.capacity) {
      errors.push(`Station ${station.name} is over capacity (${assignedItems.length}/${station.capacity})`);
    }

    // Check station status
    if (station.status === 'offline' || station.status === 'maintenance') {
      errors.push(`Cannot assign items to station ${station.name} - status: ${station.status}`);
    }

    // Validate station specializations (if any items require specific skills)
    assignedItems.forEach(item => {
      // This would require additional logic to check if the station
      // has the required specializations for the item type
      // For now, we'll just check basic compatibility
      if (station.specializations.length === 0 && item.preparationNotes.includes('specialized')) {
        errors.push(`Item ${item.id} requires specialized preparation but station has no specializations`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates inventory availability for recipe ingredients
   */
  static validateIngredientAvailability(
    recipe: Recipe, 
    quantity: number, 
    inventory: InventoryItem[]
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    recipe.ingredients.forEach(ingredient => {
      const inventoryItem = inventory.find(item => item.id === ingredient.ingredientId);
      
      if (!inventoryItem) {
        if (!ingredient.isOptional) {
          errors.push(`Required ingredient ${ingredient.name} not found in inventory`);
        } else {
          warnings.push(`Optional ingredient ${ingredient.name} not available`);
        }
        return;
      }

      // Check if there's enough stock
      const requiredQuantity = ingredient.quantity * quantity;
      if (inventoryItem.currentStock < requiredQuantity) {
        const shortfall = requiredQuantity - inventoryItem.currentStock;
        if (!ingredient.isOptional) {
          errors.push(`Insufficient stock for ${ingredient.name}: need ${requiredQuantity}${ingredient.unit}, have ${inventoryItem.currentStock}${inventoryItem.unit} (short ${shortfall}${ingredient.unit})`);
        } else {
          warnings.push(`Low stock for optional ingredient ${ingredient.name}`);
        }
      }

      // Check expiration
      if (inventoryItem.expirationDate && inventoryItem.expirationDate < new Date()) {
        errors.push(`Ingredient ${ingredient.name} has expired (${inventoryItem.expirationDate.toDateString()})`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors: [...errors, ...warnings], // Include warnings as errors for now
    };
  }

  /**
   * Validates kitchen status transitions
   */
  static validateKitchenStatusTransition(
    currentStatus: KitchenStatus, 
    newStatus: KitchenStatus
  ): ValidationResult {
    const isValid = KitchenStatusMapper.isValidTransition(currentStatus, newStatus);
    
    return {
      isValid,
      errors: isValid ? [] : [`Invalid kitchen status transition from ${currentStatus} to ${newStatus}`],
    };
  }

  /**
   * Validates that kitchen order timing is realistic
   */
  static validateOrderTiming(kitchenOrder: KitchenOrder): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if estimated completion time is in the future
    if (kitchenOrder.estimatedCompletionTime < new Date()) {
      errors.push('Estimated completion time cannot be in the past');
    }

    // Check if actual times are logical
    if (kitchenOrder.actualStartTime && kitchenOrder.actualCompletionTime) {
      if (kitchenOrder.actualStartTime > kitchenOrder.actualCompletionTime) {
        errors.push('Actual start time cannot be after completion time');
      }

      // Check if completion time is reasonable
      const actualDuration = kitchenOrder.actualCompletionTime.getTime() - kitchenOrder.actualStartTime.getTime();
      const actualMinutes = actualDuration / (1000 * 60);
      const estimatedMinutes = kitchenOrder.items.reduce((total, item) => total + item.estimatedTime, 0);

      if (actualMinutes > estimatedMinutes * 3) {
        warnings.push(`Actual preparation time (${Math.round(actualMinutes)}min) significantly exceeds estimate (${estimatedMinutes}min)`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors: [...errors, ...warnings],
    };
  }

  /**
   * Comprehensive validation for a complete kitchen order
   */
  static validateCompleteKitchenOrder(
    kitchenOrder: KitchenOrder,
    baseOrder: Order,
    products: Product[],
    recipes: Recipe[],
    inventory: InventoryItem[],
    stations: PreparationStation[]
  ): ValidationResult {
    const allErrors: string[] = [];

    // Validate order sync
    const syncResult = this.validateKitchenOrderSync(kitchenOrder, baseOrder);
    allErrors.push(...syncResult.errors);

    // Validate timing
    const timingResult = this.validateOrderTiming(kitchenOrder);
    allErrors.push(...timingResult.errors);

    // Validate each item
    kitchenOrder.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      const recipe = recipes.find(r => r.dishId === item.productId);
      
      if (product) {
        const itemResult = this.validateKitchenOrderItem(item, product, recipe);
        allErrors.push(...itemResult.errors);

        // Validate ingredient availability if recipe exists
        if (recipe) {
          const availabilityResult = this.validateIngredientAvailability(recipe, item.quantity, inventory);
          allErrors.push(...availabilityResult.errors);
        }
      } else {
        allErrors.push(`Product not found for item ${item.id}`);
      }

      // Validate station assignment if assigned
      if (item.stationId) {
        const station = stations.find(s => s.id === item.stationId);
        if (station) {
          const stationResult = this.validateStationAssignment([item], station);
          allErrors.push(...stationResult.errors);
        } else {
          allErrors.push(`Station not found for item ${item.id}`);
        }
      }
    });

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
    };
  }
}