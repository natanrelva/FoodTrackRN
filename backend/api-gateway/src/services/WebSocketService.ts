import { Server as SocketIOServer, Socket } from 'socket.io';
import { EventBus, EventHandler } from '@foodtrack/backend-shared';
import { DomainEvent } from '@foodtrack/types';

export interface WebSocketConnection {
  id: string;
  tenantId?: string;
  userId?: string;
  userType?: 'customer' | 'kitchen' | 'tenant' | 'admin';
  rooms: string[];
  connectedAt: Date;
}

export class WebSocketService implements EventHandler {
  private connections = new Map<string, WebSocketConnection>();
  private eventBus: EventBus;

  constructor(private io: SocketIOServer) {
    this.eventBus = EventBus.getInstance();
    this.setupEventHandlers();
    this.setupSocketHandlers();
  }

  private setupEventHandlers(): void {
    // Subscribe to all domain events to broadcast them
    this.eventBus.subscribe('OrderCreated', this);
    this.eventBus.subscribe('OrderConfirmed', this);
    this.eventBus.subscribe('OrderStatusUpdated', this);
    this.eventBus.subscribe('OrderCancelled', this);
    this.eventBus.subscribe('ProductionContractCreated', this);
    this.eventBus.subscribe('KitchenOrderCreated', this);
    this.eventBus.subscribe('KitchenOrderStatusChanged', this);
    this.eventBus.subscribe('IngredientConsumed', this);
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`🔌 WebSocket client connected: ${socket.id}`);
      
      // Initialize connection
      const connection: WebSocketConnection = {
        id: socket.id,
        rooms: [],
        connectedAt: new Date()
      };
      this.connections.set(socket.id, connection);

      // Authentication handler
      socket.on('authenticate', (data: { tenantId?: string; userId?: string; userType?: string }) => {
        this.handleAuthentication(socket, data);
      });

      // Room subscription handlers
      socket.on('subscribe:tenant', (tenantId: string) => {
        this.handleTenantSubscription(socket, tenantId);
      });

      socket.on('subscribe:kitchen', (tenantId: string) => {
        this.handleKitchenSubscription(socket, tenantId);
      });

      socket.on('subscribe:order', (orderId: string) => {
        this.handleOrderSubscription(socket, orderId);
      });

      socket.on('subscribe:customer', (customerId: string) => {
        this.handleCustomerSubscription(socket, customerId);
      });

      // Unsubscribe handlers
      socket.on('unsubscribe:tenant', (tenantId: string) => {
        this.handleTenantUnsubscription(socket, tenantId);
      });

      socket.on('unsubscribe:kitchen', (tenantId: string) => {
        this.handleKitchenUnsubscription(socket, tenantId);
      });

      socket.on('unsubscribe:order', (orderId: string) => {
        this.handleOrderUnsubscription(socket, orderId);
      });

      // Heartbeat/ping handler
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() });
      });

      // Disconnect handler
      socket.on('disconnect', (reason) => {
        this.handleDisconnection(socket, reason);
      });

      // Error handler
      socket.on('error', (error) => {
        console.error(`🔌 WebSocket error for ${socket.id}:`, error);
      });
    });
  }

  private handleAuthentication(socket: Socket, data: { tenantId?: string; userId?: string; userType?: string }): void {
    const connection = this.connections.get(socket.id);
    if (!connection) return;

    // Update connection with auth data
    connection.tenantId = data.tenantId;
    connection.userId = data.userId;
    connection.userType = data.userType as any;

    this.connections.set(socket.id, connection);

    console.log(`🔐 Client ${socket.id} authenticated as ${data.userType} for tenant ${data.tenantId}`);
    
    socket.emit('authenticated', {
      success: true,
      tenantId: data.tenantId,
      userId: data.userId,
      userType: data.userType
    });
  }

  private handleTenantSubscription(socket: Socket, tenantId: string): void {
    const connection = this.connections.get(socket.id);
    if (!connection) return;

    const roomName = `tenant:${tenantId}`;
    socket.join(roomName);
    
    if (!connection.rooms.includes(roomName)) {
      connection.rooms.push(roomName);
    }

    console.log(`📊 Client ${socket.id} subscribed to tenant ${tenantId}`);
    socket.emit('subscribed', { room: roomName, type: 'tenant' });
  }

  private handleKitchenSubscription(socket: Socket, tenantId: string): void {
    const connection = this.connections.get(socket.id);
    if (!connection) return;

    const roomName = `kitchen:${tenantId}`;
    socket.join(roomName);
    
    if (!connection.rooms.includes(roomName)) {
      connection.rooms.push(roomName);
    }

    console.log(`👨‍🍳 Client ${socket.id} subscribed to kitchen ${tenantId}`);
    socket.emit('subscribed', { room: roomName, type: 'kitchen' });
  }

  private handleOrderSubscription(socket: Socket, orderId: string): void {
    const connection = this.connections.get(socket.id);
    if (!connection) return;

    const roomName = `order:${orderId}`;
    socket.join(roomName);
    
    if (!connection.rooms.includes(roomName)) {
      connection.rooms.push(roomName);
    }

    console.log(`📦 Client ${socket.id} subscribed to order ${orderId}`);
    socket.emit('subscribed', { room: roomName, type: 'order' });
  }

  private handleCustomerSubscription(socket: Socket, customerId: string): void {
    const connection = this.connections.get(socket.id);
    if (!connection) return;

    const roomName = `customer:${customerId}`;
    socket.join(roomName);
    
    if (!connection.rooms.includes(roomName)) {
      connection.rooms.push(roomName);
    }

    console.log(`👤 Client ${socket.id} subscribed to customer ${customerId}`);
    socket.emit('subscribed', { room: roomName, type: 'customer' });
  }

  private handleTenantUnsubscription(socket: Socket, tenantId: string): void {
    const roomName = `tenant:${tenantId}`;
    socket.leave(roomName);
    
    const connection = this.connections.get(socket.id);
    if (connection) {
      connection.rooms = connection.rooms.filter(room => room !== roomName);
    }

    console.log(`📊 Client ${socket.id} unsubscribed from tenant ${tenantId}`);
    socket.emit('unsubscribed', { room: roomName, type: 'tenant' });
  }

  private handleKitchenUnsubscription(socket: Socket, tenantId: string): void {
    const roomName = `kitchen:${tenantId}`;
    socket.leave(roomName);
    
    const connection = this.connections.get(socket.id);
    if (connection) {
      connection.rooms = connection.rooms.filter(room => room !== roomName);
    }

    console.log(`👨‍🍳 Client ${socket.id} unsubscribed from kitchen ${tenantId}`);
    socket.emit('unsubscribed', { room: roomName, type: 'kitchen' });
  }

  private handleOrderUnsubscription(socket: Socket, orderId: string): void {
    const roomName = `order:${orderId}`;
    socket.leave(roomName);
    
    const connection = this.connections.get(socket.id);
    if (connection) {
      connection.rooms = connection.rooms.filter(room => room !== roomName);
    }

    console.log(`📦 Client ${socket.id} unsubscribed from order ${orderId}`);
    socket.emit('unsubscribed', { room: roomName, type: 'order' });
  }

  private handleDisconnection(socket: Socket, reason: string): void {
    console.log(`🔌 Client ${socket.id} disconnected: ${reason}`);
    this.connections.delete(socket.id);
  }

  // EventHandler implementation - handle domain events and broadcast them
  async handle(event: DomainEvent): Promise<void> {
    try {
      await this.broadcastEvent(event);
    } catch (error) {
      console.error('🔌 Error broadcasting event:', error);
    }
  }

  private async broadcastEvent(event: DomainEvent): Promise<void> {
    const { eventType, tenantId, payload } = event;

    // Broadcast to tenant room
    if (tenantId) {
      this.io.to(`tenant:${tenantId}`).emit('domain_event', {
        type: eventType,
        tenantId,
        payload,
        timestamp: event.occurredAt
      });
    }

    // Specific event handling
    switch (eventType) {
      case 'OrderCreated':
      case 'OrderConfirmed':
      case 'OrderStatusUpdated':
      case 'OrderCancelled':
        await this.handleOrderEvent(event);
        break;

      case 'KitchenOrderCreated':
      case 'KitchenOrderStatusChanged':
        await this.handleKitchenEvent(event);
        break;

      case 'ProductionContractCreated':
        await this.handleProductionContractEvent(event);
        break;

      case 'IngredientConsumed':
        await this.handleSupplyEvent(event);
        break;
    }
  }

  private async handleOrderEvent(event: DomainEvent): Promise<void> {
    const { tenantId, payload } = event;
    const orderId = payload.orderId;

    // Broadcast to specific order room
    if (orderId) {
      this.io.to(`order:${orderId}`).emit('order_update', {
        type: event.eventType,
        orderId,
        data: payload,
        timestamp: event.occurredAt
      });
    }

    // Broadcast to customer if available
    if (payload.customerId) {
      this.io.to(`customer:${payload.customerId}`).emit('order_update', {
        type: event.eventType,
        orderId,
        data: payload,
        timestamp: event.occurredAt
      });
    }

    // Broadcast to tenant dashboard
    if (tenantId) {
      this.io.to(`tenant:${tenantId}`).emit('dashboard_update', {
        type: 'order',
        event: event.eventType,
        data: payload,
        timestamp: event.occurredAt
      });
    }
  }

  private async handleKitchenEvent(event: DomainEvent): Promise<void> {
    const { tenantId, payload } = event;

    // Broadcast to kitchen room
    if (tenantId) {
      this.io.to(`kitchen:${tenantId}`).emit('kitchen_update', {
        type: event.eventType,
        data: payload,
        timestamp: event.occurredAt
      });
    }

    // Also broadcast to order room if orderId is available
    if (payload.orderId) {
      this.io.to(`order:${payload.orderId}`).emit('kitchen_update', {
        type: event.eventType,
        data: payload,
        timestamp: event.occurredAt
      });
    }
  }

  private async handleProductionContractEvent(event: DomainEvent): Promise<void> {
    const { tenantId, payload } = event;

    // Broadcast to kitchen room (production contracts are for kitchen)
    if (tenantId) {
      this.io.to(`kitchen:${tenantId}`).emit('production_contract_update', {
        type: event.eventType,
        data: payload,
        timestamp: event.occurredAt
      });
    }
  }

  private async handleSupplyEvent(event: DomainEvent): Promise<void> {
    const { tenantId, payload } = event;

    // Broadcast to tenant dashboard for supply management
    if (tenantId) {
      this.io.to(`tenant:${tenantId}`).emit('supply_update', {
        type: event.eventType,
        data: payload,
        timestamp: event.occurredAt
      });
    }
  }

  // Public methods for manual broadcasting
  public broadcastToTenant(tenantId: string, event: string, data: any): void {
    this.io.to(`tenant:${tenantId}`).emit(event, data);
  }

  public broadcastToKitchen(tenantId: string, event: string, data: any): void {
    this.io.to(`kitchen:${tenantId}`).emit(event, data);
  }

  public broadcastToOrder(orderId: string, event: string, data: any): void {
    this.io.to(`order:${orderId}`).emit(event, data);
  }

  public broadcastToCustomer(customerId: string, event: string, data: any): void {
    this.io.to(`customer:${customerId}`).emit(event, data);
  }

  // Connection management
  public getConnectionCount(): number {
    return this.connections.size;
  }

  public getConnectionsByTenant(tenantId: string): WebSocketConnection[] {
    return Array.from(this.connections.values()).filter(
      conn => conn.tenantId === tenantId
    );
  }

  public getConnectionStats(): {
    total: number;
    byUserType: Record<string, number>;
    byTenant: Record<string, number>;
  } {
    const stats = {
      total: this.connections.size,
      byUserType: {} as Record<string, number>,
      byTenant: {} as Record<string, number>
    };

    for (const connection of this.connections.values()) {
      // Count by user type
      if (connection.userType) {
        stats.byUserType[connection.userType] = (stats.byUserType[connection.userType] || 0) + 1;
      }

      // Count by tenant
      if (connection.tenantId) {
        stats.byTenant[connection.tenantId] = (stats.byTenant[connection.tenantId] || 0) + 1;
      }
    }

    return stats;
  }
}