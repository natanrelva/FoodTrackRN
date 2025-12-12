import express, { Router, Request, Response } from 'express';
import { z } from 'zod';
import { 
  NotificationFilters,
  NotificationFiltersSchema,
  CreateNotificationRequestSchema,
  NotificationPreferencesSchema
} from '@foodtrack/backend-shared';
import { NotificationService } from '../services/NotificationService';
import { OrderService } from '../services/OrderService';

const router: express.Router = Router();
const notificationService = new NotificationService();
const orderService = new OrderService();

// Validation schemas for API requests
const GetNotificationsQuerySchema = z.object({
  orderId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  type: z.string().optional(),
  channel: z.string().optional(),
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

const SendDelayNotificationSchema = z.object({
  orderId: z.string().uuid(),
});

const UpdatePreferencesSchema = NotificationPreferencesSchema.omit({
  id: true,
  tenantId: true,
  customerId: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * GET /api/notifications
 * Get notifications with filtering and pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    
    // Validate query parameters
    const queryValidation = GetNotificationsQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: queryValidation.error.errors,
        },
      });
    }

    const query = queryValidation.data;

    // Build filters
    const filters: NotificationFilters = {
      orderId: query.orderId,
      customerId: query.customerId,
      type: query.type ? [query.type as any] : undefined,
      channel: query.channel ? [query.channel as any] : undefined,
      status: query.status ? [query.status as any] : undefined,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? Math.min(parseInt(query.limit), 100) : 20,
    };

    // Validate filters
    const filtersValidation = NotificationFiltersSchema.safeParse(filters);
    if (!filtersValidation.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid filters',
          details: filtersValidation.error.errors,
        },
      });
    }

    const result = await notificationService['notificationRepository'].findAll(tenantId, filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch notifications',
      },
    });
  }
});

/**
 * GET /api/notifications/order/:orderId
 * Get notification history for a specific order
 */
router.get('/order/:orderId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { orderId } = req.params;

    if (!orderId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid order ID format',
        },
      });
    }

    const notifications = await notificationService.getNotificationHistory(orderId, tenantId);
    res.json({ notifications });
  } catch (error) {
    console.error('Error fetching order notifications:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch order notifications',
      },
    });
  }
});

/**
 * POST /api/notifications/retry/:orderId
 * Retry failed notifications for an order
 */
router.post('/retry/:orderId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { orderId } = req.params;

    if (!orderId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid order ID format',
        },
      });
    }

    const results = await notificationService.retryFailedNotifications(orderId, tenantId);
    res.json({ results });
  } catch (error) {
    console.error('Error retrying notifications:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retry notifications',
      },
    });
  }
});

/**
 * POST /api/notifications/delay
 * Send delay notification for an order
 */
router.post('/delay', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    
    // Validate request body
    const bodyValidation = SendDelayNotificationSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: bodyValidation.error.errors,
        },
      });
    }

    const { orderId } = bodyValidation.data;

    await orderService.sendDelayNotification(orderId, tenantId);
    
    res.json({
      success: true,
      message: 'Delay notification sent successfully',
    });
  } catch (error) {
    console.error('Error sending delay notification:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: {
          code: 'ORDER_NOT_FOUND',
          message: error.message,
        },
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to send delay notification',
      },
    });
  }
});

/**
 * GET /api/notifications/preferences/:customerId
 * Get notification preferences for a customer
 */
router.get('/preferences/:customerId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { customerId } = req.params;

    if (!customerId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid customer ID format',
        },
      });
    }

    const preferences = await notificationService.getNotificationPreferences(customerId, tenantId);
    
    if (!preferences) {
      return res.status(404).json({
        error: {
          code: 'PREFERENCES_NOT_FOUND',
          message: 'Notification preferences not found for customer',
        },
      });
    }

    res.json(preferences);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch notification preferences',
      },
    });
  }
});

/**
 * PUT /api/notifications/preferences/:customerId
 * Update notification preferences for a customer
 */
router.put('/preferences/:customerId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { customerId } = req.params;

    if (!customerId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid customer ID format',
        },
      });
    }

    // Validate request body
    const bodyValidation = UpdatePreferencesSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: bodyValidation.error.errors,
        },
      });
    }

    const preferences = await notificationService.updateNotificationPreferences(
      customerId,
      tenantId,
      bodyValidation.data
    );

    res.json(preferences);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update notification preferences',
      },
    });
  }
});

/**
 * POST /api/notifications/process-delayed
 * Process delayed order notifications (background job endpoint)
 */
router.post('/process-delayed', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    
    await orderService.processDelayedOrderNotifications(tenantId);
    
    res.json({
      success: true,
      message: 'Delayed order notifications processed successfully',
    });
  } catch (error) {
    console.error('Error processing delayed notifications:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to process delayed notifications',
      },
    });
  }
});

/**
 * GET /api/notifications/stats
 * Get notification statistics for the tenant
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { dateFrom, dateTo } = req.query;

    let dateRange: { startDate: Date; endDate: Date } | undefined;
    
    if (dateFrom && dateTo) {
      dateRange = {
        startDate: new Date(dateFrom as string),
        endDate: new Date(dateTo as string),
      };
    }

    const stats = await notificationService['notificationRepository'].getNotificationStats(tenantId, dateRange);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch notification statistics',
      },
    });
  }
});

export default router;