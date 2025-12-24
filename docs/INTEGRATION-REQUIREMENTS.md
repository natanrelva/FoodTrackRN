# FoodTrack - Necessidades de Integração Backend/Frontend

**Versão:** 1.0  
**Data:** 24 de Dezembro de 2024  
**Status:** 📋 Especificação Completa

## Visão Geral

Este documento mapeia todas as necessidades de integração entre os frontends e backend do FoodTrack, baseado na análise das specs, código existente e dados mockados que precisam ser substituídos por APIs reais.

## 🎯 Frontend Applications Overview

### 1. **Client Frontend** (localhost:3000)
**Propósito:** Interface de pedidos para clientes  
**Dados Mockados:** Produtos hardcoded no código  
**Integrações Necessárias:** Catálogo de produtos, criação de pedidos, tracking em tempo real

### 2. **Tenant Dashboard** (localhost:3001)  
**Propósito:** Dashboard gerencial do restaurante  
**Dados Mockados:** Orders, Products, Transactions  
**Integrações Necessárias:** Gestão completa de pedidos, analytics, produtos

### 3. **Kitchen Interface** (localhost:3002)
**Propósito:** Interface de produção da cozinha  
**Dados Mockados:** KitchenOrders, Recipes  
**Integrações Necessárias:** Production Contracts, workflow de preparo, receitas

## 📊 Análise de Dados Mockados

### Client Frontend
```typescript
// Atualmente hardcoded no código - precisa vir da API
const products = [
  { id: '1', name: 'X-Burger', price: 25.90, category: 'Lanches' },
  { id: '2', name: 'Pizza Margherita', price: 35.90, category: 'Lanches' },
  // ... mais produtos
];
```

### Tenant Dashboard  
```typescript
// frontend/tenant/src/data/mockData.ts
mockOrders: 4 pedidos com status variados
mockProducts: 6 produtos com estoque e categorias  
mockTransactions: 4 transações financeiras
```

### Kitchen Interface
```typescript
// frontend/kitchen/src/data/mockKitchenOrders.ts
mockKitchenOrders: 5 pedidos com workflow completo
mockRecipes: 3 receitas detalhadas com ingredientes e passos
```

## 🔌 APIs Necessárias

### 1. Products API
**Endpoints Requeridos:**
```typescript
GET    /api/products              // Lista produtos por tenant
POST   /api/products              // Criar produto (tenant dashboard)
PUT    /api/products/:id          // Atualizar produto
DELETE /api/products/:id          // Remover produto
PUT    /api/products/:id/availability // Toggle disponibilidade
```

**Estrutura de Dados:**
```typescript
interface Product {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  stock: number;
  available: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Frontends que Consomem:**
- ✅ **Client:** Lista produtos para catálogo
- ✅ **Tenant:** CRUD completo de produtos
- ❌ **Kitchen:** Não consome diretamente

---

### 2. Orders API
**Endpoints Requeridos:**
```typescript
GET    /api/orders                // Lista pedidos com filtros
POST   /api/orders                // Criar pedido (client)
GET    /api/orders/:id            // Detalhes do pedido
PUT    /api/orders/:id/status     // Atualizar status
PUT    /api/orders/:id/confirm    // Confirmar pedido
DELETE /api/orders/:id            // Cancelar pedido
GET    /api/orders/:id/history    // Histórico de eventos
```

**Estrutura de Dados:**
```typescript
interface Order {
  id: string;
  number: string;
  tenantId: string;
  customerId?: string;
  customer: {
    name: string;
    phone: string;
    address: string;
  };
  items: OrderItem[];
  status: 'draft' | 'confirmed' | 'in_preparation' | 'ready' | 'delivering' | 'delivered' | 'cancelled';
  channel: 'whatsapp' | 'instagram' | 'site' | 'ifood';
  payment: {
    method: 'pix' | 'credit' | 'debit' | 'cash';
    status: 'pending' | 'confirmed' | 'failed';
    amount: number;
  };
  totalAmount: number;
  specialInstructions?: string;
  deliveryAddress?: any;
  createdAt: string;
  updatedAt: string;
}
```

**Frontends que Consomem:**
- ✅ **Client:** Criar pedidos, tracking de status
- ✅ **Tenant:** Visualizar e gerenciar todos os pedidos
- ❌ **Kitchen:** Recebe via Production Contracts

---

### 3. Kitchen API (Production Contracts)
**Endpoints Requeridos:**
```typescript
GET    /api/kitchen/orders        // Pedidos para produção
POST   /api/kitchen/orders/:id/start    // Iniciar preparo
PUT    /api/kitchen/orders/:id/step     // Completar etapa
PUT    /api/kitchen/orders/:id/ready    // Marcar como pronto
POST   /api/kitchen/orders/:id/issue    // Reportar problema
GET    /api/kitchen/stations      // Estações disponíveis
POST   /api/kitchen/stations/:id/assign // Atribuir pedido à estação
```

**Estrutura de Dados (Production Contract - ADR-001):**
```typescript
interface ProductionContract {
  id: string;
  tenantId: string;
  orderId: string;
  items: ProductionItem[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  specialInstructions: string[];
  allergenAlerts: AllergenAlert[];
  estimatedCompletionTime: string;
  assignedStations: StationAssignment[];
  status: 'pending' | 'assigned' | 'in_preparation' | 'ready' | 'completed';
  createdAt: string;
}

interface ProductionItem {
  productionItemId: string;
  productId: string;
  recipeId: string;
  quantity: number;
  modifications: string[];
  allergens: string[];
  preparationNotes?: string;
  estimatedTime: number;
}
```

**Frontends que Consomem:**
- ❌ **Client:** Não consome diretamente
- ✅ **Tenant:** Monitora progresso da cozinha
- ✅ **Kitchen:** Interface principal de trabalho

---

### 4. Recipes API
**Endpoints Requeridos:**
```typescript
GET    /api/recipes/:dishId       // Receita por produto
GET    /api/recipes/:dishId/instructions // Instruções com modificações
POST   /api/recipes/:dishId/modifications // Aplicar modificações
GET    /api/recipes/:dishId/ingredients   // Calcular ingredientes
```

**Estrutura de Dados:**
```typescript
interface RecipeInstructions {
  recipeId: string;
  dishName: string;
  totalTime: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  modifications: string[];
  allergenWarnings: string[];
  qualityCheckpoints: QualityStandard[];
}
```

**Frontends que Consomem:**
- ❌ **Client:** Não consome diretamente
- ❌ **Tenant:** Pode visualizar para gestão
- ✅ **Kitchen:** Interface principal para preparo

---

### 5. Analytics API
**Endpoints Requeridos:**
```typescript
GET    /api/analytics/revenue     // Métricas de receita
GET    /api/analytics/orders      // Estatísticas de pedidos
GET    /api/analytics/performance // Performance da cozinha
GET    /api/analytics/products    // Produtos mais vendidos
GET    /api/analytics/customers   // Análise de clientes
```

**Estrutura de Dados:**
```typescript
interface RevenueMetrics {
  period: string;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  growthRate: number;
  breakdown: {
    confirmed: number;
    pending: number;
    cancelled: number;
  };
}
```

**Frontends que Consomem:**
- ❌ **Client:** Não consome
- ✅ **Tenant:** Dashboard principal com métricas
- ❌ **Kitchen:** Pode consumir métricas de performance

---

### 6. Customers API
**Endpoints Requeridos:**
```typescript
GET    /api/customers             // Lista clientes
POST   /api/customers             // Criar cliente
GET    /api/customers/:id         // Detalhes do cliente
PUT    /api/customers/:id         // Atualizar cliente
GET    /api/customers/:id/orders  // Histórico de pedidos
```

**Frontends que Consomem:**
- ✅ **Client:** Criar/atualizar dados do cliente
- ✅ **Tenant:** Gestão de clientes
- ❌ **Kitchen:** Não consome diretamente

## 🔄 WebSocket Real-Time Events

### Event Channels por Frontend

#### Client Frontend
```typescript
// Eventos que o cliente precisa receber
'order:created'           // Confirmação de pedido criado
'order:status-updated'    // Mudanças de status do pedido
'order:ready'            // Pedido pronto para retirada/entrega
'order:out-for-delivery' // Pedido saiu para entrega
'product:availability'   // Mudanças na disponibilidade de produtos
```

#### Tenant Dashboard
```typescript
// Eventos para o dashboard gerencial
'order:new'              // Novo pedido recebido
'order:status-updated'   // Todas as mudanças de status
'order:cancelled'        // Pedidos cancelados
'kitchen:order-ready'    // Pedidos prontos na cozinha
'analytics:updated'      // Métricas atualizadas
'payment:confirmed'      // Pagamentos confirmados
'payment:failed'         // Falhas de pagamento
```

#### Kitchen Interface
```typescript
// Eventos para a interface da cozinha
'production-contract:created'  // Novo contrato de produção
'kitchen:order-assigned'       // Pedido atribuído à estação
'kitchen:order-priority'       // Mudanças de prioridade
'kitchen:station-update'       // Atualizações de estação
'supply:ingredient-alert'      // Alertas de ingredientes
'supply:stock-low'            // Estoque baixo
```

## 🏗️ Implementação por Fases

### Fase 1: Backend Foundation (Semana 1-2)
**Prioridade:** Crítica
```typescript
✅ Database schema setup
✅ Event infrastructure (Event Bus + WebSocket)
✅ Products API implementation
✅ Basic Orders API
✅ Database seeding
```

### Fase 2: Core Business Logic (Semana 3-4)
**Prioridade:** Alta
```typescript
✅ Complete Orders API with state machine
✅ Production Contract implementation (ADR-001)
✅ Kitchen API with contract consumption
✅ WebSocket real-time events
✅ Customers API
```

### Fase 3: Frontend Integration (Semana 5-6)
**Prioridade:** Alta
```typescript
✅ Client Frontend: Replace hardcoded products with API
✅ Client Frontend: Implement real order creation and tracking
✅ Tenant Dashboard: Replace all mock data with real APIs
✅ Kitchen Interface: Implement Production Contract workflow
✅ All frontends: WebSocket real-time updates
```

### Fase 4: Advanced Features (Semana 7-8)
**Prioridade:** Média
```typescript
✅ Analytics API implementation
✅ Recipes API with modifications
✅ Performance optimization
✅ Error handling and resilience
✅ Comprehensive testing
```

## 🔧 Technical Implementation Details

### API Service Layer (Frontend)
```typescript
// frontend/*/src/services/api.ts
class ApiService {
  private baseURL = 'http://localhost:4000/api';
  private tenantId: string;
  
  async getProducts(): Promise<Product[]> {
    const response = await this.request('GET', '/products');
    return response.data;
  }
  
  async createOrder(orderData: CreateOrderData): Promise<Order> {
    const response = await this.request('POST', '/orders', orderData);
    return response.data;
  }
  
  private async request(method: string, endpoint: string, data?: any) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
        'Content-Type': 'application/json',
        'X-Tenant-ID': this.tenantId
      },
      body: data ? JSON.stringify(data) : undefined
    });
    
    if (!response.ok) {
      throw new ApiError(response.status, await response.json());
    }
    
    return response.json();
  }
}
```

### WebSocket Integration
```typescript
// frontend/*/src/hooks/useWebSocket.ts
export function useWebSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  
  useEffect(() => {
    const newSocket = io('http://localhost:4000', {
      auth: { token: getAuthToken() }
    });
    
    newSocket.on('connect', () => setConnected(true));
    newSocket.on('disconnect', () => setConnected(false));
    
    setSocket(newSocket);
    return () => newSocket.close();
  }, []);
  
  const subscribe = (channel: string, callback: Function) => {
    if (socket) {
      socket.on(channel, callback);
    }
  };
  
  return { socket, connected, subscribe };
}
```

### State Management Migration
```typescript
// Substituir dados mockados por estado real
// Antes:
const [orders] = useState(mockOrders);

// Depois:
const [orders, setOrders] = useState<Order[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await apiService.getOrders();
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  fetchOrders();
}, []);
```

## 🎯 Success Criteria

### Functional Requirements
- ✅ Zero mock data in production code
- ✅ All frontends consume real APIs
- ✅ Real-time updates via WebSocket
- ✅ Event-driven architecture operational
- ✅ Production Contract pattern implemented
- ✅ Multi-tenant isolation enforced

### Performance Requirements
- ✅ API responses < 500ms (95th percentile)
- ✅ WebSocket handles 200+ concurrent connections
- ✅ Database queries optimized with indexes
- ✅ Frontend loading states < 2s
- ✅ Real-time updates < 100ms latency

### User Experience Requirements
- ✅ Seamless transition from mock to real data
- ✅ Proper error handling and recovery
- ✅ Offline support where applicable
- ✅ Loading states and feedback
- ✅ Consistent data across all interfaces

## 🚨 Risk Mitigation

### High-Risk Areas
1. **WebSocket Stability:** Connection drops, reconnection logic
2. **Database Performance:** Query optimization, connection pooling
3. **Event Consistency:** Order of events, idempotency
4. **Multi-tenant Security:** Data isolation, authorization

### Mitigation Strategies
- Comprehensive monitoring and alerting
- Feature flags for gradual rollout
- Rollback procedures for each phase
- Keep mock data as fallback during transition
- Extensive integration testing

## 📋 Implementation Checklist

### Backend APIs
- [ ] Products API (CRUD + availability)
- [ ] Orders API (lifecycle + state machine)
- [ ] Kitchen API (Production Contracts)
- [ ] Recipes API (instructions + modifications)
- [ ] Analytics API (metrics + reporting)
- [ ] Customers API (management)
- [ ] WebSocket service (real-time events)

### Frontend Integration
- [ ] Client: Product catalog from API
- [ ] Client: Order creation and tracking
- [ ] Tenant: Complete dashboard with real data
- [ ] Tenant: Product management interface
- [ ] Kitchen: Production Contract workflow
- [ ] Kitchen: Recipe instructions and modifications
- [ ] All: WebSocket real-time updates

### Infrastructure
- [ ] Database schema and migrations
- [ ] Event Bus and Event Store
- [ ] Multi-tenant middleware
- [ ] Authentication and authorization
- [ ] Error handling and logging
- [ ] Performance monitoring
- [ ] Deployment pipeline

Este documento serve como guia completo para a implementação da integração entre todos os frontends e o backend, garantindo que nenhuma funcionalidade seja esquecida e que a migração dos dados mockados seja feita de forma sistemática e completa.