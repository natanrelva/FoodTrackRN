# Índice da Documentação FoodTrack

**Versão:** 1.1  
**Última Atualização:** 23 de Dezembro de 2024  
**Status:** 🏗️ Arquitetura V1.0 Congelada - Fase de Implementação  

## **📋 Navegação Rápida**

### **🎯 Para Começar**
- **[README.md](../README.md)** - Estado global atual e jornada de descoberta
- **[COM.md](../COM.md)** - Blueprint completo + Arquitetura V1.0 Congelada
- **[SYSTEM_INTEGRATION.md](../.kiro/specs/SYSTEM_INTEGRATION.md)** - Como todas as specs se integram

### **🏗️ Arquitetura e Decisões**
- **[ADR-001: Contrato de Produção](./ADR-001-Contrato-de-Producao.md)** - Desacoplamento Ordering ↔ Kitchen
- **ADR-002: Recipe Aggregate** *(Próximo)*
- **ADR-003: Event Sourcing** *(Planejado)*

### **📋 Specs por Bounded Context**

#### **Fundação (Prioridade 1)**
- **[Mock to Real API Migration](../.kiro/specs/mock-to-real-api-migration/requirements.md)** - Substituição de dados mockados por APIs reais
- **[Event-Driven Architecture](../.kiro/specs/event-driven-architecture/requirements.md)** - Infraestrutura de eventos
- **[Multi-Tenancy](../.kiro/specs/multi-tenancy/requirements.md)** - Isolamento por restaurante
- **[API Gateway](../.kiro/specs/api-gateway/requirements.md)** - Ponto de entrada único

#### **Core Business (Prioridade 2)**
- **[Ordering Context](../.kiro/specs/ordering/requirements.md)** - Ciclo de vida do pedido
- **[WebSocket Real-time](../.kiro/specs/websocket-realtime/requirements.md)** - Comunicação instantânea

#### **Operações (Prioridade 3)**
- **[Kitchen Context](../.kiro/specs/kitchen/requirements.md)** - Operação da cozinha
- **[Supply Context](../.kiro/specs/supply/requirements.md)** - Gestão de estoque

#### **Logística (Prioridade 4)**
- **[Delivery Context](../.kiro/specs/delivery/requirements.md)** - Coordenação de entregas

#### **Inteligência (Prioridade 5)**
- **[Analytics & Monitoring](../.kiro/specs/analytics-monitoring/requirements.md)** - Métricas e observabilidade

### **🖥️ Frontends**
- **[Client Frontend](../.kiro/specs/client-frontend/requirements.md)** - Interface do cliente
- **[Tenant Frontend](../.kiro/specs/tenant-frontend/requirements.md)** - Dashboard do restaurante

## **📊 Status de Implementação**

### **Legenda**
- ✅ **Completo** - Implementado e testado
- 🏗️ **Em Desenvolvimento** - Sendo implementado
- 📋 **Especificado** - Documentado, pronto para implementação
- ⏳ **Planejado** - Na roadmap, aguardando priorização
- ❌ **Bloqueado** - Dependente de outras implementações

### **Matriz de Status**

| Componente | Spec | Design | Implementação | Testes | Status |
|------------|------|--------|---------------|--------|--------|
| **Mock to Real API Migration** | ✅ | ✅ | ❌ | ❌ | 📋 Pronto |
| **Event-Driven Architecture** | ✅ | ✅ | ❌ | ❌ | 📋 Pronto |
| **Multi-Tenancy** | ✅ | ✅ | ❌ | ❌ | 📋 Pronto |
| **API Gateway** | ✅ | ✅ | 🏗️ | ❌ | 🏗️ Parcial |
| **Ordering Context** | ✅ | ✅ | 🏗️ | ❌ | 🏗️ Mockado |
| **Kitchen Context** | ✅ | ✅ | 🏗️ | ❌ | 🏗️ Mockado |
| **Supply Context** | ✅ | ✅ | ❌ | ❌ | 📋 Pronto |
| **Delivery Context** | ✅ | ✅ | ❌ | ❌ | 📋 Pronto |
| **WebSocket Real-time** | ✅ | ✅ | ❌ | ❌ | 📋 Pronto |
| **Analytics & Monitoring** | ✅ | ✅ | ❌ | ❌ | 📋 Pronto |
| **Client Frontend** | ✅ | ✅ | 🏗️ | ❌ | 🏗️ Mockado |
| **Tenant Frontend** | ✅ | ✅ | 🏗️ | ❌ | 🏗️ Mockado |

## **🎯 Roadmap de Implementação**

### **Sprint 1-2: Fundação (Semanas 1-4)**
- [ ] Mock to Real API Migration
- [ ] Event-Driven Architecture
- [ ] Multi-Tenancy
- [ ] API Gateway base

### **Sprint 3-4: Core Business (Semanas 5-8)**
- [ ] Ordering Context com Production Contract
- [ ] WebSocket Real-time

### **Sprint 5-6: Operações (Semanas 9-12)**
- [ ] Kitchen Context
- [ ] Supply Context

### **Sprint 7-8: Logística (Semanas 13-16)**
- [ ] Delivery Context

### **Sprint 9-10: Inteligência (Semanas 17-20)**
- [ ] Analytics & Monitoring

### **Sprint 11-12: Frontends (Semanas 21-24)**
- [ ] Migração de dados mockados
- [ ] Integração completa

## **📚 Guias de Uso**

### **Para Desenvolvedores**
1. **Comece pelo README.md** para entender o contexto
2. **Leia COM.md** para visão arquitetural completa
3. **Consulte ADRs** para decisões já tomadas
4. **Escolha uma Spec** baseada na prioridade
5. **Implemente seguindo** Requirements → Design → Tasks

### **Para Arquitetos**
1. **Revise Arquitetura V1.0** no COM.md
2. **Consulte ADRs existentes** antes de mudanças
3. **Crie novos ADRs** para decisões estruturais
4. **Valide specs** contra princípios congelados

### **Para Product Owners**
1. **Use roadmap** para priorização
2. **Acompanhe status** na matriz de implementação
3. **Valide funcionalidades** contra specs
4. **Defina critérios** de aceite baseados em requirements

## **🔄 Processo de Atualização**

### **Regras de Evolução**
1. **README.md**: Atualizar a cada descoberta significativa
2. **COM.md**: Apenas via ADR (arquitetura congelada)
3. **Specs**: Atualizar conforme necessidades funcionais
4. **ADRs**: Criar para decisões arquiteturais importantes
5. **INDEX.md**: Manter sincronizado com mudanças

### **Responsabilidades**
- **Tech Lead**: Manter README.md e INDEX.md atualizados
- **Arquiteto**: Gerenciar ADRs e validar mudanças no COM.md
- **Desenvolvedores**: Atualizar specs durante implementação
- **Product Owner**: Validar requirements e critérios de aceite

## **📞 Contatos e Responsáveis**

| Área | Responsável | Documentos |
|------|-------------|------------|
| **Arquitetura Geral** | Arquiteto de Sistema | COM.md, ADRs |
| **Implementação** | Tech Lead | Specs, README.md |
| **Produto** | Product Owner | Requirements, Critérios |
| **Documentação** | Tech Writer | INDEX.md, Guias |

---

**Este índice é atualizado automaticamente a cada mudança significativa na documentação.**