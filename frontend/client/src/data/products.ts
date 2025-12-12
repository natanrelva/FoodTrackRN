import { Product, Category } from '@foodtrack/types';

export const products: Product[] = [
  {
    id: '1',
    name: 'X-Burger Clássico',
    description: 'Hambúrguer suculento, queijo cheddar, alface, tomate e molho especial',
    price: 24.90,
    image: 'https://images.unsplash.com/photo-1688246780164-00c01647e78c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXJnZXIlMjBmb29kfGVufDF8fHx8MTc2NTM0NjYyOHww&ixlib=rb-4.1.0&q=80&w=1080',
    category: 'lanches',
    extras: [
      { name: 'Bacon', price: 5.00 },
      { name: 'Cheddar Extra', price: 4.00 },
      { name: 'Ovo', price: 3.00 }
    ]
  },
  {
    id: '2',
    name: 'Pizza Margherita',
    description: 'Molho de tomate, mussarela, manjericão fresco e azeite',
    price: 42.00,
    image: 'https://images.unsplash.com/photo-1544982503-9f984c14501a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaXp6YSUyMHNsaWNlfGVufDF8fHx8MTc2NTM1NDA4NHww&ixlib=rb-4.1.0&q=80&w=1080',
    category: 'lanches',
    extras: [
      { name: 'Borda Recheada', price: 8.00 },
      { name: 'Azeitonas', price: 3.00 }
    ]
  },
  {
    id: '3',
    name: 'Refrigerante Lata',
    description: 'Coca-Cola, Guaraná ou Sprite - 350ml gelada',
    price: 5.50,
    image: 'https://images.unsplash.com/photo-1735643434124-f51889fa1f8c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb2RhJTIwZHJpbmt8ZW58MXx8fHwxNzY1Mzg1OTYyfDA&ixlib=rb-4.1.0&q=80&w=1080',
    category: 'bebidas'
  },
  {
    id: '4',
    name: 'Batata Frita Grande',
    description: 'Porção generosa de batatas crocantes com sal especial',
    price: 16.00,
    image: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVuY2glMjBmcmllc3xlbnwxfHx8fDE3NjUzODM2NTB8MA&ixlib=rb-4.1.0&q=80&w=1080',
    category: 'acompanhamentos',
    extras: [
      { name: 'Molho Cheddar', price: 4.00 },
      { name: 'Molho Barbecue', price: 3.00 }
    ]
  },
  {
    id: '5',
    name: 'Sorvete Artesanal',
    description: 'Duas bolas de sorvete artesanal - sabores variados',
    price: 12.00,
    image: 'https://images.unsplash.com/photo-1673551494246-0ea345ddbf86?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpY2UlMjBjcmVhbSUyMGRlc3NlcnR8ZW58MXx8fHwxNzY1Mzg3MzUxfDA&ixlib=rb-4.1.0&q=80&w=1080',
    category: 'sobremesas',
    extras: [
      { name: 'Cobertura Chocolate', price: 3.00 },
      { name: 'Granulado', price: 2.00 }
    ]
  },
  {
    id: '6',
    name: 'Salada Caesar',
    description: 'Alface romana, croutons, parmesão e molho caesar',
    price: 22.00,
    image: 'https://images.unsplash.com/photo-1692780941487-505d5d908aa6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYWxhZCUyMGhlYWx0aHl8ZW58MXx8fHwxNzY1MzEzOTYxfDA&ixlib=rb-4.1.0&q=80&w=1080',
    category: 'saudavel',
    extras: [
      { name: 'Frango Grelhado', price: 8.00 },
      { name: 'Camarão', price: 12.00 }
    ]
  }
];

export const categories: Category[] = [
  { id: 'todos', name: 'Todos', icon: '🍽️' },
  { id: 'lanches', name: 'Lanches', icon: '🍔' },
  { id: 'bebidas', name: 'Bebidas', icon: '🥤' },
  { id: 'acompanhamentos', name: 'Acompanhamentos', icon: '🍟' },
  { id: 'sobremesas', name: 'Sobremesas', icon: '🍨' },
  { id: 'saudavel', name: 'Saudável', icon: '🥗' }
];
