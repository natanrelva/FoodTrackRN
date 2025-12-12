import { Pool, PoolClient } from 'pg';
import { 
  KitchenOrder, 
  KitchenOrderSchema,
  KitchenStatus,
  OrderPriority,
  StationAssignment,
  StationWorkload,
  PreparationStation,
  PreparationStationSchema,
  KitchenStatusMapper,
  ItemStatus,
  StatusUpdateLog,
  DelayNotification,
  RemakeRequest,
  DeliveryCoordination,
  PreparationStage
} from '@foodtrack/backend-shared';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'foodtrack',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

export interface KitchenOrderFilters {
  status?: KitchenStatus[];
  priority?: OrderPriority[];
  stationId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface TimeEstimate {
  dishId: string;
  estimatedMinutes: number;
  complexity: 'low' | 'medium' | 'high';
  stationRequirements: string[];
}

export interface QualityIssue {
  type: 'temperature' | 'presentation' | 'taste' | 'missing_ingredient' | 'other';
  description: string;
  severity: 'minor' | 'major' | 'critical';
  reportedBy: string;
}

export interface QualityReport {
  id: string;
  orderId: string;
  issue: QualityIssue;
  resolution: string;
  resolvedBy?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

export class KitchenRepository {
  private tableName = 'kitchen_orders';
  private stationsTableName = 'preparation_stations';

  async findActiveOrders(tenantId: string, filters: KitchenOrderFilters = {}): Promise<KitchenOrder[]> {
    const conditions: string[] = ['ko.tenant_id = $1'];
    const values: any[] = [tenantId];
    let paramIndex = 2;

    // Status filter
    if (filters.status && filters.status.length > 0) {
      const statusPlaceholders = filters.status.map(() => `$${paramIndex++}`).join(', ');
      conditions.push(`ko.status IN (${statusPlaceholders})`);
      values.push(...filters.status);
    } else {
      // Default to active statuses only
      conditions.push(`ko.status NOT IN ('ready_for_pickup', 'cancelled')`);
    }

    // Priority filter
    if (filters.priority && filters.priority.length > 0) {
      const priorityPlaceholders = filters.priority.map(() => `$${paramIndex++}`).join(', ');
      conditions.push(`ko.priority IN (${priorityPlaceholders})`);
      values.push(...filters.priority);
    }

    // Station filter
    if (filters.stationId) {
      conditions.push(`EXISTS (
        SELECT 1 FROM jsonb_array_elements(ko.assigned_stations) AS station 
        WHERE station->>'stationId' = $${paramIndex++}
      )`);
      values.push(filters.stationId);
    }

    // Date range filter
    if (filters.dateFrom) {
      conditions.push(`ko.created_at >= $${paramIndex++}`);
      values.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      conditions.push(`ko.created_at <= $${paramIndex++}`);
      values.push(filters.dateTo);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    
    const query = `
      SELECT ko.*, 
             o.number as order_number,
             o.channel as order_channel,
             c.name as customer_name
      FROM kitchen_orders ko
      LEFT JOIN orders o ON ko.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      ${whereClause}
      ORDER BY 
        CASE ko.priority 
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        ko.estimated_completion_time ASC,
        ko.created_at ASC
    `;

    try {
      const result = await pool.query(query, values);
      return result.rows.map(row => this.mapRowToKitchenOrder(row));
    } catch (error) {
      throw new Error(`Failed to find active orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(id: string, tenantId: string): Promise<KitchenOrder | null> {
    const query = `
      SELECT ko.*, 
             o.number as order_number,
             o.channel as order_channel,
             c.name as customer_name
      FROM kitchen_orders ko
      LEFT JOIN orders o ON ko.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE ko.id = $1 AND ko.tenant_id = $2
    `;
    
    try {
      const result = await pool.query(query, [id, tenantId]);
      return result.rows[0] ? this.mapRowToKitchenOrder(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Failed to find kitchen order by id: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async create(kitchenOrderData: Omit<KitchenOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<KitchenOrder> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const query = `
        INSERT INTO kitchen_orders (
          order_id, tenant_id, items, status, priority, special_instructions,
          allergen_alerts, estimated_completion_time, assigned_stations
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      const values = [
        kitchenOrderData.orderId,
        kitchenOrderData.tenantId,
        JSON.stringify(kitchenOrderData.items),
        kitchenOrderData.status,
        kitchenOrderData.priority,
        kitchenOrderData.specialInstructions,
        JSON.stringify(kitchenOrderData.allergenAlerts),
        kitchenOrderData.estimatedCompletionTime,
        JSON.stringify(kitchenOrderData.assignedStations),
      ];
      
      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      return this.mapRowToKitchenOrder(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to create kitchen order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  async updateStatus(id: string, status: KitchenStatus, tenantId: string, stationId?: string): Promise<KitchenOrder | null> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const updates: string[] = ['status = $3', 'updated_at = NOW()'];
      const values: any[] = [id, tenantId, status];
      let paramIndex = 4;

      // Update timestamps based on status
      if (status === 'in_preparation' && !stationId) {
        updates.push(`actual_start_time = NOW()`);
      } else if (status === 'ready_for_pickup') {
        updates.push(`actual_completion_time = NOW()`);
      }

      const query = `
        UPDATE kitchen_orders 
        SET ${updates.join(', ')} 
        WHERE id = $1 AND tenant_id = $2
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      
      // Also update the main order status if needed
      if (result.rows[0]) {
        const orderStatus = KitchenStatusMapper.toOrderStatus(status);
        await client.query(
          'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3',
          [orderStatus, result.rows[0].order_id, tenantId]
        );
      }
      
      await client.query('COMMIT');
      
      return result.rows[0] ? this.mapRowToKitchenOrder(result.rows[0]) : null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to update kitchen order status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  async assignToStation(orderId: string, stationId: string, tenantId: string): Promise<StationAssignment> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get current kitchen order
      const orderResult = await client.query(
        'SELECT * FROM kitchen_orders WHERE id = $1 AND tenant_id = $2',
        [orderId, tenantId]
      );
      
      if (orderResult.rows.length === 0) {
        throw new Error('Kitchen order not found');
      }
      
      const kitchenOrder = orderResult.rows[0];
      const currentAssignments = JSON.parse(kitchenOrder.assigned_stations || '[]');
      
      // Get station info
      const stationResult = await client.query(
        'SELECT * FROM preparation_stations WHERE id = $1 AND tenant_id = $2',
        [stationId, tenantId]
      );
      
      if (stationResult.rows.length === 0) {
        throw new Error('Preparation station not found');
      }
      
      const station = stationResult.rows[0];
      
      // Create new assignment
      const assignment: StationAssignment = {
        stationId,
        stationName: station.name,
        assignedAt: new Date(),
        estimatedDuration: 30, // Default 30 minutes, should be calculated based on items
        items: JSON.parse(kitchenOrder.items).map((item: any) => item.id),
      };
      
      // Add to assignments
      currentAssignments.push(assignment);
      
      // Update kitchen order
      await client.query(
        'UPDATE kitchen_orders SET assigned_stations = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3',
        [JSON.stringify(currentAssignments), orderId, tenantId]
      );
      
      // Update station workload
      await client.query(
        'UPDATE preparation_stations SET current_workload = current_workload + 1, updated_at = NOW() WHERE id = $1 AND tenant_id = $2',
        [stationId, tenantId]
      );
      
      await client.query('COMMIT');
      
      return assignment;
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to assign order to station: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  async getStationWorkload(stationId: string, tenantId: string): Promise<StationWorkload> {
    const query = `
      SELECT 
        ps.id as station_id,
        ps.current_workload,
        COUNT(CASE WHEN ko.status IN ('received', 'in_preparation') THEN 1 END) as active_orders,
        COUNT(CASE WHEN ko.status = 'received' THEN 1 END) as queued_orders,
        ps.average_processing_time,
        (ps.current_workload::float / ps.capacity * 100) as utilization_rate
      FROM preparation_stations ps
      LEFT JOIN kitchen_orders ko ON ko.assigned_stations::jsonb @> jsonb_build_array(jsonb_build_object('stationId', ps.id))
        AND ko.tenant_id = ps.tenant_id
        AND ko.status NOT IN ('ready_for_pickup', 'cancelled')
      WHERE ps.id = $1 AND ps.tenant_id = $2
      GROUP BY ps.id, ps.current_workload, ps.capacity, ps.average_processing_time
    `;
    
    try {
      const result = await pool.query(query, [stationId, tenantId]);
      
      if (result.rows.length === 0) {
        throw new Error('Station not found');
      }
      
      const row = result.rows[0];
      const estimatedWaitTime = row.queued_orders * row.average_processing_time;
      
      return {
        stationId: row.station_id,
        activeOrders: parseInt(row.active_orders),
        queuedOrders: parseInt(row.queued_orders),
        estimatedWaitTime,
        utilizationRate: parseFloat(row.utilization_rate),
        lastUpdated: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to get station workload: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async estimatePreparationTime(items: any[], tenantId: string): Promise<TimeEstimate[]> {
    // This would typically involve complex logic based on recipes, station capacity, etc.
    // For now, return basic estimates
    const estimates: TimeEstimate[] = items.map(item => ({
      dishId: item.productId,
      estimatedMinutes: item.preparationTime || 15, // Default 15 minutes
      complexity: item.preparationTime > 30 ? 'high' : item.preparationTime > 15 ? 'medium' : 'low',
      stationRequirements: this.determineStationRequirements(item),
    }));
    
    return estimates;
  }

  async reportQualityIssue(orderId: string, issue: QualityIssue, tenantId: string): Promise<QualityReport> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const query = `
        INSERT INTO quality_reports (
          order_id, tenant_id, issue_type, description, severity, reported_by
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const values = [
        orderId,
        tenantId,
        issue.type,
        issue.description,
        issue.severity,
        issue.reportedBy,
      ];
      
      const result = await client.query(query, values);
      
      // Update kitchen order to on_hold if critical issue
      if (issue.severity === 'critical') {
        await client.query(
          'UPDATE kitchen_orders SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3',
          ['on_hold', orderId, tenantId]
        );
      }
      
      await client.query('COMMIT');
      
      const row = result.rows[0];
      return {
        id: row.id,
        orderId: row.order_id,
        issue: {
          type: row.issue_type,
          description: row.description,
          severity: row.severity,
          reportedBy: row.reported_by,
        },
        resolution: row.resolution || '',
        resolvedBy: row.resolved_by,
        createdAt: new Date(row.created_at),
        resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to report quality issue: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  // Station Assignment and Workflow Management Methods
  async getStationAssignmentSuggestions(orderId: string, tenantId: string): Promise<any[]> {
    const query = `
      SELECT 
        ps.*,
        COUNT(CASE WHEN ko.status IN ('received', 'in_preparation') THEN 1 END) as active_orders,
        (ps.current_workload::float / ps.capacity * 100) as utilization_rate
      FROM preparation_stations ps
      LEFT JOIN kitchen_orders ko ON ko.assigned_stations::jsonb @> jsonb_build_array(jsonb_build_object('stationId', ps.id))
        AND ko.tenant_id = ps.tenant_id
        AND ko.status NOT IN ('ready_for_pickup', 'cancelled')
      WHERE ps.tenant_id = $1 AND ps.status = 'active'
      GROUP BY ps.id, ps.current_workload, ps.capacity
      ORDER BY utilization_rate ASC, ps.average_processing_time ASC
    `;
    
    try {
      const result = await pool.query(query, [tenantId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to get station assignment suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getOverloadedStations(tenantId: string, threshold: number = 90): Promise<any[]> {
    const query = `
      SELECT 
        ps.*,
        COUNT(CASE WHEN ko.status IN ('received', 'in_preparation') THEN 1 END) as active_orders,
        (ps.current_workload::float / ps.capacity * 100) as utilization_rate
      FROM preparation_stations ps
      LEFT JOIN kitchen_orders ko ON ko.assigned_stations::jsonb @> jsonb_build_array(jsonb_build_object('stationId', ps.id))
        AND ko.tenant_id = ps.tenant_id
        AND ko.status NOT IN ('ready_for_pickup', 'cancelled')
      WHERE ps.tenant_id = $1 AND ps.status = 'active'
      GROUP BY ps.id, ps.current_workload, ps.capacity
      HAVING (ps.current_workload::float / ps.capacity * 100) > $2
      ORDER BY utilization_rate DESC
    `;
    
    try {
      const result = await pool.query(query, [tenantId, threshold]);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to get overloaded stations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUnderutilizedStations(tenantId: string, threshold: number = 50): Promise<any[]> {
    const query = `
      SELECT 
        ps.*,
        COUNT(CASE WHEN ko.status IN ('received', 'in_preparation') THEN 1 END) as active_orders,
        (ps.current_workload::float / ps.capacity * 100) as utilization_rate
      FROM preparation_stations ps
      LEFT JOIN kitchen_orders ko ON ko.assigned_stations::jsonb @> jsonb_build_array(jsonb_build_object('stationId', ps.id))
        AND ko.tenant_id = ps.tenant_id
        AND ko.status NOT IN ('ready_for_pickup', 'cancelled')
      WHERE ps.tenant_id = $1 AND ps.status = 'active'
      GROUP BY ps.id, ps.current_workload, ps.capacity
      HAVING (ps.current_workload::float / ps.capacity * 100) < $2
      ORDER BY utilization_rate ASC
    `;
    
    try {
      const result = await pool.query(query, [tenantId, threshold]);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to get underutilized stations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async redistributeWorkload(fromStationId: string, toStationId: string, orderIds: string[], tenantId: string): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update orders to new station
      for (const orderId of orderIds) {
        // Get current assignments
        const orderResult = await client.query(
          'SELECT assigned_stations FROM kitchen_orders WHERE id = $1 AND tenant_id = $2',
          [orderId, tenantId]
        );
        
        if (orderResult.rows.length > 0) {
          const currentAssignments = JSON.parse(orderResult.rows[0].assigned_stations || '[]');
          
          // Update assignments to new station
          const updatedAssignments = currentAssignments.map((assignment: any) => {
            if (assignment.stationId === fromStationId) {
              return { ...assignment, stationId: toStationId };
            }
            return assignment;
          });
          
          await client.query(
            'UPDATE kitchen_orders SET assigned_stations = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3',
            [JSON.stringify(updatedAssignments), orderId, tenantId]
          );
        }
      }
      
      // Update station workloads
      await client.query(
        'UPDATE preparation_stations SET current_workload = current_workload - $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3',
        [orderIds.length, fromStationId, tenantId]
      );
      
      await client.query(
        'UPDATE preparation_stations SET current_workload = current_workload + $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3',
        [orderIds.length, toStationId, tenantId]
      );
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to redistribute workload: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  async updateStationCapacity(stationId: string, newCapacity: number, tenantId: string): Promise<boolean> {
    const query = `
      UPDATE preparation_stations 
      SET capacity = $1, updated_at = NOW() 
      WHERE id = $2 AND tenant_id = $3
    `;
    
    try {
      const result = await pool.query(query, [newCapacity, stationId, tenantId]);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      throw new Error(`Failed to update station capacity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async assignStaffToStation(staffId: string, stationId: string, tenantId: string): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get current station staff
      const stationResult = await client.query(
        'SELECT assigned_staff FROM preparation_stations WHERE id = $1 AND tenant_id = $2',
        [stationId, tenantId]
      );
      
      if (stationResult.rows.length === 0) {
        throw new Error('Station not found');
      }
      
      const currentStaff = JSON.parse(stationResult.rows[0].assigned_staff || '[]');
      
      // Check if staff is already assigned
      if (!currentStaff.find((staff: any) => staff.id === staffId)) {
        // Add staff to station (this would typically involve getting staff details)
        currentStaff.push({
          id: staffId,
          name: 'Staff Member', // Would be fetched from staff table
          role: 'cook',
          skills: [],
          currentStation: stationId,
        });
        
        await client.query(
          'UPDATE preparation_stations SET assigned_staff = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3',
          [JSON.stringify(currentStaff), stationId, tenantId]
        );
      }
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to assign staff to station: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  // Station management methods
  async findAllStations(tenantId: string): Promise<PreparationStation[]> {
    const query = `
      SELECT * FROM preparation_stations 
      WHERE tenant_id = $1 AND status != 'offline'
      ORDER BY name ASC
    `;
    
    try {
      const result = await pool.query(query, [tenantId]);
      return result.rows.map(row => this.mapRowToPreparationStation(row));
    } catch (error) {
      throw new Error(`Failed to find stations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findStationById(id: string, tenantId: string): Promise<PreparationStation | null> {
    const query = 'SELECT * FROM preparation_stations WHERE id = $1 AND tenant_id = $2';
    
    try {
      const result = await pool.query(query, [id, tenantId]);
      return result.rows[0] ? this.mapRowToPreparationStation(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Failed to find station by id: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper methods
  private mapRowToKitchenOrder(row: any): KitchenOrder {
    return KitchenOrderSchema.parse({
      id: row.id,
      orderId: row.order_id,
      tenantId: row.tenant_id,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
      status: row.status,
      priority: row.priority,
      specialInstructions: row.special_instructions || '',
      allergenAlerts: typeof row.allergen_alerts === 'string' ? JSON.parse(row.allergen_alerts) : row.allergen_alerts || [],
      estimatedCompletionTime: new Date(row.estimated_completion_time),
      actualStartTime: row.actual_start_time ? new Date(row.actual_start_time) : undefined,
      actualCompletionTime: row.actual_completion_time ? new Date(row.actual_completion_time) : undefined,
      assignedStations: typeof row.assigned_stations === 'string' ? JSON.parse(row.assigned_stations) : row.assigned_stations || [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  private mapRowToPreparationStation(row: any): PreparationStation {
    return PreparationStationSchema.parse({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      type: row.type,
      capacity: row.capacity,
      currentWorkload: row.current_workload,
      specializations: typeof row.specializations === 'string' ? JSON.parse(row.specializations) : row.specializations || [],
      equipment: typeof row.equipment === 'string' ? JSON.parse(row.equipment) : row.equipment || [],
      assignedStaff: typeof row.assigned_staff === 'string' ? JSON.parse(row.assigned_staff) : row.assigned_staff || [],
      status: row.status,
      averageProcessingTime: row.average_processing_time,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  // Status Tracking Methods
  async updateItemStatus(orderId: string, itemId: string, status: ItemStatus, tenantId: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get current order
      const orderResult = await client.query(
        'SELECT items FROM kitchen_orders WHERE id = $1 AND tenant_id = $2',
        [orderId, tenantId]
      );
      
      if (orderResult.rows.length === 0) {
        throw new Error('Kitchen order not found');
      }
      
      const items = JSON.parse(orderResult.rows[0].items);
      const itemIndex = items.findIndex((item: any) => item.id === itemId);
      
      if (itemIndex === -1) {
        throw new Error('Order item not found');
      }
      
      // Update item status
      items[itemIndex].status = status;
      if (status === 'completed') {
        items[itemIndex].actualTime = items[itemIndex].estimatedTime; // Would calculate actual time
      }
      
      // Update order
      await client.query(
        'UPDATE kitchen_orders SET items = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3',
        [JSON.stringify(items), orderId, tenantId]
      );
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to update item status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  async logStatusUpdate(log: Omit<StatusUpdateLog, 'id'>): Promise<StatusUpdateLog> {
    const query = `
      INSERT INTO status_update_logs (
        order_id, item_id, previous_status, new_status, updated_by, updated_at, station_id, notes, estimated_delay
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      log.orderId,
      log.itemId,
      log.previousStatus,
      log.newStatus,
      log.updatedBy,
      log.updatedAt,
      log.stationId,
      log.notes,
      log.estimatedDelay,
    ];
    
    try {
      const result = await pool.query(query, values);
      return this.mapRowToStatusUpdateLog(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to log status update: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getStatusUpdateHistory(orderId: string, tenantId: string): Promise<StatusUpdateLog[]> {
    const query = `
      SELECT sul.* FROM status_update_logs sul
      JOIN kitchen_orders ko ON sul.order_id = ko.id
      WHERE sul.order_id = $1 AND ko.tenant_id = $2
      ORDER BY sul.updated_at DESC
    `;
    
    try {
      const result = await pool.query(query, [orderId, tenantId]);
      return result.rows.map(row => this.mapRowToStatusUpdateLog(row));
    } catch (error) {
      throw new Error(`Failed to get status update history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateEstimatedCompletionTime(orderId: string, newTime: Date, tenantId: string): Promise<void> {
    const query = `
      UPDATE kitchen_orders 
      SET estimated_completion_time = $1, updated_at = NOW() 
      WHERE id = $2 AND tenant_id = $3
    `;
    
    try {
      await pool.query(query, [newTime, orderId, tenantId]);
    } catch (error) {
      throw new Error(`Failed to update estimated completion time: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createDelayNotification(notification: Omit<DelayNotification, 'id'>): Promise<DelayNotification> {
    const query = `
      INSERT INTO delay_notifications (
        order_id, delay_minutes, reason, notified_at, notification_method, customer_response, new_estimated_time
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      notification.orderId,
      notification.delayMinutes,
      notification.reason,
      notification.notifiedAt,
      notification.notificationMethod,
      notification.customerResponse,
      notification.newEstimatedTime,
    ];
    
    try {
      const result = await pool.query(query, values);
      return this.mapRowToDelayNotification(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to create delay notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createRemakeRequest(request: Omit<RemakeRequest, 'id'>): Promise<RemakeRequest> {
    const query = `
      INSERT INTO remake_requests (
        original_order_id, original_item_id, reason, requested_by, requested_at, priority, status, estimated_time
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      request.originalOrderId,
      request.originalItemId,
      request.reason,
      request.requestedBy,
      request.requestedAt,
      request.priority,
      request.status,
      request.estimatedTime,
    ];
    
    try {
      const result = await pool.query(query, values);
      return this.mapRowToRemakeRequest(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to create remake request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findRemakeRequestById(id: string, tenantId: string): Promise<RemakeRequest | null> {
    const query = `
      SELECT rr.* FROM remake_requests rr
      JOIN kitchen_orders ko ON rr.original_order_id = ko.id
      WHERE rr.id = $1 AND ko.tenant_id = $2
    `;
    
    try {
      const result = await pool.query(query, [id, tenantId]);
      return result.rows[0] ? this.mapRowToRemakeRequest(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Failed to find remake request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateRemakeRequest(id: string, updates: Partial<RemakeRequest>, tenantId: string): Promise<RemakeRequest> {
    const setClause = Object.keys(updates)
      .filter(key => key !== 'id')
      .map((key, index) => `${this.camelToSnake(key)} = $${index + 3}`)
      .join(', ');
    
    const values = [
      id,
      tenantId,
      ...Object.values(updates).filter((_, index) => Object.keys(updates)[index] !== 'id')
    ];
    
    const query = `
      UPDATE remake_requests 
      SET ${setClause}
      FROM kitchen_orders ko
      WHERE remake_requests.id = $1 AND remake_requests.original_order_id = ko.id AND ko.tenant_id = $2
      RETURNING remake_requests.*
    `;
    
    try {
      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('Remake request not found');
      }
      return this.mapRowToRemakeRequest(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to update remake request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createDeliveryCoordination(coordination: Omit<DeliveryCoordination, 'id'>): Promise<DeliveryCoordination> {
    const query = `
      INSERT INTO delivery_coordinations (
        order_id, status, estimated_pickup_time, coordinated_by, coordinated_at, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      coordination.orderId,
      coordination.status,
      coordination.estimatedPickupTime,
      coordination.coordinatedBy,
      coordination.coordinatedAt,
      coordination.notes,
    ];
    
    try {
      const result = await pool.query(query, values);
      return this.mapRowToDeliveryCoordination(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to create delivery coordination: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateDeliveryCoordination(id: string, updates: Partial<DeliveryCoordination>, tenantId: string): Promise<DeliveryCoordination | null> {
    const setClause = Object.keys(updates)
      .filter(key => key !== 'id')
      .map((key, index) => `${this.camelToSnake(key)} = $${index + 3}`)
      .join(', ');
    
    const values = [
      id,
      tenantId,
      ...Object.values(updates).filter((_, index) => Object.keys(updates)[index] !== 'id')
    ];
    
    const query = `
      UPDATE delivery_coordinations 
      SET ${setClause}
      FROM kitchen_orders ko
      WHERE delivery_coordinations.id = $1 AND delivery_coordinations.order_id = ko.id AND ko.tenant_id = $2
      RETURNING delivery_coordinations.*
    `;
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0] ? this.mapRowToDeliveryCoordination(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Failed to update delivery coordination: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPreparationStages(orderId: string, tenantId: string): Promise<PreparationStage[]> {
    const query = `
      SELECT ps.* FROM preparation_stages ps
      JOIN kitchen_orders ko ON ps.order_id = ko.id
      WHERE ps.order_id = $1 AND ko.tenant_id = $2
      ORDER BY ps.item_id, 
        CASE ps.stage 
          WHEN 'prep' THEN 1 
          WHEN 'cooking' THEN 2 
          WHEN 'plating' THEN 3 
          WHEN 'quality_check' THEN 4 
          WHEN 'ready' THEN 5 
        END
    `;
    
    try {
      const result = await pool.query(query, [orderId, tenantId]);
      return result.rows.map(row => this.mapRowToPreparationStage(row));
    } catch (error) {
      throw new Error(`Failed to get preparation stages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updatePreparationStage(id: string, updates: Partial<PreparationStage>, tenantId: string): Promise<PreparationStage | null> {
    const setClause = Object.keys(updates)
      .filter(key => key !== 'id')
      .map((key, index) => `${this.camelToSnake(key)} = $${index + 3}`)
      .join(', ');
    
    const values = [
      id,
      tenantId,
      ...Object.values(updates).filter((_, index) => Object.keys(updates)[index] !== 'id')
    ];
    
    const query = `
      UPDATE preparation_stages 
      SET ${setClause}
      FROM kitchen_orders ko
      WHERE preparation_stages.id = $1 AND preparation_stages.order_id = ko.id AND ko.tenant_id = $2
      RETURNING preparation_stages.*
    `;
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0] ? this.mapRowToPreparationStage(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Failed to update preparation stage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper mapping methods
  private mapRowToStatusUpdateLog(row: any): StatusUpdateLog {
    return {
      id: row.id,
      orderId: row.order_id,
      itemId: row.item_id,
      previousStatus: row.previous_status,
      newStatus: row.new_status,
      updatedBy: row.updated_by,
      updatedAt: row.updated_at,
      stationId: row.station_id,
      notes: row.notes,
      estimatedDelay: row.estimated_delay,
    };
  }

  private mapRowToDelayNotification(row: any): DelayNotification {
    return {
      id: row.id,
      orderId: row.order_id,
      delayMinutes: row.delay_minutes,
      reason: row.reason,
      notifiedAt: row.notified_at,
      notificationMethod: row.notification_method,
      customerResponse: row.customer_response,
      newEstimatedTime: row.new_estimated_time,
    };
  }

  private mapRowToRemakeRequest(row: any): RemakeRequest {
    return {
      id: row.id,
      originalOrderId: row.original_order_id,
      originalItemId: row.original_item_id,
      reason: row.reason,
      requestedBy: row.requested_by,
      requestedAt: row.requested_at,
      priority: row.priority,
      status: row.status,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      newOrderId: row.new_order_id,
      estimatedTime: row.estimated_time,
    };
  }

  private mapRowToDeliveryCoordination(row: any): DeliveryCoordination {
    return {
      id: row.id,
      orderId: row.order_id,
      status: row.status,
      estimatedPickupTime: row.estimated_pickup_time,
      actualPickupTime: row.actual_pickup_time,
      deliveryPersonId: row.delivery_person_id,
      deliveryPersonName: row.delivery_person_name,
      coordinatedBy: row.coordinated_by,
      coordinatedAt: row.coordinated_at,
      notes: row.notes,
    };
  }

  private mapRowToPreparationStage(row: any): PreparationStage {
    return {
      id: row.id,
      orderId: row.order_id,
      itemId: row.item_id,
      stage: row.stage,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      estimatedDuration: row.estimated_duration,
      actualDuration: row.actual_duration,
      stationId: row.station_id,
      assignedTo: row.assigned_to,
      notes: row.notes,
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  private determineStationRequirements(item: any): string[] {
    // This would typically be based on product category, cooking method, etc.
    // For now, return basic requirements based on item properties
    const requirements: string[] = [];
    
    if (item.category === 'main_course') {
      requirements.push('grill', 'main_course');
    } else if (item.category === 'salad') {
      requirements.push('salad');
    } else if (item.category === 'dessert') {
      requirements.push('dessert');
    } else if (item.category === 'beverage') {
      requirements.push('beverage');
    } else {
      requirements.push('appetizer');
    }
    
    return requirements;
  }

  // Station Display System Methods
  async createHelpRequest(request: any, tenantId: string): Promise<any> {
    const query = `
      INSERT INTO help_requests (
        station_id, request_type, description, priority, requested_by, requested_at, status, tenant_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      request.stationId,
      request.requestType,
      request.description,
      request.priority,
      request.requestedBy,
      request.requestedAt,
      request.status,
      tenantId,
    ];
    
    try {
      const result = await pool.query(query, values);
      return this.mapRowToHelpRequest(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to create help request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createStationIssueReport(issue: any, tenantId: string): Promise<any> {
    const query = `
      INSERT INTO station_issue_reports (
        station_id, issue_type, description, severity, affected_equipment, estimated_downtime, 
        reported_by, reported_at, status, tenant_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const values = [
      issue.stationId,
      issue.type,
      issue.description,
      issue.severity,
      JSON.stringify(issue.affectedEquipment || []),
      issue.estimatedDowntime || 0,
      issue.reportedBy,
      issue.reportedAt,
      issue.status,
      tenantId,
    ];
    
    try {
      const result = await pool.query(query, values);
      return this.mapRowToStationIssueReport(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to create station issue report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateStationStatus(stationId: string, status: string, tenantId: string): Promise<boolean> {
    const query = `
      UPDATE preparation_stations 
      SET status = $1, updated_at = NOW() 
      WHERE id = $2 AND tenant_id = $3
    `;
    
    try {
      const result = await pool.query(query, [status, stationId, tenantId]);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      throw new Error(`Failed to update station status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper mapping methods for station display
  private mapRowToHelpRequest(row: any): any {
    return {
      id: row.id,
      stationId: row.station_id,
      requestType: row.request_type,
      description: row.description,
      priority: row.priority,
      requestedBy: row.requested_by,
      requestedAt: new Date(row.requested_at),
      status: row.status,
      resolvedBy: row.resolved_by,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
    };
  }

  private mapRowToStationIssueReport(row: any): any {
    return {
      id: row.id,
      stationId: row.station_id,
      type: row.issue_type,
      description: row.description,
      severity: row.severity,
      affectedEquipment: typeof row.affected_equipment === 'string' 
        ? JSON.parse(row.affected_equipment) 
        : row.affected_equipment || [],
      estimatedDowntime: row.estimated_downtime,
      reportedBy: row.reported_by,
      reportedAt: new Date(row.reported_at),
      status: row.status,
      resolvedBy: row.resolved_by,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
    };
  }
}