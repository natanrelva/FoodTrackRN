import { Pool } from 'pg';
import { Customer, CustomerSchema } from '@foodtrack/backend-shared';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'foodtrack',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

export class CustomerRepository {
  async findById(id: string, tenantId: string): Promise<Customer | null> {
    const query = 'SELECT * FROM customers WHERE id = $1 AND tenant_id = $2';
    
    try {
      const result = await pool.query(query, [id, tenantId]);
      return result.rows[0] ? this.mapRowToCustomer(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Failed to find customer by id: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByPhone(phone: string, tenantId: string): Promise<Customer | null> {
    const query = 'SELECT * FROM customers WHERE phone = $1 AND tenant_id = $2';
    
    try {
      const result = await pool.query(query, [phone, tenantId]);
      return result.rows[0] ? this.mapRowToCustomer(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Failed to find customer by phone: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByEmail(email: string, tenantId: string): Promise<Customer | null> {
    const query = 'SELECT * FROM customers WHERE email = $1 AND tenant_id = $2';
    
    try {
      const result = await pool.query(query, [email, tenantId]);
      return result.rows[0] ? this.mapRowToCustomer(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Failed to find customer by email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async create(customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    const query = `
      INSERT INTO customers (
        tenant_id, name, email, phone, address, preferences
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      customerData.tenantId,
      customerData.name,
      customerData.email || null,
      customerData.phone,
      JSON.stringify(customerData.address),
      JSON.stringify(customerData.preferences),
    ];
    
    try {
      const result = await pool.query(query, values);
      return this.mapRowToCustomer(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to create customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(id: string, updates: Partial<Customer>, tenantId: string): Promise<Customer | null> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'createdAt' && key !== 'tenantId') {
        const dbKey = this.camelToSnake(key);
        updateFields.push(`${dbKey} = $${paramIndex}`);
        
        if (key === 'address' || key === 'preferences') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      return null;
    }

    updateFields.push(`updated_at = NOW()`);
    
    const query = `
      UPDATE customers 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
      RETURNING *
    `;
    
    values.push(id, tenantId);
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0] ? this.mapRowToCustomer(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Failed to update customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private mapRowToCustomer(row: any): Customer {
    return CustomerSchema.parse({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      email: row.email || undefined,
      phone: row.phone,
      address: typeof row.address === 'string' ? JSON.parse(row.address) : row.address,
      preferences: typeof row.preferences === 'string' ? JSON.parse(row.preferences) : row.preferences,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}