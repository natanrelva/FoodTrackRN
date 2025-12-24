import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { OrderService } from '../services/OrderService';
import { 
  CreateOrderSchema, 
  UpdateOrderStatusSchema, 
  OrderFiltersSchema,
  OrderResponseSchema,
  OrderListResponseSchema
} from '../models/Order';

const router = Router();
const orderService = new OrderService();

// GET /api/orders - List orders with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'Tenant ID is required',
        },
      });
    }

    // Parse and validate query parameters
    const filters = OrderFiltersSchema.parse({
      status: req.query.status,
      channel: req.query.channel,
      customerId: req.query.customerId,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      search: req.query.search,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    });

    const result = await orderService.findAll(tenantId, filters);

    const response: OrderListResponseSchema = {
      success: true,
      data: result,
    };

    res.json(response);
  } catch (error) {
    console.error('Error listing orders:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: error.errors,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list orders',
      },
    });
  }
});

// GET /api/orders/stats - Get order statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'Tenant ID is required',
        },
      });
    }

    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

    const stats = await orderService.getOrderStats(tenantId, dateFrom, dateTo);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error getting order stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get order statistics',
      },
    });
  }
});

// GET /api/orders/:id - Get order by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'Tenant ID is required',
        },
      });
    }

    const { id } = req.params;
    
    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid order ID format',
        },
      });
    }

    const order = await orderService.findById(id, tenantId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found',
        },
      });
    }

    const response: OrderResponseSchema = {
      success: true,
      data: order,
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting order:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get order',
      },
    });
  }
});

// POST /api/orders - Create new order
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'Tenant ID is required',
        },
      });
    }

    const orderData = CreateOrderSchema.parse(req.body);
    const order = await orderService.create(orderData, tenantId);

    const response: OrderResponseSchema = {
      success: true,
      data: order,
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating order:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid order data',
          details: error.errors,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create order',
      },
    });
  }
});

// PUT /api/orders/:id/confirm - Confirm order (generates Production Contract)
router.put('/:id/confirm', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'Tenant ID is required',
        },
      });
    }

    const { id } = req.params;
    
    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid order ID format',
        },
      });
    }

    const order = await orderService.confirm(id, tenantId);

    const response: OrderResponseSchema = {
      success: true,
      data: order,
    };

    res.json(response);
  } catch (error) {
    console.error('Error confirming order:', error);
    
    if (error instanceof Error && error.message.includes('Invalid status transition')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: error.message,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to confirm order',
      },
    });
  }
});

// PUT /api/orders/:id/status - Update order status
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'Tenant ID is required',
        },
      });
    }

    const { id } = req.params;
    
    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid order ID format',
        },
      });
    }

    const updateData = UpdateOrderStatusSchema.parse(req.body);
    const order = await orderService.updateStatus(id, updateData, tenantId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found',
        },
      });
    }

    const response: OrderResponseSchema = {
      success: true,
      data: order,
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating order status:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid status update data',
          details: error.errors,
        },
      });
    }

    if (error instanceof Error && error.message.includes('Invalid status transition')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: error.message,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update order status',
      },
    });
  }
});

// DELETE /api/orders/:id - Cancel order
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'Tenant ID is required',
        },
      });
    }

    const { id } = req.params;
    const { reason } = req.body;
    
    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid order ID format',
        },
      });
    }

    const order = await orderService.cancel(id, reason || 'Order cancelled by user', tenantId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found',
        },
      });
    }

    res.json({
      success: true,
      data: {
        message: 'Order cancelled successfully',
        order,
      },
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    
    if (error instanceof Error && error.message.includes('Invalid status transition')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: error.message,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to cancel order',
      },
    });
  }
});

// GET /api/orders/:id/history - Get order history
router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'Tenant ID is required',
        },
      });
    }

    const { id } = req.params;
    
    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid order ID format',
        },
      });
    }

    const history = await orderService.getOrderHistory(id, tenantId);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('Error getting order history:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get order history',
      },
    });
  }
});

// GET /api/orders/:id/transitions - Get valid status transitions
router.get('/:id/transitions', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'Tenant ID is required',
        },
      });
    }

    const { id } = req.params;
    
    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid order ID format',
        },
      });
    }

    const transitions = await orderService.getValidStatusTransitions(id, tenantId);

    res.json({
      success: true,
      data: transitions,
    });
  } catch (error) {
    console.error('Error getting valid transitions:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get valid status transitions',
      },
    });
  }
});

// GET /api/orders/:id/production-contract - Get Production Contract for order
router.get('/:id/production-contract', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'Tenant ID is required',
        },
      });
    }

    const { id } = req.params;
    
    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid order ID format',
        },
      });
    }

    const contract = await orderService.getProductionContract(id, tenantId);

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONTRACT_NOT_FOUND',
          message: 'Production contract not found for this order',
        },
      });
    }

    res.json({
      success: true,
      data: contract,
    });
  } catch (error) {
    console.error('Error getting production contract:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get production contract',
      },
    });
  }
});

export default router;