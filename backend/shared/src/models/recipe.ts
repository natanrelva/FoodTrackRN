import { z } from 'zod';

// Measurement Unit enum
export const MeasurementUnitSchema = z.enum([
  'g',      // grams
  'kg',     // kilograms
  'ml',     // milliliters
  'l',      // liters
  'cups',   // cups
  'tbsp',   // tablespoons
  'tsp',    // teaspoons
  'pcs',    // pieces
  'oz',     // ounces
  'lbs'     // pounds
]);
export type MeasurementUnit = z.infer<typeof MeasurementUnitSchema>;

// Difficulty Level enum
export const DifficultyLevelSchema = z.enum(['easy', 'medium', 'hard', 'expert']);
export type DifficultyLevel = z.infer<typeof DifficultyLevelSchema>;

// Allergen Model
export const AllergenSchema = z.object({
  type: z.string().min(1),
  severity: z.enum(['mild', 'moderate', 'severe']),
});
export type Allergen = z.infer<typeof AllergenSchema>;

// Nutritional Info Model
export const NutritionalInfoSchema = z.object({
  calories: z.number().min(0),
  protein: z.number().min(0), // grams
  carbs: z.number().min(0),   // grams
  fat: z.number().min(0),     // grams
  fiber: z.number().min(0).optional(), // grams
  sodium: z.number().min(0).optional(), // mg
});
export type NutritionalInfo = z.infer<typeof NutritionalInfoSchema>;

// Ingredient Substitute Model
export const IngredientSubstituteSchema = z.object({
  ingredientId: z.string().uuid(),
  name: z.string().min(1),
  ratio: z.number().positive(), // substitution ratio (e.g., 1.5 means use 1.5x amount)
  notes: z.string().optional(),
});
export type IngredientSubstitute = z.infer<typeof IngredientSubstituteSchema>;

// Recipe Ingredient Model
export const RecipeIngredientSchema = z.object({
  ingredientId: z.string().uuid(),
  name: z.string().min(1),
  quantity: z.number().positive(),
  unit: MeasurementUnitSchema,
  isOptional: z.boolean().default(false),
  substitutes: z.array(IngredientSubstituteSchema).default([]),
});
export type RecipeIngredient = z.infer<typeof RecipeIngredientSchema>;

// Recipe Step Model
export const RecipeStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  instruction: z.string().min(1),
  duration: z.number().int().positive().optional(), // minutes
  temperature: z.number().optional(), // celsius
  equipment: z.array(z.string()).default([]),
  notes: z.string().optional(),
});
export type RecipeStep = z.infer<typeof RecipeStepSchema>;

// Temperature Range Model
export const TemperatureRangeSchema = z.object({
  min: z.number(),
  max: z.number(),
  unit: z.enum(['celsius', 'fahrenheit']).default('celsius'),
});
export type TemperatureRange = z.infer<typeof TemperatureRangeSchema>;

// Quality Criteria Model
export const QualityCriteriaSchema = z.object({
  aspect: z.string().min(1), // e.g., "color", "texture", "temperature"
  requirement: z.string().min(1), // e.g., "golden brown", "crispy exterior"
  tolerance: z.string().optional(), // e.g., "±2°C", "slight variation acceptable"
});
export type QualityCriteria = z.infer<typeof QualityCriteriaSchema>;

// Common Issue Model
export const CommonIssueSchema = z.object({
  issue: z.string().min(1),
  solution: z.string().min(1),
  prevention: z.string().min(1),
});
export type CommonIssue = z.infer<typeof CommonIssueSchema>;

// Quality Standard Model
export const QualityStandardSchema = z.object({
  id: z.string().uuid(),
  dishId: z.string().uuid(),
  criteria: z.array(QualityCriteriaSchema).default([]),
  visualReference: z.string().url().optional(), // URL to reference image
  temperatureRequirements: TemperatureRangeSchema.optional(),
  presentationGuidelines: z.string().default(''),
  commonIssues: z.array(CommonIssueSchema).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type QualityStandard = z.infer<typeof QualityStandardSchema>;

// Recipe Model
export const RecipeSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  dishId: z.string().uuid(), // References Product.id
  name: z.string().min(1),
  description: z.string().default(''),
  ingredients: z.array(RecipeIngredientSchema).min(1),
  instructions: z.array(RecipeStepSchema).min(1),
  preparationTime: z.number().int().positive(), // minutes
  cookingTime: z.number().int().positive(), // minutes
  difficulty: DifficultyLevelSchema.default('medium'),
  allergens: z.array(AllergenSchema).default([]),
  nutritionalInfo: NutritionalInfoSchema.optional(),
  qualityStandards: z.array(QualityStandardSchema).default([]),
  servings: z.number().int().positive().default(1),
  tags: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Recipe = z.infer<typeof RecipeSchema>;

// Recipe Instructions Model (for display)
export const RecipeInstructionsSchema = z.object({
  recipeId: z.string().uuid(),
  dishName: z.string().min(1),
  totalTime: z.number().int().positive(), // prep + cook time
  difficulty: DifficultyLevelSchema,
  ingredients: z.array(RecipeIngredientSchema),
  steps: z.array(RecipeStepSchema),
  modifications: z.array(z.string()).default([]), // Applied modifications
  allergenWarnings: z.array(AllergenSchema).default([]),
  qualityCheckpoints: z.array(QualityStandardSchema).default([]),
});
export type RecipeInstructions = z.infer<typeof RecipeInstructionsSchema>;

// Create Recipe Request Model
export const CreateRecipeRequestSchema = z.object({
  dishId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  ingredients: z.array(RecipeIngredientSchema.omit({ ingredientId: true }).extend({
    ingredientName: z.string().min(1), // Will be resolved to ingredientId
  })).min(1),
  instructions: z.array(RecipeStepSchema).min(1),
  preparationTime: z.number().int().positive(),
  cookingTime: z.number().int().positive(),
  difficulty: DifficultyLevelSchema.optional(),
  allergens: z.array(AllergenSchema).optional(),
  nutritionalInfo: NutritionalInfoSchema.optional(),
  servings: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
});
export type CreateRecipeRequest = z.infer<typeof CreateRecipeRequestSchema>;

// Recipe Update Model
export const RecipeUpdateSchema = CreateRecipeRequestSchema.partial();
export type RecipeUpdate = z.infer<typeof RecipeUpdateSchema>;

// Recipe Validation Result Model
export const RecipeValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});
export type RecipeValidationResult = z.infer<typeof RecipeValidationResultSchema>;

// Recipe Modification Validation Model
export const ModificationValidationSchema = z.object({
  modification: z.string().min(1),
  isValid: z.boolean(),
  affectedIngredients: z.array(z.string()).default([]),
  affectedSteps: z.array(z.number().int().positive()).default([]),
  warnings: z.array(z.string()).default([]),
});
export type ModificationValidation = z.infer<typeof ModificationValidationSchema>;

// Ingredient List Model (for requirements calculation)
export const IngredientListSchema = z.object({
  dishId: z.string().uuid(),
  quantity: z.number().int().positive(),
  ingredients: z.array(z.object({
    ingredientId: z.string().uuid(),
    name: z.string().min(1),
    totalQuantity: z.number().positive(),
    unit: MeasurementUnitSchema,
    isOptional: z.boolean(),
  })),
  totalPreparationTime: z.number().int().positive(),
  allergens: z.array(AllergenSchema),
});
export type IngredientList = z.infer<typeof IngredientListSchema>;

// Recipe Validation Utilities
export class RecipeValidationUtils {
  static validateRecipe(recipe: unknown): RecipeValidationResult {
    const result = RecipeSchema.safeParse(recipe);
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!result.success) {
      result.error.errors.forEach(e => {
        errors.push(`${e.path.join('.')}: ${e.message}`);
      });
    } else {
      // Additional business logic validation
      const data = result.data;
      
      // Check if total time is reasonable
      const totalTime = data.preparationTime + data.cookingTime;
      if (totalTime > 480) { // 8 hours
        warnings.push('Total preparation and cooking time exceeds 8 hours');
      }

      // Check for duplicate ingredients
      const ingredientIds = data.ingredients.map(i => i.ingredientId);
      const duplicates = ingredientIds.filter((id, index) => ingredientIds.indexOf(id) !== index);
      if (duplicates.length > 0) {
        errors.push('Recipe contains duplicate ingredients');
      }

      // Check step numbering
      const stepNumbers = data.instructions.map(s => s.stepNumber).sort((a, b) => a - b);
      for (let i = 0; i < stepNumbers.length; i++) {
        if (stepNumbers[i] !== i + 1) {
          errors.push('Recipe steps must be numbered consecutively starting from 1');
          break;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static validateModifications(dishId: string, modifications: string[]): ModificationValidation[] {
    // This would typically involve more complex logic to validate modifications
    // For now, return basic validation
    return modifications.map(modification => ({
      modification,
      isValid: modification.length > 0,
      affectedIngredients: [],
      affectedSteps: [],
      warnings: modification.length > 100 ? ['Modification description is very long'] : [],
    }));
  }

  static calculateIngredientRequirements(recipe: Recipe, quantity: number): IngredientList {
    const ingredients = recipe.ingredients.map(ingredient => ({
      ingredientId: ingredient.ingredientId,
      name: ingredient.name,
      totalQuantity: ingredient.quantity * quantity,
      unit: ingredient.unit,
      isOptional: ingredient.isOptional,
    }));

    return {
      dishId: recipe.dishId,
      quantity,
      ingredients,
      totalPreparationTime: recipe.preparationTime + recipe.cookingTime,
      allergens: recipe.allergens,
    };
  }
}

// Constants
export const MEASUREMENT_UNIT_LABELS: Record<MeasurementUnit, string> = {
  'g': 'Grams',
  'kg': 'Kilograms',
  'ml': 'Milliliters',
  'l': 'Liters',
  'cups': 'Cups',
  'tbsp': 'Tablespoons',
  'tsp': 'Teaspoons',
  'pcs': 'Pieces',
  'oz': 'Ounces',
  'lbs': 'Pounds',
};

export const DIFFICULTY_LEVEL_LABELS: Record<DifficultyLevel, string> = {
  'easy': 'Easy',
  'medium': 'Medium',
  'hard': 'Hard',
  'expert': 'Expert',
};