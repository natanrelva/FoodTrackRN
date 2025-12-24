import { Router, Request, Response } from 'express';
import { webSocketService } from '../index';

const router = Router();

/**
 * @route GET /api/websocket/stats
 * @desc Get WebSocket connection statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    if (!webSocketService) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'WebSocket service not initialized'
        }
      });
    }

    const stats = webSocketService.getConnectionStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting WebSocket stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get WebSocket statistics'
      }
    });
  }
});

/**
 * @route GET /api/websocket/connections/:tenantId
 * @desc Get connections for a specific tenant
 */
router.get('/connections/:tenantId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { tenantId: paramTenantId } = req.params;

    // Ensure user can only see their own tenant's connections
    if (tenantId !== paramTenantId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied to tenant connections'
        }
      });
    }

    if (!webSocketService) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'WebSocket service not initialized'
        }
      });
    }

    const connections = webSocketService.getConnectionsByTenant(tenantId);
    
    res.json({
      success: true,
      data: {
        tenantId,
        connectionCount: connections.length,
        connections: connections.map(conn => ({
          id: conn.id,
          userType: conn.userType,
          rooms: conn.rooms,
          connectedAt: conn.connectedAt
        }))
      }
    });
  } catch (error) {
    console.error('Error getting tenant connections:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get tenant connections'
      }
    });
  }
});

/**
 * @route POST /api/websocket/broadcast/:tenantId
 * @desc Broadcast a message to all connections of a tenant
 */
router.post('/broadcast/:tenantId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { tenantId: paramTenantId } = req.params;
    const { event, data, target } = req.body;

    // Ensure user can only broadcast to their own tenant
    if (tenantId !== paramTenantId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied to broadcast to tenant'
        }
      });
    }

    if (!event || !data) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Event and data are required'
        }
      });
    }

    if (!webSocketService) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'WebSocket service not initialized'
        }
      });
    }

    // Broadcast based on target
    switch (target) {
      case 'kitchen':
        webSocketService.broadcastToKitchen(tenantId, event, data);
        break;
      case 'tenant':
        webSocketService.broadcastToTenant(tenantId, event, data);
        break;
      default:
        // Broadcast to all tenant connections
        webSocketService.broadcastToTenant(tenantId, event, data);
        break;
    }
    
    res.json({
      success: true,
      data: {
        message: 'Broadcast sent successfully',
        tenantId,
        event,
        target: target || 'tenant',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error broadcasting message:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to broadcast message'
      }
    });
  }
});

/**
 * @route GET /api/websocket/health
 * @desc WebSocket service health check
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const isHealthy = webSocketService !== undefined;
    const connectionCount = webSocketService ? webSocketService.getConnectionCount() : 0;
    
    res.json({
      success: true,
      data: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        connectionCount,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }
    });
  } catch (error) {
    console.error('Error checking WebSocket health:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to check WebSocket health'
      }
    });
  }
});

export default router;