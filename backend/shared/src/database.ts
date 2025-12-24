import { Pool, PoolConfig } from 'pg';

export class DatabaseConnection {
  private static instance: Pool;

  static getInstance(): Pool {
    if (!this.instance) {
      const config: PoolConfig = {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        database: process.env.DATABASE_NAME || 'foodtrack_dev',
        user: process.env.DATABASE_USER || 'foodtrack',
        password: process.env.DATABASE_PASSWORD || 'foodtrack123',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      };

      this.instance = new Pool(config);

      this.instance.on('error', (err) => {
        console.error('Unexpected error on idle client', err);
        process.exit(-1);
      });
    }

    return this.instance;
  }

  static async testConnection(): Promise<boolean> {
    try {
      const pool = this.getInstance();
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  static async close(): Promise<void> {
    if (this.instance) {
      await this.instance.end();
    }
  }
}

export abstract class BaseRepository<T> {
  protected pool: Pool;
  protected tableName: string;

  constructor(tableName: string) {
    this.pool = DatabaseConnection.getInstance();
    this.tableName = tableName;
  }

  abstract findById(id: string, tenantId?: string): Promise<T | null>;
  abstract findAll(tenantId?: string, filters?: any): Promise<T[]>;
  abstract create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  abstract update(id: string, data: Partial<T>, tenantId?: string): Promise<T | null>;
  abstract delete(id: string, tenantId?: string): Promise<boolean>;

  protected buildWhereClause(filters: Record<string, any>, startIndex = 1): { clause: string; values: any[] } {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = startIndex;

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        conditions.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    return {
      clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      values,
    };
  }
}