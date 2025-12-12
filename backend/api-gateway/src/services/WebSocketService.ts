import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '@foodtrack/backend-shared';

export interface KitchenWebSocketEvents {
  // Outgoing events (server to client)
  'order:new': (data: NewOrderData) => void;
  'order:modified': (data: OrderModification) => void;
  'order:status-update': (data: OrderStatusUpdate) => void;
  'inventory:low-stock': (data: LowStockAlert) => void;
  'inventory:usage-update': (data: InventoryUsage) => void;
  'station:assignment': (data: StationAssignment) => void;
  'station:help-request': (data: HelpRequest) => void;
  'quality:issue-reported': (data: QualityIssueReport) => void;
  
  // Incoming events (client to server)
  'order:update-status': (data: { orderId: string; status: string; stationId?: string }) => void;
  'inventory:update-usage': (data: { ingredientId: string; quantity: number; orderId: string }) => void;
  'station:request-help': (data: { stationId: string; helpType: string; message?: string }) => void;
  'quality:report-issue': (data: { orderId: string; issue: string; severity: string }) => void;
}

export interface NewOrderData {
  orderId: string;
  tenantId: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    specialInstructions?: string;
    allergens?: string[];
  }>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedCompletionTime: string;
  customerInfo?: {
    name?: string;
    phone?: string;
  };
}

export interface OrderModification {
  orderId: string;
  tenantId: string;
  changes: {
    items?: Array<{ id: string; action: 'add' | 'remove' | 'modify'; details: any }>;
    specialInstructions?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  };
  reason: string;
}

export interface OrderStatusUpdate {
  orderId: string;
  tenantId: string;
  status: string;
  stationId?: string;
  timestamp: string;
  estimatedCompletionTime?: string;
}

export interface LowStockAlert {
  tenantId: string;
  ingredientId: string;
  ingredientName: string;
  currentStock: number;
  minimumStock: number;
  unit: string;
  severity: 'warning' | 'critical';
}

export interface InventoryUsage {
  tenantId: string;
  ingredientId: string;
  ingredientName: string;
  quantityUsed: number;
  remainingStock: number;
  unit: string;
  orderId: string;
  timestamp: string;
}

export interface StationAssignment {
  tenantId: string;
  orderId: string;
  stationId: string;
  stationName: string;
  assignedItems: string[];
  estimatedTime: number;
  priority: number;
}

export interface HelpRequest {
  tenantId: string;
  stationId: string;
  stationName: string;
  helpType: 'technical' | 'ingredient' | 'quality' | 'general';
  message?: string;
  requestedBy: string;
  timestamp: string;
  status: 'pending' | 'acknowledged' | 'resolved';
}

export interface QualityIssueReport {
  tenantId: string;
  orderId: string;
  stationId: string;
  issue: string;
  severity: 'minor' | 'major' | 'critical';
  reportedBy: string;
  timestamp: string;
  requiresRemake: boolean;
}

class WebSocketService {
  private io: SocketIOServer | null = null;
  private connectedClients = new Map<string, { socket: any; tenantId: string; userId: string }>();

  initialize(server: HTTPServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3003'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.io.use(this.authenticateSocket.bind(this));
    this.io.on('connection', this.handleConnection.bind(this));

    console.log('🔌 WebSocket server initialized');
  }

  private async authenticateSocket(socket: any, next: (err?: Error) => void): Promise<void> {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
      
      socket.userId = decoded.userId;
      socket.tenantId = decoded.tenantId;
      socket.userRole = decoded.role;
      
      next();
    } catch (error) {
      next(new Error('Invalid authentication token'));
    }
  }

  private handleConnection(socket: any): void {
    const { userId, tenantId, userRole } = socket;
    
    console.log(`🔌 Kitchen client connected: ${userId} (tenant: ${tenantId})`);
    
    // Store client connection
    this.connectedClients.set(socket.id, { socket, tenantId, userId });
    
    // Join tenant-specific room
    socket.join(`tenant:${tenantId}`);
    
    // Join role-specific rooms if needed
    if (userRole === 'kitchen_staff' || userRole === 'chef') {
      socket.join(`kitchen:${tenantId}`);
    }

    // Handle incoming events
    this.setupEventHandlers(socket);

    socket.on('disconnect', () => {
      console.log(`🔌 Kitchen client disconnected: ${userId}`);
      this.connectedClients.delete(socket.id);
    });
  }

  private setupEventHandlers(socket: any): void {
    const { tenantId } = socket;

    // Order status updates
    socket.on('order:update-status', (data: { orderId: string; status: string; stationId?: string }) => {
      this.broadcastToTenant(tenantId, 'order:status-update', {
        orderId: data.orderId,
        tenantId,
        status: data.status,
        stationId: data.stationId,
        timestamp: new Date().toISOString(),
      });
    });

    // Inventory usage updates
    socket.on('inventory:update-usage', (data: { ingredientId: string; quantity: number; orderId: string }) => {
      // This would typically trigger inventory calculations and alerts
      // For now, we'll just broadcast the usage update
      this.broadcastToTenant(tenantId, 'inventory:usage-update', {
        tenantId,
        ingredientId: data.ingredientId,
        ingredientName: `Ingredient ${data.ingredientId}`, // Would be fetched from DB
        quantityUsed: data.quantity,
        remainingStock: 0, // Would be calculated
        unit: 'units',
        orderId: data.orderId,
        timestamp: new Date().toISOString(),
      });
    });

    // Station help requests
    socket.on('station:request-help', (data: { stationId: string; helpType: string; message?: string }) => {
      this.broadcastToTenant(tenantId, 'station:help-request', {
        tenantId,
        stationId: data.stationId,
        stationName: `Station ${data.stationId}`, // Would be fetched from DB
        helpType: data.helpType as any,
        message: data.message,
        requestedBy: socket.userId,
        timestamp: new Date().toISOString(),
        status: 'pending',
      });
    });

    // Quality issue reports
    socket.on('quality:report-issue', (data: { orderId: string; issue: string; severity: string }) => {
      this.broadcastToTenant(tenantId, 'quality:issue-reported', {
        tenantId,
        orderId: data.orderId,
        stationId: 'unknown', // Would be determined from context
        issue: data.issue,
        severity: data.severity as any,
        reportedBy: socket.userId,
        timestamp: new Date().toISOString(),
        requiresRemake: data.severity === 'critical',
      });
    });
  }

  // Public methods for broadcasting events from other services

  broadcastNewOrder(orderData: NewOrderData): void {
    this.broadcastToTenant(orderData.tenantId, 'order:new', orderData);
  }

  broadcastOrderModification(modificationData: OrderModification): void {
    this.broadcastToTenant(modificationData.tenantId, 'order:modified', modificationData);
  }

  broadcastOrderStatusUpdate(statusData: OrderStatusUpdate): void {
    this.broadcastToTenant(statusData.tenantId, 'order:status-update', statusData);
  }

  broadcastLowStockAlert(alertData: LowStockAlert): void {
    this.broadcastToTenant(alertData.tenantId, 'inventory:low-stock', alertData);
  }

  broadcastStationAssignment(assignmentData: StationAssignment): void {
    this.broadcastToTenant(assignmentData.tenantId, 'station:assignment', assignmentData);
  }

  broadcastToTenant(tenantId: string, event: string, data: any): void {
    if (!this.io) {
      console.warn('WebSocket server not initialized');
      return;
    }

    this.io.to(`tenant:${tenantId}`).emit(event, data);
    console.log(`📡 Broadcasted ${event} to tenant ${tenantId}`);
  }

  private broadcastToTenantPrivate(tenantId: string, event: string, data: any): void {
    this.broadcastToTenant(tenantId, event, data);
  }

  private broadcastToKitchen(tenantId: string, event: string, data: any): void {
    if (!this.io) {
      console.warn('WebSocket server not initialized');
      return;
    }

    this.io.to(`kitchen:${tenantId}`).emit(event, data);
    console.log(`📡 Broadcasted ${event} to kitchen staff in tenant ${tenantId}`);
  }

  getConnectedClients(tenantId?: string): number {
    if (!tenantId) {
      return this.connectedClients.size;
    }
    
    return Array.from(this.connectedClients.values())
      .filter(client => client.tenantId === tenantId)
      .length;
  }
}

export const webSocketService = new WebSocketService();