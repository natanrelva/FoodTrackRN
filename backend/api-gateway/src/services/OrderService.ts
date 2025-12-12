import { 
  Order, 
  CreateOrderRequest, 
  OrderFilters, 
  PaginatedOrders,
  OrderStatus,
  OrderTotals,
  ValidationResult,
  OrderItem,
  CreateOrderItem,
  OrderValidationUtils,
  ChannelType
} from '@foodtrack/backend-shared';
import { OrderRepository } from '../repositories/OrderRepository';
import { CustomerRepository } from '../repositories/CustomerRepository';
import { ProductRepository } from '../repositories/ProductRepository';
import { AuditRepository } from '../repositories/AuditRepository';
import { NotificationService } from './NotificationService';
import { randomUUID } from 'crypto';

export interface OrderAnalytics {
  totalOrders: number;
  totalRevenue: number;
  averageTicket: number;
  delayedOrders: number;
  ordersByStatus: Record<OrderStatus, number>;
  ordersByChannel: Record<ChannelType, number>;
  growthRate?: number;
  periodComparison?: {
    current: number;
    previous: number;
    change: number;
  };
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export class OrderService {
  private orderRepository: OrderRepository;
  private customerRepository: CustomerRepository;
  private productRepository: ProductRepository;
  private auditRepository: AuditRepository;
  private notificationService: NotificationService;

  constructor() {
    this.orderRepository = new OrderRepository();
    this.customerRepository = new CustomerRepository();
    this.productRepository = new ProductRepository();
    this.auditRepository = new AuditRepository();
    this.notificationService = new NotificationService();
  }

  /**
   * Creates a new order with full validation
   * Requirements: 1.1, 1.2, 1.5
   */
  async createOrder(orderData: CreateOrderRequest, tenantId: string): Promise<Order> {
    // Validate the order request
    const validation = OrderValidationUtils.validateCreateOrderRequest(orderData);
    if (!validation.isValid) {
      throw new Error(`Order validation failed: ${validation.errors.join(', ')}`);
    }

    // Validate customer exists
    const customer = await this.customerRepository.findById(orderData.customerId, tenantId);
    if (!customer) {
      throw new Error(`Customer with ID ${orderData.customerId} not found`);
    }

    // Validate and process order items
    const processedItems = await this.validateAndProcessOrderItems(orderData.items, tenantId);

    // Calculate order totals
    const totals = this.calculateOrderTotals(processedItems, orderData.delivery.fee, 0); // TODO: Apply coupon discount

    // Create the order object
    const order: Omit<Order, 'id' | 'number' | 'createdAt' | 'updatedAt'> = {
      tenantId,
      customerId: orderData.customerId,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
      items: processedItems,
      status: 'pending' as OrderStatus,
      channel: orderData.channel,
      payment: {
        method: 'pix', // Default payment method, should be determined by business logic
        status: 'pending',
        amount: totals.total,
      },
      delivery: orderData.delivery,
      subtotal: totals.subtotal,
      deliveryFee: totals.deliveryFee,
      discount: totals.discount,
      total: totals.total,
      notes: orderData.notes,
    };

    // Create the order in the database
    const createdOrder = await this.orderRepository.createWithAutoNumber(order);

    // Send order confirmation notification
    try {
      await this.notificationService.sendOrderConfirmation(createdOrder);
    } catch (error) {
      // Log error but don't fail the order creation
      console.error('Failed to send order confirmation notification:', error);
    }

    // Integrate with kitchen system for new orders
    try {
      const { KitchenIntegrationService } = await import('./KitchenIntegrationService');
      const integrationService = new KitchenIntegrationService();
      await integrationService.processNewOrder(createdOrder, tenantId);
    } catch (error) {
      // Log error but don't fail the order creation
      console.error('Failed to integrate with kitchen system:', error);
    }

    return createdOrder;
  }

  /**
   * Validates order items and processes them with product information
   */
  private async validateAndProcessOrderItems(items: CreateOrderItem[], tenantId: string): Promise<OrderItem[]> {
    const processedItems: OrderItem[] = [];

    for (const item of items) {
      // Validate product exists and is active
      const product = await this.productRepository.findById(item.productId, tenantId);
      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found`);
      }

      if (product.active === false) {
        throw new Error(`Product ${product.name} is not available`);
      }

      // Check stock availability
      if (product.stock !== null && product.stock !== undefined && product.stock < item.quantity) {
        throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
      }

      // Process extras
      const processedExtras = item.extras.map(extraName => {
        const extra = product.extras?.find(e => e.name === extraName);
        if (!extra) {
          throw new Error(`Extra '${extraName}' not found for product ${product.name}`);
        }
        return {
          name: extra.name,
          price: extra.price,
        };
      });

      // Create processed order item
      const processedItem: OrderItem = {
        id: randomUUID(),
        productId: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        quantity: item.quantity,
        extras: processedExtras,
        notes: item.notes,
        preparationTime: (product as any).preparationTime,
      };

      processedItems.push(processedItem);
    }

    return processedItems;
  }

  /**
   * Calculates order totals including subtotal, delivery fee, discount, and total
   */
  calculateOrderTotals(items: OrderItem[], deliveryFee: number, discount: number): OrderTotals {
    const subtotal = items.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity;
      const extrasTotal = item.extras.reduce((extrasSum, extra) => extrasSum + extra.price, 0) * item.quantity;
      return sum + itemTotal + extrasTotal;
    }, 0);

    const total = Math.max(0, subtotal + deliveryFee - discount);

    return {
      subtotal,
      deliveryFee,
      discount,
      total,
    };
  }

  /**
   * Validates order items for business rules
   */
  async validateOrderItems(items: CreateOrderItem[], tenantId: string): Promise<ValidationResult> {
    const errors: string[] = [];

    try {
      await this.validateAndProcessOrderItems(items, tenantId);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown validation error');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generates a new order number for the tenant
   */
  async generateOrderNumber(tenantId: string): Promise<string> {
    return await this.orderRepository.generateOrderNumber(tenantId);
  }

  /**
   * Retrieves orders with filtering and pagination
   * Requirements: 2.1, 2.5
   */
  async getOrders(filters: OrderFilters, tenantId: string): Promise<PaginatedOrders> {
    // Validate filters
    const validation = OrderValidationUtils.validateOrderFilters(filters);
    if (!validation.isValid) {
      throw new Error(`Invalid filters: ${validation.errors.join(', ')}`);
    }

    return await this.orderRepository.findAll(tenantId, filters);
  }

  /**
   * Advanced filtering by status, channel, date range with pagination
   * Requirements: 2.1, 2.5
   */
  async getOrdersWithAdvancedFilters(
    tenantId: string,
    options: {
      status?: OrderStatus[];
      channel?: ChannelType[];
      dateFrom?: Date;
      dateTo?: Date;
      customerId?: string;
      search?: string;
      page?: number;
      limit?: number;
      sortBy?: 'createdAt' | 'updatedAt' | 'total' | 'number';
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<PaginatedOrders> {
    const filters: OrderFilters = {
      status: options.status,
      channel: options.channel,
      dateFrom: options.dateFrom,
      dateTo: options.dateTo,
      customerId: options.customerId,
      search: options.search,
      page: options.page || 1,
      limit: Math.min(options.limit || 20, 100), // Cap at 100 items per page
    };

    return await this.getOrders(filters, tenantId);
  }

  /**
   * Search orders by customer name or order number
   * Requirements: 2.5
   */
  async searchOrders(searchTerm: string, tenantId: string, page: number = 1, limit: number = 20): Promise<PaginatedOrders> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      throw new Error('Search term is required');
    }

    const filters: OrderFilters = {
      search: searchTerm.trim(),
      page,
      limit: Math.min(limit, 100),
    };

    return await this.getOrders(filters, tenantId);
  }

  /**
   * Gets orders by date range
   * Requirements: 2.1, 2.5
   */
  async getOrdersByDateRange(startDate: Date, endDate: Date, tenantId: string): Promise<Order[]> {
    if (startDate >= endDate) {
      throw new Error('Start date must be before end date');
    }

    return await this.orderRepository.findByDateRange(startDate, endDate, tenantId);
  }

  /**
   * Gets orders by channel
   * Requirements: 2.1, 2.5
   */
  async getOrdersByChannel(channel: ChannelType, tenantId: string): Promise<Order[]> {
    return await this.orderRepository.findByChannel(channel, tenantId);
  }

  /**
   * Gets recent orders with pagination
   * Requirements: 2.1, 2.5
   */
  async getRecentOrders(tenantId: string, limit: number = 10): Promise<Order[]> {
    const filters: OrderFilters = {
      page: 1,
      limit: Math.min(limit, 50), // Cap at 50 recent orders
    };

    const result = await this.getOrders(filters, tenantId);
    return result.orders;
  }

  /**
   * Gets order statistics for dashboard
   * Requirements: 2.1, 2.5
   */
  async getOrderStatistics(tenantId: string, dateRange?: DateRange): Promise<{
    totalOrders: number;
    pendingOrders: number;
    preparingOrders: number;
    readyOrders: number;
    deliveringOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  }> {
    const metrics = await this.orderRepository.getOrderMetrics(tenantId, dateRange);
    
    return {
      totalOrders: metrics.totalOrders,
      pendingOrders: metrics.ordersByStatus['pending'] || 0,
      preparingOrders: metrics.ordersByStatus['preparing'] || 0,
      readyOrders: metrics.ordersByStatus['ready'] || 0,
      deliveringOrders: metrics.ordersByStatus['delivering'] || 0,
      deliveredOrders: metrics.ordersByStatus['delivered'] || 0,
      cancelledOrders: metrics.ordersByStatus['cancelled'] || 0,
      totalRevenue: metrics.totalRevenue,
      averageOrderValue: metrics.averageTicket,
    };
  }

  /**
   * Retrieves a single order by ID
   */
  async getOrderById(orderId: string, tenantId: string): Promise<Order> {
    const order = await this.orderRepository.findById(orderId, tenantId);
    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }
    return order;
  }

  /**
   * Updates order status with transition validation
   * Requirements: 2.2, 2.3, 5.3
   */
  async updateOrderStatus(
    orderId: string, 
    newStatus: OrderStatus, 
    tenantId: string,
    auditContext?: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      reason?: string;
    }
  ): Promise<Order> {
    // Get current order
    const currentOrder = await this.orderRepository.findById(orderId, tenantId);
    if (!currentOrder) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    // Validate status transition
    const transitionValidation = OrderValidationUtils.validateStatusTransition(currentOrder.status, newStatus);
    if (!transitionValidation.isValid) {
      throw new Error(`Invalid status transition from ${currentOrder.status} to ${newStatus}. ${transitionValidation.errors.join(', ')}`);
    }

    // Prevent duplicate status updates
    if (currentOrder.status === newStatus) {
      throw new Error(`Order is already in ${newStatus} status`);
    }

    // Additional business rule validations
    await this.validateStatusTransitionBusinessRules(currentOrder, newStatus);

    // Update the order status and timestamp
    const updates: Partial<Order> = {
      status: newStatus,
      updatedAt: new Date(),
    };

    // Set completion time for terminal states
    if (newStatus === 'delivered' || newStatus === 'cancelled') {
      updates.actualCompletionTime = new Date();
    }

    // Update estimated completion time for certain status changes
    if (newStatus === 'confirmed') {
      // Calculate estimated completion time based on preparation times
      const totalPreparationTime = currentOrder.items.reduce((total, item) => {
        return total + (item.preparationTime || 15) * item.quantity; // Default 15 minutes per item
      }, 0);
      
      // Add buffer time and delivery time if applicable
      const bufferTime = 10; // 10 minutes buffer
      const deliveryTime = currentOrder.delivery.type === 'delivery' ? (currentOrder.delivery.estimatedTime || 30) : 0;
      
      updates.estimatedCompletionTime = new Date(Date.now() + (totalPreparationTime + bufferTime + deliveryTime) * 60000);
    }

    // Clear estimated completion time when order is completed
    if (newStatus === 'delivered') {
      updates.estimatedCompletionTime = undefined;
    }

    const updatedOrder = await this.orderRepository.update(orderId, updates, tenantId);
    if (!updatedOrder) {
      throw new Error(`Failed to update order status`);
    }

    // Log the status change for audit trail
    await this.logStatusChange(
      orderId, 
      currentOrder.status, 
      newStatus, 
      tenantId,
      auditContext?.reason,
      auditContext?.userId,
      auditContext?.ipAddress,
      auditContext?.userAgent
    );

    // Send status update notification
    try {
      await this.notificationService.sendStatusUpdate(updatedOrder, currentOrder.status);
    } catch (error) {
      // Log error but don't fail the status update
      console.error('Failed to send status update notification:', error);
    }

    // Integrate with kitchen system for status changes
    try {
      const { KitchenIntegrationService } = await import('./KitchenIntegrationService');
      const integrationService = new KitchenIntegrationService();
      await integrationService.handleOrderStatusChange(
        orderId, 
        newStatus, 
        currentOrder.status, 
        tenantId
      );
    } catch (error) {
      // Log error but don't fail the status update
      console.error('Failed to integrate status change with kitchen system:', error);
    }

    return updatedOrder;
  }

  /**
   * Validates business rules for status transitions
   */
  private async validateStatusTransitionBusinessRules(order: Order, newStatus: OrderStatus): Promise<void> {
    // Validate delivery-specific transitions
    if (newStatus === 'delivering' && order.delivery.type !== 'delivery') {
      throw new Error('Cannot set status to "delivering" for pickup orders');
    }

    // Validate payment status for certain transitions
    if (newStatus === 'preparing' && order.payment.status !== 'confirmed') {
      throw new Error('Cannot start preparing order until payment is confirmed');
    }

    // Validate that ready orders have all items prepared
    if (newStatus === 'ready') {
      // In a more complex system, we might check individual item preparation status
      // For now, we just ensure the order was in preparing status
      if (order.status !== 'preparing') {
        throw new Error('Order must be in preparing status before marking as ready');
      }
    }

    // Additional business rules can be added here
  }

  /**
   * Cancels an order with reason
   */
  async cancelOrder(
    orderId: string, 
    reason: string, 
    tenantId: string,
    auditContext?: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<Order> {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Cancellation reason is required');
    }

    const currentOrder = await this.orderRepository.findById(orderId, tenantId);
    if (!currentOrder) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    // Validate that order can be cancelled
    if (currentOrder.status === 'delivered') {
      throw new Error('Cannot cancel a delivered order');
    }

    if (currentOrder.status === 'cancelled') {
      throw new Error('Order is already cancelled');
    }

    const updates: Partial<Order> = {
      status: 'cancelled' as OrderStatus,
      notes: currentOrder.notes ? `${currentOrder.notes}\n\nCancellation reason: ${reason}` : `Cancellation reason: ${reason}`,
      actualCompletionTime: new Date(),
      updatedAt: new Date(),
    };

    const updatedOrder = await this.orderRepository.update(orderId, updates, tenantId);
    if (!updatedOrder) {
      throw new Error(`Failed to cancel order`);
    }

    // Log the cancellation for audit trail
    await this.logStatusChange(
      orderId, 
      currentOrder.status, 
      'cancelled', 
      tenantId, 
      reason,
      auditContext?.userId,
      auditContext?.ipAddress,
      auditContext?.userAgent
    );

    // Send cancellation notification
    try {
      await this.notificationService.sendStatusUpdate(updatedOrder, currentOrder.status);
    } catch (error) {
      // Log error but don't fail the cancellation
      console.error('Failed to send cancellation notification:', error);
    }

    return updatedOrder;
  }

  /**
   * Gets orders by status
   */
  async getOrdersByStatus(status: OrderStatus, tenantId: string): Promise<Order[]> {
    return await this.orderRepository.findByStatus(status, tenantId);
  }

  /**
   * Gets delayed orders
   */
  async getDelayedOrders(tenantId: string): Promise<Order[]> {
    return await this.orderRepository.findDelayedOrders(tenantId);
  }

  /**
   * Logs status changes for audit trail
   * Requirements: 5.3
   */
  private async logStatusChange(
    orderId: string, 
    fromStatus: OrderStatus, 
    toStatus: OrderStatus, 
    tenantId: string, 
    reason?: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await this.auditRepository.logOrderStatusChange(
        orderId,
        tenantId,
        fromStatus,
        toStatus,
        reason,
        userId,
        ipAddress,
        userAgent
      );
    } catch (error) {
      // Log error but don't fail the main operation
      console.error('Failed to log status change to audit trail:', error);
    }
  }

  /**
   * Gets order analytics for the specified date range
   */
  async getOrderAnalytics(tenantId: string, dateRange?: DateRange): Promise<OrderAnalytics> {
    const metrics = await this.orderRepository.getOrderMetrics(tenantId, dateRange);
    
    // Calculate growth rate if date range is provided
    let growthRate: number | undefined;
    let periodComparison: OrderAnalytics['periodComparison'];
    
    if (dateRange) {
      const periodLength = dateRange.endDate.getTime() - dateRange.startDate.getTime();
      const previousPeriodStart = new Date(dateRange.startDate.getTime() - periodLength);
      const previousPeriodEnd = new Date(dateRange.endDate.getTime() - periodLength);
      
      const previousMetrics = await this.orderRepository.getOrderMetrics(tenantId, {
        startDate: previousPeriodStart,
        endDate: previousPeriodEnd,
      });
      
      if (previousMetrics.totalRevenue > 0) {
        growthRate = ((metrics.totalRevenue - previousMetrics.totalRevenue) / previousMetrics.totalRevenue) * 100;
      }
      
      periodComparison = {
        current: metrics.totalRevenue,
        previous: previousMetrics.totalRevenue,
        change: metrics.totalRevenue - previousMetrics.totalRevenue,
      };
    }

    return {
      totalOrders: metrics.totalOrders,
      totalRevenue: metrics.totalRevenue,
      averageTicket: metrics.averageTicket,
      delayedOrders: metrics.delayedOrders,
      ordersByStatus: metrics.ordersByStatus as Record<OrderStatus, number>,
      ordersByChannel: metrics.ordersByChannel as Record<ChannelType, number>,
      growthRate,
      periodComparison,
    };
  }

  /**
   * Gets the audit trail for an order
   * Requirements: 5.3
   */
  async getOrderAuditTrail(orderId: string, tenantId: string) {
    return await this.auditRepository.getOrderAuditLogs(orderId, tenantId);
  }

  /**
   * Gets valid status transitions for a given current status
   */
  getValidStatusTransitions(currentStatus: OrderStatus): OrderStatus[] {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['ready', 'cancelled'],
      ready: ['delivering', 'delivered', 'cancelled'],
      delivering: ['delivered', 'cancelled'],
      delivered: [], // Terminal state
      cancelled: [], // Terminal state
    };

    return validTransitions[currentStatus] || [];
  }

  /**
   * Checks if a status transition is valid
   */
  isValidStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
    return OrderValidationUtils.isValidStatusTransition(currentStatus, newStatus);
  }

  /**
   * Sends delay notification for orders taking longer than expected
   * Requirements: 3.1, 3.4
   */
  async sendDelayNotification(orderId: string, tenantId: string): Promise<void> {
    try {
      const order = await this.orderRepository.findById(orderId, tenantId);
      if (!order) {
        throw new Error(`Order with ID ${orderId} not found`);
      }

      // Only send delay notifications for orders that are still being prepared or ready
      if (!['preparing', 'ready'].includes(order.status)) {
        console.log(`Skipping delay notification for order ${orderId} - status is ${order.status}`);
        return;
      }

      await this.notificationService.sendDelayNotification(order);
    } catch (error) {
      console.error(`Failed to send delay notification for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Checks for delayed orders and sends notifications
   * This method can be called by a background job
   * Requirements: 3.1, 3.4
   */
  async processDelayedOrderNotifications(tenantId: string): Promise<void> {
    try {
      const delayedOrders = await this.getDelayedOrders(tenantId);
      
      for (const order of delayedOrders) {
        try {
          // Check if we've already sent a delay notification recently (within last 30 minutes)
          const recentNotifications = await this.notificationService.getNotificationHistory(order.id, tenantId);
          const recentDelayNotification = recentNotifications.find(
            n => n.type === 'delay_notification' && 
                 n.createdAt > new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
          );

          if (!recentDelayNotification) {
            await this.sendDelayNotification(order.id, tenantId);
          }
        } catch (error) {
          console.error(`Error processing delay notification for order ${order.id}:`, error);
          // Continue with other orders
        }
      }
    } catch (error) {
      console.error('Error processing delayed order notifications:', error);
      throw error;
    }
  }

  /**
   * Gets notification service instance for external access
   */
  getNotificationService(): NotificationService {
    return this.notificationService;
  }
}