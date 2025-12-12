import { KitchenOrder, OrderPriority, KitchenStatus } from '../types/kitchen';

// Dados mock dos pedidos da cozinha para desenvolvimento e testes
export const mockKitchenOrders: KitchenOrder[] = [
  {
    id: '001',
    orderId: 'PED-001',
    items: [
      {
        id: '001-1',
        productId: 'burger-classic',
        name: 'Hambúrguer Clássico',

        price: 24.99,
        quantity: 2,
        extras: ['Queijo Extra'],


        modifications: ['Queijo Extra', 'Bem Passado'],
        allergens: ['glúten', 'lactose'],
        preparationNotes: 'Cliente prefere bem passado',
        status: 'in_progress',
        estimatedTime: 25,
        actualTime: 22
      },
      {
        id: '001-2',
        productId: 'caesar-salad',
        name: 'Salada Caesar',

        price: 12.99,
        quantity: 1,
        extras: [],
        estimatedTime: 15,
        modifications: ['Sem Anchovas'],
        allergens: ['lactose', 'glúten'],
        preparationNotes: 'Sem anchovas devido à alergia a peixe',
        status: 'pending'
      }
    ],
    status: 'in_preparation',
    priority: 'high',
    specialInstructions: 'Cliente tem alergia ao glúten - cuidado com contaminação cruzada',
    allergenAlerts: [
      {
        type: 'glúten',
        severity: 'severe',
        description: 'Cliente tem alergia severa ao glúten - evitar contaminação cruzada'
      }
    ],
    estimatedCompletionTime: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    actualStartTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    assignedStations: [
      {
        stationId: 'grill-01',
        stationName: 'Estação Grill',
        assignedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        estimatedDuration: 15,
        items: ['001-1']
      },
      {
        stationId: 'salad-01',
        stationName: 'Estação Saladas',
        assignedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
        estimatedDuration: 5,
        items: ['001-2']
      }
    ]
  },
  {
    id: '002',
    orderId: 'PED-002',
    items: [
      {
        id: '002-1',
        productId: 'pizza-margherita',
        name: 'Pizza Margherita',
        price: 18.99,
        quantity: 1,
        extras: ['Queijo Extra'],
        estimatedTime: 12,
        modifications: ['Queijo Extra', 'Massa Fina'],
        allergens: ['lactose', 'glúten'],
        preparationNotes: 'Massa fina, queijo extra',
        status: 'pending'
      }
    ],
    status: 'received',
    priority: 'urgent',
    specialInstructions: 'Pedido urgente - cliente aguardando',
    allergenAlerts: [],
    estimatedCompletionTime: new Date(Date.now() + 12 * 60 * 1000).toISOString(),
    assignedStations: []
  },
  {
    id: '003',
    orderId: 'PED-003',
    items: [
      {
        id: '003-1',
        productId: 'brownie-chocolate',
        name: 'Brownie de Chocolate',

        price: 8.99,
        quantity: 2,
        extras: [],
        estimatedTime: 5,
        modifications: [],
        allergens: ['lactose', 'ovos', 'nozes'],
        preparationNotes: 'Brownie quente, sorvete gelado',
        status: 'ready',
        actualTime: 5
      }
    ],
    status: 'ready_for_pickup',
    priority: 'low',
    specialInstructions: '',
    allergenAlerts: [
      {
        type: 'nozes',
        severity: 'mild',
        description: 'Contém nozes'
      }
    ],
    estimatedCompletionTime: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    actualStartTime: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    actualCompletionTime: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    assignedStations: [
      {
        stationId: 'dessert-01',
        stationName: 'Estação Sobremesas',
        assignedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        estimatedDuration: 5,
        items: ['003-1']
      }
    ]
  },
  {
    id: '004',
    orderId: 'PED-004',
    items: [
      {
        id: '004-1',
        productId: 'peixe-batatas',
        name: 'Peixe com Batatas',

        price: 22.99,
        quantity: 1,
        extras: ['Molho Tártaro Extra'],
        estimatedTime: 18,
        modifications: ['Molho Tártaro Extra', 'Bem Crocante'],
        allergens: ['peixe', 'glúten'],
        preparationNotes: 'Massa bem crocante, molho tártaro extra',
        status: 'assigned'
      }
    ],
    status: 'on_hold',
    priority: 'medium',
    specialInstructions: 'Em espera - aguardando entrega de peixe fresco',
    allergenAlerts: [
      {
        type: 'peixe',
        severity: 'moderate',
        description: 'Contém peixe - verificar alergias'
      }
    ],
    estimatedCompletionTime: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    assignedStations: [
      {
        stationId: 'grill-01',
        stationName: 'Estação Grill',
        assignedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        estimatedDuration: 18,
        items: ['004-1']
      }
    ]
  },
  {
    id: '005',
    orderId: 'PED-005',
    items: [
      {
        id: '005-1',
        productId: 'pizza-margherita-2',
        name: 'Pizza Margherita',
        price: 18.99,
        quantity: 1,
        extras: [],
        estimatedTime: 20,
        modifications: ['Manjericão Extra'],
        allergens: ['glúten', 'lactose'],
        preparationNotes: 'Folhas de manjericão fresco extra',
        status: 'pending'
      }
    ],
    status: 'received',
    priority: 'medium',
    specialInstructions: 'Cliente solicitou manjericão extra',
    allergenAlerts: [],
    estimatedCompletionTime: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    assignedStations: []
  }
];

// Funções auxiliares para filtrar pedidos
export function getOrdersByStatus(status: KitchenStatus): KitchenOrder[] {
  return mockKitchenOrders.filter(order => order.status === status);
}

export function getOrdersByPriority(priority: OrderPriority): KitchenOrder[] {
  return mockKitchenOrders.filter(order => order.priority === priority);
}

export function getOverdueOrders(): KitchenOrder[] {
  const now = Date.now();
  return mockKitchenOrders.filter(order => {
    const estimatedTime = new Date(order.estimatedCompletionTime).getTime();
    return estimatedTime < now && 
           order.status !== 'ready_for_pickup' && 
           order.status !== 'cancelled';
  });
}

export function getOrdersWithAllergens(): KitchenOrder[] {
  return mockKitchenOrders.filter(order => order.allergenAlerts.length > 0);
}