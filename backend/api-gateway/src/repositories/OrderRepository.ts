import { Pool, PoolClient } from 'pg';
import { 
  Order, 
  OrderSchema, 
  CreateOrderRequest,
  OrderFilters, 
  PaginatedOrders,
  OrderStatus,
  ChannelType,
  OrderMetrics
} from '@foodtrack/backend-shared';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'foodtrack',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface ChannelMetrics {
  channel: ChannelType;
  orderCount: number;
  revenue: number;
  averageTicket: number;
}

export class OrderRepository {
  private tableName = 'orders';

  async findById(id: string, tenantId: string): Promise<Order | null> {
    const query = `
      SELECT o.*, 
             c.name as customer_name, 
             c.email as customer_email, 
             c.phone as customer_phone
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = $1 AND o.tenant_id = $2
    `;
    
    try {
      const result = await pool.query(query, [id, tenantId]);
      return result.rows[0] ? this.mapRowToOrder(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Failed to find order by id: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findAll(tenantId: string, filters: Partial<OrderFilters> = {}): Promise<PaginatedOrders> {
    // Set default values for required fields
    const normalizedFilters: OrderFilters = {
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
      ...filters,
    };
    const { query, countQuery, values } = this.buildFilteredQuery(tenantId, normalizedFilters);
    
    try {
      // Get total count
      const countResult = await pool.query(countQuery, values.slice(0, -2)); // Remove LIMIT and OFFSET params
      const total = parseInt(countResult.rows[0].count);
      
      // Get paginated results
      const result = await pool.query(query, values);
      const orders = result.rows.map(row => this.mapRowToOrder(row));
      
      const pages = Math.ceil(total / normalizedFilters.limit);
      
      return {
        orders,
        pagination: {
          page: normalizedFilters.page,
          limit: normalizedFilters.limit,
          total,
          pages,
        },
      };
    } catch (error) {
      throw new Error(`Failed to find orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async create(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const query = `
        INSERT INTO orders (
          tenant_id, number, customer_id, items, status, channel, 
          payment, delivery, subtotal, delivery_fee, discount, total, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      
      const values = [
        orderData.tenantId,
        orderData.number,
        orderData.customerId,
        JSON.stringify(orderData.items),
        orderData.status,
        orderData.channel,
        JSON.stringify(orderData.payment),
        JSON.stringify(orderData.delivery),
        orderData.subtotal,
        orderData.deliveryFee,
        orderData.discount,
        orderData.total,
        orderData.notes || null,
      ];
      
      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      return this.mapRowToOrder(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  async update(id: string, updates: Partial<Order>, tenantId: string): Promise<Order | null> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Build dynamic update query
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id' && key !== 'createdAt' && key !== 'tenantId') {
          const dbKey = this.camelToSnake(key);
          updateFields.push(`${dbKey} = $${paramIndex}`);
          
          if (key === 'items' || key === 'payment' || key === 'delivery') {
            values.push(JSON.stringify(value));
          } else {
            values.push(value);
          }
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      updateFields.push(`updated_at = NOW()`);
      
      const query = `
        UPDATE orders 
        SET ${updateFields.join(', ')} 
        WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
        RETURNING *
      `;
      
      values.push(id, tenantId);
      
      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      return result.rows[0] ? this.mapRowToOrder(result.rows[0]) : null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to update order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const query = 'DELETE FROM orders WHERE id = $1 AND tenant_id = $2';
    
    try {
      const result = await pool.query(query, [id, tenantId]);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      throw new Error(`Failed to delete order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Business-specific queries
  async findByStatus(status: OrderStatus, tenantId: string): Promise<Order[]> {
    const query = `
      SELECT o.*, 
             c.name as customer_name, 
             c.email as customer_email, 
             c.phone as customer_phone
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.status = $1 AND o.tenant_id = $2
      ORDER BY o.created_at DESC
    `;
    
    try {
      const result = await pool.query(query, [status, tenantId]);
      return result.rows.map(row => this.mapRowToOrder(row));
    } catch (error) {
      throw new Error(`Failed to find orders by status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByChannel(channel: ChannelType, tenantId: string): Promise<Order[]> {
    const query = `
      SELECT o.*, 
             c.name as customer_name, 
             c.email as customer_email, 
             c.phone as customer_phone
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.channel = $1 AND o.tenant_id = $2
      ORDER BY o.created_at DESC
    `;
    
    try {
      const result = await pool.query(query, [channel, tenantId]);
      return result.rows.map(row => this.mapRowToOrder(row));
    } catch (error) {
      throw new Error(`Failed to find orders by channel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByDateRange(startDate: Date, endDate: Date, tenantId: string): Promise<Order[]> {
    const query = `
      SELECT o.*, 
             c.name as customer_name, 
             c.email as customer_email, 
             c.phone as customer_phone
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.created_at >= $1 AND o.created_at <= $2 AND o.tenant_id = $3
      ORDER BY o.created_at DESC
    `;
    
    try {
      const result = await pool.query(query, [startDate, endDate, tenantId]);
      return result.rows.map(row => this.mapRowToOrder(row));
    } catch (error) {
      throw new Error(`Failed to find orders by date range: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findDelayedOrders(tenantId: string): Promise<Order[]> {
    // Orders that are preparing for more than 30 minutes or ready for more than 15 minutes
    const query = `
      SELECT o.*, 
             c.name as customer_name, 
             c.email as customer_email, 
             c.phone as customer_phone
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.tenant_id = $1 
        AND (
          (o.status = 'preparing' AND o.updated_at < NOW() - INTERVAL '30 minutes')
          OR (o.status = 'ready' AND o.updated_at < NOW() - INTERVAL '15 minutes')
        )
      ORDER BY o.updated_at ASC
    `;
    
    try {
      const result = await pool.query(query, [tenantId]);
      return result.rows.map(row => this.mapRowToOrder(row));
    } catch (error) {
      throw new Error(`Failed to find delayed orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Analytics queries
  async getOrderMetrics(tenantId: string, dateRange?: DateRange): Promise<OrderMetrics> {
    let whereClause = 'WHERE tenant_id = $1';
    const values: any[] = [tenantId];
    
    if (dateRange) {
      whereClause += ' AND created_at >= $2 AND created_at <= $3';
      values.push(dateRange.startDate, dateRange.endDate);
    }
    
    const query = `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(AVG(total), 0) as average_ticket,
        COUNT(CASE WHEN (
          (status = 'preparing' AND updated_at < NOW() - INTERVAL '30 minutes')
          OR (status = 'ready' AND updated_at < NOW() - INTERVAL '15 minutes')
        ) THEN 1 END) as delayed_orders,
        json_object_agg(status, status_count) as orders_by_status,
        json_object_agg(channel, channel_count) as orders_by_channel
      FROM (
        SELECT 
          status, channel, total, updated_at,
          COUNT(*) OVER (PARTITION BY status) as status_count,
          COUNT(*) OVER (PARTITION BY channel) as channel_count
        FROM orders 
        ${whereClause}
      ) subquery
    `;
    
    try {
      const result = await pool.query(query, values);
      const row = result.rows[0];
      
      return {
        totalOrders: parseInt(row.total_orders),
        totalRevenue: parseFloat(row.total_revenue),
        averageTicket: parseFloat(row.average_ticket),
        delayedOrders: parseInt(row.delayed_orders),
        ordersByStatus: row.orders_by_status || {},
        ordersByChannel: row.orders_by_channel || {},
      };
    } catch (error) {
      throw new Error(`Failed to get order metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getChannelPerformance(tenantId: string, dateRange?: DateRange): Promise<ChannelMetrics[]> {
    let whereClause = 'WHERE tenant_id = $1';
    const values: any[] = [tenantId];
    
    if (dateRange) {
      whereClause += ' AND created_at >= $2 AND created_at <= $3';
      values.push(dateRange.startDate, dateRange.endDate);
    }
    
    const query = `
      SELECT 
        channel,
        COUNT(*) as order_count,
        COALESCE(SUM(total), 0) as revenue,
        COALESCE(AVG(total), 0) as average_ticket
      FROM orders 
      ${whereClause}
      GROUP BY channel
      ORDER BY revenue DESC
    `;
    
    try {
      const result = await pool.query(query, values);
      return result.rows.map(row => ({
        channel: row.channel as ChannelType,
        orderCount: parseInt(row.order_count),
        revenue: parseFloat(row.revenue),
        averageTicket: parseFloat(row.average_ticket),
      }));
    } catch (error) {
      throw new Error(`Failed to get channel performance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Order numbering system
  async generateOrderNumber(tenantId: string): Promise<string> {
    const query = 'SELECT get_next_order_number($1) as order_number';
    
    try {
      const result = await pool.query(query, [tenantId]);
      return result.rows[0].order_number;
    } catch (error) {
      throw new Error(`Failed to generate order number: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCurrentOrderNumber(tenantId: string): Promise<string> {
    const query = 'SELECT get_current_order_number($1) as order_number';
    
    try {
      const result = await pool.query(query, [tenantId]);
      return result.rows[0].order_number;
    } catch (error) {
      throw new Error(`Failed to get current order number: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async resetOrderSequence(tenantId: string, startValue: number = 1001): Promise<void> {
    const query = 'SELECT reset_order_sequence($1, $2)';
    
    try {
      await pool.query(query, [tenantId, startValue]);
    } catch (error) {
      throw new Error(`Failed to reset order sequence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByNumber(orderNumber: string, tenantId: string): Promise<Order | null> {
    const query = `
      SELECT o.*, 
             c.name as customer_name, 
             c.email as customer_email, 
             c.phone as customer_phone
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.number = $1 AND o.tenant_id = $2
    `;
    
    try {
      const result = await pool.query(query, [orderNumber, tenantId]);
      return result.rows[0] ? this.mapRowToOrder(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Failed to find order by number: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async isOrderNumberExists(orderNumber: string, tenantId: string): Promise<boolean> {
    const query = 'SELECT 1 FROM orders WHERE number = $1 AND tenant_id = $2 LIMIT 1';
    
    try {
      const result = await pool.query(query, [orderNumber, tenantId]);
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Failed to check order number existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Enhanced create method with automatic order number generation
  async createWithAutoNumber(orderData: Omit<Order, 'id' | 'number' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Generate order number
      const orderNumber = await this.generateOrderNumber(orderData.tenantId);
      
      const query = `
        INSERT INTO orders (
          tenant_id, number, customer_id, items, status, channel, 
          payment, delivery, subtotal, delivery_fee, discount, total, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      
      const values = [
        orderData.tenantId,
        orderNumber,
        orderData.customerId,
        JSON.stringify(orderData.items),
        orderData.status,
        orderData.channel,
        JSON.stringify(orderData.payment),
        JSON.stringify(orderData.delivery),
        orderData.subtotal,
        orderData.deliveryFee,
        orderData.discount,
        orderData.total,
        orderData.notes || null,
      ];
      
      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      return this.mapRowToOrder(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      
      // Handle unique constraint violation (order number conflict)
      if (error instanceof Error && error.message.includes('unique_tenant_order_number')) {
        throw new Error('Order number conflict detected. Please retry the operation.');
      }
      
      throw new Error(`Failed to create order with auto number: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  // Helper methods
  private buildFilteredQuery(tenantId: string, filters: OrderFilters): { query: string; countQuery: string; values: any[] } {
    const conditions: string[] = ['o.tenant_id = $1'];
    const values: any[] = [tenantId];
    let paramIndex = 2;

    // Status filter
    if (filters.status && filters.status.length > 0) {
      const statusPlaceholders = filters.status.map(() => `$${paramIndex++}`).join(', ');
      conditions.push(`o.status IN (${statusPlaceholders})`);
      values.push(...filters.status);
    }

    // Channel filter
    if (filters.channel && filters.channel.length > 0) {
      const channelPlaceholders = filters.channel.map(() => `$${paramIndex++}`).join(', ');
      conditions.push(`o.channel IN (${channelPlaceholders})`);
      values.push(...filters.channel);
    }

    // Date range filter
    if (filters.dateFrom) {
      conditions.push(`o.created_at >= $${paramIndex++}`);
      values.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      conditions.push(`o.created_at <= $${paramIndex++}`);
      values.push(filters.dateTo);
    }

    // Customer filter
    if (filters.customerId) {
      conditions.push(`o.customer_id = $${paramIndex++}`);
      values.push(filters.customerId);
    }

    // Search filter
    if (filters.search) {
      conditions.push(`(o.number ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex})`);
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    
    const baseQuery = `
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      ${whereClause}
    `;

    const countQuery = `SELECT COUNT(*) ${baseQuery}`;
    
    // Add pagination
    const offset = (filters.page - 1) * filters.limit;
    values.push(filters.limit, offset);
    
    const query = `
      SELECT o.*, 
             c.name as customer_name, 
             c.email as customer_email, 
             c.phone as customer_phone
      ${baseQuery}
      ORDER BY o.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    return { query, countQuery, values };
  }

  private mapRowToOrder(row: any): Order {
    return OrderSchema.parse({
      id: row.id,
      tenantId: row.tenant_id,
      number: row.number,
      customerId: row.customer_id,
      customer: row.customer_name ? {
        id: row.customer_id,
        name: row.customer_name,
        email: row.customer_email || undefined,
        phone: row.customer_phone,
      } : undefined,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
      status: row.status,
      channel: row.channel,
      payment: typeof row.payment === 'string' ? JSON.parse(row.payment) : row.payment,
      delivery: typeof row.delivery === 'string' ? JSON.parse(row.delivery) : row.delivery,
      subtotal: parseFloat(row.subtotal),
      deliveryFee: parseFloat(row.delivery_fee),
      discount: parseFloat(row.discount),
      total: parseFloat(row.total),
      notes: row.notes || undefined,
      estimatedCompletionTime: row.estimated_completion_time ? new Date(row.estimated_completion_time) : undefined,
      actualCompletionTime: row.actual_completion_time ? new Date(row.actual_completion_time) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}