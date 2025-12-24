import { Socket } from 'socket.io';
import { WebSocketService } from '../services/WebSocketService';
import { OrderService } from '../services/OrderService';
import { KitchenService } from '../services/KitchenService';
import { KitchenOrderRepository } from '../repositories/KitchenOrderRepository';
import { ProductionContractRepository } from '../repositories/ProductionContractRepository';
import { OrderRepository } from '../repositories/OrderRepository';
import { EventBus } from '@foodtrack/backend-shared';

export class WebSocketHandlers {
  private orderService: OrderService;
  private kitchenService: KitchenService;

  constructor(private webSocketService: WebSocketService) {
    // Initialize services
    this.orderService = new OrderService();
    this.kitchenService = new KitchenService(
      new KitchenOrderRepository(),
      new ProductionContractRepository(),
      new OrderRepository(),
      EventBus.getInstance()
    );
  }

  // Kitchen-specific handlers
  setupKitchenHandlers(socket: Socket): void {
    // Get kitchen orders for a tenant
    socket.on('kitchen:get_orders', async (data: { tenantId: string }, callback) => {
      try {
        const orders = await this.kitchenService.getActiveKitchenOrders(data.tenantId);
        callback({ success: true, data: orders });
      } catch (error) {
        console.error('Kitchen get orders error:', error);
        callback({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to get kitchen orders' 
        });
      }
    });

    // Update kitchen order status
    socket.on('kitchen:update_order_status', async (data: {
      orderId: string;
      tenantId: string;
      status: string;
      assignedStation?: string;
    }, callback) => {
      try {
        const updatedOrder = await this.kitchenService.updateKitchenOrderStatus(
          data.orderId,
          data.tenantId,
          {
            status: data.status as any,
            assignedStation: data.assignedStation
          }
        );
        callback({ success: true, data: updatedOrder });
      } catch (error) {
        console.error('Kitchen update order status error:', error);
        callback({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to update order status' 
        });
      }
    });

    // Update kitchen order item status
    socket.on('kitchen:update_item_status', async (data: {
      kitchenOrderId: string;
      tenantId: string;
      itemId: string;
      status: string;
    }, callback) => {
      try {
        const success = await this.kitchenService.updateKitchenOrderItemStatus(
          data.kitchenOrderId,
          data.tenantId,
          {
            itemId: data.itemId,
            status: data.status as any
          }
        );
        callback({ success, data: { updated: success } });
      } catch (error) {
        console.error('Kitchen update item status error:', error);
        callback({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to update item status' 
        });
      }
    });

    // Get stations
    socket.on('kitchen:get_stations', async (data: { tenantId: string }, callback) => {
      try {
        const stations = await this.kitchenService.getStations(data.tenantId);
        callback({ success: true, data: stations });
      } catch (error) {
        console.error('Kitchen get stations error:', error);
        callback({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to get stations' 
        });
      }
    });
  }

  // Order-specific handlers
  setupOrderHandlers(socket: Socket): void {
    // Get order details
    socket.on('order:get_details', async (data: { orderId: string; tenantId: string }, callback) => {
      try {
        const order = await this.orderService.findById(data.orderId, data.tenantId);
        callback({ success: true, data: order });
      } catch (error) {
        console.error('Order get details error:', error);
        callback({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to get order details' 
        });
      }
    });

    // Get order status transitions
    socket.on('order:get_transitions', async (data: { orderId: string; tenantId: string }, callback) => {
      try {
        const transitions = await this.orderService.getValidStatusTransitions(data.orderId, data.tenantId);
        callback({ success: true, data: transitions });
      } catch (error) {
        console.error('Order get transitions error:', error);
        callback({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to get order transitions' 
        });
      }
    });

    // Update order status
    socket.on('order:update_status', async (data: {
      orderId: string;
      tenantId: string;
      status: string;
      notes?: string;
    }, callback) => {
      try {
        const updatedOrder = await this.orderService.updateStatus(
          data.orderId,
          { status: data.status as any, notes: data.notes },
          data.tenantId
        );
        callback({ success: true, data: updatedOrder });
      } catch (error) {
        console.error('Order update status error:', error);
        callback({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to update order status' 
        });
      }
    });
  }

  // Tenant dashboard handlers
  setupTenantHandlers(socket: Socket): void {
    // Get dashboard stats
    socket.on('tenant:get_stats', async (data: { tenantId: string }, callback) => {
      try {
        const stats = await this.orderService.getOrderStats(data.tenantId);
        callback({ success: true, data: stats });
      } catch (error) {
        console.error('Tenant get stats error:', error);
        callback({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to get tenant stats' 
        });
      }
    });

    // Get recent orders
    socket.on('tenant:get_recent_orders', async (data: { 
      tenantId: string; 
      limit?: number; 
      status?: string; 
    }, callback) => {
      try {
        const result = await this.orderService.findAll(data.tenantId, {
          limit: data.limit || 10,
          page: 1,
          status: data.status as any
        });
        callback({ success: true, data: result.orders });
      } catch (error) {
        console.error('Tenant get recent orders error:', error);
        callback({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to get recent orders' 
        });
      }
    });

    // Get kitchen status
    socket.on('tenant:get_kitchen_status', async (data: { tenantId: string }, callback) => {
      try {
        const activeOrders = await this.kitchenService.getActiveKitchenOrders(data.tenantId);
        const stations = await this.kitchenService.getStations(data.tenantId, true);
        
        callback({ 
          success: true, 
          data: { 
            activeOrders: activeOrders.length,
            orders: activeOrders,
            stations: stations.map(station => ({
              ...station,
              utilization: station.capacity > 0 ? (station.currentLoad / station.capacity) * 100 : 0
            }))
          } 
        });
      } catch (error) {
        console.error('Tenant get kitchen status error:', error);
        callback({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to get kitchen status' 
        });
      }
    });
  }

  // Customer-specific handlers
  setupCustomerHandlers(socket: Socket): void {
    // Get customer orders
    socket.on('customer:get_orders', async (data: { customerId: string; tenantId: string }, callback) => {
      try {
        const orders = await this.orderService.findByCustomer(data.customerId, data.tenantId);
        callback({ success: true, data: orders });
      } catch (error) {
        console.error('Customer get orders error:', error);
        callback({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to get customer orders' 
        });
      }
    });

    // Track order
    socket.on('customer:track_order', async (data: { orderId: string; tenantId: string }, callback) => {
      try {
        const order = await this.orderService.findById(data.orderId, data.tenantId);
        if (!order) {
          return callback({ success: false, error: 'Order not found' });
        }

        // Get kitchen order if exists
        const kitchenOrder = await this.kitchenService.getKitchenOrderByOrderId(data.orderId, data.tenantId);
        
        callback({ 
          success: true, 
          data: {
            order,
            kitchenOrder,
            estimatedDeliveryTime: order.estimatedDeliveryTime || kitchenOrder?.estimatedCompletionTime
          }
        });
      } catch (error) {
        console.error('Customer track order error:', error);
        callback({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to track order' 
        });
      }
    });
  }

  // General utility handlers
  setupUtilityHandlers(socket: Socket): void {
    // Health check
    socket.on('health_check', (callback) => {
      callback({ 
        success: true, 
        data: { 
          status: 'healthy', 
          timestamp: new Date().toISOString(),
          connections: this.webSocketService.getConnectionCount()
        } 
      });
    });

    // Get connection stats (admin only)
    socket.on('admin:get_connection_stats', (callback) => {
      const stats = this.webSocketService.getConnectionStats();
      callback({ success: true, data: stats });
    });
  }

  // Setup all handlers for a socket
  setupAllHandlers(socket: Socket): void {
    this.setupKitchenHandlers(socket);
    this.setupOrderHandlers(socket);
    this.setupTenantHandlers(socket);
    this.setupCustomerHandlers(socket);
    this.setupUtilityHandlers(socket);
  }
}