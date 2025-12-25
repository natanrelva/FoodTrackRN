// Teste para completar o fluxo de pedidos e gerar dados para analytics
const API_BASE = 'http://localhost:4001/api';

async function completeOrderFlow() {
  console.log('🔄 COMPLETANDO FLUXO DE PEDIDOS PARA ANALYTICS\n');

  try {
    // 1. Buscar pedidos existentes
    console.log('1️⃣ Buscando pedidos existentes...');
    const ordersResponse = await fetch(`${API_BASE}/orders`);
    const ordersData = await ordersResponse.json();
    
    if (!ordersData.success || !ordersData.data.orders) {
      console.log('❌ Erro ao buscar pedidos');
      return;
    }

    const orders = ordersData.data.orders;
    console.log(`✅ Encontrados ${orders.length} pedidos`);

    // 2. Completar alguns pedidos (simular o fluxo completo)
    const ordersToComplete = orders.filter(order => 
      ['draft', 'confirmed', 'preparing', 'ready'].includes(order.status)
    ).slice(0, 5); // Pegar até 5 pedidos para completar

    console.log(`\n2️⃣ Completando ${ordersToComplete.length} pedidos...`);

    for (const order of ordersToComplete) {
      console.log(`\n   📋 Processando pedido #${order.number} (${order.status})...`);
      
      try {
        // Simular progressão do status
        const statusFlow = {
          'draft': 'confirmed',
          'confirmed': 'preparing', 
          'preparing': 'ready',
          'ready': 'delivering',
          'delivering': 'delivered'
        };

        let currentStatus = order.status;
        
        // Avançar até 'delivered'
        while (currentStatus !== 'delivered') {
          const nextStatus = statusFlow[currentStatus];
          if (!nextStatus) break;

          const updateResponse = await fetch(`${API_BASE}/orders/${order.id}/status`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              status: nextStatus,
              notes: `Atualizado automaticamente para ${nextStatus}`
            })
          });

          const updateResult = await updateResponse.json();
          
          if (updateResult.success) {
            console.log(`     ✅ ${currentStatus} → ${nextStatus}`);
            currentStatus = nextStatus;
            
            // Pequena pausa para simular tempo real
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            console.log(`     ❌ Erro ao atualizar para ${nextStatus}:`, updateResult.error?.message);
            break;
          }
        }

        if (currentStatus === 'delivered') {
          console.log(`     🎉 Pedido #${order.number} completado!`);
        }

      } catch (error) {
        console.log(`     ❌ Erro ao processar pedido #${order.number}:`, error.message);
      }
    }

    // 3. Criar alguns pedidos novos e completá-los
    console.log('\n3️⃣ Criando novos pedidos para mais dados...');
    
    const newOrdersData = [
      {
        customer: { name: 'Maria Silva', phone: '11987654321', address: 'Rua A, 123' },
        items: [{ productId: '550e8400-e29b-41d4-a716-446655440020', quantity: 2, modifications: [] }],
        channel: 'website',
        payment: { method: 'credit_card' },
        delivery: { type: 'delivery', address: 'Rua A, 123', fee: 5 },
        notes: 'Pedido de teste para analytics'
      },
      {
        customer: { name: 'João Santos', phone: '11987654322', address: 'Rua B, 456' },
        items: [
          { productId: '550e8400-e29b-41d4-a716-446655440021', quantity: 1, modifications: [] },
          { productId: '550e8400-e29b-41d4-a716-446655440022', quantity: 1, modifications: [] }
        ],
        channel: 'whatsapp',
        payment: { method: 'pix' },
        delivery: { type: 'pickup', address: '', fee: 0 },
        notes: 'Pedido combinado'
      },
      {
        customer: { name: 'Ana Costa', phone: '11987654323', address: 'Rua C, 789' },
        items: [{ productId: '550e8400-e29b-41d4-a716-446655440023', quantity: 3, modifications: [] }],
        channel: 'instagram',
        payment: { method: 'money' },
        delivery: { type: 'delivery', address: 'Rua C, 789', fee: 8 },
        notes: 'Cliente VIP'
      }
    ];

    for (let i = 0; i < newOrdersData.length; i++) {
      const orderData = newOrdersData[i];
      
      try {
        // Criar pedido
        const createResponse = await fetch(`${API_BASE}/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(orderData)
        });

        const createResult = await createResponse.json();
        
        if (createResult.success) {
          console.log(`   ✅ Pedido criado: #${createResult.data.number}`);
          
          // Completar o pedido imediatamente
          const orderId = createResult.data.id;
          const statusFlow = ['confirmed', 'preparing', 'ready', 'delivering', 'delivered'];
          
          for (const status of statusFlow) {
            const updateResponse = await fetch(`${API_BASE}/orders/${orderId}/status`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                status: status,
                notes: `Auto-completado para ${status}`
              })
            });

            const updateResult = await updateResponse.json();
            if (updateResult.success) {
              console.log(`     ✅ Status: ${status}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          console.log(`   🎉 Pedido #${createResult.data.number} completado!`);
          
        } else {
          console.log(`   ❌ Erro ao criar pedido:`, createResult.error?.message);
        }
        
      } catch (error) {
        console.log(`   ❌ Erro ao processar novo pedido:`, error.message);
      }
    }

    // 4. Verificar resultados
    console.log('\n4️⃣ Verificando resultados...');
    
    const finalOrdersResponse = await fetch(`${API_BASE}/orders`);
    const finalOrdersData = await finalOrdersResponse.json();
    
    if (finalOrdersData.success) {
      const allOrders = finalOrdersData.data.orders;
      const deliveredOrders = allOrders.filter(order => order.status === 'delivered');
      const totalRevenue = deliveredOrders.reduce((sum, order) => sum + order.total, 0);
      
      console.log(`✅ Total de pedidos: ${allOrders.length}`);
      console.log(`✅ Pedidos entregues: ${deliveredOrders.length}`);
      console.log(`✅ Receita total: R$ ${totalRevenue.toFixed(2)}`);
      
      // Status distribution
      const statusCount = {};
      allOrders.forEach(order => {
        statusCount[order.status] = (statusCount[order.status] || 0) + 1;
      });
      
      console.log('\n📊 Distribuição por status:');
      Object.entries(statusCount).forEach(([status, count]) => {
        console.log(`   ${status}: ${count} pedidos`);
      });
    }

    console.log('\n🎉 FLUXO DE PEDIDOS COMPLETADO!');
    console.log('💡 Agora você pode testar as analytics com dados reais!');

  } catch (error) {
    console.error('❌ Erro durante o processo:', error.message);
  }
}

completeOrderFlow();