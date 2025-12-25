// Teste de confirmação de pedido
const API_BASE = 'http://localhost:4001/api';

async function testOrderConfirmation() {
  console.log('✅ Testando confirmação de pedidos...\n');

  try {
    // 1. Buscar pedidos em draft
    console.log('1️⃣ Buscando pedidos em draft...');
    const ordersResponse = await fetch(`${API_BASE}/orders`);
    const ordersData = await ordersResponse.json();
    
    if (!ordersData.success || !ordersData.data.orders) {
      console.log('❌ Erro ao buscar pedidos');
      return;
    }

    const draftOrders = ordersData.data.orders.filter(order => order.status === 'draft');
    
    if (draftOrders.length === 0) {
      console.log('⚠️ Nenhum pedido em draft encontrado');
      return;
    }

    const orderToConfirm = draftOrders[0];
    console.log(`✅ Pedido encontrado: ${orderToConfirm.id} - Status: ${orderToConfirm.status}`);

    // 2. Confirmar o pedido
    console.log('\n2️⃣ Confirmando pedido...');
    const confirmResponse = await fetch(`${API_BASE}/orders/${orderToConfirm.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'confirmed',
        notes: 'Pedido confirmado via teste'
      })
    });

    const confirmResult = await confirmResponse.json();
    
    if (confirmResult.success) {
      console.log(`✅ Pedido confirmado! Novo status: ${confirmResult.data.status}`);
      
      // 3. Aguardar processamento
      console.log('\n3️⃣ Aguardando processamento para a cozinha...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 4. Verificar se apareceu na cozinha
      console.log('\n4️⃣ Verificando na cozinha...');
      const kitchenResponse = await fetch(`${API_BASE}/kitchen/orders`);
      const kitchenData = await kitchenResponse.json();

      console.log('Resposta da cozinha:', JSON.stringify(kitchenData, null, 2));

      if (kitchenData.success && kitchenData.data && kitchenData.data.orders) {
        const kitchenOrder = kitchenData.data.orders.find(ko => ko.orderId === orderToConfirm.id);
        if (kitchenOrder) {
          console.log(`✅ Pedido encontrado na cozinha!`);
          console.log(`   Kitchen Order ID: ${kitchenOrder.id}`);
          console.log(`   Status: ${kitchenOrder.status}`);
          console.log(`   Itens: ${kitchenOrder.items?.length || 0}`);
        } else {
          console.log('⚠️ Pedido ainda não apareceu na cozinha');
          console.log(`   Total de pedidos na cozinha: ${kitchenData.data.orders.length}`);
        }
      } else {
        console.log('⚠️ Erro ao acessar dados da cozinha ou nenhum pedido encontrado');
      }

    } else {
      console.log('❌ Erro ao confirmar pedido:', confirmResult.error?.message);
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testOrderConfirmation();