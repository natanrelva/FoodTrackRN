import { Pool } from 'pg';
import { Product, ProductSchema, BaseRepository } from '@foodtrack/backend-shared';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'foodtrack',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

export class ProductRepository extends BaseRepository<Product> {
  constructor() {
    super('products');
  }

  async findById(id: string, tenantId?: string): Promise<Product | null> {
    const query = tenantId 
      ? 'SELECT * FROM products WHERE id = $1 AND tenant_id = $2'
      : 'SELECT * FROM products WHERE id = $1';
    
    const values = tenantId ? [id, tenantId] : [id];
    const result = await pool.query(query, values);
    
    return result.rows[0] ? this.mapRowToProduct(result.rows[0]) : null;
  }

  async findAll(tenantId?: string, filters: any = {}): Promise<Product[]> {
    let query = 'SELECT * FROM products';
    const values: any[] = [];
    const conditions: string[] = [];
    let paramIndex = 1;

    if (tenantId) {
      conditions.push(`tenant_id = $${paramIndex}`);
      values.push(tenantId);
      paramIndex++;
    }

    if (filters.category) {
      conditions.push(`category = $${paramIndex}`);
      values.push(filters.category);
      paramIndex++;
    }

    if (filters.active !== undefined) {
      conditions.push(`active = $${paramIndex}`);
      values.push(filters.active);
      paramIndex++;
    }

    if (filters.search) {
      conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY name ASC';
    
    const result = await pool.query(query, values);
    return result.rows.map(row => this.mapRowToProduct(row));
  }

  async create(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const query = `
      INSERT INTO products (tenant_id, name, description, price, image, category, stock, active, extras, tags, preparation_time)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const values = [
      data.tenantId,
      data.name,
      data.description,
      data.price,
      data.image,
      data.category,
      data.stock || 0,
      data.active ?? true,
      JSON.stringify(data.extras || []),
      JSON.stringify(data.tags || []),
      data.preparationTime || null,
    ];
    
    const result = await pool.query(query, values);
    return this.mapRowToProduct(result.rows[0]);
  }

  async update(id: string, data: Partial<Product>, tenantId?: string): Promise<Product | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'createdAt' && key !== 'tenantId') {
        const dbKey = this.camelToSnake(key);
        updates.push(`${dbKey} = $${paramIndex}`);
        
        if (key === 'extras' || key === 'tags') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
        paramIndex++;
      }
    });

    if (updates.length === 0) return null;

    updates.push(`updated_at = NOW()`);
    
    let query = `UPDATE products SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
    values.push(id);
    
    if (tenantId) {
      paramIndex++;
      query += ` AND tenant_id = $${paramIndex}`;
      values.push(tenantId);
    }
    
    query += ' RETURNING *';
    
    const result = await pool.query(query, values);
    return result.rows[0] ? this.mapRowToProduct(result.rows[0]) : null;
  }

  async delete(id: string, tenantId?: string): Promise<boolean> {
    const query = tenantId 
      ? 'DELETE FROM products WHERE id = $1 AND tenant_id = $2'
      : 'DELETE FROM products WHERE id = $1';
    
    const values = tenantId ? [id, tenantId] : [id];
    const result = await pool.query(query, values);
    
    return (result.rowCount ?? 0) > 0;
  }

  async findByCategory(category: string, tenantId: string): Promise<Product[]> {
    const query = 'SELECT * FROM products WHERE category = $1 AND tenant_id = $2 AND active = true ORDER BY name ASC';
    const result = await pool.query(query, [category, tenantId]);
    
    return result.rows.map(row => this.mapRowToProduct(row));
  }

  private mapRowToProduct(row: any): Product {
    return ProductSchema.parse({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      image: row.image,
      category: row.category,
      stock: row.stock,
      active: row.active,
      extras: typeof row.extras === 'string' ? JSON.parse(row.extras) : row.extras,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags,
      preparationTime: row.preparation_time,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}