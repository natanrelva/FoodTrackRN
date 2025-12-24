import { Pool, PoolClient } from 'pg';
import { DatabaseConnection, BaseRepository } from '@foodtrack/backend-shared';
import { 
  Product, 
  ProductSchema, 
  CreateProductRequest, 
  UpdateProductRequest, 
  ProductFilters 
} from '../models/Product';

export class ProductRepository extends BaseRepository<Product> {
  constructor() {
    super('products');
  }

  async findById(id: string, tenantId: string): Promise<Product | null> {
    const query = `
      SELECT 
        id,
        tenant_id as "tenantId",
        name,
        description,
        price,
        image,
        category,
        stock,
        active,
        extras,
        nutritional_info as "nutritionalInfo",
        tags,
        preparation_time as "preparationTime",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM products 
      WHERE id = $1 AND tenant_id = $2
    `;
    
    try {
      const result = await this.pool.query(query, [id, tenantId]);
      return result.rows[0] ? this.mapRowToProduct(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Failed to find product by id: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findAll(tenantId: string, filters: ProductFilters = {}): Promise<{ products: Product[]; total: number }> {
    const conditions: string[] = ['tenant_id = $1'];
    const values: any[] = [tenantId];
    let paramIndex = 2;

    // Build WHERE conditions
    if (filters.category) {
      conditions.push(`category = $${paramIndex++}`);
      values.push(filters.category);
    }

    if (filters.active !== undefined) {
      conditions.push(`active = $${paramIndex++}`);
      values.push(filters.active);
    }

    if (filters.search) {
      conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.minPrice) {
      conditions.push(`price >= $${paramIndex++}`);
      values.push(filters.minPrice);
    }

    if (filters.maxPrice) {
      conditions.push(`price <= $${paramIndex++}`);
      values.push(filters.maxPrice);
    }

    if (filters.tags && filters.tags.length > 0) {
      conditions.push(`tags ?| $${paramIndex++}`);
      values.push(filters.tags);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    
    // Count query
    const countQuery = `SELECT COUNT(*) FROM products ${whereClause}`;
    const countResult = await this.pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Main query with pagination
    const offset = ((filters.page || 1) - 1) * (filters.limit || 20);
    const query = `
      SELECT 
        id,
        tenant_id as "tenantId",
        name,
        description,
        price,
        image,
        category,
        stock,
        active,
        extras,
        nutritional_info as "nutritionalInfo",
        tags,
        preparation_time as "preparationTime",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM products 
      ${whereClause}
      ORDER BY name ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    
    values.push(filters.limit || 20, offset);

    try {
      const result = await this.pool.query(query, values);
      const products = result.rows.map(row => this.mapRowToProduct(row));
      return { products, total };
    } catch (error) {
      throw new Error(`Failed to find products: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async create(data: CreateProductRequest & { tenantId: string }): Promise<Product> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const query = `
        INSERT INTO products (
          tenant_id, name, description, price, image, category, stock, 
          active, extras, nutritional_info, tags, preparation_time
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING 
          id,
          tenant_id as "tenantId",
          name,
          description,
          price,
          image,
          category,
          stock,
          active,
          extras,
          nutritional_info as "nutritionalInfo",
          tags,
          preparation_time as "preparationTime",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;
      
      const values = [
        data.tenantId,
        data.name,
        data.description || null,
        data.price,
        data.image,
        data.category,
        data.stock || 0,
        data.active !== undefined ? data.active : true,
        JSON.stringify(data.extras || []),
        data.nutritionalInfo ? JSON.stringify(data.nutritionalInfo) : null,
        JSON.stringify(data.tags || []),
        data.preparationTime || null,
      ];
      
      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      return this.mapRowToProduct(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  async update(id: string, data: UpdateProductRequest, tenantId: string): Promise<Product | null> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Build dynamic update query
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbKey = this.camelToSnake(key);
          updateFields.push(`${dbKey} = $${paramIndex++}`);
          
          if (key === 'extras' || key === 'nutritionalInfo' || key === 'tags') {
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
        UPDATE products 
        SET ${updateFields.join(', ')} 
        WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++}
        RETURNING 
          id,
          tenant_id as "tenantId",
          name,
          description,
          price,
          image,
          category,
          stock,
          active,
          extras,
          nutritional_info as "nutritionalInfo",
          tags,
          preparation_time as "preparationTime",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;
      
      values.push(id, tenantId);
      
      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      return result.rows[0] ? this.mapRowToProduct(result.rows[0]) : null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to update product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    // Soft delete by setting active to false
    const query = `
      UPDATE products 
      SET active = false, updated_at = NOW() 
      WHERE id = $1 AND tenant_id = $2
    `;
    
    try {
      const result = await this.pool.query(query, [id, tenantId]);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      throw new Error(`Failed to delete product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateAvailability(id: string, active: boolean, tenantId: string): Promise<Product | null> {
    const query = `
      UPDATE products 
      SET active = $1, updated_at = NOW() 
      WHERE id = $2 AND tenant_id = $3
      RETURNING 
        id,
        tenant_id as "tenantId",
        name,
        description,
        price,
        image,
        category,
        stock,
        active,
        extras,
        nutritional_info as "nutritionalInfo",
        tags,
        preparation_time as "preparationTime",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;
    
    try {
      const result = await this.pool.query(query, [active, id, tenantId]);
      return result.rows[0] ? this.mapRowToProduct(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Failed to update product availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByCategory(category: string, tenantId: string): Promise<Product[]> {
    const query = `
      SELECT 
        id,
        tenant_id as "tenantId",
        name,
        description,
        price,
        image,
        category,
        stock,
        active,
        extras,
        nutritional_info as "nutritionalInfo",
        tags,
        preparation_time as "preparationTime",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM products 
      WHERE category = $1 AND tenant_id = $2 AND active = true
      ORDER BY name ASC
    `;
    
    try {
      const result = await this.pool.query(query, [category, tenantId]);
      return result.rows.map(row => this.mapRowToProduct(row));
    } catch (error) {
      throw new Error(`Failed to find products by category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCategories(tenantId: string): Promise<string[]> {
    const query = `
      SELECT DISTINCT category 
      FROM products 
      WHERE tenant_id = $1 AND active = true
      ORDER BY category ASC
    `;
    
    try {
      const result = await this.pool.query(query, [tenantId]);
      return result.rows.map(row => row.category);
    } catch (error) {
      throw new Error(`Failed to get categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper methods
  private mapRowToProduct(row: any): Product {
    return ProductSchema.parse({
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      image: row.image,
      category: row.category,
      stock: row.stock,
      active: row.active,
      extras: typeof row.extras === 'string' ? JSON.parse(row.extras) : row.extras || [],
      nutritionalInfo: row.nutritionalInfo ? 
        (typeof row.nutritionalInfo === 'string' ? JSON.parse(row.nutritionalInfo) : row.nutritionalInfo) : 
        undefined,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags || [],
      preparationTime: row.preparationTime,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}