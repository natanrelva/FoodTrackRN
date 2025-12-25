// Teste do fluxo completo de pedidos
const API_BASE = 'http://localhost:4001/api';

async function testOrderFlow() {
  console.log('🛒 Testando fluxo completo de pedidos...\n');

  try {
    // 1. Buscar produtos disponíveis
    console.log('1️⃣ Buscando produtos disponíveis...');
    const productsResponse = await fetch(`${API_BASE}/products`);
    const productsData = await productsResponse.json();
    
    if (!productsData.success || productsData.data.products.length === 0) {
      console.log('❌ Nenhum produto disponível');
      return;
    }

    const product = productsData.data.products[0];
    console.log(`✅ Produto selecionado: ${product.name} - R$ ${product.price}`);

    // 2. Criar um pedido
    console.log('\n2️⃣ Criando pedido...');
    const orderData = {
      customer: {
        name: 'Cliente Teste',
        phone: '(11) 99999-9999',
        email: 'teste@foodtrack.com',
        address: 'Rua de Teste, 123, São Paulo, SP'
      },
      items: [{
        productId: product.id,
        quantity: 2,
        modifications: []
      }],
      channel: 'website',
      payment: {
        method: 'pix'
      },
      delivery: {
        type: 'delivery',
        address: 'Rua de Teste, 123, São Paulo, SP',
        fee: 5.00,
        instructions: 'Apartamento 45'
      },
      notes: 'Pedido de teste da integração'
    };

    const createOrderResponse = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    const orderResult = await createOrderResponse.json();
    
    if (orderResult.success) {
      console.log(`✅ Pedido criado com sucesso! ID: ${orderResult.data.id}`);
      console.log(`   Status: ${orderResult.data.status}`);
      console.log(`   Total: R$ ${orderResult.data.totalAmount}`);

      // 3. Aguardar um pouco para o pedido ser processado
      console.log('\n3️⃣ Aguardando processamento...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 4. Verificar se o pedido apareceu na cozinha
      console.log('\n4️⃣ Verificando se o pedido apareceu na cozinha...');
      const kitchenResponse = await fetch(`${API_BASE}/kitchen/orders`);
      const kitchenData = await kitchenResponse.json();

      if (kitchenData.success && kitchenData.data && kitchenData.data.orders) {
        const kitchenOrder = kitchenData.data.orders.find(ko => ko.orderId === orderResult.data.id);
        if (kitchenOrder) {
          console.log(`✅ Pedido encontrado na cozinha!`);
          console.log(`   Kitchen Order ID: ${kitchenOrder.id}`);
          console.log(`   Status: ${kitchenOrder.status}`);
          console.log(`   Itens: ${kitchenOrder.items.length}`);
        } else {
          console.log('⚠️ Pedido ainda não apareceu na cozinha (pode estar sendo processado)');
        }
      } else {
        console.log('⚠️ Erro ao acessar dados da cozinha');
      }

      // 5. Buscar o pedido criado
      console.log('\n5️⃣ Verificando pedido na lista de pedidos...');
      const ordersResponse = await fetch(`${API_BASE}/orders`);
      const ordersData = await ordersResponse.json();

      if (ordersData.success && ordersData.data && ordersData.data.orders) {
        const createdOrder = ordersData.data.orders.find(o => o.id === orderResult.data.id);
        if (createdOrder) {
          console.log(`✅ Pedido encontrado na lista de pedidos!`);
          console.log(`   Status atual: ${createdOrder.status}`);
        }
      }

    } else {
      console.log('❌ Erro ao criar pedido:', orderResult.error?.message);
    }

    console.log('\n🎯 Teste de fluxo de pedidos concluído!');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testOrderFlow();