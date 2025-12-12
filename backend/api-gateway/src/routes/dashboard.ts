import { Router } from 'express';
import { OrderService } from '../services/OrderService';

const router: Router = Router();

// GET /api/dashboard/metrics
router.get('/metrics', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const orderService = new OrderService();
    
    // Parse date range from query parameters
    const { dateFrom, dateTo, period = '30d' } = req.query;
    let dateRange;
    
    if (dateFrom && dateTo) {
      dateRange = {
        startDate: new Date(dateFrom as string),
        endDate: new Date(dateTo as string),
      };
    } else {
      // Default to last 30 days if no date range provided
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }
      
      dateRange = { startDate, endDate };
    }

    // Get analytics from OrderService
    const analytics = await orderService.getOrderAnalytics(tenantId, dateRange);
    
    // Get today's orders for additional metrics
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const todayAnalytics = await orderService.getOrderAnalytics(tenantId, {
      startDate: todayStart,
      endDate: todayEnd,
    });

    // Format response to match expected dashboard format
    const metrics = {
      totalRevenue: analytics.totalRevenue,
      totalOrders: analytics.totalOrders,
      averageTicket: analytics.averageTicket,
      delayedOrders: analytics.delayedOrders,
      ordersToday: todayAnalytics.totalOrders,
      revenueGrowth: analytics.growthRate || 0,
      orderGrowth: analytics.periodComparison ? 
        ((analytics.periodComparison.current - analytics.periodComparison.previous) / 
         Math.max(analytics.periodComparison.previous, 1)) * 100 : 0,
      ordersByStatus: analytics.ordersByStatus,
      ordersByChannel: analytics.ordersByChannel,
    };

    res.json(metrics);
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/recent-orders
router.get('/recent-orders', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const orderService = new OrderService();
    
    // Parse limit from query parameters with validation
    const limitParam = req.query.limit as string;
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 10; // Cap at 50 orders
    
    if (isNaN(limit) || limit < 1) {
      return res.status(400).json({ error: 'Invalid limit parameter' });
    }

    // Get recent orders using OrderService
    const orders = await orderService.getRecentOrders(tenantId, limit);

    // Format orders for dashboard display with complete information
    const formattedOrders = orders.map(order => ({
      id: order.id,
      number: order.number,
      customer: {
        name: order.customer?.name || 'Unknown Customer',
        phone: order.customer?.phone,
        email: order.customer?.email,
      },
      status: order.status,
      channel: order.channel,
      total: order.total,
      itemCount: order.items.length,
      items: order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      delivery: {
        type: order.delivery.type,
        address: order.delivery.address,
        estimatedTime: order.delivery.estimatedTime,
      },
      payment: {
        method: order.payment.method,
        status: order.payment.status,
      },
      estimatedCompletionTime: order.estimatedCompletionTime,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));

    res.json(formattedOrders);
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/sales-chart
router.get('/sales-chart', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const orderService = new OrderService();
    
    // Parse period and date range parameters
    const { period = '7d', dateFrom, dateTo, aggregation = 'daily' } = req.query;
    
    let startDate: Date;
    let endDate: Date;
    
    if (dateFrom && dateTo) {
      startDate = new Date(dateFrom as string);
      endDate = new Date(dateTo as string);
    } else {
      // Calculate date range based on period
      endDate = new Date();
      startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 7);
      }
    }

    // Validate date range
    if (startDate >= endDate) {
      return res.status(400).json({ error: 'Start date must be before end date' });
    }

    // Get orders for the date range
    const orders = await orderService.getOrdersByDateRange(startDate, endDate, tenantId);
    
    // Aggregate data based on the specified aggregation type
    const salesData = aggregateOrdersByPeriod(orders, aggregation as 'daily' | 'weekly' | 'monthly');

    res.json(salesData);
  } catch (error) {
    next(error);
  }
});

// Helper function to aggregate orders by time period
function aggregateOrdersByPeriod(
  orders: any[], 
  aggregation: 'daily' | 'weekly' | 'monthly'
): Array<{ date: string; revenue: number; orders: number }> {
  const aggregatedData = new Map<string, { revenue: number; orders: number }>();

  orders.forEach(order => {
    // Only include completed orders in sales data
    if (order.status !== 'delivered') {
      return;
    }

    const orderDate = new Date(order.createdAt);
    let dateKey: string;

    switch (aggregation) {
      case 'daily':
        dateKey = orderDate.toISOString().split('T')[0]; // YYYY-MM-DD
        break;
      case 'weekly':
        // Get Monday of the week
        const monday = new Date(orderDate);
        monday.setDate(orderDate.getDate() - orderDate.getDay() + 1);
        dateKey = monday.toISOString().split('T')[0];
        break;
      case 'monthly':
        dateKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-01`;
        break;
      default:
        dateKey = orderDate.toISOString().split('T')[0];
    }

    const existing = aggregatedData.get(dateKey) || { revenue: 0, orders: 0 };
    aggregatedData.set(dateKey, {
      revenue: existing.revenue + order.total,
      orders: existing.orders + 1,
    });
  });

  // Convert to array and sort by date
  return Array.from(aggregatedData.entries())
    .map(([date, data]) => ({
      date,
      revenue: Math.round(data.revenue * 100) / 100, // Round to 2 decimal places
      orders: data.orders,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export default router;