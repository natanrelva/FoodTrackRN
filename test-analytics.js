// Teste das funcionalidades de analytics avançadas
const API_BASE = 'http://localhost:4001/api';

async function testAnalytics() {
  console.log('📊 TESTANDO FUNCIONALIDADES DE ANALYTICS AVANÇADAS\n');
  console.log('=' .repeat(60));

  try {
    // 1. Testar Analytics Overview
    console.log('\n📈 1. TESTANDO ANALYTICS OVERVIEW...');
    const overviewResponse = await fetch(`${API_BASE}/analytics/overview?period=30d`);
    const overviewData = await overviewResponse.json();
    
    if (overviewData.success) {
      console.log('✅ Analytics Overview: OK');
      console.log(`   📊 Período: ${overviewData.data.period.days} dias`);
      console.log(`   💰 Receita Total: R$ ${overviewData.data.orders.totalRevenue}`);
      console.log(`   📋 Total de Pedidos: ${overviewData.data.orders.totalOrders}`);
      console.log(`   🎯 Ticket Médio: R$ ${overviewData.data.orders.averageTicket.toFixed(2)}`);
      console.log(`   ⏰ Pedidos Atrasados: ${overviewData.data.orders.delayedOrders}`);
      console.log(`   📈 Taxa de Crescimento: ${overviewData.data.orders.growthRate?.toFixed(1)}%`);
      
      if (overviewData.data.customers) {
        console.log(`   👥 Clientes Novos: ${overviewData.data.customers.newCustomers}`);
        console.log(`   🔄 Clientes Recorrentes: ${overviewData.data.customers.repeatCustomers}`);
        console.log(`   📊 Pedidos por Cliente: ${overviewData.data.customers.averageOrdersPerCustomer.toFixed(1)}`);
      }
      
      if (overviewData.data.products && overviewData.data.products.topProducts.length > 0) {
        console.log(`   🏆 Produto Mais Vendido: ${overviewData.data.products.topProducts[0].name}`);
        console.log(`   💰 Receita do Top Produto: R$ ${overviewData.data.products.topProducts[0].revenue}`);
      }
    } else {
      console.log('❌ Analytics Overview: ERRO -', overviewData.error?.message);
    }

    // 2. Testar Performance Analytics
    console.log('\n⚡ 2. TESTANDO PERFORMANCE ANALYTICS...');
    const performanceResponse = await fetch(`${API_BASE}/analytics/performance?period=7d`);
    const performanceData = await performanceResponse.json();
    
    if (performanceData.success) {
      console.log('✅ Performance Analytics: OK');
      console.log(`   📊 Total de Pedidos: ${performanceData.data.orderMetrics.totalOrders}`);
      console.log(`   ✅ Pedidos Completados: ${performanceData.data.orderMetrics.completedOrders}`);
      console.log(`   📈 Taxa de Cumprimento: ${performanceData.data.orderMetrics.fulfillmentRate}%`);
      console.log(`   💰 Valor Médio do Pedido: R$ ${performanceData.data.orderMetrics.averageOrderValue}`);
      console.log(`   ⏰ Tempo Médio de Preparo: ${performanceData.data.timeAnalysis.averagePreparationTime} min`);
      console.log(`   🕐 Horário de Pico: ${performanceData.data.timeAnalysis.peakHour}:00h`);
      
      if (performanceData.data.kitchenEfficiency) {
        console.log(`   👨‍🍳 Eficiência da Cozinha:`);
        console.log(`     - Tempo Médio de Preparo: ${performanceData.data.kitchenEfficiency.averagePreparationTime} min`);
        console.log(`     - Taxa de Entrega no Prazo: ${performanceData.data.kitchenEfficiency.onTimeDeliveryRate}%`);
        
        const stations = performanceData.data.kitchenEfficiency.stationUtilization;
        Object.entries(stations).forEach(([station, utilization]) => {
          console.log(`     - ${station}: ${utilization}% utilização`);
        });
      }
    } else {
      console.log('❌ Performance Analytics: ERRO -', performanceData.error?.message);
    }

    // 3. Testar Trends Analytics
    console.log('\n📈 3. TESTANDO TRENDS ANALYTICS...');
    const trendsResponse = await fetch(`${API_BASE}/analytics/trends`);
    const trendsData = await trendsResponse.json();
    
    if (trendsData.success) {
      console.log('✅ Trends Analytics: OK');
      console.log(`   📊 Semanas Analisadas: ${trendsData.data.period.weeksAnalyzed}`);
      console.log(`   📈 Crescimento de Pedidos: ${trendsData.data.growthAnalysis.orderGrowthRate}%`);
      console.log(`   💰 Crescimento de Receita: ${trendsData.data.growthAnalysis.revenueGrowthRate}%`);
      console.log(`   📊 Tendência: ${trendsData.data.growthAnalysis.trend}`);
      
      if (trendsData.data.forecast) {
        console.log(`   🔮 Previsão Próxima Semana:`);
        console.log(`     - Pedidos: ${trendsData.data.forecast.nextWeek.orders}`);
        console.log(`     - Receita: R$ ${trendsData.data.forecast.nextWeek.revenue}`);
        console.log(`     - Confiança: ${trendsData.data.forecast.confidence}%`);
      }
      
      if (trendsData.data.weeklyTrends && trendsData.data.weeklyTrends.length > 0) {
        console.log(`   📊 Últimas 3 Semanas:`);
        const lastThreeWeeks = trendsData.data.weeklyTrends.slice(-3);
        lastThreeWeeks.forEach((week, index) => {
          console.log(`     ${index + 1}. Semana ${week.week}: ${week.orders} pedidos, R$ ${week.revenue}`);
        });
      }
    } else {
      console.log('❌ Trends Analytics: ERRO -', trendsData.error?.message);
    }

    // 4. Testar Dashboard Metrics (existente)
    console.log('\n📊 4. TESTANDO DASHBOARD METRICS...');
    const dashboardResponse = await fetch(`${API_BASE}/dashboard/metrics?period=30d`);
    const dashboardData = await dashboardResponse.json();
    
    if (dashboardData.totalRevenue !== undefined) {
      console.log('✅ Dashboard Metrics: OK');
      console.log(`   💰 Receita Total: R$ ${dashboardData.totalRevenue}`);
      console.log(`   📋 Total de Pedidos: ${dashboardData.totalOrders}`);
      console.log(`   🎯 Ticket Médio: R$ ${dashboardData.averageTicket}`);
      console.log(`   📅 Pedidos Hoje: ${dashboardData.ordersToday}`);
    } else {
      console.log('❌ Dashboard Metrics: ERRO');
    }

    // 5. Testar Recent Orders
    console.log('\n📋 5. TESTANDO RECENT ORDERS...');
    const recentOrdersResponse = await fetch(`${API_BASE}/dashboard/recent-orders?limit=5`);
    const recentOrdersData = await recentOrdersResponse.json();
    
    if (Array.isArray(recentOrdersData) && recentOrdersData.length > 0) {
      console.log('✅ Recent Orders: OK');
      console.log(`   📊 Últimos ${recentOrdersData.length} pedidos:`);
      recentOrdersData.slice(0, 3).forEach((order, index) => {
        console.log(`     ${index + 1}. #${order.number} - ${order.customer.name} - R$ ${order.total} - ${order.status}`);
      });
    } else {
      console.log('❌ Recent Orders: ERRO ou sem dados');
    }

    // 6. Testar Sales Chart
    console.log('\n📈 6. TESTANDO SALES CHART...');
    const salesChartResponse = await fetch(`${API_BASE}/dashboard/sales-chart?period=7d`);
    const salesChartData = await salesChartResponse.json();
    
    if (salesChartData.success && Array.isArray(salesChartData.data)) {
      console.log('✅ Sales Chart: OK');
      console.log(`   📊 Dados de ${salesChartData.data.length} períodos`);
      if (salesChartData.data.length > 0) {
        const totalRevenue = salesChartData.data.reduce((sum, item) => sum + item.revenue, 0);
        const totalOrders = salesChartData.data.reduce((sum, item) => sum + item.orders, 0);
        console.log(`   💰 Receita Total do Período: R$ ${totalRevenue.toFixed(2)}`);
        console.log(`   📋 Total de Pedidos do Período: ${totalOrders}`);
      }
    } else {
      console.log('❌ Sales Chart: ERRO');
    }

    // Resumo Final
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 RESUMO DOS TESTES DE ANALYTICS');
    console.log('=' .repeat(60));
    console.log('\n✅ FUNCIONALIDADES TESTADAS:');
    console.log('   📊 Analytics Overview - Visão geral completa');
    console.log('   ⚡ Performance Analytics - Métricas operacionais');
    console.log('   📈 Trends Analytics - Análise de tendências e previsões');
    console.log('   📊 Dashboard Metrics - Métricas do dashboard');
    console.log('   📋 Recent Orders - Pedidos recentes');
    console.log('   📈 Sales Chart - Gráfico de vendas');
    
    console.log('\n🚀 ENDPOINTS ANALYTICS DISPONÍVEIS:');
    console.log('   📊 GET /api/analytics/overview - Análise completa');
    console.log('   ⚡ GET /api/analytics/performance - Métricas de performance');
    console.log('   📈 GET /api/analytics/trends - Tendências e previsões');
    console.log('   📊 GET /api/dashboard/metrics - Métricas do dashboard');
    console.log('   📋 GET /api/dashboard/recent-orders - Pedidos recentes');
    console.log('   📈 GET /api/dashboard/sales-chart - Dados para gráficos');
    
    console.log('\n🎉 SPRINT 4: ANALYTICS & OPTIMIZATION - CONCLUÍDO!');
    console.log('\n💡 PRÓXIMOS PASSOS:');
    console.log('   1. Integrar analytics nos frontends');
    console.log('   2. Implementar cache Redis para performance');
    console.log('   3. Adicionar mais métricas avançadas');
    console.log('   4. Implementar alertas automáticos');

  } catch (error) {
    console.error('❌ Erro durante os testes de analytics:', error.message);
  }
}

testAnalytics();