import { Router } from 'express';
import { CreateOrderRequestSchema, OrderFiltersSchema, OrderStatusSchema } from '@foodtrack/backend-shared';
import { OrderService } from '../services/OrderService';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';

const router: Router = Router();
const orderService = new OrderService();

// Apply authentication and tenant middleware to all routes
router.use(authMiddleware);
router.use(tenantMiddleware);

// GET /api/orders
router.get('/', async (req, res, next) => {
  try {
    const { 
      status, 
      channel, 
      dateFrom, 
      dateTo, 
      customerId, 
      search, 
      page = '1', 
      limit = '20' 
    } = req.query;
    
    // Build filters object
    const filters: any = {
      page: parseInt(page as string, 10),
      limit: Math.min(parseInt(limit as string, 10), 100), // Cap at 100
    };
    
    // Add optional filters
    if (status) {
      const statusArray = Array.isArray(status) ? status : [status];
      filters.status = statusArray.filter(s => OrderStatusSchema.safeParse(s).success);
    }
    
    if (channel) {
      const channelArray = Array.isArray(channel) ? channel : [channel];
      filters.channel = channelArray;
    }
    
    if (dateFrom) {
      filters.dateFrom = new Date(dateFrom as string);
    }
    
    if (dateTo) {
      filters.dateTo = new Date(dateTo as string);
    }
    
    if (customerId) {
      filters.customerId = customerId as string;
    }
    
    if (search) {
      filters.search = search as string;
    }
    
    // Validate filters using schema
    const validatedFilters = OrderFiltersSchema.parse(filters);
    
    // Get orders using OrderService
    const result = await orderService.getOrders(validatedFilters, req.tenantId!);
    
    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      // Handle validation errors
      if (error.message.includes('Invalid filters')) {
        return res.status(400).json({ 
          error: 'VALIDATION_ERROR',
          message: error.message 
        });
      }
    }
    
    next(error);
  }
});

// GET /api/orders/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid order ID format' 
      });
    }
    
    // Get order using OrderService
    const order = await orderService.getOrderById(id, req.tenantId!);
    
    res.json(order);
  } catch (error) {
    if (error instanceof Error) {
      // Handle order not found
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          error: 'ORDER_NOT_FOUND',
          message: 'Order not found' 
        });
      }
    }
    
    next(error);
  }
});

// POST /api/orders
router.post('/', async (req, res, next) => {
  try {
    // Validate request body using shared schema
    const orderData = CreateOrderRequestSchema.parse(req.body);
    
    // Create order using OrderService
    const order = await orderService.createOrder(orderData, req.tenantId!);
    
    res.status(201).json(order);
  } catch (error) {
    if (error instanceof Error) {
      // Handle validation errors
      if (error.message.includes('validation failed') || error.message.includes('not found')) {
        return res.status(400).json({ 
          error: 'VALIDATION_ERROR',
          message: error.message 
        });
      }
      
      // Handle business logic errors
      if (error.message.includes('not available') || error.message.includes('Insufficient stock')) {
        return res.status(400).json({ 
          error: 'PRODUCT_NOT_AVAILABLE',
          message: error.message 
        });
      }
    }
    
    next(error);
  }
});

// PUT /api/orders/:id/status
router.put('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid order ID format' 
      });
    }
    
    // Validate status
    const statusValidation = OrderStatusSchema.safeParse(status);
    if (!statusValidation.success) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid order status' 
      });
    }
    
    // Build audit context from request
    const auditContext = {
      userId: req.user?.userId,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      reason: reason as string | undefined,
    };
    
    // Update order status using OrderService
    const updatedOrder = await orderService.updateOrderStatus(
      id, 
      statusValidation.data, 
      req.tenantId!,
      auditContext
    );
    
    res.json(updatedOrder);
  } catch (error) {
    if (error instanceof Error) {
      // Handle order not found
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          error: 'ORDER_NOT_FOUND',
          message: 'Order not found' 
        });
      }
      
      // Handle invalid status transitions
      if (error.message.includes('Invalid status transition')) {
        return res.status(400).json({ 
          error: 'INVALID_STATUS_TRANSITION',
          message: error.message 
        });
      }
      
      // Handle business rule violations
      if (error.message.includes('Cannot') || error.message.includes('must be')) {
        return res.status(400).json({ 
          error: 'BUSINESS_RULE_VIOLATION',
          message: error.message 
        });
      }
    }
    
    next(error);
  }
});

// Kitchen Integration Webhooks

// POST /api/orders/webhook/kitchen-integration - Webhook for kitchen system integration
router.post('/webhook/kitchen-integration', async (req, res, next) => {
  try {
    const { eventType, orderId, orderData, statusChange } = req.body;
    
    if (!eventType || !orderId) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'eventType and orderId are required' 
      });
    }
    
    // Import integration service
    const { KitchenIntegrationService } = await import('../services/KitchenIntegrationService');
    const integrationService = new KitchenIntegrationService();
    
    switch (eventType) {
      case 'order_created':
        if (!orderData) {
          return res.status(400).json({ 
            error: 'VALIDATION_ERROR',
            message: 'orderData is required for order_created event' 
          });
        }
        
        // Process new order in kitchen system
        const kitchenOrder = await integrationService.processNewOrder(orderData, req.tenantId!);
        
        res.status(201).json({ 
          success: true,
          kitchenOrderId: kitchenOrder.id,
          message: 'Order processed in kitchen system' 
        });
        break;
        
      case 'order_status_changed':
        if (!statusChange || !statusChange.newStatus || !statusChange.previousStatus) {
          return res.status(400).json({ 
            error: 'VALIDATION_ERROR',
            message: 'statusChange with newStatus and previousStatus is required' 
          });
        }
        
        // Handle order status change
        await integrationService.handleOrderStatusChange(
          orderId, 
          statusChange.newStatus, 
          statusChange.previousStatus, 
          req.tenantId!
        );
        
        res.json({ 
          success: true,
          message: 'Order status change processed' 
        });
        break;
        
      default:
        return res.status(400).json({ 
          error: 'INVALID_EVENT_TYPE',
          message: `Unsupported event type: ${eventType}` 
        });
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          error: 'RESOURCE_NOT_FOUND',
          message: error.message 
        });
      }
    }
    
    next(error);
  }
});

export default router;