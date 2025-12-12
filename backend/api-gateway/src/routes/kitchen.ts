import { Router } from 'express';
import { KitchenStatusSchema, OrderPrioritySchema } from '@foodtrack/backend-shared';
import { KitchenService } from '../services/KitchenService';
import { KitchenIntegrationService } from '../services/KitchenIntegrationService';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';

const router: Router = Router();
const kitchenService = new KitchenService();
const integrationService = new KitchenIntegrationService();

// Apply authentication and tenant middleware to all routes
router.use(authMiddleware);
router.use(tenantMiddleware);

// GET /api/kitchen/orders - Get active kitchen orders
router.get('/orders', async (req, res, next) => {
  try {
    const { 
      status, 
      priority, 
      stationId, 
      dateFrom, 
      dateTo, 
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
      filters.status = statusArray.filter(s => KitchenStatusSchema.safeParse(s).success);
    }
    
    if (priority) {
      const priorityArray = Array.isArray(priority) ? priority : [priority];
      filters.priority = priorityArray.filter(p => OrderPrioritySchema.safeParse(p).success);
    }
    
    if (stationId) {
      filters.stationId = stationId as string;
    }
    
    if (dateFrom) {
      filters.dateFrom = new Date(dateFrom as string);
    }
    
    if (dateTo) {
      filters.dateTo = new Date(dateTo as string);
    }
    
    // Get active orders using KitchenService
    const orders = await kitchenService.getActiveOrders(req.tenantId!, filters);
    
    res.json({ orders });
  } catch (error) {
    if (error instanceof Error) {
      // Handle validation errors
      if (error.message.includes('Invalid')) {
        return res.status(400).json({ 
          error: 'VALIDATION_ERROR',
          message: error.message 
        });
      }
    }
    
    next(error);
  }
});

// GET /api/kitchen/orders/:id - Get specific kitchen order
router.get('/orders/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid order ID format' 
      });
    }
    
    // Get orders using KitchenService
    const orders = await kitchenService.getActiveOrders(req.tenantId!, { });
    const order = orders.find(o => o.id === id);
    
    if (!order) {
      return res.status(404).json({ 
        error: 'ORDER_NOT_FOUND',
        message: 'Kitchen order not found' 
      });
    }
    
    res.json(order);
  } catch (error) {
    next(error);
  }
});

// PUT /api/kitchen/orders/:id/status - Update kitchen order status
router.put('/orders/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, stationId } = req.body;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid order ID format' 
      });
    }
    
    // Validate status
    const statusValidation = KitchenStatusSchema.safeParse(status);
    if (!statusValidation.success) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid kitchen status' 
      });
    }
    
    // Update order status using KitchenService
    const updatedOrder = await kitchenService.updateOrderStatus(
      id, 
      statusValidation.data, 
      req.tenantId!,
      stationId
    );
    
    res.json(updatedOrder);
  } catch (error) {
    if (error instanceof Error) {
      // Handle order not found
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          error: 'ORDER_NOT_FOUND',
          message: 'Kitchen order not found' 
        });
      }
      
      // Handle invalid status transitions
      if (error.message.includes('Invalid status transition')) {
        return res.status(400).json({ 
          error: 'INVALID_STATUS_TRANSITION',
          message: error.message 
        });
      }
    }
    
    next(error);
  }
});

// POST /api/kitchen/orders/:id/assign - Assign order to station
router.post('/orders/:id/assign', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stationId } = req.body;
    
    // Validate UUID formats
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid order ID format' 
      });
    }
    
    if (!stationId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stationId)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid station ID format' 
      });
    }
    
    // Assign order to station using KitchenService
    const assignment = await kitchenService.assignOrderToStation(id, stationId, req.tenantId!);
    
    res.json(assignment);
  } catch (error) {
    if (error instanceof Error) {
      // Handle capacity issues
      if (error.message.includes('capacity')) {
        return res.status(400).json({ 
          error: 'STATION_AT_CAPACITY',
          message: error.message 
        });
      }
      
      // Handle not found errors
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

// GET /api/kitchen/stations/:id/workload - Get station workload
router.get('/stations/:id/workload', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid station ID format' 
      });
    }
    
    // Get station workload using KitchenService
    const workload = await kitchenService.getStationWorkload(id, req.tenantId!);
    
    res.json(workload);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          error: 'STATION_NOT_FOUND',
          message: 'Station not found' 
        });
      }
    }
    
    next(error);
  }
});

// GET /api/kitchen/stations/:id/orders - Get orders assigned to specific station
router.get('/stations/:id/orders', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, priority } = req.query;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid station ID format' 
      });
    }
    
    // Build filters for station-specific orders
    const filters: any = { stationId: id };
    
    if (status) {
      const statusArray = Array.isArray(status) ? status : [status];
      filters.status = statusArray;
    }
    
    if (priority) {
      const priorityArray = Array.isArray(priority) ? priority : [priority];
      filters.priority = priorityArray;
    }
    
    // Get station orders using KitchenService
    const orders = await kitchenService.getActiveOrders(req.tenantId!, filters);
    
    res.json({ orders });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          error: 'STATION_NOT_FOUND',
          message: 'Station not found' 
        });
      }
    }
    
    next(error);
  }
});

// GET /api/kitchen/stations/:id/instructions - Get station-specific instructions
router.get('/stations/:id/instructions', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid station ID format' 
      });
    }
    
    // Get station instructions using KitchenService
    const instructions = await kitchenService.getStationInstructions(id, req.tenantId!);
    
    res.json(instructions);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          error: 'STATION_NOT_FOUND',
          message: 'Station not found' 
        });
      }
    }
    
    next(error);
  }
});

// POST /api/kitchen/stations/:id/help-request - Create help request from station
router.post('/stations/:id/help-request', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { requestType, description, priority } = req.body;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid station ID format' 
      });
    }
    
    // Validate required fields
    if (!requestType || !description) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Request type and description are required' 
      });
    }
    
    const validRequestTypes = ['equipment', 'ingredient', 'technique', 'emergency', 'other'];
    if (!validRequestTypes.includes(requestType)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid request type' 
      });
    }
    
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid priority level' 
      });
    }
    
    // Create help request using KitchenService
    const helpRequest = await kitchenService.createHelpRequest(
      id, 
      requestType, 
      description, 
      priority || 'medium',
      req.tenantId!,
      req.user?.userId || 'unknown'
    );
    
    res.status(201).json(helpRequest);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          error: 'STATION_NOT_FOUND',
          message: 'Station not found' 
        });
      }
    }
    
    next(error);
  }
});

// POST /api/kitchen/stations/:id/issue-report - Report station issue
router.post('/stations/:id/issue-report', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, description, severity, affectedEquipment, estimatedDowntime } = req.body;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid station ID format' 
      });
    }
    
    // Validate required fields
    if (!type || !description || !severity) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Type, description, and severity are required' 
      });
    }
    
    const validTypes = ['equipment_failure', 'supply_shortage', 'staff_shortage', 'cleanliness', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid issue type' 
      });
    }
    
    const validSeverities = ['minor', 'major', 'critical'];
    if (!validSeverities.includes(severity)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid severity level' 
      });
    }
    
    const issue = {
      type,
      description,
      severity,
      affectedEquipment: affectedEquipment || [],
      estimatedDowntime: estimatedDowntime || 0,
    };
    
    // Report station issue using KitchenService
    const issueReport = await kitchenService.reportStationIssue(
      id, 
      issue, 
      req.tenantId!,
      req.user?.userId || 'unknown'
    );
    
    res.status(201).json(issueReport);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          error: 'STATION_NOT_FOUND',
          message: 'Station not found' 
        });
      }
    }
    
    next(error);
  }
});

// POST /api/kitchen/estimate-time - Estimate preparation time for items
router.post('/estimate-time', async (req, res, next) => {
  try {
    const { items } = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Items array is required and must not be empty' 
      });
    }
    
    // Estimate preparation time using KitchenService
    const estimates = await kitchenService.estimatePreparationTime(items, req.tenantId!);
    
    res.json({ estimates });
  } catch (error) {
    next(error);
  }
});

// POST /api/kitchen/orders/:id/quality-issue - Report quality issue
router.post('/orders/:id/quality-issue', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, description, severity } = req.body;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid order ID format' 
      });
    }
    
    // Validate required fields
    if (!type || !description || !severity) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Type, description, and severity are required' 
      });
    }
    
    const issue = {
      type,
      description,
      severity,
      reportedBy: req.user?.userId || 'unknown',
    };
    
    // Report quality issue using KitchenService
    const report = await kitchenService.reportQualityIssue(id, issue, req.tenantId!);
    
    res.status(201).json(report);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          error: 'ORDER_NOT_FOUND',
          message: 'Kitchen order not found' 
        });
      }
    }
    
    next(error);
  }
});

// Status Tracking and Updates Routes

// PUT /api/kitchen/orders/:orderId/items/:itemId/status - Update item status
router.put('/orders/:orderId/items/:itemId/status', async (req, res, next) => {
  try {
    const { orderId, itemId } = req.params;
    const { status, notes } = req.body;
    
    // Validate UUID formats
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid order ID format' 
      });
    }
    
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid item ID format' 
      });
    }
    
    // Validate status
    const validStatuses = ['pending', 'assigned', 'in_progress', 'ready', 'completed', 'on_hold'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid item status' 
      });
    }
    
    // Update item status using KitchenService
    await kitchenService.updateItemStatus(
      orderId, 
      itemId, 
      status, 
      req.tenantId!, 
      req.user?.userId || 'unknown',
      notes
    );
    
    res.json({ success: true, message: 'Item status updated successfully' });
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

// GET /api/kitchen/orders/:id/status-history - Get status update history
router.get('/orders/:id/status-history', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid order ID format' 
      });
    }
    
    // Get status update history using KitchenService
    const history = await kitchenService.getStatusUpdateHistory(id, req.tenantId!);
    
    res.json(history);
  } catch (error) {
    next(error);
  }
});

// POST /api/kitchen/orders/:id/delay - Report delay
router.post('/orders/:id/delay', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { delayMinutes, reason } = req.body;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid order ID format' 
      });
    }
    
    // Validate required fields
    if (!delayMinutes || delayMinutes <= 0 || !reason) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Delay minutes (positive number) and reason are required' 
      });
    }
    
    // Report delay using KitchenService
    const notification = await kitchenService.reportDelay(
      id, 
      delayMinutes, 
      reason, 
      req.tenantId!, 
      req.user?.userId || 'unknown'
    );
    
    res.status(201).json(notification);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          error: 'ORDER_NOT_FOUND',
          message: 'Kitchen order not found' 
        });
      }
    }
    
    next(error);
  }
});

// POST /api/kitchen/orders/:id/notify-delay - Notify customer of delay
router.post('/orders/:id/notify-delay', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { delayMinutes, reason } = req.body;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid order ID format' 
      });
    }
    
    // Validate required fields
    if (!delayMinutes || delayMinutes <= 0 || !reason) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Delay minutes (positive number) and reason are required' 
      });
    }
    
    // Notify customer of delay using KitchenService
    const notification = await kitchenService.notifyCustomerOfDelay(
      id, 
      delayMinutes, 
      reason, 
      req.tenantId!
    );
    
    res.status(201).json(notification);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          error: 'ORDER_NOT_FOUND',
          message: 'Kitchen order not found' 
        });
      }
    }
    
    next(error);
  }
});

// POST /api/kitchen/orders/:id/remake-request - Create remake request
router.post('/orders/:id/remake-request', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, itemId } = req.body;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid order ID format' 
      });
    }
    
    if (itemId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid item ID format' 
      });
    }
    
    // Validate required fields
    if (!reason) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Reason is required' 
      });
    }
    
    // Create remake request using KitchenService
    const remakeRequest = await kitchenService.createRemakeRequest(
      id, 
      reason, 
      req.tenantId!, 
      req.user?.userId || 'unknown',
      itemId
    );
    
    res.status(201).json(remakeRequest);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          error: 'ORDER_NOT_FOUND',
          message: 'Kitchen order not found' 
        });
      }
    }
    
    next(error);
  }
});

// PUT /api/kitchen/remake-requests/:id/approve - Approve remake request
router.put('/remake-requests/:id/approve', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid remake request ID format' 
      });
    }
    
    // Approve remake request using KitchenService
    const approvedRequest = await kitchenService.approveRemakeRequest(
      id, 
      req.tenantId!, 
      req.user?.userId || 'unknown'
    );
    
    res.json(approvedRequest);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          error: 'REMAKE_REQUEST_NOT_FOUND',
          message: 'Remake request not found' 
        });
      }
    }
    
    next(error);
  }
});

// POST /api/kitchen/orders/:id/coordinate-delivery - Coordinate delivery pickup
router.post('/orders/:id/coordinate-delivery', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid order ID format' 
      });
    }
    
    // Coordinate delivery pickup using KitchenService
    const coordination = await kitchenService.coordinateDeliveryPickup(
      id, 
      req.tenantId!, 
      req.user?.userId || 'unknown'
    );
    
    res.status(201).json(coordination);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          error: 'ORDER_NOT_FOUND',
          message: 'Kitchen order not found' 
        });
      }
      
      if (error.message.includes('not ready')) {
        return res.status(400).json({ 
          error: 'ORDER_NOT_READY',
          message: error.message 
        });
      }
    }
    
    next(error);
  }
});

// PUT /api/kitchen/delivery-coordinations/:id/status - Update delivery status
router.put('/delivery-coordinations/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid coordination ID format' 
      });
    }
    
    // Validate status
    const validStatuses = ['pending', 'notified', 'dispatched', 'picked_up', 'delivered'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid delivery status' 
      });
    }
    
    // Update delivery status using KitchenService
    const coordination = await kitchenService.updateDeliveryStatus(id, status, req.tenantId!);
    
    res.json(coordination);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          error: 'COORDINATION_NOT_FOUND',
          message: 'Delivery coordination not found' 
        });
      }
    }
    
    next(error);
  }
});

// GET /api/kitchen/orders/:id/preparation-stages - Get preparation stages
router.get('/orders/:id/preparation-stages', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid order ID format' 
      });
    }
    
    // Get preparation stages using KitchenService
    const stages = await kitchenService.trackPreparationStages(id, req.tenantId!);
    
    res.json(stages);
  } catch (error) {
    next(error);
  }
});

// PUT /api/kitchen/preparation-stages/:id - Update preparation stage
router.put('/preparation-stages/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid stage ID format' 
      });
    }
    
    // Validate status
    const validStatuses = ['pending', 'in_progress', 'completed', 'on_hold', 'failed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid preparation stage status' 
      });
    }
    
    // Update preparation stage using KitchenService
    const stage = await kitchenService.updatePreparationStage(
      id, 
      status, 
      req.tenantId!, 
      req.user?.userId || 'unknown',
      notes
    );
    
    res.json(stage);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          error: 'STAGE_NOT_FOUND',
          message: 'Preparation stage not found' 
        });
      }
    }
    
    next(error);
  }
});

// Recipe Management Routes

// GET /api/kitchen/recipes/:dishId - Get recipe for dish
router.get('/recipes/:dishId', async (req, res, next) => {
  try {
    const { dishId } = req.params;
    const { modifications } = req.query;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dishId)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid dish ID format' 
      });
    }
    
    let modificationsList: string[] = [];
    if (modifications) {
      modificationsList = Array.isArray(modifications) ? modifications as string[] : [modifications as string];
    }
    
    // Get recipe instructions using KitchenService
    const instructions = await kitchenService.getRecipeInstructions(dishId, modificationsList, req.tenantId!);
    
    if (!instructions) {
      return res.status(404).json({ 
        error: 'RECIPE_NOT_FOUND',
        message: 'Recipe not found for this dish' 
      });
    }
    
    res.json(instructions);
  } catch (error) {
    next(error);
  }
});

// GET /api/kitchen/recipes/:dishId/ingredients - Get ingredient requirements
router.get('/recipes/:dishId/ingredients', async (req, res, next) => {
  try {
    const { dishId } = req.params;
    const { quantity = '1' } = req.query;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dishId)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid dish ID format' 
      });
    }
    
    const quantityNum = parseInt(quantity as string, 10);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Quantity must be a positive number' 
      });
    }
    
    // Get ingredient requirements using KitchenService
    const requirements = await kitchenService.getIngredientRequirements(dishId, quantityNum, req.tenantId!);
    
    if (!requirements) {
      return res.status(404).json({ 
        error: 'RECIPE_NOT_FOUND',
        message: 'Recipe not found for this dish' 
      });
    }
    
    res.json(requirements);
  } catch (error) {
    next(error);
  }
});

// Inventory Management Routes

// GET /api/kitchen/inventory - Get current inventory stock
router.get('/inventory', async (req, res, next) => {
  try {
    // Get current stock using KitchenService
    const inventory = await kitchenService.getCurrentStock(req.tenantId!);
    
    res.json({ inventory });
  } catch (error) {
    next(error);
  }
});

// GET /api/kitchen/inventory/alerts/low-stock - Get low stock alerts
router.get('/inventory/alerts/low-stock', async (req, res, next) => {
  try {
    // Get low stock alerts using KitchenService
    const alerts = await kitchenService.getLowStockAlerts(req.tenantId!);
    
    res.json({ alerts });
  } catch (error) {
    next(error);
  }
});

// GET /api/kitchen/inventory/alerts/expiration - Get expiration alerts
router.get('/inventory/alerts/expiration', async (req, res, next) => {
  try {
    // Get expiration alerts using KitchenService
    const alerts = await kitchenService.getExpirationAlerts(req.tenantId!);
    
    res.json({ alerts });
  } catch (error) {
    next(error);
  }
});

// POST /api/kitchen/inventory/:ingredientId/usage - Update ingredient usage
router.post('/inventory/:ingredientId/usage', async (req, res, next) => {
  try {
    const { ingredientId } = req.params;
    const { quantity, orderId } = req.body;
    
    // Validate UUID formats
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ingredientId)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid ingredient ID format' 
      });
    }
    
    if (orderId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid order ID format' 
      });
    }
    
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Quantity must be a positive number' 
      });
    }
    
    // Update ingredient usage using KitchenService
    const update = await kitchenService.updateIngredientUsage(
      ingredientId, 
      quantity, 
      orderId || 'manual-usage', 
      req.tenantId!
    );
    
    res.json(update);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Insufficient stock')) {
        return res.status(400).json({ 
          error: 'INSUFFICIENT_STOCK',
          message: error.message 
        });
      }
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          error: 'INGREDIENT_NOT_FOUND',
          message: 'Ingredient not found' 
        });
      }
    }
    
    next(error);
  }
});

// GET /api/kitchen/inventory/:ingredientId/availability - Check ingredient availability
router.get('/inventory/:ingredientId/availability', async (req, res, next) => {
  try {
    const { ingredientId } = req.params;
    const { quantity = '1' } = req.query;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ingredientId)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid ingredient ID format' 
      });
    }
    
    const quantityNum = parseFloat(quantity as string);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Quantity must be a positive number' 
      });
    }
    
    // Check ingredient availability using KitchenService
    const availability = await kitchenService.checkIngredientAvailability(
      ingredientId, 
      quantityNum, 
      req.tenantId!
    );
    
    res.json(availability);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          error: 'INGREDIENT_NOT_FOUND',
          message: 'Ingredient not found' 
        });
      }
    }
    
    next(error);
  }
});

// POST /api/kitchen/inventory/delivery - Record ingredient delivery
router.post('/inventory/delivery', async (req, res, next) => {
  try {
    const { supplier, deliveryDate, invoiceNumber, totalCost, items, notes } = req.body;
    
    // Validate required fields
    if (!supplier || !deliveryDate || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Supplier, delivery date, and items are required' 
      });
    }
    
    // Validate delivery date
    const parsedDate = new Date(deliveryDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid delivery date format' 
      });
    }
    
    // Validate items
    for (const item of items) {
      if (!item.inventoryItemId || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({ 
          error: 'VALIDATION_ERROR',
          message: 'Each item must have inventoryItemId and positive quantity' 
        });
      }
    }
    
    const delivery = {
      supplier,
      deliveryDate: parsedDate,
      invoiceNumber,
      totalCost: totalCost || 0,
      items: items.map((item: any) => ({
        inventoryItemId: item.inventoryItemId,
        itemName: item.itemName || 'Unknown Item',
        quantity: item.quantity,
        unit: item.unit || 'units',
        costPerUnit: item.costPerUnit || 0,
        batchNumber: item.batchNumber,
        expirationDate: item.expirationDate ? new Date(item.expirationDate) : undefined,
        qualityCheck: item.qualityCheck || 'pending',
        notes: item.notes,
      })),
      receivedBy: req.user?.userId || 'unknown',
      qualityApproved: false,
      notes,
    };
    
    // Record ingredient delivery using KitchenService
    const recordedDelivery = await kitchenService.recordIngredientDelivery(delivery, req.tenantId!);
    
    res.status(201).json(recordedDelivery);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          error: 'INGREDIENT_NOT_FOUND',
          message: 'One or more ingredients not found' 
        });
      }
    }
    
    next(error);
  }
});

// POST /api/kitchen/inventory/barcode-scan - Process barcode scan for delivery
router.post('/inventory/barcode-scan', async (req, res, next) => {
  try {
    const { barcode, quantity } = req.body;
    
    if (!barcode) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Barcode is required' 
      });
    }
    
    // Find inventory item by barcode
    const inventory = await kitchenService.getCurrentStock(req.tenantId!);
    const item = inventory.find(i => i.barcode === barcode);
    
    if (!item) {
      return res.status(404).json({ 
        error: 'ITEM_NOT_FOUND',
        message: 'No inventory item found with this barcode' 
      });
    }
    
    // Return item information for delivery processing
    res.json({
      inventoryItem: item,
      suggestedQuantity: quantity || 1,
      lastDeliveryDate: null, // Would be fetched from delivery history
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/kitchen/inventory/:ingredientId/availability - Update dish availability based on ingredient stock
router.put('/inventory/:ingredientId/availability', async (req, res, next) => {
  try {
    const { ingredientId } = req.params;
    const { markUnavailable } = req.body;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ingredientId)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid ingredient ID format' 
      });
    }
    
    // Get ingredient requirements for all dishes
    const inventory = await kitchenService.getCurrentStock(req.tenantId!);
    const ingredient = inventory.find(i => i.id === ingredientId);
    
    if (!ingredient) {
      return res.status(404).json({ 
        error: 'INGREDIENT_NOT_FOUND',
        message: 'Ingredient not found' 
      });
    }
    
    // In a full implementation, this would update dish availability in the product service
    // For now, we'll return the affected dishes that should be marked unavailable
    const affectedDishes: string[] = []; // Would be populated from recipe database
    
    res.json({
      ingredient: ingredient.name,
      currentStock: ingredient.currentStock,
      minimumStock: ingredient.minimumStock,
      affectedDishes,
      recommendedAction: markUnavailable ? 'mark_unavailable' : 'restock_needed',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/kitchen/inventory/reorder-suggestions - Get reordering suggestions
router.get('/inventory/reorder-suggestions', async (req, res, next) => {
  try {
    // Get low stock alerts
    const lowStockAlerts = await kitchenService.getLowStockAlerts(req.tenantId!);
    
    // Get expiration alerts
    const expirationAlerts = await kitchenService.getExpirationAlerts(req.tenantId!);
    
    // Generate reorder suggestions based on alerts and usage patterns
    const suggestions = lowStockAlerts.map(alert => ({
      ingredientId: alert.inventoryItemId,
      ingredientName: alert.itemName,
      currentStock: alert.currentStock,
      minimumStock: alert.minimumStock,
      suggestedOrderQuantity: Math.max(alert.minimumStock * 2, 10), // Simple calculation
      priority: alert.severity,
      reason: 'Low stock',
      estimatedCost: 0, // Would be calculated from supplier data
    }));
    
    res.json({ suggestions });
  } catch (error) {
    next(error);
  }
});

// Station Assignment and Workflow Management Routes

// GET /api/kitchen/orders/:id/station-assignments - Get optimal station assignments for order
router.get('/orders/:id/station-assignments', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid order ID format' 
      });
    }
    
    // Get optimal station assignments using KitchenService
    const assignmentResult = await kitchenService.getOptimalStationAssignments(id, req.tenantId!);
    
    res.json(assignmentResult);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          error: 'ORDER_NOT_FOUND',
          message: 'Kitchen order not found' 
        });
      }
    }
    
    next(error);
  }
});

// POST /api/kitchen/orders/:id/auto-assign - Auto-assign order to optimal stations
router.post('/orders/:id/auto-assign', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid order ID format' 
      });
    }
    
    // Auto-assign order to optimal stations using KitchenService
    const assignments = await kitchenService.autoAssignOrderToOptimalStation(id, req.tenantId!);
    
    res.json({ assignments });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          error: 'ORDER_NOT_FOUND',
          message: 'Kitchen order not found' 
        });
      }
    }
    
    next(error);
  }
});

// GET /api/kitchen/stations/overloads - Detect station overloads
router.get('/stations/overloads', async (req, res, next) => {
  try {
    // Detect station overloads using KitchenService
    const overloads = await kitchenService.detectStationOverloads(req.tenantId!);
    
    res.json({ overloads });
  } catch (error) {
    next(error);
  }
});

// GET /api/kitchen/workload/redistribution-suggestions - Get workload redistribution suggestions
router.get('/workload/redistribution-suggestions', async (req, res, next) => {
  try {
    // Get workload redistribution suggestions using KitchenService
    const suggestions = await kitchenService.suggestWorkloadRedistribution(req.tenantId!);
    
    res.json({ suggestions });
  } catch (error) {
    next(error);
  }
});

// GET /api/kitchen/staff/cross-training-suggestions - Get cross-training suggestions
router.get('/staff/cross-training-suggestions', async (req, res, next) => {
  try {
    // Get cross-training suggestions using KitchenService
    const suggestions = await kitchenService.getCrossTrainingSuggestions(req.tenantId!);
    
    res.json({ suggestions });
  } catch (error) {
    next(error);
  }
});

// POST /api/kitchen/workload/redistribute - Execute workload redistribution
router.post('/workload/redistribute', async (req, res, next) => {
  try {
    const { fromStationId, toStationId, orderIds } = req.body;
    
    // Validate required fields
    if (!fromStationId || !toStationId || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'fromStationId, toStationId, and orderIds array are required' 
      });
    }
    
    // Validate UUID formats
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fromStationId)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid fromStationId format' 
      });
    }
    
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(toStationId)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid toStationId format' 
      });
    }
    
    // Validate order IDs
    for (const orderId of orderIds) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
        return res.status(400).json({ 
          error: 'VALIDATION_ERROR',
          message: `Invalid order ID format: ${orderId}` 
        });
      }
    }
    
    // Execute workload redistribution using KitchenRepository
    const success = await kitchenService['kitchenRepository'].redistributeWorkload(
      fromStationId, 
      toStationId, 
      orderIds, 
      req.tenantId!
    );
    
    if (success) {
      res.json({ 
        success: true, 
        message: `Successfully redistributed ${orderIds.length} orders from station to station`,
        redistributedOrders: orderIds.length
      });
    } else {
      res.status(500).json({ 
        error: 'REDISTRIBUTION_FAILED',
        message: 'Failed to redistribute workload' 
      });
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          error: 'STATION_NOT_FOUND',
          message: 'One or more stations not found' 
        });
      }
    }
    
    next(error);
  }
});

// PUT /api/kitchen/stations/:id/capacity - Update station capacity
router.put('/stations/:id/capacity', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { capacity } = req.body;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid station ID format' 
      });
    }
    
    // Validate capacity
    if (!capacity || capacity <= 0 || !Number.isInteger(capacity)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Capacity must be a positive integer' 
      });
    }
    
    // Update station capacity using KitchenRepository
    const success = await kitchenService['kitchenRepository'].updateStationCapacity(id, capacity, req.tenantId!);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Station capacity updated successfully',
        stationId: id,
        newCapacity: capacity
      });
    } else {
      res.status(404).json({ 
        error: 'STATION_NOT_FOUND',
        message: 'Station not found' 
      });
    }
  } catch (error) {
    next(error);
  }
});

// POST /api/kitchen/stations/:id/assign-staff - Assign staff to station
router.post('/stations/:id/assign-staff', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { staffId } = req.body;
    
    // Validate UUID formats
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid station ID format' 
      });
    }
    
    if (!staffId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(staffId)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid staff ID format' 
      });
    }
    
    // Assign staff to station using KitchenRepository
    const success = await kitchenService['kitchenRepository'].assignStaffToStation(staffId, id, req.tenantId!);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Staff assigned to station successfully',
        stationId: id,
        staffId
      });
    } else {
      res.status(404).json({ 
        error: 'RESOURCE_NOT_FOUND',
        message: 'Station or staff member not found' 
      });
    }
  } catch (error) {
    next(error);
  }
});

// System Integration Routes

// POST /api/kitchen/integration/order-received - Process new order from Order Management system
router.post('/integration/order-received', async (req, res, next) => {
  try {
    const { order } = req.body;
    
    if (!order || !order.id) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Order data is required' 
      });
    }
    
    // Process new order through integration service
    const kitchenOrder = await integrationService.processNewOrder(order, req.tenantId!);
    
    res.status(201).json({ 
      success: true,
      kitchenOrder,
      message: 'Order processed successfully' 
    });
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

// POST /api/kitchen/integration/order-status-changed - Handle order status change from Order Management
router.post('/integration/order-status-changed', async (req, res, next) => {
  try {
    const { orderId, newStatus, previousStatus } = req.body;
    
    if (!orderId || !newStatus || !previousStatus) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'orderId, newStatus, and previousStatus are required' 
      });
    }
    
    // Handle order status change through integration service
    await integrationService.handleOrderStatusChange(orderId, newStatus, previousStatus, req.tenantId!);
    
    res.json({ 
      success: true,
      message: 'Order status change processed successfully' 
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/kitchen/integration/delivery-status-update - Handle delivery status update
router.post('/integration/delivery-status-update', async (req, res, next) => {
  try {
    const { orderId, deliveryStatus } = req.body;
    
    if (!orderId || !deliveryStatus) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'orderId and deliveryStatus are required' 
      });
    }
    
    const validStatuses = ['dispatched', 'picked_up', 'delivered'];
    if (!validStatuses.includes(deliveryStatus)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid delivery status' 
      });
    }
    
    // Handle delivery status update through integration service
    await integrationService.handleDeliveryStatusUpdate(orderId, deliveryStatus, req.tenantId!);
    
    res.json({ 
      success: true,
      message: 'Delivery status update processed successfully' 
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/kitchen/integration/sync-recipe - Sync recipe data with Product service
router.post('/integration/sync-recipe/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid product ID format' 
      });
    }
    
    // Sync recipe data through integration service
    const recipe = await integrationService.syncRecipeData(productId, req.tenantId!);
    
    if (recipe) {
      res.json({ 
        success: true,
        recipe,
        message: 'Recipe data synced successfully' 
      });
    } else {
      res.status(404).json({ 
        error: 'RECIPE_NOT_FOUND',
        message: 'No recipe found for this product' 
      });
    }
  } catch (error) {
    next(error);
  }
});

// POST /api/kitchen/integration/update-product-availability - Update product availability based on inventory
router.post('/integration/update-product-availability', async (req, res, next) => {
  try {
    // Update product availability through integration service
    await integrationService.updateProductAvailability(req.tenantId!);
    
    res.json({ 
      success: true,
      message: 'Product availability updated successfully' 
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/kitchen/integration/send-analytics - Send kitchen analytics data
router.post('/integration/send-analytics', async (req, res, next) => {
  try {
    const { date } = req.body;
    
    const analyticsDate = date ? new Date(date) : new Date();
    
    // Send analytics data through integration service
    await integrationService.sendAnalyticsData(req.tenantId!, analyticsDate);
    
    res.json({ 
      success: true,
      message: 'Analytics data sent successfully' 
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/kitchen/integration/process-reordering - Process automatic reordering
router.post('/integration/process-reordering', async (req, res, next) => {
  try {
    // Process automatic reordering through integration service
    await integrationService.processAutomaticReordering(req.tenantId!);
    
    res.json({ 
      success: true,
      message: 'Automatic reordering processed successfully' 
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/kitchen/integration/status - Get integration system status
router.get('/integration/status', async (req, res, next) => {
  try {
    // Get integration status (mock implementation)
    const status = {
      orderManagementSystem: {
        connected: true,
        lastSync: new Date().toISOString(),
        status: 'healthy'
      },
      deliverySystem: {
        connected: true,
        lastNotification: new Date().toISOString(),
        status: 'healthy'
      },
      productService: {
        connected: true,
        lastRecipeSync: new Date().toISOString(),
        status: 'healthy'
      },
      analyticsSystem: {
        connected: true,
        lastDataSent: new Date().toISOString(),
        status: 'healthy'
      },
      procurementSystem: {
        connected: true,
        lastReorderRequest: new Date().toISOString(),
        status: 'healthy',
        autoReorderingEnabled: true
      }
    };
    
    res.json({ 
      integrationStatus: status,
      overallHealth: 'healthy',
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;