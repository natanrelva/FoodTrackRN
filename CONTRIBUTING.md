# 🤝 Guia de Contribuição - FoodTrack

Obrigado por considerar contribuir com o FoodTrack! Este documento fornece diretrizes para contribuições.

## 📋 Índice

- [Código de Conduta](#código-de-conduta)
- [Como Contribuir](#como-contribuir)
- [Configuração do Ambiente](#configuração-do-ambiente)
- [Padrões de Desenvolvimento](#padrões-de-desenvolvimento)
- [Processo de Pull Request](#processo-de-pull-request)
- [Reportar Bugs](#reportar-bugs)
- [Sugerir Funcionalidades](#sugerir-funcionalidades)

## Código de Conduta

Este projeto adere ao [Código de Conduta do Contributor Covenant](https://www.contributor-covenant.org/). Ao participar, você deve seguir este código.

## Como Contribuir

### Tipos de Contribuição

Aceitamos vários tipos de contribuições:

- 🐛 **Correção de bugs**
- ✨ **Novas funcionalidades**
- 📚 **Melhorias na documentação**
- 🧪 **Testes**
- 🎨 **Melhorias de UI/UX**
- ⚡ **Otimizações de performance**
- 🔒 **Melhorias de segurança**

### Antes de Começar

1. **Verifique issues existentes** para evitar trabalho duplicado
2. **Discuta mudanças grandes** criando uma issue primeiro
3. **Fork o repositório** para sua conta
4. **Configure o ambiente** seguindo o guia abaixo

## Configuração do Ambiente

### Pré-requisitos

- Node.js 18+
- pnpm 8+
- Docker & Docker Compose
- Git

### Setup

```bash
# 1. Fork e clone seu fork
git clone https://github.com/SEU-USUARIO/foodtrack.git
cd foodtrack

# 2. Adicione o repositório original como upstream
git remote add upstream https://github.com/ORIGINAL-OWNER/foodtrack.git

# 3. Execute o setup automático
chmod +x scripts/setup.sh
./scripts/setup.sh

# 4. Verifique se tudo está funcionando
pnpm test
```

## Padrões de Desenvolvimento

### Estrutura de Branch

```
main                    # Branch principal (produção)
├── develop            # Branch de desenvolvimento
├── feature/nome       # Novas funcionalidades
├── bugfix/nome        # Correções de bugs
├── hotfix/nome        # Correções urgentes
└── docs/nome          # Melhorias na documentação
```

### Convenções de Nomenclatura

#### Branches
```bash
feature/add-user-authentication
bugfix/fix-login-validation
hotfix/security-patch
docs/update-api-documentation
```

#### Commits
Seguimos o padrão [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: adiciona autenticação de usuário
fix: corrige validação de login
docs: atualiza documentação da API
style: formata código com prettier
refactor: refatora componente ProductCard
test: adiciona testes para UserService
chore: atualiza dependências
```

**Tipos de commit:**
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Documentação
- `style`: Formatação (não afeta lógica)
- `refactor`: Refatoração de código
- `test`: Testes
- `chore`: Tarefas de manutenção
- `perf`: Melhorias de performance
- `ci`: Mudanças no CI/CD

### Padrões de Código

#### TypeScript

```typescript
// ✅ Bom
interface UserProfile {
  id: string;
  name: string;
  email: string;
}

function getUserProfile(userId: string): Promise<UserProfile> {
  // implementação
}

// ❌ Evitar
function getUser(id: any): any {
  // implementação
}
```

#### React Components

```typescript
// ✅ Bom
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
    <div className={cn('product-card', className)}>
      {/* JSX */}
    </div>
  );
}

// ❌ Evitar
export function ProductCard(props: any) {
  return <div>{/* JSX */}</div>;
}
```

#### Backend Routes

```typescript
// ✅ Bom
router.get('/', async (req, res, next) => {
  try {
    const products = await productService.getProducts(req.tenantId!);
    res.json(products);
  } catch (error) {
    next(error);
  }
});

// ❌ Evitar
router.get('/', (req, res) => {
  // sem tratamento de erro
  const products = getProducts();
  res.json(products);
});
```

### Testes

#### Estrutura de Testes

```typescript
// components/ProductCard/ProductCard.test.tsx
describe('ProductCard', () => {
  const mockProduct: Product = {
    id: '1',
    name: 'Test Product',
    // ... outros campos
  };

  it('should render product name', () => {
    render(<ProductCard product={mockProduct} onAddToCart={jest.fn()} />);
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });

  it('should call onAddToCart when button is clicked', () => {
    const onAddToCart = jest.fn();
    render(<ProductCard product={mockProduct} onAddToCart={onAddToCart} />);
    
    fireEvent.click(screen.getByRole('button', { name: /adicionar/i }));
    
    expect(onAddToCart).toHaveBeenCalledWith(mockProduct);
  });
});
```

#### Cobertura de Testes

- **Mínimo**: 80% de cobertura
- **Componentes**: Testar props, eventos e estados
- **Services**: Testar lógica de negócio
- **APIs**: Testar endpoints e validações

### Documentação

#### Comentários no Código

```typescript
/**
 * Calcula o preço total do carrinho incluindo taxas e descontos
 * @param items - Itens do carrinho
 * @param deliveryFee - Taxa de entrega
 * @param discount - Desconto aplicado (0-1)
 * @returns Preço total calculado
 */
function calculateTotal(
  items: CartItem[], 
  deliveryFee: number, 
  discount: number
): number {
  // implementação
}
```

#### README de Componentes

```markdown
# ProductCard

Componente para exibir informações de um produto.

## Props

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| product | Product | Sim | Dados do produto |
| onAddToCart | Function | Sim | Callback ao adicionar ao carrinho |
| className | string | Não | Classes CSS adicionais |

## Exemplo

\`\`\`tsx
<ProductCard 
  product={product} 
  onAddToCart={handleAddToCart}
  className="custom-class"
/>
\`\`\`
```

## Processo de Pull Request

### 1. Preparação

```bash
# Sincronizar com upstream
git fetch upstream
git checkout main
git merge upstream/main

# Criar branch para sua feature
git checkout -b feature/minha-funcionalidade
```

### 2. Desenvolvimento

```bash
# Fazer mudanças
# Adicionar testes
# Atualizar documentação

# Verificar qualidade do código
pnpm lint
pnpm type-check
pnpm test

# Commit das mudanças
git add .
git commit -m "feat: adiciona nova funcionalidade"
```

### 3. Submissão

```bash
# Push para seu fork
git push origin feature/minha-funcionalidade

# Criar Pull Request no GitHub
```

### 4. Template de Pull Request

```markdown
## Descrição

Breve descrição das mudanças realizadas.

## Tipo de Mudança

- [ ] Bug fix (mudança que corrige um problema)
- [ ] Nova funcionalidade (mudança que adiciona funcionalidade)
- [ ] Breaking change (mudança que quebra compatibilidade)
- [ ] Documentação (mudança apenas na documentação)

## Como Testar

1. Passo 1
2. Passo 2
3. Passo 3

## Checklist

- [ ] Meu código segue os padrões do projeto
- [ ] Realizei self-review do código
- [ ] Comentei código complexo
- [ ] Adicionei testes que provam que a correção/funcionalidade funciona
- [ ] Testes novos e existentes passam
- [ ] Atualizei a documentação se necessário

## Screenshots (se aplicável)

Adicione screenshots para mudanças visuais.
```

### 5. Review Process

1. **Automated Checks**: CI/CD executa testes e linting
2. **Code Review**: Maintainers revisam o código
3. **Feedback**: Discussão e possíveis mudanças
4. **Approval**: PR aprovado e merged

## Reportar Bugs

### Template de Bug Report

```markdown
**Descrição do Bug**
Descrição clara e concisa do bug.

**Para Reproduzir**
Passos para reproduzir o comportamento:
1. Vá para '...'
2. Clique em '....'
3. Role para baixo até '....'
4. Veja o erro

**Comportamento Esperado**
Descrição clara do que deveria acontecer.

**Screenshots**
Se aplicável, adicione screenshots.

**Ambiente:**
 - OS: [e.g. Windows, macOS, Linux]
 - Browser: [e.g. Chrome, Safari]
 - Versão: [e.g. 22]
 - Node.js: [e.g. 18.17.0]

**Contexto Adicional**
Qualquer outro contexto sobre o problema.
```

## Sugerir Funcionalidades

### Template de Feature Request

```markdown
**A funcionalidade está relacionada a um problema?**
Descrição clara do problema. Ex: Estou sempre frustrado quando [...]

**Descreva a solução que você gostaria**
Descrição clara e concisa do que você quer que aconteça.

**Descreva alternativas consideradas**
Descrição de soluções ou funcionalidades alternativas consideradas.

**Contexto Adicional**
Qualquer outro contexto ou screenshots sobre a funcionalidade.
```

## Diretrizes Específicas

### Frontend (React)

- Use **TypeScript** sempre
- Siga os **React Hooks** patterns
- Use **Tailwind CSS** para estilos
- Implemente **acessibilidade** (ARIA labels, etc.)
- Otimize para **performance** (memo, useMemo, etc.)

### Backend (Node.js)

- Use **TypeScript** sempre
- Implemente **validação** com Zod
- Siga padrões **REST** para APIs
- Implemente **logging** adequado
- Considere **segurança** sempre

### Database

- Use **migrations** para mudanças no schema
- Adicione **indexes** para queries frequentes
- Considere **performance** das queries
- Mantenha **integridade referencial**

## Recursos Úteis

### Documentação
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Express.js Guide](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

### Ferramentas
- [VS Code](https://code.visualstudio.com/) - Editor recomendado
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Postman](https://www.postman.com/) - Testar APIs
- [pgAdmin](https://www.pgadmin.org/) - Gerenciar PostgreSQL

### Extensões VS Code Recomendadas
- TypeScript and JavaScript Language Features
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint
- Auto Rename Tag
- Bracket Pair Colorizer
- GitLens

## Reconhecimento

Contribuidores são reconhecidos no README.md e releases. Obrigado por ajudar a tornar o FoodTrack melhor! 🎉

## Dúvidas?

- 📧 Email: dev@foodtrack.com
- 💬 Discord: [Servidor da Comunidade](https://discord.gg/foodtrack)
- 📋 Issues: [GitHub Issues](https://github.com/seu-usuario/foodtrack/issues)

---

**Lembre-se**: Toda contribuição, por menor que seja, é valiosa! 🚀