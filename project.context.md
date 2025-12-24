A seguir está o **refinamento do seu `project.context.md`**, mantendo **100% da sua intenção**, porém com:

* linguagem mais **normativa e estável**
* conceitos mais **congeláveis arquiteturalmente**
* melhor aderência a **DDD, ADRs e Kiro Specs**
* remoção de qualquer ambiguidade futura

O conteúdo abaixo **pode substituir integralmente** o arquivo atual.

---

# **FoodTrack — Project Context**

## **1. Propósito do Documento**

Este documento define o **contexto global, conceitual e estável** do sistema FoodTrack.
Ele estabelece o **vocabulário oficial**, os **limites do domínio** e os **princípios não negociáveis** que orientam todas as decisões arquiteturais, ADRs, especificações (Kiro), backlog técnico e estratégias de teste.

Qualquer alteração estrutural neste documento **DEVE** ser precedida por um **Architecture Decision Record (ADR)** aprovado.

Este documento é a **âncora conceitual do sistema**.

---

## **2. O que é o FoodTrack**

FoodTrack é um **Restaurant Operating System (ROS)** orientado a eventos, projetado para **orquestrar, rastrear e otimizar** o ciclo completo de produção alimentar — desde a intenção comercial do cliente até a entrega do produto final.

O sistema coordena de forma desacoplada e observável:

* Criação e confirmação de pedidos
* Execução operacional da produção em cozinha ou fábrica
* Execução guiada e versionada de receitas
* Consumo real e auditável de insumos
* Previsão e gestão logística de estoque
* Coordenação de entrega

O FoodTrack existe para operar **restaurantes, cozinhas industriais e fábricas de alimentos** que exigem:

* Previsibilidade operacional
* Padronização da execução produtiva
* Rastreabilidade de insumos
* Visibilidade em tempo real do estado do negócio

---

## **3. Problemas que o Sistema Resolve**

O FoodTrack resolve problemas estruturais comuns em operações alimentícias:

* Falta de visibilidade confiável do estado real dos pedidos
* Execução inconsistente de receitas e processos produtivos
* Perdas, desperdícios e uso indevido de insumos
* Estoques reativos, não preditivos
* Forte acoplamento entre pedido, produção e logística

O sistema **não é apenas um aplicativo de pedidos**, mas um **sistema operacional de produção alimentar**, onde o pedido é apenas o gatilho de uma cadeia operacional maior.

---

## **4. Princípios Arquiteturais Fundamentais**

Os princípios abaixo são **fundacionais e não negociáveis**.

### **4.1 Event-Driven Architecture**

* O estado do sistema é consequência da ocorrência de eventos
* Integrações entre contextos acontecem exclusivamente por **eventos canônicos**
* Eventos são fatos imutáveis do domínio

### **4.2 Domain-Driven Design (DDD)**

* O domínio orienta a arquitetura
* Bounded Contexts possuem **autonomia semântica**
* Comunicação entre contextos ocorre por eventos, não por chamadas diretas

### **4.3 Multi-Tenancy por Design**

* Todo dado pertence exatamente a um tenant
* Nenhuma leitura, escrita ou reprocessamento cruza limites de tenant
* O isolamento é garantido desde o domínio até a persistência

### **4.4 Desacoplamento Operacional**

* Pedido não controla produção
* Produção não controla estoque diretamente
* Cada contexto reage a eventos relevantes ao seu domínio

### **4.5 Observabilidade e Auditabilidade**

* Toda ação relevante gera eventos observáveis
* O consumo de insumos é rastreável, auditável e analisável
* O histórico operacional é uma fonte primária de verdade

---

## **5. Bounded Contexts Principais**

### **5.1 Ordering Context**

Responsável por:

* Criação, validação e confirmação de pedidos
* Representação da intenção comercial do cliente
* Gerenciamento do estado comercial do pedido

Não é responsável por:

* Execução da produção
* Consumo de insumos
* Orquestração operacional

---

### **5.2 Kitchen / Factory Operation Context**

Responsável por:

* Execução operacional da produção
* Orquestração de estações de trabalho
* Execução passo a passo de receitas versionadas

Inclui explicitamente o ator de domínio:

* **Operador de Fábrica (OF)**

O Operador de Fábrica executa **processos produtivos reais**, seguindo receitas e instruções operacionais, e não apenas transições de status.

---

### **5.3 Supply (Logística de Insumos) Context**

Responsável por:

* Controle de estoque
* Registro de consumo real de insumos
* Previsão de reposição
* Detecção de desperdício e uso anômalo

O contexto Supply **reage exclusivamente a eventos de consumo**, nunca a comandos diretos da cozinha ou da produção.

---

### **5.4 Delivery Context**

Responsável por:

* Coordenação logística de entregas
* Alocação e gerenciamento de entregadores
* Rastreamento do processo de entrega

---

## **6. Fluxo de Negócio Central (Visão Conceitual)**

1. O cliente cria um pedido
2. O pedido é confirmado comercialmente
3. Um **Contrato de Produção** é criado
4. A cozinha consome o contrato e executa a produção
5. A execução da receita gera eventos de consumo de insumos
6. O Supply registra, audita e analisa o consumo
7. O pedido finalizado segue para entrega

O **Contrato de Produção** é o elo formal, imutável e desacoplado entre pedido e produção.

---

## **7. Conceitos-Chave do Domínio**

* **Pedido**: intenção comercial do cliente
* **Contrato de Produção**: compromisso imutável de produção
* **Receita**: definição versionada de execução produtiva
* **Porção Padrão**: unidade base de consumo de insumos
* **Evento Canônico**: fato de negócio imutável e auditável

---

## **8. O que o Sistema NÃO é (Non-Goals)**

* Não é um ERP genérico
* Não é apenas um aplicativo de delivery
* Não é um sistema de estoque tradicional
* Não executa lógica síncrona cross-context
* Não permite acoplamento direto entre domínios

---

## **9. Relação com ADRs e Specs**

* Este documento define o **contexto**
* ADRs registram e justificam **decisões arquiteturais**
* Specs (Kiro) definem **comportamentos observáveis**
* Backlog técnico deriva diretamente das specs

Nenhuma funcionalidade implementável nasce fora dessa cadeia.

---

## **10. Estado Atual do Projeto**

No estado atual:

* O contexto global do FoodTrack está formalmente definido
* O próximo passo é a consolidação das decisões arquiteturais iniciais

Este documento passa a ser a **referência oficial e estável** do FoodTrack.

---

### 📌 Observação final (importante)

Este `project.context.md` agora está **no nível correto para ser consumido pelo Kiro** como contexto base para:

* geração de ADRs
* criação de specs formais
* validação de código
* testes de invariantes

👉 **Próximo passo recomendado:**
Formalizar o **ADR-001 — Contrato de Produção** com base direta neste contexto.
