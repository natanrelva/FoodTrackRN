import { Pool } from 'pg';
import { getDbConnection } from '@foodtrack/backend-shared';

export interface AuditLogEntry {
  tenantId: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLog extends AuditLogEntry {
  id: string;
  createdAt: Date;
}

export class AuditRepository {
  private db: Pool;

  constructor() {
    this.db = getDbConnection();
  }

  /**
   * Creates a new audit log entry
   */
  async create(entry: AuditLogEntry): Promise<AuditLog> {
    const query = `
      INSERT INTO audit_logs (
        tenant_id, entity_type, entity_id, action, 
        old_values, new_values, metadata, user_id, 
        ip_address, user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, tenant_id, entity_type, entity_id, action, 
                old_values, new_values, metadata, user_id, 
                ip_address, user_agent, created_at
    `;

    const values = [
      entry.tenantId,
      entry.entityType,
      entry.entityId,
      entry.action,
      entry.oldValues ? JSON.stringify(entry.oldValues) : null,
      entry.newValues ? JSON.stringify(entry.newValues) : null,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
      entry.userId || null,
      entry.ipAddress || null,
      entry.userAgent || null,
    ];

    try {
      const result = await this.db.query(query, values);
      const row = result.rows[0];

      return {
        id: row.id,
        tenantId: row.tenant_id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        action: row.action,
        oldValues: row.old_values ? JSON.parse(row.old_values) : undefined,
        newValues: row.new_values ? JSON.parse(row.new_values) : undefined,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        userId: row.user_id,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        createdAt: row.created_at,
      };
    } catch (error) {
      console.error('Error creating audit log:', error);
      throw new Error('Failed to create audit log entry');
    }
  }

  /**
   * Logs an order status change
   */
  async logOrderStatusChange(
    orderId: string,
    tenantId: string,
    fromStatus: string,
    toStatus: string,
    reason?: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuditLog> {
    const entry: AuditLogEntry = {
      tenantId,
      entityType: 'order',
      entityId: orderId,
      action: 'status_change',
      oldValues: { status: fromStatus },
      newValues: { status: toStatus },
      metadata: reason ? { reason } : undefined,
      userId,
      ipAddress,
      userAgent,
    };

    return await this.create(entry);
  }

  /**
   * Logs order creation
   */
  async logOrderCreation(
    orderId: string,
    tenantId: string,
    orderData: Record<string, any>,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuditLog> {
    const entry: AuditLogEntry = {
      tenantId,
      entityType: 'order',
      entityId: orderId,
      action: 'create',
      newValues: orderData,
      userId,
      ipAddress,
      userAgent,
    };

    return await this.create(entry);
  }

  /**
   * Logs order updates
   */
  async logOrderUpdate(
    orderId: string,
    tenantId: string,
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuditLog> {
    const entry: AuditLogEntry = {
      tenantId,
      entityType: 'order',
      entityId: orderId,
      action: 'update',
      oldValues,
      newValues,
      userId,
      ipAddress,
      userAgent,
    };

    return await this.create(entry);
  }

  /**
   * Gets audit logs for a specific entity
   */
  async getEntityAuditLogs(
    entityType: string,
    entityId: string,
    tenantId: string,
    limit: number = 50
  ): Promise<AuditLog[]> {
    const query = `
      SELECT id, tenant_id, entity_type, entity_id, action, 
             old_values, new_values, metadata, user_id, 
             ip_address, user_agent, created_at
      FROM audit_logs
      WHERE tenant_id = $1 AND entity_type = $2 AND entity_id = $3
      ORDER BY created_at DESC
      LIMIT $4
    `;

    try {
      const result = await this.db.query(query, [tenantId, entityType, entityId, limit]);
      
      return result.rows.map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        action: row.action,
        oldValues: row.old_values ? JSON.parse(row.old_values) : undefined,
        newValues: row.new_values ? JSON.parse(row.new_values) : undefined,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        userId: row.user_id,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw new Error('Failed to fetch audit logs');
    }
  }

  /**
   * Gets audit logs for a specific order
   */
  async getOrderAuditLogs(orderId: string, tenantId: string): Promise<AuditLog[]> {
    return await this.getEntityAuditLogs('order', orderId, tenantId);
  }

  /**
   * Gets recent audit logs for a tenant
   */
  async getRecentAuditLogs(
    tenantId: string,
    entityType?: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    let query = `
      SELECT id, tenant_id, entity_type, entity_id, action, 
             old_values, new_values, metadata, user_id, 
             ip_address, user_agent, created_at
      FROM audit_logs
      WHERE tenant_id = $1
    `;

    const values: any[] = [tenantId];

    if (entityType) {
      query += ` AND entity_type = $2`;
      values.push(entityType);
      query += ` ORDER BY created_at DESC LIMIT $3`;
      values.push(limit);
    } else {
      query += ` ORDER BY created_at DESC LIMIT $2`;
      values.push(limit);
    }

    try {
      const result = await this.db.query(query, values);
      
      return result.rows.map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        action: row.action,
        oldValues: row.old_values ? JSON.parse(row.old_values) : undefined,
        newValues: row.new_values ? JSON.parse(row.new_values) : undefined,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        userId: row.user_id,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error('Error fetching recent audit logs:', error);
      throw new Error('Failed to fetch recent audit logs');
    }
  }
}