import { Pool, PoolClient } from 'pg';
import { DatabaseConnection, BaseRepository } from '@foodtrack/backend-shared';
import { 
  Order, 
  OrderSchema, 
  CreateOrderRequest, 
  UpdateOrderStatusRequest, 
  OrderFilters,
  OrderStatus,
  OrderNumberGenerator
} from '../models/Order';

export class OrderRepository extends BaseRepository<Order> {
  constructor() {
    super('orders');
  }

  async findById(id: string, tenantId: string): Promise<Order | null> {
    const query = `
      SELECT 
        o.id,
        o.tenant_id as "tenantId",
        o.number,
        o.customer_id as "customerId",
        c.name as customer_name,
        c.phone as customer_phone,
        c.email as customer_email,
        c.address as customer_address,
        o.items,
        o.status,
        o.channel,
        o.payment,
        o.delivery,
        o.subtotal,
        o.delivery_fee as "deliveryFee",
        o.discount,
        o.total,
        o.notes,
        o.created_at as "createdAt",
        o.updated_at as "updatedAt"
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = $1 AND o.tenant_id = $2
    `;
    
    try {
      const result = await this.pool.query(query, [id, tenantId]);
      return result.rows[0] ? this.mapRowToOrder(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Failed to find order by id: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findAll(tenantId: string, filters: OrderFilters = {}): Promise<{ orders: Order[]; total: number }> {
    const conditions: string[] = ['o.tenant_id = $1'];
    const values: any[] = [tenantId];
    let paramIndex = 2;

    // Build WHERE conditions
    if (filters.status) {
      conditions.push(`o.status = $${paramIndex++}`);
      values.push(filters.status);
    }

    if (filters.channel) {
      conditions.push(`o.channel = $${paramIndex++}`);
      values.push(filters.channel);
    }

    if (filters.customerId) {
      conditions.push(`o.customer_id = $${paramIndex++}`);
      values.push(filters.customerId);
    }

    if (filters.dateFrom) {
      conditions.push(`o.created_at >= $${paramIndex++}`);
      values.push(new Date(filters.dateFrom));
    }

    if (filters.dateTo) {
      conditions.push(`o.created_at <= $${paramIndex++}`);
      values.push(new Date(filters.dateTo));
    }

    if (filters.search) {
      conditions.push(`(o.number ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex})`);
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    
    // Count query
    const countQuery = `
      SELECT COUNT(*) 
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      ${whereClause}
    `;
    const countResult = await this.pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Main query with pagination
    const offset = ((filters.page || 1) - 1) * (filters.limit || 20);
    const query = `
      SELECT 
        o.id,
        o.tenant_id as "tenantId",
        o.number,
        o.customer_id as "customerId",
        c.name as customer_name,
        c.phone as customer_phone,
        c.email as customer_email,
        c.address as customer_address,
        o.items,
        o.status,
        o.channel,
        o.payment,
        o.delivery,
        o.subtotal,
        o.delivery_fee as "deliveryFee",
        o.discount,
        o.total,
        o.notes,
        o.created_at as "createdAt",
        o.updated_at as "updatedAt"
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    
    values.push(filters.limit || 20, offset);

    try {
      const result = await this.pool.query(query, values);
      const orders = result.rows.map(row => this.mapRowToOrder(row));
      return { orders, total };
    } catch (error) {
      throw new Error(`Failed to find orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async create(data: CreateOrderRequest & { tenantId: string }): Promise<Order> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Generate order number
      const orderNumber = OrderNumberGenerator.generate(data.tenantId);
      
      // Create or find customer
      let customerId: string;
      const existingCustomer = await client.query(
        'SELECT id FROM customers WHERE tenant_id = $1 AND phone = $2',
        [data.tenantId, data.customer.phone]
      );
      
      if (existingCustomer.rows.length > 0) {
        customerId = existingCustomer.rows[0].id;
        
        // Update customer info
        await client.query(`
          UPDATE customers 
          SET name = $1, email = $2, address = $3, updated_at = NOW()
          WHERE id = $4
        `, [
          data.customer.name,
          data.customer.email || null,
          JSON.stringify({ street: data.customer.address }),
          customerId
        ]);
      } else {
        // Create new customer
        const customerResult = await client.query(`
          INSERT INTO customers (tenant_id, name, email, phone, address)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `, [
          data.tenantId,
          data.customer.name,
          data.customer.email || null,
          data.customer.phone,
          JSON.stringify({ street: data.customer.address })
        ]);
        customerId = customerResult.rows[0].id;
      }

      // Get product details and calculate totals
      const productIds = data.items.map(item => item.productId);
      const productsResult = await client.query(
        'SELECT id, name, price FROM products WHERE id = ANY($1) AND tenant_id = $2 AND active = true',
        [productIds, data.tenantId]
      );
      
      const products = new Map(productsResult.rows.map(p => [p.id, p]));
      
      // Build order items with product details
      const orderItems = data.items.map(item => {
        const product = products.get(item.productId);
        if (!product) {
          throw new Error(`Product ${item.productId} not found or not available`);
        }
        
        return {
          id: item.productId,
          name: product.name,
          quantity: item.quantity,
          price: parseFloat(product.price),
          extras: [],
          modifications: item.modifications,
        };
      });

      // Calculate totals
      const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const deliveryFee = data.delivery.fee || 0;
      const discount = 0; // TODO: Implement discount logic
      const total = subtotal + deliveryFee - discount;

      // Create order
      const orderQuery = `
        INSERT INTO orders (
          tenant_id, number, customer_id, items, status, channel, 
          payment, delivery, subtotal, delivery_fee, discount, total, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING 
          id,
          tenant_id as "tenantId",
          number,
          customer_id as "customerId",
          items,
          status,
          channel,
          payment,
          delivery,
          subtotal,
          delivery_fee as "deliveryFee",
          discount,
          total,
          notes,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;
      
      const orderValues = [
        data.tenantId,
        orderNumber,
        customerId,
        JSON.stringify(orderItems),
        'draft', // Initial status
        data.channel,
        JSON.stringify({
          method: data.payment.method,
          status: 'pending',
          amount: total,
        }),
        JSON.stringify(data.delivery),
        subtotal,
        deliveryFee,
        discount,
        total,
        data.notes || null,
      ];
      
      const orderResult = await client.query(orderQuery, orderValues);
      await client.query('COMMIT');
      
      // Get customer info for response
      const customerInfo = await client.query(
        'SELECT name, phone, email FROM customers WHERE id = $1',
        [customerId]
      );
      
      const orderRow = {
        ...orderResult.rows[0],
        customer_name: customerInfo.rows[0].name,
        customer_phone: customerInfo.rows[0].phone,
        customer_email: customerInfo.rows[0].email,
      };
      
      return this.mapRowToOrder(orderRow);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  async updateStatus(id: string, status: OrderStatus, tenantId: string, notes?: string): Promise<Order | null> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const query = `
        UPDATE orders 
        SET status = $1, notes = COALESCE($2, notes), updated_at = NOW()
        WHERE id = $3 AND tenant_id = $4
        RETURNING 
          id,
          tenant_id as "tenantId",
          number,
          customer_id as "customerId",
          items,
          status,
          channel,
          payment,
          delivery,
          subtotal,
          delivery_fee as "deliveryFee",
          discount,
          total,
          notes,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;
      
      const result = await client.query(query, [status, notes, id, tenantId]);
      await client.query('COMMIT');
      
      if (result.rows.length === 0) {
        return null;
      }

      // Get customer info
      const customerInfo = await client.query(
        'SELECT name, phone, email FROM customers WHERE id = $1',
        [result.rows[0].customerId]
      );
      
      const orderRow = {
        ...result.rows[0],
        customer_name: customerInfo.rows[0]?.name,
        customer_phone: customerInfo.rows[0]?.phone,
        customer_email: customerInfo.rows[0]?.email,
      };
      
      return this.mapRowToOrder(orderRow);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to update order status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    // Soft delete by setting status to cancelled
    const result = await this.updateStatus(id, 'cancelled', tenantId, 'Order cancelled');
    return result !== null;
  }

  async findByStatus(status: OrderStatus, tenantId: string): Promise<Order[]> {
    const { orders } = await this.findAll(tenantId, { status });
    return orders;
  }

  async findByCustomer(customerId: string, tenantId: string): Promise<Order[]> {
    const { orders } = await this.findAll(tenantId, { customerId });
    return orders;
  }

  // Helper methods
  private mapRowToOrder(row: any): Order {
    // Extract address from customer address object
    let customerAddress = 'Endereço não informado';
    if (row.customer_address) {
      try {
        const addressObj = typeof row.customer_address === 'string' 
          ? JSON.parse(row.customer_address) 
          : row.customer_address;
        customerAddress = addressObj.street || addressObj.address || 'Endereço não informado';
      } catch (e) {
        customerAddress = row.customer_address.toString();
      }
    }

    const customer = {
      name: row.customer_name || 'Cliente',
      phone: row.customer_phone || '',
      email: row.customer_email || undefined,
      address: customerAddress,
    };

    // Map database status to schema status
    let status = row.status;
    if (status === 'pending') {
      status = 'draft'; // Map pending to draft
    }
    if (status === 'preparing') {
      status = 'in_preparation'; // Map preparing to in_preparation
    }

    return OrderSchema.parse({
      id: row.id,
      tenantId: row.tenantId,
      number: row.number,
      customerId: row.customerId,
      customer,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
      status,
      channel: row.channel,
      payment: typeof row.payment === 'string' ? JSON.parse(row.payment) : row.payment,
      delivery: typeof row.delivery === 'string' ? JSON.parse(row.delivery) : row.delivery,
      subtotal: parseFloat(row.subtotal),
      deliveryFee: parseFloat(row.deliveryFee || 0),
      discount: parseFloat(row.discount || 0),
      total: parseFloat(row.total),
      notes: row.notes || undefined,
      specialInstructions: row.specialInstructions || undefined,
      estimatedDeliveryTime: row.estimatedDeliveryTime ? new Date(row.estimatedDeliveryTime) : undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }
}