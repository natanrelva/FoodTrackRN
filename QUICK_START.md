# 🚀 Guia de Início Rápido - FoodTrack

## ⚡ Setup em 5 Minutos

### 1. Pré-requisitos
```bash
# Verifique se tem tudo instalado
node --version    # >= 18.0.0
pnpm --version    # >= 8.0.0
docker --version  # Qualquer versão recente
```

### 2. Clone e Configure
```bash
# Clone o repositório
git clone <repo-url>
cd foodtrack

# Setup automático (escolha seu sistema)
./scripts/setup.sh              # Linux/macOS
# ou
PowerShell -File scripts/setup.ps1  # Windows
```

### 3. Inicie o Desenvolvimento
```bash
# Inicia todas as aplicações
pnpm dev
```

### 4. Acesse as Aplicações
- **Cliente**: http://localhost:3000
- **Admin**: http://localhost:3001  
- **Cozinha**: http://localhost:3002
- **Entrega**: http://localhost:3003
- **API**: http://localhost:4000
- **Banco**: http://localhost:8082

### 5. Login de Teste
```
Email: test@test.com
Senha: 123456
```

## 🎯 Fluxo de Teste Rápido

1. **Faça login** no Cliente (porta 3000)
2. **Crie um pedido** navegando pelos produtos
3. **Veja o pedido** aparecer na Cozinha (porta 3002)
4. **Atualize o status** na cozinha
5. **Observe** as mudanças em tempo real no Cliente

## 🛠️ Comandos Úteis

```bash
# Desenvolvimento
pnpm dev                 # Todas as apps
pnpm dev:client         # Só cliente
pnpm dev:tenant         # Só admin
pnpm dev:kitchen        # Só cozinha
pnpm dev:delivery       # Só entrega

# Build
pnpm build              # Build completo
pnpm build:types        # Só tipos
pnpm build:shared       # Só backend compartilhado

# Qualidade
pnpm lint               # Linting
pnpm type-check         # Verificar tipos
pnpm test               # Testes

# Database
pnpm migrate            # Rodar migrations
pnpm db:reset           # Reset do banco

# Utilitários
pnpm clean              # Limpar node_modules
pnpm reset              # Reset completo
```

## 🔧 Troubleshooting

### Erro de Porta em Uso
```bash
# Encontre o processo
netstat -tulpn | grep :3000

# Mate o processo
kill -9 <PID>
```

### Docker não Conecta
```bash
# Reinicie os serviços
docker-compose -f docker-compose.dev.yml restart

# Ou reset completo
pnpm db:reset
```

### Erro de Tipos TypeScript
```bash
# Rebuild dos tipos
pnpm build:types
pnpm build:shared

# Verificar erros
pnpm type-check
```

### Dependências Desatualizadas
```bash
# Reinstalar tudo
pnpm clean
pnpm install
pnpm setup
```

## 📚 Próximos Passos

1. **Leia a documentação**: `docs/ARCHITECTURE.md`
2. **Entenda a integração**: `docs/INTEGRATION.md`
3. **Veja a spec técnica**: `docs/TECHNICAL_SPEC.md`
4. **Contribua**: `CONTRIBUTING.md`

## 🆘 Precisa de Ajuda?

- **Documentação completa**: Pasta `docs/`
- **Issues**: GitHub Issues
- **Arquitetura**: `docs/ARCHITECTURE.md`
- **API**: `docs/API.md`

---

**Tempo estimado de setup**: 5-10 minutos  
**Dificuldade**: Iniciante  
**Suporte**: Documentação completa disponível