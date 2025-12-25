// Script de teste para verificar a integração completa do FoodTrack
const API_BASE = 'http://localhost:4001/api';

async function testIntegration() {
  console.log('🚀 Iniciando testes de integração do FoodTrack...\n');

  try {
    // 1. Testar API de Produtos
    console.log('📦 Testando API de Produtos...');
    const productsResponse = await fetch(`${API_BASE}/products`);
    const productsData = await productsResponse.json();
    
    if (productsData.success && productsData.data.products.length > 0) {
      console.log(`✅ Produtos carregados: ${productsData.data.products.length} produtos encontrados`);
      console.log(`   Exemplo: ${productsData.data.products[0].name} - R$ ${productsData.data.products[0].price}`);
    } else {
      console.log('❌ Erro ao carregar produtos');
      return;
    }

    // 2. Testar API de Pedidos
    console.log('\n📋 Testando API de Pedidos...');
    const ordersResponse = await fetch(`${API_BASE}/orders`);
    const ordersData = await ordersResponse.json();
    
    if (ordersData.success) {
      console.log(`✅ API de Pedidos funcionando: ${ordersData.data.orders?.length || 0} pedidos encontrados`);
    } else {
      console.log('❌ Erro ao acessar API de pedidos');
    }

    // 3. Testar API da Cozinha
    console.log('\n👨‍🍳 Testando API da Cozinha...');
    const kitchenResponse = await fetch(`${API_BASE}/kitchen/orders`);
    const kitchenData = await kitchenResponse.json();
    
    if (kitchenData.success) {
      console.log(`✅ API da Cozinha funcionando: ${kitchenData.data.orders?.length || 0} pedidos na cozinha`);
    } else {
      console.log('❌ Erro ao acessar API da cozinha');
    }

    // 4. Testar Health Check
    console.log('\n🏥 Testando Health Check...');
    const healthResponse = await fetch(`http://localhost:4001/health`);
    const healthData = await healthResponse.json();
    
    if (healthData.status === 'ok') {
      console.log(`✅ Sistema saudável - Uptime: ${Math.round(healthData.uptime/1000)}s`);
    } else {
      console.log('❌ Sistema com problemas');
    }

    // 5. Testar Frontends
    console.log('\n🌐 Testando Frontends...');
    
    const frontends = [
      { name: 'Client Frontend', url: 'http://localhost:3000' },
      { name: 'Tenant Dashboard', url: 'http://localhost:3001' },
      { name: 'Kitchen Interface', url: 'http://localhost:3002' }
    ];

    for (const frontend of frontends) {
      try {
        const response = await fetch(frontend.url, { method: 'HEAD' });
        if (response.ok) {
          console.log(`✅ ${frontend.name} rodando em ${frontend.url}`);
        } else {
          console.log(`❌ ${frontend.name} com problemas`);
        }
      } catch (error) {
        console.log(`❌ ${frontend.name} não acessível`);
      }
    }

    console.log('\n🎉 Teste de integração concluído!');
    console.log('\n📊 Status dos Serviços:');
    console.log('   🚀 API Gateway: http://localhost:4001');
    console.log('   🌐 Client Frontend: http://localhost:3000');
    console.log('   📊 Tenant Dashboard: http://localhost:3001');
    console.log('   👨‍🍳 Kitchen Interface: http://localhost:3002');
    console.log('   🗄️ Adminer (DB): http://localhost:8082');
    console.log('   📧 MailHog: http://localhost:8025');

  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
  }
}

// Executar os testes
testIntegration();