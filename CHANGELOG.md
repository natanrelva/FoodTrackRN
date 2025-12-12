# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2025-12-12

### Adicionado
- **Arquitetura Integrada**: Sistema completo com 4 aplicações frontend coordenadas
- **Cliente Web** (porta 3000): Interface para clientes fazerem pedidos
- **Dashboard Tenant** (porta 3001): Painel administrativo para restaurantes
- **Kitchen App** (porta 3002): Interface para cozinha com WebSocket em tempo real
- **Delivery App** (porta 3003): Interface para entregadores
- **API Gateway** (porta 4000): Backend integrado com Socket.IO
- **Comunicação em Tempo Real**: WebSocket entre todas as aplicações
- **Autenticação Unificada**: JWT compartilhado entre aplicações
- **Tipos TypeScript Compartilhados**: Package `@foodtrack/types`
- **Scripts de Setup Automatizado**: Para Linux/macOS e Windows
- **Documentação Completa**: Arquitetura, integração e especificação técnica

### Alterado
- **Estrutura do Projeto**: Reorganizada para monorepo integrado
- **README.md**: Atualizado com nova arquitetura e instruções
- **Documentação**: Completamente reescrita para refletir sistema integrado
- **Package.json**: Scripts atualizados para aplicações existentes

### Removido
- **Arquivos Temporários**: 15 arquivos de documentação temporária
- **Diretórios Vazios**: 5 diretórios de microserviços não implementados
- **Código Duplicado**: Limpeza de imports e dependências desnecessárias

### Corrigido
- **Estrutura de Tipos**: Organização dos tipos TypeScript
- **Configuração do Workspace**: pnpm workspace otimizado
- **Scripts de Build**: Dependências corretas entre packages

### Documentação
- **docs/ARCHITECTURE.md**: Arquitetura do sistema integrado
- **docs/INTEGRATION.md**: Guia de integração entre aplicações
- **docs/TECHNICAL_SPEC.md**: Especificação técnica detalhada
- **docs/API.md**: Documentação da API atualizada
- **docs/DEVELOPMENT.md**: Guia de desenvolvimento
- **docs/DEPLOYMENT.md**: Guia de deploy
- **CONTRIBUTING.md**: Guia de contribuição atualizado

### Infraestrutura
- **Docker Compose**: Configuração para desenvolvimento
- **Scripts de Setup**: Automação completa de configuração
- **CI/CD**: Preparação para pipelines automatizados

## [0.1.0] - 2025-12-01

### Adicionado
- Estrutura inicial do projeto
- Configuração básica do monorepo
- Aplicações frontend básicas
- API Gateway inicial

---

## Tipos de Mudanças

- `Adicionado` para novas funcionalidades
- `Alterado` para mudanças em funcionalidades existentes
- `Descontinuado` para funcionalidades que serão removidas
- `Removido` para funcionalidades removidas
- `Corrigido` para correções de bugs
- `Segurança` para vulnerabilidades corrigidas