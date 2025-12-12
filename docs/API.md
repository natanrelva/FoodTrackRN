# 📊 API Documentation - FoodTrack

## Base URL
```
http://localhost:4000/api
```

## Autenticação

Todas as rotas protegidas requerem um token JWT no header:
```http
Authorization: Bearer <jwt-token>
```

### Obter Token
```http
POST /auth/login
Content-Type: application/json

{
  "email": "test@test.com",
  "password": "123456"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "test@test.com",
    "name": "Test User",
    "role": "admin",
    "tenantId": "uuid"
  }
}
```

## Endpoints

### 🔐 Autenticação

#### POST /auth/login
Realiza login do usuário.

**Body:**
```json
{
  "email": "string",
  "password": "string (min: 6)"
}
```

**Response 200:**
```json
{
  "token": "string",
  "refreshToken": "string",
  "user": {
    "id": "uuid",
    "email": "string",
    "name": "string",
    "role": "admin|manager|operator",
    "tenantId": "uuid"
  }
}
```

**Response 401:**
```json
{
  "error": "Credenciais inválidas"
}
```

#### POST /auth/register
Registra novo usuário.

**Body:**
```json
{
  "email": "string",
  "password": "string (min: 6)",
  "name": "string",
  "tenantId": "uuid"
}
```

**Response 201:**
```json
{
  "token": "string",
  "user": {
    "id": "uuid",
    "email": "string",
    "name": "string",
    "role": "admin",
    "tenantId": "uuid"
  }
}
```

### 🍕 Produtos

#### GET /products
Lista produtos do tenant.

**Query Parameters:**
- `category` (optional): Filtrar por categoria
- `active` (optional): `true|false` - Filtrar por status
- `search` (optional): Buscar por nome ou descrição

**Response 200:**
```json
[
  {
    "id": "uuid",
    "tenantId": "uuid",
    "name": "Pizza Margherita",
    "description": "Molho de tomate, mussarela, manjericão",
    "price": 42.00,
    "image": "https://example.com/image.jpg",
    "category": "lanches",
    "stock": 30,
    "active": true,
    "extras": [
      {
        "name": "Borda Recheada",
        "price": 8.00
      }
    ],
    "tags": ["pizza", "italiana"],
    "preparationTime": 25,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
]
```

#### GET /products/:id
Obtém produto específico.

**Response 200:**
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "name": "Pizza Margherita",
  "description": "Molho de tomate, mussarela, manjericão",
  "price": 42.00,
  "image": "https://example.com/image.jpg",
  "category": "lanches",
  "stock": 30,
  "active": true,
  "extras": [
    {
      "name": "Borda Recheada",
      "price": 8.00
    }
  ],
  "tags": ["pizza", "italiana"],
  "preparationTime": 25,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Response 404:**
```json
{
  "error": "Produto não encontrado"
}
```

#### POST /products
Cria novo produto.

**Body:**
```json
{
  "name": "string",
  "description": "string",
  "price": "number (positive)",
  "image": "string (url)",
  "category": "string",
  "stock": "number (min: 0, default: 0)",
  "active": "boolean (default: true)",
  "extras": [
    {
      "name": "string",
      "price": "number (positive)"
    }
  ],
  "tags": ["string"],
  "preparationTime": "number (positive, optional)"
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "name": "Pizza Margherita",
  "description": "Molho de tomate, mussarela, manjericão",
  "price": 42.00,
  "image": "https://example.com/image.jpg",
  "category": "lanches",
  "stock": 30,
  "active": true,
  "extras": [
    {
      "name": "Borda Recheada",
      "price": 8.00
    }
  ],
  "tags": ["pizza", "italiana"],
  "preparationTime": 25,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

#### PUT /products/:id
Atualiza produto existente.

**Body:** (todos os campos opcionais)
```json
{
  "name": "string",
  "description": "string",
  "price": "number (positive)",
  "image": "string (url)",
  "category": "string",
  "stock": "number (min: 0)",
  "active": "boolean",
  "extras": [
    {
      "name": "string",
      "price": "number (positive)"
    }
  ],
  "tags": ["string"],
  "preparationTime": "number (positive)"
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "name": "Pizza Margherita Atualizada",
  "description": "Nova descrição",
  "price": 45.00,
  "image": "https://example.com/new-image.jpg",
  "category": "lanches",
  "stock": 25,
  "active": true,
  "extras": [
    {
      "name": "Borda Recheada",
      "price": 10.00
    }
  ],
  "tags": ["pizza", "italiana", "premium"],
  "preparationTime": 30,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-02T00:00:00Z"
}
```

#### DELETE /products/:id
Remove produto.

**Response 204:** (No Content)

**Response 404:**
```json
{
  "error": "Produto não encontrado"
}
```

### 📋 Pedidos

#### GET /orders
Lista pedidos do tenant.

**Query Parameters:**
- `status` (optional): Filtrar por status
- `channel` (optional): Filtrar por canal
- `page` (optional): Página (default: 1)
- `limit` (optional): Itens por página (default: 20)

**Response 200:**
```json
{
  "orders": [
    {
      "id": "uuid",
      "number": "#1001",
      "customerId": "uuid",
      "items": [
        {
          "productId": "uuid",
          "name": "Pizza Margherita",
          "price": 42.00,
          "quantity": 1,
          "extras": ["Borda Recheada"],
          "notes": "Sem cebola"
        }
      ],
      "status": "pending",
      "channel": "website",
      "delivery": {
        "type": "delivery",
        "address": {
          "street": "Rua das Flores",
          "number": "123",
          "neighborhood": "Centro",
          "city": "São Paulo",
          "state": "SP",
          "zipCode": "01234-567"
        },
        "fee": 5.00
      },
      "subtotal": 42.00,
      "deliveryFee": 5.00,
      "discount": 0.00,
      "total": 47.00,
      "notes": "Entregar no portão",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

#### GET /orders/:id
Obtém pedido específico.

**Response 200:**
```json
{
  "id": "uuid",
  "number": "#1001",
  "customerId": "uuid",
  "items": [
    {
      "productId": "uuid",
      "name": "Pizza Margherita",
      "price": 42.00,
      "quantity": 1,
      "extras": ["Borda Recheada"],
      "notes": "Sem cebola"
    }
  ],
  "status": "pending",
  "channel": "website",
  "delivery": {
    "type": "delivery",
    "address": {
      "street": "Rua das Flores",
      "number": "123",
      "neighborhood": "Centro",
      "city": "São Paulo",
      "state": "SP",
      "zipCode": "01234-567"
    },
    "fee": 5.00
  },
  "subtotal": 42.00,
  "deliveryFee": 5.00,
  "discount": 0.00,
  "total": 47.00,
  "notes": "Entregar no portão",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### POST /orders
Cria novo pedido.

**Body:**
```json
{
  "customerId": "uuid",
  "items": [
    {
      "productId": "uuid",
      "name": "string",
      "price": "number (positive)",
      "quantity": "number (positive)",
      "extras": ["string"],
      "notes": "string (optional)"
    }
  ],
  "channel": "whatsapp|instagram|website|ifood|uber_eats|rappi",
  "delivery": {
    "type": "pickup|delivery",
    "address": {
      "street": "string",
      "number": "string",
      "complement": "string (optional)",
      "neighborhood": "string",
      "city": "string",
      "state": "string",
      "zipCode": "string"
    },
    "fee": "number (min: 0, default: 0)"
  },
  "notes": "string (optional)"
}
```

#### PUT /orders/:id/status
Atualiza status do pedido.

**Body:**
```json
{
  "status": "pending|confirmed|preparing|ready|delivering|delivered|cancelled"
}
```

**Response 200:**
```json
{
  "message": "Status atualizado com sucesso"
}
```

### 👥 Clientes

#### GET /customers
Lista clientes do tenant.

**Query Parameters:**
- `search` (optional): Buscar por nome ou telefone
- `page` (optional): Página (default: 1)
- `limit` (optional): Itens por página (default: 20)

**Response 200:**
```json
{
  "customers": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "name": "João Silva",
      "email": "joao@email.com",
      "phone": "(11) 98765-4321",
      "address": {
        "street": "Rua das Palmeiras",
        "number": "456",
        "complement": "Apto 101",
        "neighborhood": "Jardim América",
        "city": "São Paulo",
        "state": "SP",
        "zipCode": "01234-567"
      },
      "preferences": {
        "notifications": true,
        "marketing": false
      },
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

#### POST /customers
Cria novo cliente.

**Body:**
```json
{
  "name": "string",
  "email": "string (email, optional)",
  "phone": "string",
  "address": {
    "street": "string",
    "number": "string",
    "complement": "string (optional)",
    "neighborhood": "string",
    "city": "string",
    "state": "string",
    "zipCode": "string"
  }
}
```

### 📊 Dashboard

#### GET /dashboard/metrics
Obtém métricas gerais do tenant.

**Response 200:**
```json
{
  "totalRevenue": 1250.50,
  "totalOrders": 45,
  "averageTicket": 27.79,
  "delayedOrders": 2,
  "ordersToday": 12,
  "revenueGrowth": 12.5,
  "orderGrowth": 8.3
}
```

#### GET /dashboard/recent-orders
Lista pedidos recentes.

**Query Parameters:**
- `limit` (optional): Número de pedidos (default: 10)

**Response 200:**
```json
[
  {
    "id": "uuid",
    "number": "#1001",
    "customerName": "João Silva",
    "total": 47.00,
    "status": "preparing",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

#### GET /dashboard/sales-chart
Dados para gráfico de vendas.

**Query Parameters:**
- `period` (optional): `7d|30d|90d` (default: 7d)

**Response 200:**
```json
[
  {
    "date": "2024-12-04",
    "revenue": 150.00,
    "orders": 8
  },
  {
    "date": "2024-12-05",
    "revenue": 220.50,
    "orders": 12
  }
]
```

## Códigos de Status

| Código | Descrição |
|--------|-----------|
| 200 | OK - Sucesso |
| 201 | Created - Recurso criado |
| 204 | No Content - Sucesso sem conteúdo |
| 400 | Bad Request - Dados inválidos |
| 401 | Unauthorized - Não autenticado |
| 403 | Forbidden - Sem permissão |
| 404 | Not Found - Recurso não encontrado |
| 409 | Conflict - Conflito (ex: email já existe) |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error - Erro interno |

## Tratamento de Erros

### Formato Padrão
```json
{
  "error": "Mensagem de erro",
  "details": [
    {
      "field": "email",
      "message": "Email é obrigatório"
    }
  ]
}
```

### Erros de Validação (400)
```json
{
  "error": "Dados inválidos",
  "details": [
    {
      "field": "price",
      "message": "Price must be a positive number"
    },
    {
      "field": "name",
      "message": "String must contain at least 1 character(s)"
    }
  ]
}
```

### Erro de Autenticação (401)
```json
{
  "error": "Token não fornecido"
}
```

```json
{
  "error": "Token inválido"
}
```

### Erro de Recurso (404)
```json
{
  "error": "Produto não encontrado"
}
```

### Erro de Conflito (409)
```json
{
  "error": "Email já está em uso"
}
```

## Rate Limiting

- **Limite**: 100 requests por IP a cada 15 minutos
- **Headers de resposta**:
  - `X-RateLimit-Limit`: Limite total
  - `X-RateLimit-Remaining`: Requests restantes
  - `X-RateLimit-Reset`: Timestamp do reset

## Exemplos de Uso

### Fluxo Completo: Login → Listar Produtos → Criar Produto

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}' \
  | jq -r '.token')

# 2. Listar produtos
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/products

# 3. Criar produto
curl -X POST http://localhost:4000/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pizza Calabresa",
    "description": "Pizza com calabresa e cebola",
    "price": 38.90,
    "category": "lanches",
    "image": "https://example.com/pizza.jpg",
    "stock": 20,
    "preparationTime": 20
  }'
```

### Buscar Produtos com Filtros

```bash
# Buscar pizzas ativas
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/products?category=lanches&active=true&search=pizza"
```

### Criar Pedido Completo

```bash
curl -X POST http://localhost:4000/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "550e8400-e29b-41d4-a716-446655440030",
    "items": [
      {
        "productId": "550e8400-e29b-41d4-a716-446655440020",
        "name": "X-Burger Clássico",
        "price": 24.90,
        "quantity": 2,
        "extras": ["Bacon", "Cheddar Extra"]
      }
    ],
    "channel": "website",
    "delivery": {
      "type": "delivery",
      "address": {
        "street": "Rua das Flores",
        "number": "123",
        "neighborhood": "Centro",
        "city": "São Paulo",
        "state": "SP",
        "zipCode": "01234-567"
      },
      "fee": 8.00
    },
    "notes": "Sem cebola no hambúrguer"
  }'
```