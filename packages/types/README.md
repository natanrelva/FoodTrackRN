# @foodtrack/types

Pacote compartilhado de tipos TypeScript para as aplicações FoodTrack.

## Instalação

```bash
npm install @foodtrack/types
# ou
yarn add @foodtrack/types
# ou
pnpm add @foodtrack/types
```

## Uso

```typescript
import { Product, Order, CartItem, AdminScreen, WebScreen } from '@foodtrack/types';
```

## Tipos Disponíveis

### Produtos
- `Product` - Interface unificada para produtos
- `ProductCategory` - Categorias de produtos
- `ProductExtra` - Extras/adicionais de produtos
- `Category` - Definição de categoria

### Pedidos e Carrinho
- `Order` - Pedido completo (Admin)
- `OrderItem` - Item de pedido
- `CartItem` - Item do carrinho (Web)
- `Customer` - Informações do cliente
- `Payment` - Informações de pagamento
- `Transaction` - Transação financeira
- `Notification` - Notificação

### Status
- `AdminOrderStatus` - Status de pedidos no Admin
- `WebOrderStatus` - Status de pedidos no Web
- `PaymentMethod` - Métodos de pagamento
- `PaymentStatus` - Status de pagamento
- `ChannelType` - Tipos de canal de venda

### Navegação
- `AdminScreen` - Telas do Admin
- `WebScreen` - Telas do Web

### Componentes
- `SidebarProps` - Props do Sidebar
- `DashboardProps` - Props do Dashboard
- `ProductCardProps` - Props do Card de Produto
- `CartContextType` - Tipo do contexto do carrinho
- E muitos outros...

### Admin Específico
- `User` - Usuário do sistema
- `Channel` - Canal de integração
- `MessageLog` - Log de mensagens

## Estrutura

```
src/
├── product.ts      # Tipos relacionados a produtos
├── order.ts        # Tipos de pedidos e carrinho
├── status.ts       # Tipos de status
├── navigation.ts   # Tipos de navegação
├── components.ts   # Props de componentes
├── admin.ts        # Tipos específicos do Admin
└── index.ts        # Exportações principais
```

## Desenvolvimento

```bash
# Build
npm run build

# Watch mode
npm run dev
```

## Versionamento

Este pacote segue o [Semantic Versioning](https://semver.org/).