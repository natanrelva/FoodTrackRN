import express, { Router } from 'express';
import { webSocketService } from '../services/WebSocketService';

const router: express.Router = Router();

// Test route to trigger WebSocket events
router.post('/test/new-order', (req, res) => {
  const { tenantId } = req;
  
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant ID required' });
  }

  // Broadcast a test new order
  webSocketService.broadcastNewOrder({
    orderId: `test-${Date.now()}`,
    tenantId,
    items: [
      {
        id: 'item-1',
        name: 'Test Burger',
        quantity: 1,
        specialInstructions: 'Extra cheese',
        allergens: ['dairy'],
      }
    ],
    priority: 'high',
    estimatedCompletionTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    customerInfo: {
      name: 'Test Customer',
      phone: '555-0123',
    },
  });

  res.json({ message: 'Test new order broadcasted' });
});

router.post('/test/low-stock', (req, res) => {
  const { tenantId } = req;
  
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant ID required' });
  }

  // Broadcast a test low stock alert
  webSocketService.broadcastLowStockAlert({
    tenantId,
    ingredientId: 'test-ingredient',
    ingredientName: 'Test Cheese',
    currentStock: 2,
    minimumStock: 10,
    unit: 'kg',
    severity: 'warning',
  });

  res.json({ message: 'Test low stock alert broadcasted' });
});

router.post('/test/help-request', (req, res) => {
  const { tenantId } = req;
  
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant ID required' });
  }

  // Broadcast a test help request
  webSocketService.broadcastToTenant(tenantId, 'station:help-request', {
    tenantId,
    stationId: 'grill-1',
    stationName: 'Grill Station 1',
    helpType: 'technical',
    message: 'Grill temperature issue',
    requestedBy: 'test-chef',
    timestamp: new Date().toISOString(),
    status: 'pending',
  });

  res.json({ message: 'Test help request broadcasted' });
});

router.get('/test/connection-status', (req, res) => {
  const { tenantId } = req;
  
  const connectedClients = webSocketService.getConnectedClients(tenantId);
  
  res.json({
    totalConnectedClients: webSocketService.getConnectedClients(),
    tenantConnectedClients: connectedClients,
    tenantId,
  });
});

export default router;