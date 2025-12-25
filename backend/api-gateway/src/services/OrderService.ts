import { OrderRepository } from '../repositories/OrderRepository';
import { ProductionContractRepository } from '../repositories/ProductionContractRepository';
import { ProductService } from './ProductService';
import { EventBus } from '@foodtrack/backend-shared';
import { 
  Order, 
  CreateOrderRequest, 
  UpdateOrderStatusRequest, 
  OrderFilters,
  OrderStatus,
  OrderStateMachine,
  OrderCreatedEvent,
  OrderConfirmedEvent,
  OrderStatusUpdatedEvent,
  OrderCancelledEvent
} from '../models/Order';
import {
  ProductionContract,
  ProductionContractFactory,
  ProductionContractGenerationData,
  ProductionContractCreatedEvent
} from '../models/ProductionContract';

export class OrderService {
  private orderRepository: OrderRepository;
  private productionContractRepository: ProductionContractRepository;
  private productService: ProductService;

  constructor() {
    this.orderRepository = new OrderRepository();
    this.productionContractRepository = new ProductionContractRepository();
    this.productService = new ProductService();
  }

  async findById(id: string, tenantId: string): Promise<Order | null> {
    try {
      return await this.orderRepository.findById(id, tenantId);
    } catch (error) {
      throw new Error(`Failed to find order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findAll(tenantId: string, filters: OrderFilters = {}): Promise<{ orders: Order[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      const { orders, total } = await this.orderRepository.findAll(tenantId, filters);
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const totalPages = Math.ceil(total / limit);

      return {
        orders,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      throw new Error(`Failed to find orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async create(data: CreateOrderRequest, tenantId: string): Promise<Order> {
    try {
      // Validate products exist and are available
      const productIds = data.items.map(item => item.productId);
      const validation = await this.productService.validateProductsExist(productIds, tenantId);
      
      if (!validation.valid) {
        throw new Error(`Invalid products: ${validation.invalidIds.join(', ')}`);
      }

      // Create order
      const order = await this.orderRepository.create({
        ...data,
        tenantId,
      });

      // Emit OrderCreated event
      const event: OrderCreatedEvent = {
        eventType: 'OrderCreated',
        payload: {
          orderId: order.id,
          tenantId: order.tenantId,
          customerId: order.customerId,
          number: order.number,
          items: order.items,
          total: order.total,
          channel: order.channel,
          createdAt: order.createdAt,
        },
      };

      await EventBus.getInstance().publish(event);

      return order;
    } catch (error) {
      throw new Error(`Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async confirm(id: string, tenantId: string): Promise<Order> {
    try {
      // Get current order
      const currentOrder = await this.orderRepository.findById(id, tenantId);
      if (!currentOrder) {
        throw new Error('Order not found');
      }

      // Validate state transition
      OrderStateMachine.validateTransition(currentOrder.status, 'confirmed');

      // Update order status to confirmed
      const confirmedOrder = await this.orderRepository.updateStatus(id, 'confirmed', tenantId);
      if (!confirmedOrder) {
        throw new Error('Failed to confirm order');
      }

      // Generate Production Contract (ADR-001 Implementation)
      const productionContract = await this.generateProductionContract(confirmedOrder);

      // Emit events
      const orderConfirmedEvent: OrderConfirmedEvent = {
        eventType: 'OrderConfirmed',
        payload: {
          orderId: confirmedOrder.id,
          tenantId: confirmedOrder.tenantId,
          number: confirmedOrder.number,
          confirmedAt: confirmedOrder.updatedAt,
        },
      };

      const contractCreatedEvent: ProductionContractCreatedEvent = {
        eventType: 'ProductionContractCreated',
        payload: {
          contractId: productionContract.id,
          orderId: confirmedOrder.id,
          tenantId: confirmedOrder.tenantId,
          priority: productionContract.contractData.priority,
          estimatedCompletionTime: productionContract.contractData.estimatedCompletionTime,
          itemCount: productionContract.contractData.items.length,
          createdAt: productionContract.createdAt,
        },
      };

      await EventBus.getInstance().publish(orderConfirmedEvent);
      await EventBus.getInstance().publish(contractCreatedEvent);

      return confirmedOrder;
    } catch (error) {
      throw new Error(`Failed to confirm order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateStatus(id: string, data: UpdateOrderStatusRequest, tenantId: string): Promise<Order | null> {
    try {
      // Get current order
      const currentOrder = await this.orderRepository.findById(id, tenantId);
      if (!currentOrder) {
        return null;
      }

      // Validate state transition
      OrderStateMachine.validateTransition(currentOrder.status, data.status);

      // Update order status
      const updatedOrder = await this.orderRepository.updateStatus(id, data.status, tenantId, data.notes);
      if (!updatedOrder) {
        return null;
      }

      // Emit OrderStatusUpdated event
      const event: OrderStatusUpdatedEvent = {
        eventType: 'OrderStatusUpdated',
        payload: {
          orderId: updatedOrder.id,
          tenantId: updatedOrder.tenantId,
          previousStatus: currentOrder.status,
          newStatus: updatedOrder.status,
          updatedAt: updatedOrder.updatedAt,
        },
      };

      await EventBus.getInstance().publish(event);

      return updatedOrder;
    } catch (error) {
      throw new Error(`Failed to update order status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async cancel(id: string, reason: string, tenantId: string): Promise<Order | null> {
    try {
      // Get current order
      const currentOrder = await this.orderRepository.findById(id, tenantId);
      if (!currentOrder) {
        return null;
      }

      // Validate state transition
      OrderStateMachine.validateTransition(currentOrder.status, 'cancelled');

      // Cancel order
      const cancelledOrder = await this.orderRepository.updateStatus(id, 'cancelled', tenantId, reason);
      if (!cancelledOrder) {
        return null;
      }

      // Cancel associated production contract if exists
      const productionContract = await this.productionContractRepository.findByOrderId(id, tenantId);
      if (productionContract && productionContract.status !== 'completed') {
        await this.productionContractRepository.updateStatus(productionContract.id, 'cancelled', tenantId);
      }

      // Emit OrderCancelled event
      const event: OrderCancelledEvent = {
        eventType: 'OrderCancelled',
        payload: {
          orderId: cancelledOrder.id,
          tenantId: cancelledOrder.tenantId,
          reason,
          cancelledAt: cancelledOrder.updatedAt,
        },
      };

      await EventBus.getInstance().publish(event);

      return cancelledOrder;
    } catch (error) {
      throw new Error(`Failed to cancel order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    try {
      return await this.orderRepository.delete(id, tenantId);
    } catch (error) {
      throw new Error(`Failed to delete order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByStatus(status: OrderStatus, tenantId: string): Promise<Order[]> {
    try {
      return await this.orderRepository.findByStatus(status, tenantId);
    } catch (error) {
      throw new Error(`Failed to find orders by status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByCustomer(customerId: string, tenantId: string): Promise<Order[]> {
    try {
      return await this.orderRepository.findByCustomer(customerId, tenantId);
    } catch (error) {
      throw new Error(`Failed to find orders by customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getOrderHistory(id: string, tenantId: string): Promise<any[]> {
    try {
      // TODO: Implement order history from event store
      // For now, return basic status transitions
      const order = await this.orderRepository.findById(id, tenantId);
      if (!order) {
        return [];
      }

      return [
        {
          status: 'draft',
          timestamp: order.createdAt,
          description: 'Order created',
        },
        {
          status: order.status,
          timestamp: order.updatedAt,
          description: `Order ${order.status}`,
        },
      ];
    } catch (error) {
      throw new Error(`Failed to get order history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getValidStatusTransitions(id: string, tenantId: string): Promise<OrderStatus[]> {
    try {
      const order = await this.orderRepository.findById(id, tenantId);
      if (!order) {
        return [];
      }

      return OrderStateMachine.getValidTransitions(order.status);
    } catch (error) {
      throw new Error(`Failed to get valid status transitions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private method to generate Production Contract (ADR-001)
  private async generateProductionContract(order: Order): Promise<ProductionContract> {
    try {
      // Prepare data for Production Contract generation
      const contractData: ProductionContractGenerationData = {
        orderId: order.id,
        tenantId: order.tenantId,
        items: order.items.map(item => ({
          productId: item.id,
          name: item.name,
          quantity: item.quantity,
          modifications: item.modifications || [],
          preparationTime: 15, // Default - would be fetched from product/recipe
        })),
        channel: order.channel,
        specialInstructions: order.specialInstructions,
      };

      // Generate Production Contract using Factory
      const productionContract = await ProductionContractFactory.generate(contractData);

      // Save Production Contract to database
      const savedContract = await this.productionContractRepository.create(productionContract);

      return savedContract;
    } catch (error) {
      throw new Error(`Failed to generate production contract: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Method to get Production Contract for an order
  async getProductionContract(orderId: string, tenantId: string): Promise<ProductionContract | null> {
    try {
      return await this.productionContractRepository.findByOrderId(orderId, tenantId);
    } catch (error) {
      throw new Error(`Failed to get production contract: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Analytics methods
  async getOrderStats(tenantId: string, dateFrom?: Date, dateTo?: Date): Promise<any> {
    try {
      const filters: OrderFilters = {};
      if (dateFrom) filters.dateFrom = dateFrom.toISOString();
      if (dateTo) filters.dateTo = dateTo.toISOString();

      const { orders, total } = await this.orderRepository.findAll(tenantId, filters);

      const stats = {
        total,
        byStatus: {} as Record<OrderStatus, number>,
        byChannel: {} as Record<string, number>,
        totalRevenue: 0,
        averageOrderValue: 0,
      };

      orders.forEach(order => {
        // Count by status
        stats.byStatus[order.status] = (stats.byStatus[order.status] || 0) + 1;
        
        // Count by channel
        stats.byChannel[order.channel] = (stats.byChannel[order.channel] || 0) + 1;
        
        // Calculate revenue (only for completed orders)
        if (order.status === 'delivered') {
          stats.totalRevenue += order.total;
        }
      });

      const completedOrders = stats.byStatus['delivered'] || 0;
      stats.averageOrderValue = completedOrders > 0 ? stats.totalRevenue / completedOrders : 0;

      return stats;
    } catch (error) {
      throw new Error(`Failed to get order stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Analytics methods for dashboard
  async getOrderAnalytics(tenantId: string, dateRange: { startDate: Date; endDate: Date }): Promise<{
    totalRevenue: number;
    totalOrders: number;
    averageTicket: number;
    delayedOrders: number;
    growthRate?: number;
    periodComparison?: { current: number; previous: number };
    ordersByStatus: Record<string, number>;
    ordersByChannel: Record<string, number>;
  }> {
    try {
      // Get orders for the specified date range
      const orders = await this.orderRepository.findByDateRange(
        dateRange.startDate,
        dateRange.endDate,
        tenantId
      );

      // Calculate basic metrics
      const totalOrders = orders.length;
      const completedOrders = orders.filter(order => order.status === 'delivered');
      const totalRevenue = completedOrders.reduce((sum, order) => sum + order.total, 0);
      const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Calculate delayed orders (orders that took longer than estimated)
      const delayedOrders = orders.filter(order => {
        if (!order.estimatedCompletionTime || !order.updatedAt) return false;
        return new Date(order.updatedAt) > new Date(order.estimatedCompletionTime);
      }).length;

      // Group by status
      const ordersByStatus: Record<string, number> = {};
      orders.forEach(order => {
        ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;
      });

      // Group by channel
      const ordersByChannel: Record<string, number> = {};
      orders.forEach(order => {
        ordersByChannel[order.channel] = (ordersByChannel[order.channel] || 0) + 1;
      });

      // Calculate period comparison for growth rate
      const periodDuration = dateRange.endDate.getTime() - dateRange.startDate.getTime();
      const previousStartDate = new Date(dateRange.startDate.getTime() - periodDuration);
      const previousEndDate = new Date(dateRange.startDate);

      const previousOrders = await this.orderRepository.findByDateRange(
        previousStartDate,
        previousEndDate,
        tenantId
      );

      const periodComparison = {
        current: totalOrders,
        previous: previousOrders.length
      };

      const growthRate = periodComparison.previous > 0 
        ? ((periodComparison.current - periodComparison.previous) / periodComparison.previous) * 100
        : 0;

      return {
        totalRevenue,
        totalOrders,
        averageTicket,
        delayedOrders,
        growthRate,
        periodComparison,
        ordersByStatus,
        ordersByChannel
      };
    } catch (error) {
      throw new Error(`Failed to get order analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getRecentOrders(tenantId: string, limit: number = 10): Promise<Order[]> {
    try {
      return await this.orderRepository.findRecent(tenantId, limit);
    } catch (error) {
      throw new Error(`Failed to get recent orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getOrdersByDateRange(startDate: Date, endDate: Date, tenantId: string): Promise<Order[]> {
    try {
      return await this.orderRepository.findByDateRange(startDate, endDate, tenantId);
    } catch (error) {
      throw new Error(`Failed to get orders by date range: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Advanced analytics methods
  async getCustomerBehaviorInsights(tenantId: string, dateRange: { startDate: Date; endDate: Date }): Promise<{
    repeatCustomers: number;
    newCustomers: number;
    averageOrdersPerCustomer: number;
    topCustomers: Array<{ customerId: string; orderCount: number; totalSpent: number }>;
  }> {
    try {
      const orders = await this.orderRepository.findByDateRange(
        dateRange.startDate,
        dateRange.endDate,
        tenantId
      );

      const customerStats = new Map<string, { orderCount: number; totalSpent: number; firstOrder: Date }>();

      orders.forEach(order => {
        if (!order.customerId) return;

        const existing = customerStats.get(order.customerId) || {
          orderCount: 0,
          totalSpent: 0,
          firstOrder: order.createdAt
        };

        customerStats.set(order.customerId, {
          orderCount: existing.orderCount + 1,
          totalSpent: existing.totalSpent + (order.status === 'delivered' ? order.total : 0),
          firstOrder: order.createdAt < existing.firstOrder ? order.createdAt : existing.firstOrder
        });
      });

      const newCustomers = Array.from(customerStats.values()).filter(
        stats => stats.firstOrder >= dateRange.startDate
      ).length;

      const repeatCustomers = Array.from(customerStats.values()).filter(
        stats => stats.orderCount > 1
      ).length;

      const totalCustomers = customerStats.size;
      const totalOrders = orders.length;
      const averageOrdersPerCustomer = totalCustomers > 0 ? totalOrders / totalCustomers : 0;

      const topCustomers = Array.from(customerStats.entries())
        .map(([customerId, stats]) => ({
          customerId,
          orderCount: stats.orderCount,
          totalSpent: stats.totalSpent
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);

      return {
        repeatCustomers,
        newCustomers,
        averageOrdersPerCustomer,
        topCustomers
      };
    } catch (error) {
      throw new Error(`Failed to get customer behavior insights: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getProductPopularityAnalysis(tenantId: string, dateRange: { startDate: Date; endDate: Date }): Promise<{
    topProducts: Array<{ productId: string; name: string; orderCount: number; revenue: number }>;
    categoryPerformance: Record<string, { orderCount: number; revenue: number }>;
  }> {
    try {
      const orders = await this.orderRepository.findByDateRange(
        dateRange.startDate,
        dateRange.endDate,
        tenantId
      );

      const productStats = new Map<string, { name: string; orderCount: number; revenue: number; category?: string }>();

      orders.forEach(order => {
        if (order.status !== 'delivered') return;

        order.items.forEach(item => {
          const existing = productStats.get(item.productId) || {
            name: item.name,
            orderCount: 0,
            revenue: 0,
            category: item.category
          };

          productStats.set(item.productId, {
            name: existing.name,
            orderCount: existing.orderCount + item.quantity,
            revenue: existing.revenue + (item.price * item.quantity),
            category: existing.category
          });
        });
      });

      const topProducts = Array.from(productStats.entries())
        .map(([productId, stats]) => ({
          productId,
          name: stats.name,
          orderCount: stats.orderCount,
          revenue: stats.revenue
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      const categoryPerformance: Record<string, { orderCount: number; revenue: number }> = {};
      productStats.forEach(stats => {
        const category = stats.category || 'Uncategorized';
        const existing = categoryPerformance[category] || { orderCount: 0, revenue: 0 };
        categoryPerformance[category] = {
          orderCount: existing.orderCount + stats.orderCount,
          revenue: existing.revenue + stats.revenue
        };
      });

      return {
        topProducts,
        categoryPerformance
      };
    } catch (error) {
      throw new Error(`Failed to get product popularity analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}