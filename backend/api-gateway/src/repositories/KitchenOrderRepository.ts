import { DatabaseConnection } from '@foodtrack/backend-shared';
import { 
  KitchenOrder, 
  KitchenOrderItem, 
  KitchenOrderStatus, 
  KitchenPriority,
  KitchenItemStatus,
  Station,
  StationType
} from '../models/KitchenOrder';

export class KitchenOrderRepository {
  private db = DatabaseConnection.getInstance();

  async create(kitchenOrder: Omit<KitchenOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<KitchenOrder> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Insert kitchen order
      const kitchenOrderResult = await client.query(`
        INSERT INTO kitchen_orders (
          id, tenant_id, contract_id, order_id, priority, assigned_station,
          status, estimated_completion_time, started_at, completed_at,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
        ) RETURNING *
      `, [
        kitchenOrder.tenantId,
        kitchenOrder.contractId,
        kitchenOrder.orderId,
        kitchenOrder.priority,
        kitchenOrder.assignedStation || null,
        kitchenOrder.status,
        kitchenOrder.estimatedCompletionTime || null,
        kitchenOrder.startedAt || null,
        kitchenOrder.completedAt || null
      ]);

      const createdKitchenOrder = kitchenOrderResult.rows[0];

      // Insert kitchen order items
      for (const item of kitchenOrder.items) {
        await client.query(`
          INSERT INTO kitchen_order_items (
            id, kitchen_order_id, production_item_id, product_id, recipe_id,
            quantity, modifications, status, estimated_time, started_at, completed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          item.id,
          createdKitchenOrder.id,
          item.productionItemId,
          item.productId,
          item.recipeId || null,
          item.quantity,
          JSON.stringify(item.modifications || []),
          item.status,
          item.estimatedTime || null,
          item.startedAt || null,
          item.completedAt || null
        ]);
      }

      await client.query('COMMIT');

      return this.mapDatabaseRowToKitchenOrder(createdKitchenOrder, kitchenOrder.items);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id: string, tenantId: string): Promise<KitchenOrder | null> {
    const client = await this.db.connect();
    
    try {
      // Get kitchen order with items
      const result = await client.query(`
        SELECT 
          ko.*,
          json_agg(
            json_build_object(
              'id', koi.id,
              'productionItemId', koi.production_item_id,
              'productId', koi.product_id,
              'recipeId', koi.recipe_id,
              'quantity', koi.quantity,
              'modifications', koi.modifications,
              'status', koi.status,
              'estimatedTime', koi.estimated_time,
              'startedAt', koi.started_at,
              'completedAt', koi.completed_at
            )
          ) as items
        FROM kitchen_orders ko
        LEFT JOIN kitchen_order_items koi ON ko.id = koi.kitchen_order_id
        WHERE ko.id = $1 AND ko.tenant_id = $2
        GROUP BY ko.id
      `, [id, tenantId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const items = row.items.filter((item: any) => item.id !== null);
      
      return this.mapDatabaseRowToKitchenOrder(row, items);
    } finally {
      client.release();
    }
  }

  async findByOrderId(orderId: string, tenantId: string): Promise<KitchenOrder | null> {
    const client = await this.db.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          ko.*,
          json_agg(
            json_build_object(
              'id', koi.id,
              'productionItemId', koi.production_item_id,
              'productId', koi.product_id,
              'recipeId', koi.recipe_id,
              'quantity', koi.quantity,
              'modifications', koi.modifications,
              'status', koi.status,
              'estimatedTime', koi.estimated_time,
              'startedAt', koi.started_at,
              'completedAt', koi.completed_at
            )
          ) as items
        FROM kitchen_orders ko
        LEFT JOIN kitchen_order_items koi ON ko.id = koi.kitchen_order_id
        WHERE ko.order_id = $1 AND ko.tenant_id = $2
        GROUP BY ko.id
      `, [orderId, tenantId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const items = row.items.filter((item: any) => item.id !== null);
      
      return this.mapDatabaseRowToKitchenOrder(row, items);
    } finally {
      client.release();
    }
  }

  async findByStatus(status: KitchenOrderStatus, tenantId: string): Promise<KitchenOrder[]> {
    const client = await this.db.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          ko.*,
          json_agg(
            json_build_object(
              'id', koi.id,
              'productionItemId', koi.production_item_id,
              'productId', koi.product_id,
              'recipeId', koi.recipe_id,
              'quantity', koi.quantity,
              'modifications', koi.modifications,
              'status', koi.status,
              'estimatedTime', koi.estimated_time,
              'startedAt', koi.started_at,
              'completedAt', koi.completed_at
            )
          ) as items
        FROM kitchen_orders ko
        LEFT JOIN kitchen_order_items koi ON ko.id = koi.kitchen_order_id
        WHERE ko.status = $1 AND ko.tenant_id = $2
        GROUP BY ko.id
        ORDER BY ko.priority DESC, ko.created_at ASC
      `, [status, tenantId]);

      return result.rows.map(row => {
        const items = row.items.filter((item: any) => item.id !== null);
        return this.mapDatabaseRowToKitchenOrder(row, items);
      });
    } finally {
      client.release();
    }
  }

  async findActiveOrders(tenantId: string): Promise<KitchenOrder[]> {
    const client = await this.db.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          ko.*,
          json_agg(
            json_build_object(
              'id', koi.id,
              'productionItemId', koi.production_item_id,
              'productId', koi.product_id,
              'recipeId', koi.recipe_id,
              'quantity', koi.quantity,
              'modifications', koi.modifications,
              'status', koi.status,
              'estimatedTime', koi.estimated_time,
              'startedAt', koi.started_at,
              'completedAt', koi.completed_at
            )
          ) as items
        FROM kitchen_orders ko
        LEFT JOIN kitchen_order_items koi ON ko.id = koi.kitchen_order_id
        WHERE ko.status IN ('pending', 'assigned', 'preparing', 'ready') 
          AND ko.tenant_id = $1
        GROUP BY ko.id
        ORDER BY ko.priority DESC, ko.created_at ASC
      `, [tenantId]);

      return result.rows.map(row => {
        const items = row.items.filter((item: any) => item.id !== null);
        return this.mapDatabaseRowToKitchenOrder(row, items);
      });
    } finally {
      client.release();
    }
  }

  async updateStatus(
    id: string, 
    tenantId: string, 
    status: KitchenOrderStatus,
    assignedStation?: string,
    estimatedCompletionTime?: Date
  ): Promise<KitchenOrder | null> {
    const client = await this.db.connect();
    
    try {
      const updateFields = ['status = $3', 'updated_at = NOW()'];
      const values = [id, tenantId, status];
      let paramIndex = 4;

      if (assignedStation !== undefined) {
        updateFields.push(`assigned_station = $${paramIndex}`);
        values.push(assignedStation);
        paramIndex++;
      }

      if (estimatedCompletionTime !== undefined) {
        updateFields.push(`estimated_completion_time = $${paramIndex}`);
        values.push(estimatedCompletionTime);
        paramIndex++;
      }

      // Set timestamps based on status
      if (status === KitchenOrderStatus.PREPARING) {
        updateFields.push(`started_at = NOW()`);
      } else if (status === KitchenOrderStatus.COMPLETED) {
        updateFields.push(`completed_at = NOW()`);
      }

      const result = await client.query(`
        UPDATE kitchen_orders 
        SET ${updateFields.join(', ')}
        WHERE id = $1 AND tenant_id = $2
        RETURNING *
      `, values);

      if (result.rows.length === 0) {
        return null;
      }

      // Get updated order with items
      return this.findById(id, tenantId);
    } finally {
      client.release();
    }
  }

  async updateItemStatus(
    kitchenOrderId: string,
    itemId: string,
    tenantId: string,
    status: KitchenItemStatus
  ): Promise<boolean> {
    const client = await this.db.connect();
    
    try {
      const updateFields = ['status = $4'];
      const values = [kitchenOrderId, itemId, tenantId, status];

      // Set timestamps based on status
      if (status === KitchenItemStatus.PREPARING) {
        updateFields.push('started_at = NOW()');
      } else if (status === KitchenItemStatus.COMPLETED) {
        updateFields.push('completed_at = NOW()');
      }

      const result = await client.query(`
        UPDATE kitchen_order_items 
        SET ${updateFields.join(', ')}
        WHERE kitchen_order_id = $1 AND id = $2 
          AND EXISTS (
            SELECT 1 FROM kitchen_orders 
            WHERE id = $1 AND tenant_id = $3
          )
      `, values);

      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  // Station management methods
  async createStation(station: Omit<Station, 'id' | 'createdAt' | 'updatedAt'>): Promise<Station> {
    const client = await this.db.connect();
    
    try {
      const result = await client.query(`
        INSERT INTO stations (
          id, tenant_id, name, type, capacity, current_load, active, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()
        ) RETURNING *
      `, [
        station.tenantId,
        station.name,
        station.type,
        station.capacity,
        station.currentLoad,
        station.active
      ]);

      return this.mapDatabaseRowToStation(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async findStations(tenantId: string, active?: boolean): Promise<Station[]> {
    const client = await this.db.connect();
    
    try {
      let query = 'SELECT * FROM stations WHERE tenant_id = $1';
      const values = [tenantId];

      if (active !== undefined) {
        query += ' AND active = $2';
        values.push(active);
      }

      query += ' ORDER BY name';

      const result = await client.query(query, values);
      return result.rows.map(row => this.mapDatabaseRowToStation(row));
    } finally {
      client.release();
    }
  }

  async updateStationLoad(stationId: string, tenantId: string, currentLoad: number): Promise<boolean> {
    const client = await this.db.connect();
    
    try {
      const result = await client.query(`
        UPDATE stations 
        SET current_load = $3, updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
      `, [stationId, tenantId, currentLoad]);

      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  private mapDatabaseRowToKitchenOrder(row: any, items: any[]): KitchenOrder {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      contractId: row.contract_id,
      orderId: row.order_id,
      items: items.map(item => ({
        id: item.id,
        productionItemId: item.productionItemId,
        productId: item.productId,
        recipeId: item.recipeId,
        quantity: item.quantity,
        modifications: typeof item.modifications === 'string' 
          ? JSON.parse(item.modifications) 
          : item.modifications || [],
        status: item.status as KitchenItemStatus,
        estimatedTime: item.estimatedTime,
        startedAt: item.startedAt ? new Date(item.startedAt) : undefined,
        completedAt: item.completedAt ? new Date(item.completedAt) : undefined
      })),
      priority: row.priority as KitchenPriority,
      assignedStation: row.assigned_station,
      status: row.status as KitchenOrderStatus,
      estimatedCompletionTime: row.estimated_completion_time 
        ? new Date(row.estimated_completion_time) 
        : undefined,
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapDatabaseRowToStation(row: any): Station {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      type: row.type as StationType,
      capacity: row.capacity,
      currentLoad: row.current_load,
      active: row.active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}