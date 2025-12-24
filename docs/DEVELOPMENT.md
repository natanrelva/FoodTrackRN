# 🛠️ Guia de Desenvolvimento - FoodTrack

**Versão:** 1.1  
**Última Atualização:** 23 de Dezembro de 2024

## Configuração do Ambiente

### Pré-requisitos

1. **Node.js 18+**
   ```bash
   # Verificar versão
   node --version
   # Deve retornar v18.x.x ou superior
   ```

2. **pnpm 8+**
   ```bash
   # Instalar pnpm
   npm install -g pnpm
   
   # Verificar versão
   pnpm --version
   ```

3. **Docker & Docker Compose**
   ```bash
   # Verificar Docker
   docker --version
   docker-compose --version
   ```

4. **Git**
   ```bash
   git --version
   ```

### Setup Inicial

```bash
# 1. Clone o repositório
git clone <repo-url>
cd foodtrack

# 2. Instale as dependências
pnpm install

# 3. Configure variáveis de ambiente
cp backend/api-gateway/.env.example backend/api-gateway/.env

# 4. Inicie os serviços Docker
docker-compose -f docker-compose.dev.yml up -d

# 5. Execute as migrations
pnpm migrate

# 6. Build dos pacotes compartilhados
pnpm build:types
pnpm build:shared

# 7. Inicie o desenvolvimento
pnpm dev
```

## Estrutura do Projeto

### Workspace Configuration

O projeto utiliza **pnpm workspaces** para gerenciar o monorepo:

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'frontend/*'
  - 'backend/*'
  - 'admin/*'
```

### Dependências Compartilhadas

```json
{
  "@foodtrack/types": "workspace:*",
  "@foodtrack/backend-shared": "workspace:*"
}
```

## Scripts de Desenvolvimento

### Scripts Principais

```bash
# Desenvolvimento
pnpm dev                    # Inicia todos os serviços
pnpm dev:client            # Frontend cliente
pnpm dev:tenant            # Frontend tenant
pnpm dev:api               # API Gateway

# Build
pnpm build                 # Build completo
pnpm build:types           # Apenas tipos
pnpm build:shared          # Backend compartilhado

# Database
pnpm migrate               # Executar migrations
pnpm db:seed               # Popular com dados de teste

# Qualidade
pnpm lint                  # ESLint
pnpm type-check            # TypeScript check
pnpm test                  # Testes
pnpm test:watch            # Testes em watch mode

# Utilitários
pnpm clean                 # Limpar node_modules
pnpm reset                 # Reset completo
```

### Scripts por Projeto

```bash
# Frontend Client
cd frontend/client
pnpm dev                   # Vite dev server
pnpm build                 # Build para produção
pnpm preview               # Preview do build

# Frontend Tenant
cd frontend/tenant
pnpm dev                   # Vite dev server
pnpm build                 # Build para produção

# API Gateway
cd backend/api-gateway
pnpm dev                   # tsx watch
pnpm build                 # TypeScript build
pnpm start                 # Produção
```

## Padrões de Código

### TypeScript

#### Configuração Base
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

#### Convenções de Tipos
```typescript
// Interfaces: PascalCase
interface UserProfile {
  id: string;
  name: string;
}

// Types: PascalCase
type OrderStatus = 'pending' | 'confirmed';

// Enums: PascalCase
enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  OPERATOR = 'operator'
}

// Variáveis: camelCase
const userProfile: UserProfile = { };

// Constantes: UPPER_SNAKE_CASE
const API_BASE_URL = 'http://localhost:4000';

// Funções: camelCase
function getUserProfile(id: string): UserProfile { }

// Classes: PascalCase
class UserService { }
```

### React Components

#### Estrutura de Componente
```typescript
// components/ProductCard/ProductCard.tsx
import { Product } from '@foodtrack/types';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  className?: string;
}

export function ProductCard({ 
  product, 
  onAddToCart, 
  className 
}: ProductCardProps) {
  return (
    <div className={className}>
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      <button onClick={() => onAddToCart(product)}>
        Adicionar ao Carrinho
      </button>
    </div>
  );
}
```

#### Index File
```typescript
// components/ProductCard/index.ts
export { ProductCard } from './ProductCard';
export type { ProductCardProps } from './ProductCard';
```

#### Hooks Customizados
```typescript
// hooks/useProducts.ts
import { useState, useEffect } from 'react';
import { Product } from '@foodtrack/types';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch products
  }, []);

  return { products, loading, error };
}
```

### Backend Patterns

#### Repository Pattern
```typescript
// repositories/BaseRepository.ts
export abstract class BaseRepository<T> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  abstract findById(id: string, tenantId?: string): Promise<T | null>;
  abstract findAll(tenantId?: string, filters?: any): Promise<T[]>;
  abstract create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  abstract update(id: string, data: Partial<T>, tenantId?: string): Promise<T | null>;
  abstract delete(id: string, tenantId?: string): Promise<boolean>;
}
```

#### Service Pattern
```typescript
// services/ProductService.ts
import { Product } from '@foodtrack/types';
import { ProductRepository } from '../repositories/ProductRepository';

export class ProductService {
  constructor(private productRepository: ProductRepository) {}

  async getProducts(tenantId: string, filters?: any): Promise<Product[]> {
    return this.productRepository.findAll(tenantId, filters);
  }

  async createProduct(tenantId: string, data: CreateProductData): Promise<Product> {
    // Business logic
    return this.productRepository.create({ ...data, tenantId });
  }
}
```

#### Route Handler Pattern
```typescript
// routes/products.ts
import { Router } from 'express';
import { ProductService } from '../services/ProductService';

const router = Router();
const productService = new ProductService();

router.get('/', async (req, res, next) => {
  try {
    const products = await productService.getProducts(req.tenantId!, req.query);
    res.json(products);
  } catch (error) {
    next(error);
  }
});

export default router;
```

## Gerenciamento de Estado

### Frontend State Management

#### Context API (Atual)
```typescript
// contexts/CartContext.tsx
import { createContext, useContext, useReducer } from 'react';
import { CartItem } from '@foodtrack/types';

interface CartState {
  items: CartItem[];
  total: number;
}

type CartAction = 
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'CLEAR_CART' };

const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
} | null>(null);

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
```

#### Zustand (Futuro)
```typescript
// stores/cartStore.ts
import { create } from 'zustand';
import { CartItem } from '@foodtrack/types';

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>((set) => ({
  items: [],
  addItem: (item) => set((state) => ({ 
    items: [...state.items, item] 
  })),
  removeItem: (id) => set((state) => ({ 
    items: state.items.filter(item => item.id !== id) 
  })),
  clearCart: () => set({ items: [] }),
}));
```

## Banco de Dados

### Migrations

#### Criando Nova Migration
```sql
-- backend/migrations/003_add_reviews_table.sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reviews_tenant_id ON reviews(tenant_id);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE TRIGGER update_reviews_updated_at 
    BEFORE UPDATE ON reviews 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

#### Executando Migrations
```bash
# Executar todas as migrations pendentes
pnpm migrate

# Verificar status das migrations
docker exec -it foodtrack-postgres psql -U postgres -d foodtrack -c "SELECT * FROM migrations ORDER BY id;"
```

### Repository Implementation

```typescript
// repositories/ProductRepository.ts
import { Pool } from 'pg';
import { Product, ProductSchema } from '@foodtrack/backend-shared';

export class ProductRepository extends BaseRepository<Product> {
  constructor(private pool: Pool) {
    super('products');
  }

  async findAll(tenantId: string, filters: any = {}): Promise<Product[]> {
    let query = 'SELECT * FROM products WHERE tenant_id = $1';
    const values: any[] = [tenantId];
    let paramIndex = 2;

    // Add filters
    if (filters.category) {
      query += ` AND category = $${paramIndex}`;
      values.push(filters.category);
      paramIndex++;
    }

    if (filters.active !== undefined) {
      query += ` AND active = $${paramIndex}`;
      values.push(filters.active);
      paramIndex++;
    }

    if (filters.search) {
      query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    query += ' ORDER BY name ASC';

    const result = await this.pool.query(query, values);
    return result.rows.map(row => this.mapRowToProduct(row));
  }

  private mapRowToProduct(row: any): Product {
    return ProductSchema.parse({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      image: row.image,
      category: row.category,
      stock: row.stock,
      active: row.active,
      extras: typeof row.extras === 'string' ? JSON.parse(row.extras) : row.extras,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags,
      preparationTime: row.preparation_time,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}
```

## Testes

### Estrutura de Testes

```
src/
├── components/
│   ├── ProductCard/
│   │   ├── ProductCard.tsx
│   │   ├── ProductCard.test.tsx
│   │   └── index.ts
├── hooks/
│   ├── useProducts.ts
│   └── useProducts.test.ts
└── utils/
    ├── api.ts
    └── api.test.ts
```

### Unit Tests (Frontend)

```typescript
// components/ProductCard/ProductCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from './ProductCard';
import { Product } from '@foodtrack/types';

const mockProduct: Product = {
  id: '1',
  name: 'Pizza Margherita',
  description: 'Delicious pizza',
  price: 25.90,
  image: 'https://example.com/pizza.jpg',
  category: 'lanches',
  tenantId: 'tenant-1',
  stock: 10,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ProductCard', () => {
  it('renders product information', () => {
    const onAddToCart = jest.fn();
    
    render(<ProductCard product={mockProduct} onAddToCart={onAddToCart} />);
    
    expect(screen.getByText('Pizza Margherita')).toBeInTheDocument();
    expect(screen.getByText('Delicious pizza')).toBeInTheDocument();
    expect(screen.getByText('R$ 25,90')).toBeInTheDocument();
  });

  it('calls onAddToCart when button is clicked', () => {
    const onAddToCart = jest.fn();
    
    render(<ProductCard product={mockProduct} onAddToCart={onAddToCart} />);
    
    fireEvent.click(screen.getByText('Adicionar ao Carrinho'));
    
    expect(onAddToCart).toHaveBeenCalledWith(mockProduct);
  });
});
```

### Integration Tests (Backend)

```typescript
// routes/products.test.ts
import request from 'supertest';
import app from '../app';
import { ProductRepository } from '../repositories/ProductRepository';

jest.mock('../repositories/ProductRepository');

describe('Products API', () => {
  let authToken: string;

  beforeEach(async () => {
    // Setup auth token
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@test.com',
        password: '123456'
      });
    
    authToken = response.body.token;
  });

  describe('GET /api/products', () => {
    it('returns products for authenticated user', async () => {
      const mockProducts = [
        { id: '1', name: 'Pizza', price: 25.90 }
      ];

      (ProductRepository.prototype.findAll as jest.Mock)
        .mockResolvedValue(mockProducts);

      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual(mockProducts);
    });

    it('returns 401 without auth token', async () => {
      await request(app)
        .get('/api/products')
        .expect(401);
    });
  });
});
```

### E2E Tests

```typescript
// e2e/product-management.test.ts
import { test, expect } from '@playwright/test';

test.describe('Product Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@test.com');
    await page.fill('[data-testid=password]', '123456');
    await page.click('[data-testid=login-button]');
    
    // Wait for dashboard
    await expect(page.locator('[data-testid=dashboard]')).toBeVisible();
  });

  test('should create a new product', async ({ page }) => {
    // Navigate to products
    await page.click('[data-testid=products-menu]');
    
    // Click create product
    await page.click('[data-testid=create-product-button]');
    
    // Fill form
    await page.fill('[data-testid=product-name]', 'New Pizza');
    await page.fill('[data-testid=product-description]', 'Delicious new pizza');
    await page.fill('[data-testid=product-price]', '29.90');
    
    // Submit
    await page.click('[data-testid=submit-button]');
    
    // Verify success
    await expect(page.locator('[data-testid=success-message]')).toBeVisible();
    await expect(page.locator('text=New Pizza')).toBeVisible();
  });
});
```

## Debugging

### Frontend Debugging

#### React DevTools
```bash
# Instalar extensão do navegador
# Chrome: React Developer Tools
# Firefox: React Developer Tools
```

#### Console Debugging
```typescript
// Debugging hooks
function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  
  useEffect(() => {
    console.log('Products updated:', products);
  }, [products]);
  
  return products;
}

// Debugging components
function ProductCard({ product }: ProductCardProps) {
  console.log('Rendering ProductCard:', product);
  
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
}
```

### Backend Debugging

#### VS Code Launch Configuration
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug API Gateway",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/backend/api-gateway/src/index.ts",
      "outFiles": ["${workspaceFolder}/backend/api-gateway/dist/**/*.js"],
      "runtimeArgs": ["-r", "tsx/cjs"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

#### Logging
```typescript
// utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

// Usage
logger.info('User login', { 
  userId: user.id, 
  tenantId: user.tenantId 
});

logger.error('Database error', { 
  error: error.message, 
  stack: error.stack 
});
```

## Performance

### Frontend Performance

#### Code Splitting
```typescript
// Lazy loading components
import { lazy, Suspense } from 'react';

const ProductManagement = lazy(() => import('./components/ProductManagement'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductManagement />
    </Suspense>
  );
}
```

#### Memoization
```typescript
import { memo, useMemo, useCallback } from 'react';

// Memoized component
const ProductCard = memo(({ product, onAddToCart }: ProductCardProps) => {
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
});

// Memoized values
function ProductList({ products }: ProductListProps) {
  const sortedProducts = useMemo(() => {
    return products.sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const handleAddToCart = useCallback((product: Product) => {
    // Add to cart logic
  }, []);

  return (
    <div>
      {sortedProducts.map(product => (
        <ProductCard 
          key={product.id} 
          product={product} 
          onAddToCart={handleAddToCart} 
        />
      ))}
    </div>
  );
}
```

### Backend Performance

#### Database Optimization
```sql
-- Indexes para queries frequentes
CREATE INDEX idx_products_tenant_category ON products(tenant_id, category);
CREATE INDEX idx_orders_tenant_status ON orders(tenant_id, status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Query optimization
EXPLAIN ANALYZE SELECT * FROM products 
WHERE tenant_id = $1 AND category = $2 AND active = true;
```

#### Caching
```typescript
// Redis caching
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export class ProductService {
  async getProducts(tenantId: string): Promise<Product[]> {
    const cacheKey = `products:${tenantId}`;
    
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Fetch from database
    const products = await this.productRepository.findAll(tenantId);
    
    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(products));
    
    return products;
  }
}
```

## Troubleshooting

### Problemas Comuns

#### 1. Erro de Módulo não Encontrado
```bash
# Limpar node_modules e reinstalar
pnpm clean
pnpm install

# Rebuild dos pacotes
pnpm build:types
pnpm build:shared
```

#### 2. Erro de Porta em Uso
```bash
# Verificar processos na porta
netstat -ano | findstr :3000

# Matar processo (Windows)
taskkill /PID <PID> /F

# Matar processo (Linux/Mac)
kill -9 <PID>
```

#### 3. Erro de Banco de Dados
```bash
# Verificar se PostgreSQL está rodando
docker-compose -f docker-compose.dev.yml ps

# Reiniciar serviços
docker-compose -f docker-compose.dev.yml restart postgres

# Ver logs do banco
docker-compose -f docker-compose.dev.yml logs postgres
```

#### 4. Erro de Tipos TypeScript
```bash
# Verificar tipos
pnpm type-check

# Rebuild tipos
pnpm build:types

# Verificar imports
# Certifique-se de importar de '@foodtrack/types'
```

### Logs e Monitoramento

#### Verificar Logs da API
```bash
# Logs em tempo real
docker-compose -f docker-compose.dev.yml logs -f api-gateway

# Logs do banco
docker-compose -f docker-compose.dev.yml logs postgres
```

#### Health Checks
```bash
# API Gateway
curl http://localhost:4000/health

# Banco de dados
docker exec -it foodtrack-postgres pg_isready -U postgres
```

## Contribuição

### Workflow de Desenvolvimento

1. **Criar branch**
   ```bash
   git checkout -b feature/nova-funcionalidade
   ```

2. **Desenvolver**
   ```bash
   # Fazer mudanças
   # Testar localmente
   pnpm test
   pnpm type-check
   ```

3. **Commit**
   ```bash
   git add .
   git commit -m "feat: adiciona nova funcionalidade"
   ```

4. **Push e PR**
   ```bash
   git push origin feature/nova-funcionalidade
   # Criar Pull Request no GitHub
   ```

### Code Review Checklist

- [ ] Todos os testes passando
- [ ] TypeScript sem erros
- [ ] Documentação atualizada
- [ ] Performance considerada
- [ ] Segurança verificada
- [ ] Acessibilidade testada