import { z } from 'zod';
import { MeasurementUnitSchema } from './recipe';

// Ingredient Category enum
export const IngredientCategorySchema = z.enum([
  'protein',
  'vegetables',
  'fruits',
  'dairy',
  'grains',
  'spices',
  'condiments',
  'beverages',
  'frozen',
  'canned',
  'oils',
  'herbs',
  'nuts',
  'seafood',
  'bakery'
]);
export type IngredientCategory = z.infer<typeof IngredientCategorySchema>;

// Inventory Item Model
export const InventoryItemSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  category: IngredientCategorySchema,
  currentStock: z.number().min(0),
  unit: MeasurementUnitSchema,
  minimumStock: z.number().min(0),
  maximumStock: z.number().min(0),
  costPerUnit: z.number().min(0),
  supplier: z.string().min(1),
  supplierCode: z.string().optional(), // SKU or supplier product code
  barcode: z.string().optional(),
  expirationDate: z.date().optional(),
  batchNumber: z.string().optional(),
  storageLocation: z.string().optional(),
  storageTemperature: z.enum(['room', 'refrigerated', 'frozen']).default('room'),
  isActive: z.boolean().default(true),
  lastUpdated: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type InventoryItem = z.infer<typeof InventoryItemSchema>;

// Inventory Update Model
export const InventoryUpdateSchema = z.object({
  inventoryItemId: z.string().uuid(),
  orderId: z.string().uuid().optional(), // If related to an order
  type: z.enum(['usage', 'delivery', 'adjustment', 'waste', 'transfer']),
  quantity: z.number(), // Can be negative for usage/waste
  reason: z.string().min(1),
  performedBy: z.string().uuid(), // User ID
  batchNumber: z.string().optional(),
  expirationDate: z.date().optional(),
  cost: z.number().min(0).optional(),
  notes: z.string().optional(),
  timestamp: z.date(),
});
export type InventoryUpdate = z.infer<typeof InventoryUpdateSchema>;

// Stock Alert Model
export const StockAlertSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  inventoryItemId: z.string().uuid(),
  itemName: z.string().min(1),
  alertType: z.enum(['low_stock', 'out_of_stock', 'expiring_soon', 'expired', 'overstock']),
  currentStock: z.number().min(0),
  minimumStock: z.number().min(0),
  expirationDate: z.date().optional(),
  daysUntilExpiration: z.number().int().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  isResolved: z.boolean().default(false),
  resolvedAt: z.date().optional(),
  resolvedBy: z.string().uuid().optional(),
  createdAt: z.date(),
});
export type StockAlert = z.infer<typeof StockAlertSchema>;

// Expiration Alert Model
export const ExpirationAlertSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  inventoryItemId: z.string().uuid(),
  itemName: z.string().min(1),
  batchNumber: z.string().optional(),
  expirationDate: z.date(),
  daysUntilExpiration: z.number().int(),
  currentStock: z.number().min(0),
  unit: MeasurementUnitSchema,
  severity: z.enum(['warning', 'urgent', 'expired']), // 7+ days, 1-7 days, expired
  suggestedAction: z.enum(['use_first', 'discount', 'dispose', 'return']),
  isResolved: z.boolean().default(false),
  createdAt: z.date(),
});
export type ExpirationAlert = z.infer<typeof ExpirationAlertSchema>;

// Availability Check Model
export const AvailabilityCheckSchema = z.object({
  ingredientId: z.string().uuid(),
  ingredientName: z.string().min(1),
  requiredQuantity: z.number().positive(),
  availableQuantity: z.number().min(0),
  unit: MeasurementUnitSchema,
  isAvailable: z.boolean(),
  shortfall: z.number().min(0).optional(), // How much is missing
  alternatives: z.array(z.object({
    ingredientId: z.string().uuid(),
    name: z.string().min(1),
    availableQuantity: z.number().min(0),
    substitutionRatio: z.number().positive(),
  })).default([]),
  estimatedRestockDate: z.date().optional(),
});
export type AvailabilityCheck = z.infer<typeof AvailabilityCheckSchema>;

// Ingredient Delivery Model
export const IngredientDeliverySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  supplier: z.string().min(1),
  deliveryDate: z.date(),
  invoiceNumber: z.string().optional(),
  totalCost: z.number().min(0),
  items: z.array(z.object({
    inventoryItemId: z.string().uuid(),
    itemName: z.string().min(1),
    quantity: z.number().positive(),
    unit: MeasurementUnitSchema,
    costPerUnit: z.number().min(0),
    batchNumber: z.string().optional(),
    expirationDate: z.date().optional(),
    qualityCheck: z.enum(['passed', 'failed', 'pending']).default('pending'),
    notes: z.string().optional(),
  })).min(1),
  receivedBy: z.string().uuid(), // User ID
  qualityApproved: z.boolean().default(false),
  qualityApprovedBy: z.string().uuid().optional(),
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type IngredientDelivery = z.infer<typeof IngredientDeliverySchema>;

// Inventory Usage Model (for order tracking)
export const InventoryUsageSchema = z.object({
  orderId: z.string().uuid(),
  dishId: z.string().uuid(),
  dishName: z.string().min(1),
  quantity: z.number().int().positive(),
  ingredients: z.array(z.object({
    inventoryItemId: z.string().uuid(),
    ingredientName: z.string().min(1),
    quantityUsed: z.number().positive(),
    unit: MeasurementUnitSchema,
    costPerUnit: z.number().min(0),
    totalCost: z.number().min(0),
    batchNumber: z.string().optional(),
  })),
  totalIngredientCost: z.number().min(0),
  usedAt: z.date(),
  recordedBy: z.string().uuid(), // User ID
});
export type InventoryUsage = z.infer<typeof InventoryUsageSchema>;

// Create Inventory Item Request Model
export const CreateInventoryItemRequestSchema = z.object({
  name: z.string().min(1),
  category: IngredientCategorySchema,
  unit: MeasurementUnitSchema,
  minimumStock: z.number().min(0),
  maximumStock: z.number().min(0),
  costPerUnit: z.number().min(0),
  supplier: z.string().min(1),
  supplierCode: z.string().optional(),
  barcode: z.string().optional(),
  storageLocation: z.string().optional(),
  storageTemperature: z.enum(['room', 'refrigerated', 'frozen']).optional(),
  initialStock: z.number().min(0).default(0),
  expirationDate: z.date().optional(),
  batchNumber: z.string().optional(),
});
export type CreateInventoryItemRequest = z.infer<typeof CreateInventoryItemRequestSchema>;

// Update Inventory Item Request Model
export const UpdateInventoryItemRequestSchema = CreateInventoryItemRequestSchema.partial();
export type UpdateInventoryItemRequest = z.infer<typeof UpdateInventoryItemRequestSchema>;

// Inventory Filters Model
export const InventoryFiltersSchema = z.object({
  category: z.array(IngredientCategorySchema).optional(),
  lowStock: z.boolean().optional(), // Show only items below minimum stock
  expiringSoon: z.boolean().optional(), // Show items expiring within 7 days
  outOfStock: z.boolean().optional(), // Show items with zero stock
  supplier: z.array(z.string()).optional(),
  search: z.string().optional(), // Search in name or supplier code
  sortBy: z.enum(['name', 'category', 'stock', 'expiration', 'cost']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});
export type InventoryFilters = z.infer<typeof InventoryFiltersSchema>;

// Inventory Validation Utilities
export class InventoryValidationUtils {
  static validateInventoryItem(item: unknown): { isValid: boolean; errors: string[] } {
    const result = InventoryItemSchema.safeParse(item);
    const errors: string[] = [];

    if (!result.success) {
      result.error.errors.forEach(e => {
        errors.push(`${e.path.join('.')}: ${e.message}`);
      });
    } else {
      const data = result.data;
      
      // Business logic validation
      if (data.minimumStock > data.maximumStock) {
        errors.push('Minimum stock cannot be greater than maximum stock');
      }

      if (data.currentStock < 0) {
        errors.push('Current stock cannot be negative');
      }

      if (data.expirationDate && data.expirationDate < new Date()) {
        errors.push('Expiration date cannot be in the past for new items');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static validateStockUpdate(update: unknown): { isValid: boolean; errors: string[] } {
    const result = InventoryUpdateSchema.safeParse(update);
    const errors: string[] = [];

    if (!result.success) {
      result.error.errors.forEach(e => {
        errors.push(`${e.path.join('.')}: ${e.message}`);
      });
    } else {
      const data = result.data;
      
      // Validate update types
      if (data.type === 'usage' && data.quantity > 0) {
        errors.push('Usage updates should have negative quantity');
      }

      if (data.type === 'delivery' && data.quantity <= 0) {
        errors.push('Delivery updates should have positive quantity');
      }

      if (data.type === 'waste' && data.quantity > 0) {
        errors.push('Waste updates should have negative quantity');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static calculateExpirationSeverity(expirationDate: Date): 'warning' | 'urgent' | 'expired' {
    const now = new Date();
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiration < 0) {
      return 'expired';
    } else if (daysUntilExpiration <= 1) {
      return 'urgent';
    } else if (daysUntilExpiration <= 7) {
      return 'warning';
    }
    
    return 'warning'; // Default for items expiring soon
  }

  static calculateStockAlertSeverity(currentStock: number, minimumStock: number): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = currentStock / minimumStock;

    if (currentStock === 0) {
      return 'critical';
    } else if (ratio <= 0.25) {
      return 'high';
    } else if (ratio <= 0.5) {
      return 'medium';
    } else {
      return 'low';
    }
  }
}

// Constants
export const INGREDIENT_CATEGORY_LABELS: Record<IngredientCategory, string> = {
  'protein': 'Protein',
  'vegetables': 'Vegetables',
  'fruits': 'Fruits',
  'dairy': 'Dairy',
  'grains': 'Grains',
  'spices': 'Spices',
  'condiments': 'Condiments',
  'beverages': 'Beverages',
  'frozen': 'Frozen',
  'canned': 'Canned',
  'oils': 'Oils & Fats',
  'herbs': 'Herbs',
  'nuts': 'Nuts & Seeds',
  'seafood': 'Seafood',
  'bakery': 'Bakery Items',
};

export const STORAGE_TEMPERATURE_LABELS = {
  'room': 'Room Temperature',
  'refrigerated': 'Refrigerated (2-8°C)',
  'frozen': 'Frozen (-18°C or below)',
} as const;