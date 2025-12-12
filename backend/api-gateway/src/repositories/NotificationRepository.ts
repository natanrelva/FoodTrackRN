import { Pool, PoolClient } from 'pg';
import { 
  Notification, 
  CreateNotificationRequest, 
  NotificationFilters, 
  PaginatedNotifications,
  NotificationStatus,
  NotificationChannel,
  NotificationType,
  NotificationPreferences
} from '@foodtrack/backend-shared';
import { getDbConnection } from '@foodtrack/backend-shared';
import { randomUUID } from 'crypto';

export class NotificationRepository {
  private pool: Pool;

  constructor() {
    this.pool = getDbConnection();
  }

  /**
   * Creates a new notification
   */
  async create(notificationData: CreateNotificationRequest, tenantId: string): Promise<Notification> {
    const client = await this.pool.connect();
    
    try {
      const notification: Omit<Notification, 'createdAt' | 'updatedAt'> = {
        id: randomUUID(),
        tenantId,
        orderId: notificationData.orderId,
        customerId: notificationData.customerId,
        type: notificationData.type,
        channel: notificationData.channel,
        status: 'pending',
        recipient: notificationData.recipient,
        subject: notificationData.subject,
        message: notificationData.message,
        metadata: notificationData.metadata,
        retryCount: 0,
        maxRetries: notificationData.maxRetries,
      };

      const query = `
        INSERT INTO notifications (
          id, tenant_id, order_id, customer_id, type, channel, status,
          recipient, subject, message, metadata, retry_count, max_retries,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
        ) RETURNING *
      `;

      const values = [
        notification.id,
        notification.tenantId,
        notification.orderId,
        notification.customerId,
        notification.type,
        notification.channel,
        notification.status,
        notification.recipient,
        notification.subject,
        notification.message,
        notification.metadata ? JSON.stringify(notification.metadata) : null,
        notification.retryCount,
        notification.maxRetries,
      ];

      const result = await client.query(query, values);
      return this.mapRowToNotification(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Finds a notification by ID
   */
  async findById(id: string, tenantId: string): Promise<Notification | null> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM notifications 
        WHERE id = $1 AND tenant_id = $2
      `;
      
      const result = await client.query(query, [id, tenantId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToNotification(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Finds all notifications for an order
   */
  async findByOrderId(orderId: string, tenantId: string): Promise<Notification[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM notifications 
        WHERE order_id = $1 AND tenant_id = $2
        ORDER BY created_at DESC
      `;
      
      const result = await client.query(query, [orderId, tenantId]);
      return result.rows.map(row => this.mapRowToNotification(row));
    } finally {
      client.release();
    }
  }

  /**
   * Finds notifications with filters and pagination
   */
  async findAll(tenantId: string, filters: NotificationFilters): Promise<PaginatedNotifications> {
    const client = await this.pool.connect();
    
    try {
      const conditions: string[] = ['tenant_id = $1'];
      const values: any[] = [tenantId];
      let paramCount = 1;

      // Build WHERE conditions
      if (filters.orderId) {
        conditions.push(`order_id = $${++paramCount}`);
        values.push(filters.orderId);
      }

      if (filters.customerId) {
        conditions.push(`customer_id = $${++paramCount}`);
        values.push(filters.customerId);
      }

      if (filters.type && filters.type.length > 0) {
        conditions.push(`type = ANY($${++paramCount})`);
        values.push(filters.type);
      }

      if (filters.channel && filters.channel.length > 0) {
        conditions.push(`channel = ANY($${++paramCount})`);
        values.push(filters.channel);
      }

      if (filters.status && filters.status.length > 0) {
        conditions.push(`status = ANY($${++paramCount})`);
        values.push(filters.status);
      }

      if (filters.dateFrom) {
        conditions.push(`created_at >= $${++paramCount}`);
        values.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        conditions.push(`created_at <= $${++paramCount}`);
        values.push(filters.dateTo);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count total records
      const countQuery = `SELECT COUNT(*) FROM notifications ${whereClause}`;
      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Calculate pagination
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 20, 100);
      const offset = (page - 1) * limit;
      const pages = Math.ceil(total / limit);

      // Get paginated results
      const dataQuery = `
        SELECT * FROM notifications 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;
      
      values.push(limit, offset);
      const dataResult = await client.query(dataQuery, values);

      const notifications = dataResult.rows.map(row => this.mapRowToNotification(row));

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages,
        },
      };
    } finally {
      client.release();
    }
  }

  /**
   * Updates notification status and related fields
   */
  async updateStatus(
    id: string, 
    status: NotificationStatus, 
    tenantId: string,
    errorMessage?: string,
    deliveredAt?: Date
  ): Promise<Notification | null> {
    const client = await this.pool.connect();
    
    try {
      const updates: string[] = ['status = $3', 'updated_at = NOW()'];
      const values: any[] = [id, tenantId, status];
      let paramCount = 3;

      if (status === 'sent') {
        updates.push(`sent_at = $${++paramCount}`);
        values.push(new Date());
      }

      if (status === 'delivered' && deliveredAt) {
        updates.push(`delivered_at = $${++paramCount}`);
        values.push(deliveredAt);
      }

      if (status === 'failed') {
        updates.push(`failed_at = $${++paramCount}`);
        values.push(new Date());
        
        if (errorMessage) {
          updates.push(`error_message = $${++paramCount}`);
          values.push(errorMessage);
        }
      }

      const query = `
        UPDATE notifications 
        SET ${updates.join(', ')}
        WHERE id = $1 AND tenant_id = $2
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToNotification(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Increments retry count and sets next retry time
   */
  async incrementRetryCount(id: string, tenantId: string, nextRetryAt: Date): Promise<Notification | null> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE notifications 
        SET 
          retry_count = retry_count + 1,
          next_retry_at = $3,
          status = 'retrying',
          updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
        RETURNING *
      `;

      const result = await client.query(query, [id, tenantId, nextRetryAt]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToNotification(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Finds notifications that need to be retried
   */
  async findNotificationsForRetry(tenantId: string): Promise<Notification[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM notifications 
        WHERE tenant_id = $1 
          AND status IN ('failed', 'retrying')
          AND retry_count < max_retries
          AND (next_retry_at IS NULL OR next_retry_at <= NOW())
        ORDER BY created_at ASC
        LIMIT 100
      `;
      
      const result = await client.query(query, [tenantId]);
      return result.rows.map(row => this.mapRowToNotification(row));
    } finally {
      client.release();
    }
  }

  /**
   * Gets notification statistics for a tenant
   */
  async getNotificationStats(tenantId: string, dateRange?: { startDate: Date; endDate: Date }): Promise<{
    totalNotifications: number;
    sentNotifications: number;
    failedNotifications: number;
    pendingNotifications: number;
    deliveredNotifications: number;
    notificationsByChannel: Record<NotificationChannel, number>;
    notificationsByType: Record<NotificationType, number>;
  }> {
    const client = await this.pool.connect();
    
    try {
      const conditions: string[] = ['tenant_id = $1'];
      const values: any[] = [tenantId];
      let paramCount = 1;

      if (dateRange) {
        conditions.push(`created_at >= $${++paramCount}`);
        values.push(dateRange.startDate);
        conditions.push(`created_at <= $${++paramCount}`);
        values.push(dateRange.endDate);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get overall stats
      const statsQuery = `
        SELECT 
          COUNT(*) as total_notifications,
          COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_notifications,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_notifications,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_notifications,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_notifications
        FROM notifications ${whereClause}
      `;

      const statsResult = await client.query(statsQuery, values);
      const stats = statsResult.rows[0];

      // Get notifications by channel
      const channelQuery = `
        SELECT channel, COUNT(*) as count
        FROM notifications ${whereClause}
        GROUP BY channel
      `;

      const channelResult = await client.query(channelQuery, values);
      const notificationsByChannel: Record<string, number> = {};
      channelResult.rows.forEach(row => {
        notificationsByChannel[row.channel] = parseInt(row.count);
      });

      // Get notifications by type
      const typeQuery = `
        SELECT type, COUNT(*) as count
        FROM notifications ${whereClause}
        GROUP BY type
      `;

      const typeResult = await client.query(typeQuery, values);
      const notificationsByType: Record<string, number> = {};
      typeResult.rows.forEach(row => {
        notificationsByType[row.type] = parseInt(row.count);
      });

      return {
        totalNotifications: parseInt(stats.total_notifications),
        sentNotifications: parseInt(stats.sent_notifications),
        failedNotifications: parseInt(stats.failed_notifications),
        pendingNotifications: parseInt(stats.pending_notifications),
        deliveredNotifications: parseInt(stats.delivered_notifications),
        notificationsByChannel: notificationsByChannel as Record<NotificationChannel, number>,
        notificationsByType: notificationsByType as Record<NotificationType, number>,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Creates or updates notification preferences for a customer
   */
  async upsertNotificationPreferences(preferences: Omit<NotificationPreferences, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationPreferences> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO notification_preferences (
          id, tenant_id, customer_id, preferred_channels, enabled_types,
          whatsapp_number, sms_number, email, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
        )
        ON CONFLICT (tenant_id, customer_id) 
        DO UPDATE SET
          preferred_channels = EXCLUDED.preferred_channels,
          enabled_types = EXCLUDED.enabled_types,
          whatsapp_number = EXCLUDED.whatsapp_number,
          sms_number = EXCLUDED.sms_number,
          email = EXCLUDED.email,
          updated_at = NOW()
        RETURNING *
      `;

      const values = [
        randomUUID(),
        preferences.tenantId,
        preferences.customerId,
        JSON.stringify(preferences.preferredChannels),
        JSON.stringify(preferences.enabledTypes),
        preferences.whatsappNumber,
        preferences.smsNumber,
        preferences.email,
      ];

      const result = await client.query(query, values);
      return this.mapRowToNotificationPreferences(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Gets notification preferences for a customer
   */
  async getNotificationPreferences(customerId: string, tenantId: string): Promise<NotificationPreferences | null> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM notification_preferences 
        WHERE customer_id = $1 AND tenant_id = $2
      `;
      
      const result = await client.query(query, [customerId, tenantId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToNotificationPreferences(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Deletes old notifications (cleanup job)
   */
  async deleteOldNotifications(tenantId: string, olderThanDays: number = 90): Promise<number> {
    const client = await this.pool.connect();
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const query = `
        DELETE FROM notifications 
        WHERE tenant_id = $1 AND created_at < $2
      `;

      const result = await client.query(query, [tenantId, cutoffDate]);
      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  /**
   * Maps database row to Notification object
   */
  private mapRowToNotification(row: any): Notification {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      orderId: row.order_id,
      customerId: row.customer_id,
      type: row.type,
      channel: row.channel,
      status: row.status,
      recipient: row.recipient,
      subject: row.subject,
      message: row.message,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      sentAt: row.sent_at,
      deliveredAt: row.delivered_at,
      failedAt: row.failed_at,
      errorMessage: row.error_message,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      nextRetryAt: row.next_retry_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Maps database row to NotificationPreferences object
   */
  private mapRowToNotificationPreferences(row: any): NotificationPreferences {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      customerId: row.customer_id,
      preferredChannels: JSON.parse(row.preferred_channels),
      enabledTypes: JSON.parse(row.enabled_types),
      whatsappNumber: row.whatsapp_number,
      smsNumber: row.sms_number,
      email: row.email,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}