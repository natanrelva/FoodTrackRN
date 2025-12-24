# ADR-001: Production Contract as Formal Boundary Between Ordering and Kitchen

**Versão:** 1.1  
**Última Atualização:** 23 de Dezembro de 2024

## Status
**ACCEPTED** - December 23, 2024

## Context

In the FoodTrack Restaurant Operating System, we identified a critical architectural coupling problem between the **Ordering** and **Kitchen** bounded contexts. The current implementation violates Domain-Driven Design principles by having the Kitchen context directly consume complete `Order` objects from the Ordering context.

### Problem Statement

1. **Strong Coupling**: Kitchen requires knowledge of the complete Order structure, including commercial data irrelevant to production
2. **Bounded Context Violation**: Kitchen context is forced to understand commercial concepts outside its domain responsibility
3. **Evolution Difficulty**: Changes to Order structure directly impact Kitchen implementation
4. **Mixed Responsibilities**: Kitchen handles commercial data that should remain in the Ordering domain
5. **Testing Complexity**: Kitchen tests depend on complex Order structures, making unit testing difficult

### Current Problematic Flow

```
Order.confirm() → Kitchen receives complete Order object → Kitchen extracts production data
```

This creates tight coupling where Kitchen must understand:
- Customer information
- Payment details
- Commercial pricing
- Marketing metadata
- Order lifecycle states unrelated to production

## Decision

We will implement the **Production Contract Pattern** as a formal, immutable boundary between Ordering and Kitchen contexts.

### Core Decision Points

**The Kitchen context will NEVER directly consume Order objects.** Instead, when an Order is confirmed, the Ordering context will generate a **Production Contract** containing only production-relevant information translated into Kitchen domain language.

## Alternatives Considered

### Alternative 1: Direct Order Sharing (Current - REJECTED)
- **Approach**: Kitchen directly consumes Order objects
- **Rejected Because**: 
  - Violates bounded context isolation
  - Creates unnecessary coupling
  - Mixes commercial and production concerns
  - Makes independent evolution impossible

### Alternative 2: Shared Order Interface (REJECTED)
- **Approach**: Create a shared interface that both contexts implement
- **Rejected Because**:
  - Still couples contexts through shared contracts
  - Doesn't solve the semantic boundary problem
  - Limits independent evolution of domain models

### Alternative 3: Direct API Calls (REJECTED)
- **Approach**: Kitchen makes synchronous calls to Ordering for needed data
- **Rejected Because**:
  - Creates runtime coupling and availability dependencies
  - Violates event-driven architecture principles
  - Introduces network failure points in production workflow

### Alternative 4: Production Contract (SELECTED)
- **Approach**: Ordering generates immutable Production Contracts for Kitchen consumption
- **Selected Because**:
  - Maintains complete bounded context isolation
  - Enables independent evolution of both contexts
  - Provides clear semantic boundary between commercial and production domains
  - Supports event-driven architecture principles
  - Enables comprehensive auditability

## Implementation

### Production Contract Structure

```typescript
interface ProductionContract {
  contractId: string;
  tenantId: string;
  orderId: string; // Reference for traceability only
  
  // Production-specific data (no commercial concepts)
  items: ProductionItem[];
  priority: ProductionPriority;
  specialInstructions: string[];
  estimatedCompletionTime: Date;
  
  // Contract metadata
  createdAt: Date;
  version: number;
}

interface ProductionItem {
  productionItemId: string;
  recipeId: string;
  recipeVersion: number;
  quantity: number;
  modifications: string[];
  allergenAlerts: AllergenInfo[];
}
```

### Event Flow

```typescript
// Ordering Context emits
interface ProductionContractCreated extends DomainEvent {
  eventType: 'ProductionContractCreated';
  payload: {
    contractId: string;
    orderId: string;
    tenantId: string;
    contract: ProductionContract;
  };
}

// Kitchen Context consumes and responds
interface ProductionContractReceived extends DomainEvent {
  eventType: 'ProductionContractReceived';
  payload: {
    contractId: string;
    kitchenOrderId: string;
    tenantId: string;
  };
}
```

### Ordering Context Implementation

```typescript
export class Order {
  confirm(): DomainEvent[] {
    this._status = 'confirmed';
    
    const productionContract = this.generateProductionContract();
    
    return [
      new OrderConfirmedEvent({
        orderId: this.id,
        tenantId: this.tenantId
      }),
      new ProductionContractCreatedEvent({
        contractId: productionContract.contractId,
        orderId: this.id,
        tenantId: this.tenantId,
        contract: productionContract
      })
    ];
  }

  private generateProductionContract(): ProductionContract {
    return {
      contractId: generateUUID(),
      tenantId: this.tenantId,
      orderId: this.id,
      items: this._items.map(item => ({
        productionItemId: generateUUID(),
        recipeId: item.product.recipeId,
        recipeVersion: item.product.recipeVersion,
        quantity: item.quantity,
        modifications: item.modifications,
        allergenAlerts: item.product.allergens
      })),
      priority: this.calculateProductionPriority(),
      specialInstructions: this.extractProductionInstructions(),
      estimatedCompletionTime: this.calculateEstimatedTime(),
      createdAt: new Date(),
      version: 1
    };
  }
}
```

### Kitchen Context Implementation

```typescript
export class KitchenService {
  async handleProductionContractCreated(event: ProductionContractCreatedEvent): Promise<void> {
    const { contract } = event.payload;
    
    const kitchenOrder = new KitchenOrder({
      id: generateUUID(),
      contractId: contract.contractId,
      tenantId: contract.tenantId,
      items: contract.items.map(item => this.createKitchenOrderItem(item)),
      priority: contract.priority,
      specialInstructions: contract.specialInstructions,
      status: 'pending'
    });
    
    await this.kitchenOrderRepository.save(kitchenOrder);
    await this.assignToOptimalStation(kitchenOrder);
    
    await this.eventBus.publish([
      new ProductionContractReceivedEvent({
        contractId: contract.contractId,
        kitchenOrderId: kitchenOrder.id,
        tenantId: contract.tenantId
      })
    ]);
  }
}
```

## Consequences

### Positive Consequences

- **✅ Complete Bounded Context Isolation**: Kitchen and Ordering can evolve independently
- **✅ Clear Semantic Boundaries**: Production Contract uses Kitchen domain language exclusively
- **✅ Enhanced Testability**: Kitchen tests use lightweight Production Contracts instead of complex Orders
- **✅ Improved Auditability**: Complete traceability between commercial orders and production execution
- **✅ Event-Driven Compliance**: Maintains asynchronous, event-driven architecture principles
- **✅ Multi-tenant Safety**: Production Contracts automatically include tenant isolation

### Negative Consequences

- **⚠️ Additional Complexity**: Requires translation layer between Order and Production Contract
- **⚠️ Data Duplication**: Some information exists in both Order and Production Contract
- **⚠️ Event Overhead**: Additional events in the system for contract creation and acknowledgment
- **⚠️ Synchronization Concerns**: Must ensure consistency between Order state and Production Contract

### Risk Mitigation

- **Synchronization**: Event Sourcing ensures eventual consistency
- **Performance**: Production Contracts are lightweight and focused
- **Complexity**: Well-established DDD pattern with clear benefits

## Compliance with Project Context

This decision directly implements the principle from `project.context.md`:

> "O **Contrato de Produção** é o elo formal, imutável e desacoplado entre pedido e produção."

The Production Contract serves as the formal, immutable, and decoupled link between order and production, ensuring that:

1. **Kitchen Context** receives only production-relevant information
2. **Ordering Context** maintains commercial responsibility
3. **Event-driven architecture** is preserved
4. **Multi-tenancy** is enforced at the contract level
5. **Auditability** is maintained through immutable contracts

## Implementation Timeline

- **Phase 1** (Sprint 1): Production Contract interfaces and Order.confirm() implementation
- **Phase 2** (Sprint 2): Kitchen Context integration and event handlers
- **Phase 3** (Sprint 3): Migration of existing Kitchen implementation
- **Phase 4** (Sprint 4): Performance optimization and monitoring

## Success Criteria

1. Kitchen Context has zero direct dependencies on Ordering Context
2. All Kitchen operations use Production Contracts exclusively
3. Complete traceability between Orders and Production Contracts
4. Kitchen test suite independent of Order structures
5. Performance maintained or improved
6. Zero functional regressions

This ADR establishes the foundational pattern for bounded context communication in FoodTrack, ensuring scalable, maintainable, and domain-driven architecture.