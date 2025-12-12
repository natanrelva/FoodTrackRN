import { Pool, PoolClient } from 'pg';
import { 
  Recipe, 
  RecipeSchema,
  RecipeInstructions,
  RecipeInstructionsSchema,
  CreateRecipeRequest,
  RecipeUpdate,
  RecipeValidationResult,
  ModificationValidation,
  IngredientList,
  RecipeValidationUtils
} from '@foodtrack/backend-shared';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'foodtrack',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

export interface RecipeFilters {
  dishId?: string;
  difficulty?: string[];
  preparationTimeMax?: number;
  allergens?: string[];
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export class RecipeRepository {
  private tableName = 'recipes';

  async findById(id: string, tenantId: string): Promise<Recipe | null> {
    const query = `
      SELECT r.*, p.name as dish_name
      FROM recipes r
      LEFT JOIN products p ON r.dish_id = p.id
      WHERE r.id = $1 AND r.tenant_id = $2
    `;
    
    try {
      const result = await pool.query(query, [id, tenantId]);
      return result.rows[0] ? this.mapRowToRecipe(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Failed to find recipe by id: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByDishId(dishId: string, tenantId: string): Promise<Recipe | null> {
    const query = `
      SELECT r.*, p.name as dish_name
      FROM recipes r
      LEFT JOIN products p ON r.dish_id = p.id
      WHERE r.dish_id = $1 AND r.tenant_id = $2 AND r.is_active = true
    `;
    
    try {
      const result = await pool.query(query, [dishId, tenantId]);
      return result.rows[0] ? this.mapRowToRecipe(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Failed to find recipe by dish id: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findAll(tenantId: string, filters: RecipeFilters = {}): Promise<Recipe[]> {
    const conditions: string[] = ['r.tenant_id = $1'];
    const values: any[] = [tenantId];
    let paramIndex = 2;

    // Dish ID filter
    if (filters.dishId) {
      conditions.push(`r.dish_id = $${paramIndex++}`);
      values.push(filters.dishId);
    }

    // Difficulty filter
    if (filters.difficulty && filters.difficulty.length > 0) {
      const difficultyPlaceholders = filters.difficulty.map(() => `$${paramIndex++}`).join(', ');
      conditions.push(`r.difficulty IN (${difficultyPlaceholders})`);
      values.push(...filters.difficulty);
    }

    // Preparation time filter
    if (filters.preparationTimeMax) {
      conditions.push(`(r.preparation_time + r.cooking_time) <= $${paramIndex++}`);
      values.push(filters.preparationTimeMax);
    }

    // Active filter
    if (filters.isActive !== undefined) {
      conditions.push(`r.is_active = $${paramIndex++}`);
      values.push(filters.isActive);
    }

    // Search filter
    if (filters.search) {
      conditions.push(`(r.name ILIKE $${paramIndex} OR r.description ILIKE $${paramIndex} OR p.name ILIKE $${paramIndex})`);
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Allergen filter (exclude recipes with specified allergens)
    if (filters.allergens && filters.allergens.length > 0) {
      const allergenConditions = filters.allergens.map(() => `NOT (r.allergens::jsonb @> jsonb_build_array(jsonb_build_object('type', $${paramIndex++})))`);
      conditions.push(`(${allergenConditions.join(' AND ')})`);
      values.push(...filters.allergens);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    
    const query = `
      SELECT r.*, p.name as dish_name
      FROM recipes r
      LEFT JOIN products p ON r.dish_id = p.id
      ${whereClause}
      ORDER BY r.name ASC
    `;

    try {
      const result = await pool.query(query, values);
      return result.rows.map(row => this.mapRowToRecipe(row));
    } catch (error) {
      throw new Error(`Failed to find recipes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async create(recipeData: CreateRecipeRequest, tenantId: string): Promise<Recipe> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Validate the recipe data
      const validation = RecipeValidationUtils.validateRecipe({
        ...recipeData,
        id: 'temp-id',
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      if (!validation.isValid) {
        throw new Error(`Recipe validation failed: ${validation.errors.join(', ')}`);
      }
      
      const query = `
        INSERT INTO recipes (
          tenant_id, dish_id, name, description, ingredients, instructions,
          preparation_time, cooking_time, difficulty, allergens, nutritional_info,
          quality_standards, servings, tags, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `;
      
      const values = [
        tenantId,
        recipeData.dishId,
        recipeData.name,
        recipeData.description || '',
        JSON.stringify(recipeData.ingredients),
        JSON.stringify(recipeData.instructions),
        recipeData.preparationTime,
        recipeData.cookingTime,
        recipeData.difficulty || 'medium',
        JSON.stringify(recipeData.allergens || []),
        JSON.stringify(recipeData.nutritionalInfo || null),
        JSON.stringify([]), // quality_standards - empty for now
        recipeData.servings || 1,
        JSON.stringify(recipeData.tags || []),
        true, // is_active
      ];
      
      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      return this.mapRowToRecipe(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to create recipe: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  async update(id: string, updates: RecipeUpdate, tenantId: string): Promise<Recipe | null> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Build dynamic update query
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'dishId') { // Don't allow changing dishId
          const dbKey = this.camelToSnake(key);
          updateFields.push(`${dbKey} = $${paramIndex++}`);
          
          if (key === 'ingredients' || key === 'instructions' || key === 'allergens' || key === 'nutritionalInfo' || key === 'tags') {
            values.push(JSON.stringify(value));
          } else {
            values.push(value);
          }
        }
      });

      if (updateFields.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      updateFields.push(`updated_at = NOW()`);
      
      const query = `
        UPDATE recipes 
        SET ${updateFields.join(', ')} 
        WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++}
        RETURNING *
      `;
      
      values.push(id, tenantId);
      
      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      return result.rows[0] ? this.mapRowToRecipe(result.rows[0]) : null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to update recipe: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    // Soft delete by setting is_active to false
    const query = 'UPDATE recipes SET is_active = false, updated_at = NOW() WHERE id = $1 AND tenant_id = $2';
    
    try {
      const result = await pool.query(query, [id, tenantId]);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      throw new Error(`Failed to delete recipe: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getRecipeInstructions(dishId: string, modifications: string[] = [], tenantId: string): Promise<RecipeInstructions | null> {
    const recipe = await this.findByDishId(dishId, tenantId);
    
    if (!recipe) {
      return null;
    }

    // Apply modifications to the recipe instructions
    const modifiedInstructions = this.applyModifications(recipe, modifications);

    return RecipeInstructionsSchema.parse({
      recipeId: recipe.id,
      dishName: recipe.name,
      totalTime: recipe.preparationTime + recipe.cookingTime,
      difficulty: recipe.difficulty,
      ingredients: modifiedInstructions.ingredients,
      steps: modifiedInstructions.steps,
      modifications,
      allergenWarnings: recipe.allergens,
      qualityCheckpoints: recipe.qualityStandards,
    });
  }

  async validateRecipeModifications(dishId: string, modifications: string[], tenantId: string): Promise<ModificationValidation[]> {
    const recipe = await this.findByDishId(dishId, tenantId);
    
    if (!recipe) {
      throw new Error('Recipe not found');
    }

    return RecipeValidationUtils.validateModifications(dishId, modifications);
  }

  async getIngredientRequirements(dishId: string, quantity: number, tenantId: string): Promise<IngredientList | null> {
    const recipe = await this.findByDishId(dishId, tenantId);
    
    if (!recipe) {
      return null;
    }

    return RecipeValidationUtils.calculateIngredientRequirements(recipe, quantity);
  }

  // Helper methods
  private mapRowToRecipe(row: any): Recipe {
    return RecipeSchema.parse({
      id: row.id,
      tenantId: row.tenant_id,
      dishId: row.dish_id,
      name: row.name,
      description: row.description || '',
      ingredients: typeof row.ingredients === 'string' ? JSON.parse(row.ingredients) : row.ingredients,
      instructions: typeof row.instructions === 'string' ? JSON.parse(row.instructions) : row.instructions,
      preparationTime: row.preparation_time,
      cookingTime: row.cooking_time,
      difficulty: row.difficulty,
      allergens: typeof row.allergens === 'string' ? JSON.parse(row.allergens) : row.allergens || [],
      nutritionalInfo: row.nutritional_info ? (typeof row.nutritional_info === 'string' ? JSON.parse(row.nutritional_info) : row.nutritional_info) : undefined,
      qualityStandards: typeof row.quality_standards === 'string' ? JSON.parse(row.quality_standards) : row.quality_standards || [],
      servings: row.servings,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags || [],
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  private applyModifications(recipe: Recipe, modifications: string[]): { ingredients: any[], steps: any[] } {
    // This is a simplified implementation
    // In a real system, this would involve complex logic to modify ingredients and steps
    let modifiedIngredients = [...recipe.ingredients];
    let modifiedSteps = [...recipe.instructions];

    modifications.forEach(modification => {
      const lowerMod = modification.toLowerCase();
      
      // Handle common modifications
      if (lowerMod.includes('no') || lowerMod.includes('without')) {
        // Remove ingredients or modify steps
        const ingredientToRemove = this.extractIngredientFromModification(lowerMod);
        if (ingredientToRemove) {
          modifiedIngredients = modifiedIngredients.filter(ing => 
            !ing.name.toLowerCase().includes(ingredientToRemove)
          );
        }
      } else if (lowerMod.includes('extra') || lowerMod.includes('add')) {
        // Add note to steps about extra ingredients
        modifiedSteps = modifiedSteps.map(step => ({
          ...step,
          notes: step.notes ? `${step.notes}. ${modification}` : modification
        }));
      }
    });

    return {
      ingredients: modifiedIngredients,
      steps: modifiedSteps
    };
  }

  private extractIngredientFromModification(modification: string): string | null {
    // Simple extraction logic - in reality this would be more sophisticated
    const commonIngredients = ['onion', 'garlic', 'cheese', 'tomato', 'pepper', 'salt', 'oil'];
    
    for (const ingredient of commonIngredients) {
      if (modification.includes(ingredient)) {
        return ingredient;
      }
    }
    
    return null;
  }
}