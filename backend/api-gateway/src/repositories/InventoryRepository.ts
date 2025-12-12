import { Pool, PoolClient } from 'pg';
import { 
  InventoryItem, 
  InventoryItemSchema,
  InventoryUpdate,
  InventoryUpdateSchema,
  StockAlert,
  StockAlertSchema,
  ExpirationAlert,
  ExpirationAlertSchema,
  AvailabilityCheck,
  AvailabilityCheckSchema,
  IngredientDelivery,
  IngredientDeliverySchema,
  InventoryUsage,
  InventoryUsageSchema,
  CreateInventoryItemRequest,
  UpdateInventoryItemRequest,
  InventoryFilters,
  InventoryValidationUtils
} from '@foodtrack/backend-shared';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'foodtrack',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

export interface PaginatedInventoryItems {
  items: InventoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export class InventoryRepository {
  private tableName = 'inventory_items';
  private updatesTableName = 'inventory_updates';
  private alertsTableName = 'stock_alerts';

  async findById(id: string, tenantId: string): Promise<InventoryItem | null> {
    const query = 'SELECT * FROM inventory_items WHERE id = $1 AND tenant_id = $2';
    
    try {
      const result = await pool.query(query, [id, tenantId]);
      return result.rows[0] ? this.mapRowToInventoryItem(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Failed to find inventory item by id: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findAll(tenantId: string, filters: Partial<InventoryFilters> = {}): Promise<PaginatedInventoryItems> {
    const { query, countQuery, values } = this.buildFilteredQuery(tenantId, filters);
    
    try {
      // Get total count
      const countResult = await pool.query(countQuery, values.slice(0, -2)); // Remove LIMIT and OFFSET params
      const total = parseInt(countResult.rows[0].count);
      
      // Get paginated results
      const result = await pool.query(query, values);
      const items = result.rows.map(row => this.mapRowToInventoryItem(row));
      
      const pages = Math.ceil(total / (filters.limit || 20));
      
      return {
        items,
        pagination: {
          page: filters.page || 1,
          limit: filters.limit || 20,
          total,
          pages,
        },
      };
    } catch (error) {
      throw new Error(`Failed to find inventory items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async create(itemData: CreateInventoryItemRequest, tenantId: string): Promise<InventoryItem> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Validate the inventory item data
      const validation = InventoryValidationUtils.validateInventoryItem({
        ...itemData,
        id: 'temp-id',
        tenantId,
        currentStock: itemData.initialStock || 0,
        lastUpdated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      if (!validation.isValid) {
        throw new Error(`Inventory item validation failed: ${validation.errors.join(', ')}`);
      }
      
      const query = `
        INSERT INTO inventory_items (
          tenant_id, name, category, current_stock, unit, minimum_stock, maximum_stock,
          cost_per_unit, supplier, supplier_code, barcode, expiration_date, batch_number,
          storage_location, storage_temperature, is_active, last_updated
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
        RETURNING *
      `;
      
      const values = [
        tenantId,
        itemData.name,
        itemData.category,
        itemData.initialStock || 0,
        itemData.unit,
        itemData.minimumStock,
        itemData.maximumStock,
        itemData.costPerUnit,
        itemData.supplier,
        itemData.supplierCode || null,
        itemData.barcode || null,
        itemData.expirationDate || null,
        itemData.batchNumber || null,
        itemData.storageLocation || null,
        itemData.storageTemperature || 'room',
        true, // is_active
      ];
      
      const result = await client.query(query, values);
      
      // Create initial stock update record if there's initial stock
      if (itemData.initialStock && itemData.initialStock > 0) {
        await this.createStockUpdate(client, {
          inventoryItemId: result.rows[0].id,
          type: 'adjustment',
          quantity: itemData.initialStock,
          reason: 'Initial stock entry',
          performedBy: 'system', // Should be actual user ID
          timestamp: new Date(),
        });
      }
      
      await client.query('COMMIT');
      
      return this.mapRowToInventoryItem(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to create inventory item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  async update(id: string, updates: UpdateInventoryItemRequest, tenantId: string): Promise<InventoryItem | null> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Build dynamic update query
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbKey = this.camelToSnake(key);
          updateFields.push(`${dbKey} = $${paramIndex++}`);
          values.push(value);
        }
      });

      if (updateFields.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      updateFields.push(`updated_at = NOW()`, `last_updated = NOW()`);
      
      const query = `
        UPDATE inventory_items 
        SET ${updateFields.join(', ')} 
        WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++}
        RETURNING *
      `;
      
      values.push(id, tenantId);
      
      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      return result.rows[0] ? this.mapRowToInventoryItem(result.rows[0]) : null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to update inventory item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  async updateIngredientUsage(ingredientId: string, quantity: number, orderId: string, tenantId: string, performedBy: string): Promise<InventoryUpdate> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get current inventory item
      const itemResult = await client.query(
        'SELECT * FROM inventory_items WHERE id = $1 AND tenant_id = $2',
        [ingredientId, tenantId]
      );
      
      if (itemResult.rows.length === 0) {
        throw new Error('Inventory item not found');
      }
      
      const item = itemResult.rows[0];
      const newStock = item.current_stock - quantity;
      
      if (newStock < 0) {
        throw new Error(`Insufficient stock. Available: ${item.current_stock}, Required: ${quantity}`);
      }
      
      // Update inventory item stock
      await client.query(
        'UPDATE inventory_items SET current_stock = $1, last_updated = NOW(), updated_at = NOW() WHERE id = $2 AND tenant_id = $3',
        [newStock, ingredientId, tenantId]
      );
      
      // Create usage record
      const updateData: Omit<InventoryUpdate, 'timestamp'> = {
        inventoryItemId: ingredientId,
        orderId,
        type: 'usage',
        quantity: -quantity, // Negative for usage
        reason: `Used for order ${orderId}`,
        performedBy,
      };
      
      const update = await this.createStockUpdate(client, {
        ...updateData,
        timestamp: new Date(),
      });
      
      // Check if we need to create low stock alert
      if (newStock <= item.minimum_stock) {
        await this.createLowStockAlert(client, ingredientId, tenantId, newStock, item.minimum_stock);
      }
      
      await client.query('COMMIT');
      
      return update;
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to update ingredient usage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  async checkIngredientAvailability(ingredientId: string, requiredQuantity: number, tenantId: string): Promise<AvailabilityCheck> {
    const query = `
      SELECT ii.*, 
             COALESCE(alt.alternatives, '[]'::jsonb) as alternatives
      FROM inventory_items ii
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(
          jsonb_build_object(
            'ingredientId', alt_ii.id,
            'name', alt_ii.name,
            'availableQuantity', alt_ii.current_stock,
            'substitutionRatio', 1.0
          )
        ) as alternatives
        FROM inventory_items alt_ii
        WHERE alt_ii.tenant_id = ii.tenant_id 
          AND alt_ii.category = ii.category 
          AND alt_ii.id != ii.id
          AND alt_ii.current_stock > 0
          AND alt_ii.is_active = true
        LIMIT 3
      ) alt ON true
      WHERE ii.id = $1 AND ii.tenant_id = $2
    `;
    
    try {
      const result = await pool.query(query, [ingredientId, tenantId]);
      
      if (result.rows.length === 0) {
        throw new Error('Ingredient not found');
      }
      
      const item = result.rows[0];
      const isAvailable = item.current_stock >= requiredQuantity;
      const shortfall = isAvailable ? 0 : requiredQuantity - item.current_stock;
      
      return AvailabilityCheckSchema.parse({
        ingredientId: item.id,
        ingredientName: item.name,
        requiredQuantity,
        availableQuantity: item.current_stock,
        unit: item.unit,
        isAvailable,
        shortfall,
        alternatives: typeof item.alternatives === 'string' ? JSON.parse(item.alternatives) : item.alternatives || [],
        estimatedRestockDate: undefined, // Would be calculated based on supplier data
      });
    } catch (error) {
      throw new Error(`Failed to check ingredient availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getLowStockAlerts(tenantId: string): Promise<StockAlert[]> {
    const query = `
      SELECT sa.*, ii.name as item_name
      FROM stock_alerts sa
      JOIN inventory_items ii ON sa.inventory_item_id = ii.id
      WHERE sa.tenant_id = $1 
        AND sa.alert_type IN ('low_stock', 'out_of_stock')
        AND sa.is_resolved = false
      ORDER BY sa.severity DESC, sa.created_at ASC
    `;
    
    try {
      const result = await pool.query(query, [tenantId]);
      return result.rows.map(row => this.mapRowToStockAlert(row));
    } catch (error) {
      throw new Error(`Failed to get low stock alerts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getExpirationAlerts(tenantId: string): Promise<ExpirationAlert[]> {
    const query = `
      SELECT ii.id as inventory_item_id,
             ii.name as item_name,
             ii.batch_number,
             ii.expiration_date,
             ii.current_stock,
             ii.unit,
             EXTRACT(DAY FROM (ii.expiration_date - NOW())) as days_until_expiration
      FROM inventory_items ii
      WHERE ii.tenant_id = $1 
        AND ii.expiration_date IS NOT NULL
        AND ii.expiration_date <= NOW() + INTERVAL '30 days'
        AND ii.current_stock > 0
        AND ii.is_active = true
      ORDER BY ii.expiration_date ASC
    `;
    
    try {
      const result = await pool.query(query, [tenantId]);
      
      return result.rows.map(row => {
        const daysUntilExpiration = Math.ceil(row.days_until_expiration);
        const severity = InventoryValidationUtils.calculateExpirationSeverity(new Date(row.expiration_date));
        
        let suggestedAction: 'use_first' | 'discount' | 'dispose' | 'return';
        if (daysUntilExpiration < 0) {
          suggestedAction = 'dispose';
        } else if (daysUntilExpiration <= 1) {
          suggestedAction = 'use_first';
        } else if (daysUntilExpiration <= 3) {
          suggestedAction = 'discount';
        } else {
          suggestedAction = 'use_first';
        }
        
        return ExpirationAlertSchema.parse({
          id: `exp_${row.inventory_item_id}`, // Generate ID for expiration alert
          tenantId,
          inventoryItemId: row.inventory_item_id,
          itemName: row.item_name,
          batchNumber: row.batch_number,
          expirationDate: new Date(row.expiration_date),
          daysUntilExpiration,
          currentStock: row.current_stock,
          unit: row.unit,
          severity,
          suggestedAction,
          isResolved: false,
          createdAt: new Date(),
        });
      });
    } catch (error) {
      throw new Error(`Failed to get expiration alerts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async recordIngredientDelivery(delivery: Omit<IngredientDelivery, 'id' | 'createdAt' | 'updatedAt'>, tenantId: string): Promise<IngredientDelivery> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const query = `
        INSERT INTO ingredient_deliveries (
          tenant_id, supplier, delivery_date, invoice_number, total_cost,
          items, received_by, quality_approved, quality_approved_by, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const values = [
        tenantId,
        delivery.supplier,
        delivery.deliveryDate,
        delivery.invoiceNumber || null,
        delivery.totalCost,
        JSON.stringify(delivery.items),
        delivery.receivedBy,
        delivery.qualityApproved,
        delivery.qualityApprovedBy || null,
        delivery.notes || null,
      ];
      
      const result = await client.query(query, values);
      
      // Update inventory quantities for delivered items
      for (const item of delivery.items) {
        await client.query(
          'UPDATE inventory_items SET current_stock = current_stock + $1, cost_per_unit = $2, last_updated = NOW(), updated_at = NOW() WHERE id = $3 AND tenant_id = $4',
          [item.quantity, item.costPerUnit, item.inventoryItemId, tenantId]
        );
        
        // Create delivery update record
        await this.createStockUpdate(client, {
          inventoryItemId: item.inventoryItemId,
          type: 'delivery',
          quantity: item.quantity,
          reason: `Delivery from ${delivery.supplier}`,
          performedBy: delivery.receivedBy,
          batchNumber: item.batchNumber,
          expirationDate: item.expirationDate,
          cost: item.costPerUnit * item.quantity,
          notes: item.notes,
          timestamp: new Date(),
        });
      }
      
      await client.query('COMMIT');
      
      return this.mapRowToIngredientDelivery(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to record ingredient delivery: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  // Helper methods
  private async createStockUpdate(client: PoolClient, updateData: InventoryUpdate): Promise<InventoryUpdate> {
    const query = `
      INSERT INTO inventory_updates (
        inventory_item_id, order_id, type, quantity, reason, performed_by,
        batch_number, expiration_date, cost, notes, timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const values = [
      updateData.inventoryItemId,
      updateData.orderId || null,
      updateData.type,
      updateData.quantity,
      updateData.reason,
      updateData.performedBy,
      updateData.batchNumber || null,
      updateData.expirationDate || null,
      updateData.cost || null,
      updateData.notes || null,
      updateData.timestamp,
    ];
    
    const result = await client.query(query, values);
    return this.mapRowToInventoryUpdate(result.rows[0]);
  }

  private async createLowStockAlert(client: PoolClient, inventoryItemId: string, tenantId: string, currentStock: number, minimumStock: number): Promise<void> {
    const severity = InventoryValidationUtils.calculateStockAlertSeverity(currentStock, minimumStock);
    const alertType = currentStock === 0 ? 'out_of_stock' : 'low_stock';
    
    // Check if alert already exists
    const existingAlert = await client.query(
      'SELECT id FROM stock_alerts WHERE inventory_item_id = $1 AND tenant_id = $2 AND alert_type = $3 AND is_resolved = false',
      [inventoryItemId, tenantId, alertType]
    );
    
    if (existingAlert.rows.length === 0) {
      await client.query(
        `INSERT INTO stock_alerts (
          tenant_id, inventory_item_id, alert_type, current_stock, minimum_stock, severity
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [tenantId, inventoryItemId, alertType, currentStock, minimumStock, severity]
      );
    }
  }

  private buildFilteredQuery(tenantId: string, filters: Partial<InventoryFilters>): { query: string; countQuery: string; values: any[] } {
    const conditions: string[] = ['tenant_id = $1'];
    const values: any[] = [tenantId];
    let paramIndex = 2;

    // Category filter
    if (filters.category && filters.category.length > 0) {
      const categoryPlaceholders = filters.category.map(() => `$${paramIndex++}`).join(', ');
      conditions.push(`category IN (${categoryPlaceholders})`);
      values.push(...filters.category);
    }

    // Low stock filter
    if (filters.lowStock) {
      conditions.push('current_stock <= minimum_stock');
    }

    // Out of stock filter
    if (filters.outOfStock) {
      conditions.push('current_stock = 0');
    }

    // Expiring soon filter
    if (filters.expiringSoon) {
      conditions.push('expiration_date IS NOT NULL AND expiration_date <= NOW() + INTERVAL \'7 days\'');
    }

    // Supplier filter
    if (filters.supplier && filters.supplier.length > 0) {
      const supplierPlaceholders = filters.supplier.map(() => `$${paramIndex++}`).join(', ');
      conditions.push(`supplier IN (${supplierPlaceholders})`);
      values.push(...filters.supplier);
    }

    // Search filter
    if (filters.search) {
      conditions.push(`(name ILIKE $${paramIndex} OR supplier_code ILIKE $${paramIndex})`);
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')} AND is_active = true`;
    
    const baseQuery = `FROM inventory_items ${whereClause}`;
    const countQuery = `SELECT COUNT(*) ${baseQuery}`;
    
    // Add sorting and pagination
    const sortBy = filters.sortBy || 'name';
    const sortOrder = filters.sortOrder || 'asc';
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    
    values.push(limit, offset);
    
    const query = `
      SELECT * ${baseQuery}
      ORDER BY ${this.camelToSnake(sortBy)} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    return { query, countQuery, values };
  }

  private mapRowToInventoryItem(row: any): InventoryItem {
    return InventoryItemSchema.parse({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      category: row.category,
      currentStock: parseFloat(row.current_stock),
      unit: row.unit,
      minimumStock: parseFloat(row.minimum_stock),
      maximumStock: parseFloat(row.maximum_stock),
      costPerUnit: parseFloat(row.cost_per_unit),
      supplier: row.supplier,
      supplierCode: row.supplier_code,
      barcode: row.barcode,
      expirationDate: row.expiration_date ? new Date(row.expiration_date) : undefined,
      batchNumber: row.batch_number,
      storageLocation: row.storage_location,
      storageTemperature: row.storage_temperature,
      isActive: row.is_active,
      lastUpdated: new Date(row.last_updated),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  private mapRowToInventoryUpdate(row: any): InventoryUpdate {
    return InventoryUpdateSchema.parse({
      inventoryItemId: row.inventory_item_id,
      orderId: row.order_id,
      type: row.type,
      quantity: parseFloat(row.quantity),
      reason: row.reason,
      performedBy: row.performed_by,
      batchNumber: row.batch_number,
      expirationDate: row.expiration_date ? new Date(row.expiration_date) : undefined,
      cost: row.cost ? parseFloat(row.cost) : undefined,
      notes: row.notes,
      timestamp: new Date(row.timestamp),
    });
  }

  private mapRowToStockAlert(row: any): StockAlert {
    return StockAlertSchema.parse({
      id: row.id,
      tenantId: row.tenant_id,
      inventoryItemId: row.inventory_item_id,
      itemName: row.item_name,
      alertType: row.alert_type,
      currentStock: parseFloat(row.current_stock),
      minimumStock: parseFloat(row.minimum_stock),
      expirationDate: row.expiration_date ? new Date(row.expiration_date) : undefined,
      daysUntilExpiration: row.days_until_expiration ? parseInt(row.days_until_expiration) : undefined,
      severity: row.severity,
      isResolved: row.is_resolved,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      resolvedBy: row.resolved_by,
      createdAt: new Date(row.created_at),
    });
  }

  private mapRowToIngredientDelivery(row: any): IngredientDelivery {
    return IngredientDeliverySchema.parse({
      id: row.id,
      tenantId: row.tenant_id,
      supplier: row.supplier,
      deliveryDate: new Date(row.delivery_date),
      invoiceNumber: row.invoice_number,
      totalCost: parseFloat(row.total_cost),
      items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
      receivedBy: row.received_by,
      qualityApproved: row.quality_approved,
      qualityApprovedBy: row.quality_approved_by,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}