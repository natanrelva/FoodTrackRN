import { Order, OrderItem, Notification, Product, Transaction } from '@foodtrack/types';

export const mockOrders: Order[] = [
  {
    id: '1',
    number: '#1234',
    customer: {
      name: 'João Silva',
      phone: '(11) 98765-4321',
      address: 'Rua das Flores, 123 - Centro'
    },
    items: [
      { id: '1', name: 'Pizza Margherita', quantity: 1, price: 45.90, extras: ['Borda recheada'] },
      { id: '2', name: 'Refrigerante 2L', quantity: 1, price: 10.00 }
    ],
    status: 'preparing',
    channel: 'whatsapp',
    payment: {
      method: 'pix',
      status: 'confirmed',
      amount: 55.90
    },
    createdAt: new Date().toISOString(),
    notifications: [
      { id: '1', type: 'pedido_confirmado', message: 'Pedido confirmado enviado', timestamp: new Date().toISOString(), status: 'sent' }
    ]
  },
  {
    id: '2',
    number: '#1235',
    customer: {
      name: 'Maria Santos',
      phone: '(11) 97654-3210',
      address: 'Av. Principal, 456 - Jardim'
    },
    items: [
      { id: '3', name: 'Hambúrguer Artesanal', quantity: 2, price: 35.00 },
      { id: '4', name: 'Batata Frita', quantity: 1, price: 15.00 }
    ],
    status: 'ready',
    channel: 'instagram',
    payment: {
      method: 'credit',
      status: 'confirmed',
      amount: 85.00
    },
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
    notifications: [
      { id: '2', type: 'pedido_confirmado', message: 'Pedido confirmado', timestamp: new Date(Date.now() - 30 * 60000).toISOString(), status: 'sent' },
      { id: '3', type: 'pedido_pronto', message: 'Pedido pronto para retirada', timestamp: new Date().toISOString(), status: 'sent' }
    ]
  },
  {
    id: '3',
    number: '#1236',
    customer: {
      name: 'Carlos Oliveira',
      phone: '(11) 96543-2109',
      address: 'Rua dos Comerciantes, 789 - Vila Nova'
    },
    items: [
      { id: '5', name: 'Risoto de Camarão', quantity: 1, price: 68.00 },
      { id: '6', name: 'Suco Natural', quantity: 2, price: 12.00 }
    ],
    status: 'delivering',
    channel: 'site',
    payment: {
      method: 'pix',
      status: 'confirmed',
      amount: 92.00
    },
    createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
    notifications: [
      { id: '4', type: 'pedido_confirmado', message: 'Pedido confirmado', timestamp: new Date(Date.now() - 60 * 60000).toISOString(), status: 'sent' },
      { id: '5', type: 'pedido_saiu', message: 'Pedido saiu para entrega', timestamp: new Date(Date.now() - 10 * 60000).toISOString(), status: 'sent' }
    ]
  },
  {
    id: '4',
    number: '#1237',
    customer: {
      name: 'Ana Paula',
      phone: '(11) 95432-1098',
      address: 'Travessa das Palmeiras, 321 - Bosque'
    },
    items: [
      { id: '7', name: 'Salada Caesar', quantity: 1, price: 28.00 },
      { id: '8', name: 'Água Mineral', quantity: 1, price: 5.00 }
    ],
    status: 'pending',
    channel: 'ifood',
    payment: {
      method: 'credit',
      status: 'pending',
      amount: 33.00
    },
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    notifications: []
  }
];

export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Pizza Margherita',
    description: 'Molho de tomate, mussarela, manjericão e azeite',
    price: 45.90,
    category: 'Pizzas',
    image: 'pizza',
    stock: 25,
    active: true
  },
  {
    id: '2',
    name: 'Hambúrguer Artesanal',
    description: 'Pão brioche, blend 180g, queijo cheddar, alface e tomate',
    price: 35.00,
    category: 'Lanches',
    image: 'burger',
    stock: 30,
    active: true
  },
  {
    id: '3',
    name: 'Risoto de Camarão',
    description: 'Arroz arbóreo, camarões, alho-poró e parmesão',
    price: 68.00,
    category: 'Pratos Principais',
    image: 'risotto',
    stock: 15,
    active: true
  },
  {
    id: '4',
    name: 'Salada Caesar',
    description: 'Alface romana, croutons, parmesão e molho caesar',
    price: 28.00,
    category: 'Saladas',
    image: 'salad',
    stock: 20,
    active: true
  },
  {
    id: '5',
    name: 'Batata Frita',
    description: 'Batatas fritas crocantes com sal especial',
    price: 15.00,
    category: 'Acompanhamentos',
    image: 'fries',
    stock: 50,
    active: true
  },
  {
    id: '6',
    name: 'Refrigerante 2L',
    description: 'Refrigerante gelado 2 litros',
    price: 10.00,
    category: 'Bebidas',
    image: 'soda',
    stock: 40,
    active: true
  }
];

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    orderId: '#1234',
    date: new Date().toISOString(),
    amount: 55.90,
    method: 'Pix',
    status: 'confirmed'
  },
  {
    id: '2',
    orderId: '#1235',
    date: new Date(Date.now() - 30 * 60000).toISOString(),
    amount: 85.00,
    method: 'Cartão de Crédito',
    status: 'confirmed'
  },
  {
    id: '3',
    orderId: '#1236',
    date: new Date(Date.now() - 60 * 60000).toISOString(),
    amount: 92.00,
    method: 'Pix',
    status: 'confirmed'
  },
  {
    id: '4',
    orderId: '#1237',
    date: new Date(Date.now() - 5 * 60000).toISOString(),
    amount: 33.00,
    method: 'Cartão de Crédito',
    status: 'pending'
  }
];
