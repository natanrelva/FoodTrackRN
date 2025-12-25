import { Router } from 'express';
import { OrderService } from '../services/OrderService';
import { KitchenService } from '../services/KitchenService';

const router: Router = Router();

// GET /api/analytics/overview - Complete analytics overview
router.get('/overview', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'MISSING_TENANT', message: 'Tenant ID is required' }
      });
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
      // Default date range based on period
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
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }
      
      dateRange = { startDate, endDate };
    }

    // Get comprehensive analytics
    const [
      orderAnalytics,
      customerInsights,
      productAnalysis
    ] = await Promise.all([
      orderService.getOrderAnalytics(tenantId, dateRange),
      orderService.getCustomerBehaviorInsights(tenantId, dateRange),
      orderService.getProductPopularityAnalysis(tenantId, dateRange)
    ]);

    res.json({
      success: true,
      data: {
        period: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          days: Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24))
        },
        orders: orderAnalytics,
        customers: customerInsights,
        products: productAnalysis,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/performance - Kitchen and operational performance
router.get('/performance', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'MISSING_TENANT', message: 'Tenant ID is required' }
      });
    }

    const orderService = new OrderService();
    const kitchenService = new KitchenService();
    
    // Parse date range
    const { dateFrom, dateTo, period = '7d' } = req.query;
    let dateRange;
    
    if (dateFrom && dateTo) {
      dateRange = {
        startDate: new Date(dateFrom as string),
        endDate: new Date(dateTo as string),
      };
    } else {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '1d':
          startDate.setDate(endDate.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        default:
          startDate.setDate(endDate.getDate() - 7);
      }
      
      dateRange = { startDate, endDate };
    }

    // Get performance metrics
    const orders = await orderService.getOrdersByDateRange(
      dateRange.startDate, 
      dateRange.endDate, 
      tenantId
    );

    // Calculate performance metrics
    const completedOrders = orders.filter(order => order.status === 'delivered');
    const totalOrders = orders.length;
    
    // Average preparation time (mock calculation - would need kitchen data)
    const avgPreparationTime = completedOrders.length > 0 ? 
      completedOrders.reduce((sum, order) => {
        if (order.estimatedCompletionTime && order.createdAt) {
          const prepTime = new Date(order.estimatedCompletionTime).getTime() - new Date(order.createdAt).getTime();
          return sum + (prepTime / (1000 * 60)); // Convert to minutes
        }
        return sum + 25; // Default 25 minutes if no data
      }, 0) / completedOrders.length : 0;

    // Order fulfillment rate
    const fulfillmentRate = totalOrders > 0 ? (completedOrders.length / totalOrders) * 100 : 0;

    // Peak hours analysis
    const hourlyDistribution = new Array(24).fill(0);
    orders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      hourlyDistribution[hour]++;
    });

    const peakHour = hourlyDistribution.indexOf(Math.max(...hourlyDistribution));

    // Kitchen efficiency (mock data - would integrate with actual kitchen system)
    const kitchenEfficiency = {
      averagePreparationTime: Math.round(avgPreparationTime),
      onTimeDeliveryRate: Math.max(85, Math.round(fulfillmentRate - 10)), // Mock calculation
      stationUtilization: {
        'grill-station': Math.round(Math.random() * 30 + 60), // 60-90%
        'pizza-station': Math.round(Math.random() * 25 + 65), // 65-90%
        'salad-station': Math.round(Math.random() * 20 + 50), // 50-70%
        'beverage-station': Math.round(Math.random() * 15 + 40), // 40-55%
      }
    };

    res.json({
      success: true,
      data: {
        period: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        },
        orderMetrics: {
          totalOrders,
          completedOrders: completedOrders.length,
          fulfillmentRate: Math.round(fulfillmentRate * 100) / 100,
          averageOrderValue: completedOrders.length > 0 ? 
            Math.round((completedOrders.reduce((sum, order) => sum + order.total, 0) / completedOrders.length) * 100) / 100 : 0
        },
        timeAnalysis: {
          peakHour,
          hourlyDistribution,
          averagePreparationTime: Math.round(avgPreparationTime)
        },
        kitchenEfficiency,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/trends - Trend analysis and forecasting
router.get('/trends', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'MISSING_TENANT', message: 'Tenant ID is required' }
      });
    }

    const orderService = new OrderService();
    
    // Get data for the last 90 days for trend analysis
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 90);

    const orders = await orderService.getOrdersByDateRange(startDate, endDate, tenantId);

    // Weekly trend analysis
    const weeklyData = new Map<string, { orders: number; revenue: number }>();
    
    orders.forEach(order => {
      if (order.status !== 'delivered') return;
      
      const orderDate = new Date(order.createdAt);
      // Get Monday of the week
      const monday = new Date(orderDate);
      monday.setDate(orderDate.getDate() - orderDate.getDay() + 1);
      const weekKey = monday.toISOString().split('T')[0];
      
      const existing = weeklyData.get(weekKey) || { orders: 0, revenue: 0 };
      weeklyData.set(weekKey, {
        orders: existing.orders + 1,
        revenue: existing.revenue + order.total
      });
    });

    const weeklyTrends = Array.from(weeklyData.entries())
      .map(([week, data]) => ({
        week,
        orders: data.orders,
        revenue: Math.round(data.revenue * 100) / 100
      }))
      .sort((a, b) => a.week.localeCompare(b.week));

    // Calculate growth trends
    const recentWeeks = weeklyTrends.slice(-4); // Last 4 weeks
    const previousWeeks = weeklyTrends.slice(-8, -4); // Previous 4 weeks

    const recentAvgOrders = recentWeeks.length > 0 ? 
      recentWeeks.reduce((sum, week) => sum + week.orders, 0) / recentWeeks.length : 0;
    const previousAvgOrders = previousWeeks.length > 0 ? 
      previousWeeks.reduce((sum, week) => sum + week.orders, 0) / previousWeeks.length : 0;

    const orderGrowthRate = previousAvgOrders > 0 ? 
      ((recentAvgOrders - previousAvgOrders) / previousAvgOrders) * 100 : 0;

    const recentAvgRevenue = recentWeeks.length > 0 ? 
      recentWeeks.reduce((sum, week) => sum + week.revenue, 0) / recentWeeks.length : 0;
    const previousAvgRevenue = previousWeeks.length > 0 ? 
      previousWeeks.reduce((sum, week) => sum + week.revenue, 0) / previousWeeks.length : 0;

    const revenueGrowthRate = previousAvgRevenue > 0 ? 
      ((recentAvgRevenue - previousAvgRevenue) / previousAvgRevenue) * 100 : 0;

    // Simple forecasting (linear trend)
    const nextWeekForecast = {
      orders: Math.round(recentAvgOrders * (1 + (orderGrowthRate / 100))),
      revenue: Math.round(recentAvgRevenue * (1 + (revenueGrowthRate / 100)) * 100) / 100
    };

    res.json({
      success: true,
      data: {
        period: {
          startDate,
          endDate,
          weeksAnalyzed: weeklyTrends.length
        },
        weeklyTrends,
        growthAnalysis: {
          orderGrowthRate: Math.round(orderGrowthRate * 100) / 100,
          revenueGrowthRate: Math.round(revenueGrowthRate * 100) / 100,
          trend: orderGrowthRate > 5 ? 'growing' : orderGrowthRate < -5 ? 'declining' : 'stable'
        },
        forecast: {
          nextWeek: nextWeekForecast,
          confidence: Math.min(90, Math.max(60, 90 - Math.abs(orderGrowthRate))) // Mock confidence score
        },
        generatedAt: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;