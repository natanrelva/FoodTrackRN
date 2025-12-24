import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { KitchenService } from '../services/KitchenService';
import { KitchenOrderRepository } from '../repositories/KitchenOrderRepository';
import { ProductionContractRepository } from '../repositories/ProductionContractRepository';
import { OrderRepository } from '../repositories/OrderRepository';
import { EventBus } from '@foodtrack/backend-shared';
import {
  CreateKitchenOrderRequestSchema,
  UpdateKitchenOrderStatusRequestSchema,
  UpdateKitchenOrderItemStatusRequestSchema,
  KitchenOrderStatus,
  KitchenPriority,
  StationSchema
} from '../models/KitchenOrder';

const router = Router();

// Initialize services
const kitchenOrderRepository = new KitchenOrderRepository();
const productionContractRepository = new ProductionContractRepository();
const orderRepository = new OrderRepository();
const eventBus = EventBus.getInstance();

const kitchenService = new KitchenService(
  kitchenOrderRepository,
  productionContractRepository,
  orderRepository,
  eventBus
);

// Validation middleware
const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: Function) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors
          }
        });
      }
      next(error);
    }
  };
};

// Get tenant ID from headers
const getTenantId = (req: Request): string => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    throw new Error('Tenant ID is required');
  }
  return tenantId;
};

/**
 * @route GET /api/kitchen/orders
 * @desc Get active kitchen orders
 */
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const status = req.query.status as KitchenOrderStatus;

    let orders;
    if (status) {
      orders = await kitchenService.getKitchenOrdersByStatus(status, tenantId);
    } else {
      orders = await kitchenService.getActiveKitchenOrders(tenantId);
    }

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching kitchen orders:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch kitchen orders'
      }
    });
  }
});

/**
 * @route GET /api/kitchen/orders/:id
 * @desc Get kitchen order by ID
 */
router.get('/orders/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const order = await kitchenService.getKitchenOrder(id, tenantId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Kitchen order not found'
        }
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching kitchen order:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch kitchen order'
      }
    });
  }
});

/**
 * @route GET /api/kitchen/orders/by-order/:orderId
 * @desc Get kitchen order by original order ID
 */
router.get('/orders/by-order/:orderId', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { orderId } = req.params;

    const order = await kitchenService.getKitchenOrderByOrderId(orderId, tenantId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Kitchen order not found for this order'
        }
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching kitchen order by order ID:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch kitchen order'
      }
    });
  }
});

/**
 * @route POST /api/kitchen/orders
 * @desc Create kitchen order from production contract
 */
router.post('/orders', validateRequest(CreateKitchenOrderRequestSchema), async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const orderData = req.body;

    const order = await kitchenService.createKitchenOrder(orderData, tenantId);

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error creating kitchen order:', error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'CREATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create kitchen order'
      }
    });
  }
});

/**
 * @route POST /api/kitchen/orders/from-contract/:contractId
 * @desc Create kitchen order from production contract
 */
router.post('/orders/from-contract/:contractId', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { contractId } = req.params;
    const { priority } = req.body;

    const validPriority = priority && Object.values(KitchenPriority).includes(priority) 
      ? priority as KitchenPriority 
      : KitchenPriority.NORMAL;

    const order = await kitchenService.createKitchenOrderFromContract(contractId, tenantId, validPriority);

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error creating kitchen order from contract:', error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'CREATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create kitchen order from contract'
      }
    });
  }
});

/**
 * @route PUT /api/kitchen/orders/:id/status
 * @desc Update kitchen order status
 */
router.put('/orders/:id/status', validateRequest(UpdateKitchenOrderStatusRequestSchema), async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const statusUpdate = req.body;

    const order = await kitchenService.updateKitchenOrderStatus(id, tenantId, statusUpdate);

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error updating kitchen order status:', error);
    let statusCode = 500;
    let errorCode = 'UPDATE_ERROR';

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'NOT_FOUND';
      } else if (error.message.includes('Invalid') || error.message.includes('transition')) {
        statusCode = 400;
        errorCode = 'INVALID_TRANSITION';
      }
    }

    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: error instanceof Error ? error.message : 'Failed to update kitchen order status'
      }
    });
  }
});

/**
 * @route PUT /api/kitchen/orders/:id/items/status
 * @desc Update kitchen order item status
 */
router.put('/orders/:id/items/status', validateRequest(UpdateKitchenOrderItemStatusRequestSchema), async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const itemStatusUpdate = req.body;

    const success = await kitchenService.updateKitchenOrderItemStatus(id, tenantId, itemStatusUpdate);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Kitchen order or item not found'
        }
      });
    }

    res.json({
      success: true,
      message: 'Kitchen order item status updated successfully'
    });
  } catch (error) {
    console.error('Error updating kitchen order item status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update kitchen order item status'
      }
    });
  }
});

/**
 * @route GET /api/kitchen/stations
 * @desc Get kitchen stations
 */
router.get('/stations', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const active = req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined;

    const stations = await kitchenService.getStations(tenantId, active);

    res.json({
      success: true,
      data: stations
    });
  } catch (error) {
    console.error('Error fetching stations:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch stations'
      }
    });
  }
});

/**
 * @route POST /api/kitchen/stations
 * @desc Create kitchen station
 */
router.post('/stations', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    
    // Validate station data
    const stationData = StationSchema.omit({ 
      id: true, 
      tenantId: true, 
      createdAt: true, 
      updatedAt: true 
    }).parse(req.body);

    const station = await kitchenService.createStation(stationData, tenantId);

    res.status(201).json({
      success: true,
      data: station
    });
  } catch (error) {
    console.error('Error creating station:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid station data',
          details: error.errors
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'CREATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create station'
      }
    });
  }
});

export default router;