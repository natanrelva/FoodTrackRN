import { DomainEvent } from '@foodtrack/types';

export interface EventHandler<T extends DomainEvent = DomainEvent> {
  handle(event: T): Promise<void>;
}

export class EventBus {
  private static instance: EventBus;
  private handlers = new Map<string, EventHandler[]>();

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler as EventHandler);
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType) || [];
    
    // Execute handlers in parallel
    await Promise.all(
      handlers.map(handler => 
        handler.handle(event).catch(error => {
          console.error(`Error handling event ${event.eventType}:`, error);
          // In production, you might want to implement retry logic or dead letter queue
        })
      )
    );
  }

  async publishMany(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  getHandlerCount(eventType: string): number {
    return this.handlers.get(eventType)?.length || 0;
  }

  clear(): void {
    this.handlers.clear();
  }
}

export class EventStore {
  private pool: any; // Will be injected

  constructor(pool: any) {
    this.pool = pool;
  }

  async saveEvents(streamId: string, events: DomainEvent[]): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const event of events) {
        await client.query(
          `INSERT INTO domain_events 
           (id, stream_id, event_type, event_version, tenant_id, aggregate_id, aggregate_type, 
            causation_id, correlation_id, occurred_at, event_data) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            event.id,
            streamId,
            event.eventType,
            event.eventVersion,
            event.tenantId,
            event.aggregateId,
            event.aggregateType,
            event.causationId,
            event.correlationId,
            event.occurredAt,
            JSON.stringify(event.payload)
          ]
        );
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getEvents(streamId: string, fromVersion?: number): Promise<DomainEvent[]> {
    let query = 'SELECT * FROM domain_events WHERE stream_id = $1';
    const values: any[] = [streamId];

    if (fromVersion !== undefined) {
      query += ' AND event_version > $2';
      values.push(fromVersion);
    }

    query += ' ORDER BY event_version ASC';

    const result = await this.pool.query(query, values);
    
    return result.rows.map((row: any) => ({
      id: row.id,
      eventType: row.event_type,
      eventVersion: row.event_version,
      tenantId: row.tenant_id,
      aggregateId: row.aggregate_id,
      aggregateType: row.aggregate_type,
      causationId: row.causation_id,
      correlationId: row.correlation_id,
      occurredAt: new Date(row.occurred_at),
      payload: JSON.parse(row.event_data)
    }));
  }
}

// Export kitchen events
export * from './events/KitchenEvents';