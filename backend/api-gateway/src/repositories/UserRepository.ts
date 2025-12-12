import { Pool } from 'pg';
import { User, UserSchema, BaseRepository } from '@foodtrack/backend-shared';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'foodtrack',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users');
  }

  async findById(id: string, tenantId?: string): Promise<User | null> {
    const query = tenantId 
      ? 'SELECT * FROM users WHERE id = $1 AND tenant_id = $2'
      : 'SELECT * FROM users WHERE id = $1';
    
    const values = tenantId ? [id, tenantId] : [id];
    const result = await pool.query(query, values);
    
    return result.rows[0] ? this.mapRowToUser(result.rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    
    return result.rows[0] ? this.mapRowToUser(result.rows[0]) : null;
  }

  async findAll(tenantId?: string): Promise<User[]> {
    const query = tenantId 
      ? 'SELECT * FROM users WHERE tenant_id = $1 ORDER BY created_at DESC'
      : 'SELECT * FROM users ORDER BY created_at DESC';
    
    const values = tenantId ? [tenantId] : [];
    const result = await pool.query(query, values);
    
    return result.rows.map(row => this.mapRowToUser(row));
  }

  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const query = `
      INSERT INTO users (tenant_id, email, password, name, role, avatar, permissions, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      data.tenantId,
      data.email,
      data.password,
      data.name,
      data.role,
      data.avatar || null,
      JSON.stringify(data.permissions),
      data.isActive ?? true,
    ];
    
    const result = await pool.query(query, values);
    return this.mapRowToUser(result.rows[0]);
  }

  async update(id: string, data: Partial<User>, tenantId?: string): Promise<User | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'createdAt') {
        const dbKey = this.camelToSnake(key);
        updates.push(`${dbKey} = $${paramIndex}`);
        values.push(key === 'permissions' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    });

    if (updates.length === 0) return null;

    updates.push(`updated_at = NOW()`);
    
    let query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
    values.push(id);
    
    if (tenantId) {
      paramIndex++;
      query += ` AND tenant_id = $${paramIndex}`;
      values.push(tenantId);
    }
    
    query += ' RETURNING *';
    
    const result = await pool.query(query, values);
    return result.rows[0] ? this.mapRowToUser(result.rows[0]) : null;
  }

  async delete(id: string, tenantId?: string): Promise<boolean> {
    const query = tenantId 
      ? 'DELETE FROM users WHERE id = $1 AND tenant_id = $2'
      : 'DELETE FROM users WHERE id = $1';
    
    const values = tenantId ? [id, tenantId] : [id];
    const result = await pool.query(query, values);
    
    return (result.rowCount ?? 0) > 0;
  }

  async updateLastLogin(id: string): Promise<void> {
    const query = 'UPDATE users SET last_login_at = NOW() WHERE id = $1';
    await pool.query(query, [id]);
  }

  private mapRowToUser(row: any): User {
    return UserSchema.parse({
      id: row.id,
      tenantId: row.tenant_id,
      email: row.email,
      password: row.password,
      name: row.name,
      role: row.role,
      avatar: row.avatar || undefined,
      permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions,
      isActive: row.is_active,
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}