# ADR-002: Recipe Aggregate as Kitchen Domain Core

**Versão:** 1.0  
**Última Atualização:** 24 de Dezembro de 2024

## Status
**ACCEPTED** - December 24, 2024

## Context

In the FoodTrack Restaurant Operating System, we need to establish the **Recipe** as a core aggregate within the Kitchen bounded context. The current implementation has recipe-related logic scattered across multiple layers without clear aggregate boundaries, leading to inconsistent business rule enforcement and complex modification handling.

### Problem Statement

1. **Scattered Business Logic**: Recipe validation, modification handling, and ingredient calculations are distributed across repository, service, and utility classes
2. **Weak Aggregate Boundaries**: No clear aggregate root to enforce recipe invariants and business rules
3. **Complex Modification Handling**: Recipe modifications are handled procedurally without proper domain modeling
4. **Inconsistent State Management**: Recipe state changes (ingredients, steps, quality standards) lack proper encapsulation
5. **Missing Domain Events**: Recipe lifecycle events are not properly modeled for integration with other bounded contexts

### Current Problematic Structure

```typescript
// Current: Anemic domain model with scattered logic
RecipeRepository.validateModifications() // Business logic in repository
RecipeValidationUtils.validateRecipe()   // Business logic in utilities
RecipeRepository.applyModifications()    // Domain logic in infrastructure
```

This creates weak domain modeling where:
- Business rules are not encapsulated within the domain
- Recipe modifications lack proper validation and consistency
- Integration with Supply and Kitchen contexts is tightly coupled
- Testing requires complex repository and database setup

## Decision

We will implement the **Recipe Aggregate Pattern** as the core domain model within the Kitchen bounded context, establishing Recipe as an aggregate root with proper encapsulation of business logic and state management.

### Core Decision Points

**The Recipe will be modeled as a rich domain aggregate** that encapsulates all business logic related to recipe management, modification handling, and ingredient calculations, while emitting domain events for integration with other contexts.

## Alternatives Considered

### Alternative 1: Anemic Domain Model (Current - REJECTED)
- **Approach**: Keep current structure with business logic in services and repositories
- **Rejected Because**: 
  - Violates Domain-Driven Design principles
  - Makes business rules hard to discover and maintain
  - Creates tight coupling between layers
  - Difficult to test business logic in isolation

### Alternative 2: Service-Oriented Architecture (REJECTED)
- **Approach**: Create RecipeService classes to handle all recipe operations
- **Rejected Because**:
  - Still doesn't provide proper encapsulation
  - Business logic remains scattered across multiple services
  - Doesn't solve the aggregate boundary problem
  - Makes domain events handling complex

### Alternative 3: Recipe as Value Object (REJECTED)
- **Approach**: Model Recipe as an immutable value object
- **Rejected Because**:
  - Recipes have identity and lifecycle (created, modified, versioned)
  - Need to handle complex state changes and modifications
  - Require integration with other aggregates (Orders, Ingredients)
  - Don't fit the value object pattern semantically

### Alternative 4: Recipe Aggregate (SELECTED)
- **Approach**: Model Recipe as a rich aggregate root with encapsulated business logic
- **Selected Because**:
  - Provides clear aggregate boundaries and invariant enforcement
  - Encapsulates all recipe-related business logic
  - Enables proper domain event modeling
  - Supports complex modification and versioning scenarios
  - Facilitates testing and maintainability

## Implementation

### Recipe Aggregate Structure

```typescript
export class Recipe {
  private constructor(
    private readonly _id: RecipeId,
    private readonly _tenantId: TenantId,
    private readonly _dishId: DishId,
    private _name: string,
    private _description: string,
    private _ingredients: RecipeIngredient[],
    private _instructions: RecipeStep[],
    private _preparationTime: number,
    private _cookingTime: number,
    private _difficulty: DifficultyLevel,
    private _allergens: Allergen[],
    private _nutritionalInfo?: NutritionalInfo,
    private _qualityStandards: QualityStandard[],
    private _servings: number = 1,
    private _tags: string[] = [],
    private _isActive: boolean = true,
    private _version: number = 1,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
    private _domainEvents: DomainEvent[] = []
  ) {}

  // Factory Methods
  static create(command: CreateRecipeCommand): Recipe {
    const recipe = new Recipe(
      RecipeId.generate(),
      command.tenantId,
      command.dishId,
      command.name,
      command.description,
      command.ingredients.map(ing => RecipeIngredient.create(ing)),
      command.instructions.map(step => RecipeStep.create(step)),
      command.preparationTime,
      command.cookingTime,
      command.difficulty,
      command.allergens,
      command.nutritionalInfo,
      [],
      command.servings,
      command.tags,
      true,
      1,
      new Date(),
      new Date()
    );

    recipe.validate();
    recipe.addDomainEvent(new RecipeCreatedEvent({
      recipeId: recipe._id,
      tenantId: recipe._tenantId,
      dishId: recipe._dishId,
      name: recipe._name
    }));

    return recipe;
  }

  static reconstitute(data: RecipeData): Recipe {
    return new Recipe(
      data.id,
      data.tenantId,
      data.dishId,
      data.name,
      data.description,
      data.ingredients,
      data.instructions,
      data.preparationTime,
      data.cookingTime,
      data.difficulty,
      data.allergens,
      data.nutritionalInfo,
      data.qualityStandards,
      data.servings,
      data.tags,
      data.isActive,
      data.version,
      data.createdAt,
      data.updatedAt
    );
  }

  // Business Logic Methods
  applyModifications(modifications: RecipeModification[]): ProductionContract {
    this.validateModifications(modifications);
    
    const modifiedIngredients = this.calculateModifiedIngredients(modifications);
    const modifiedSteps = this.calculateModifiedSteps(modifications);
    const allergenWarnings = this.calculateAllergenWarnings(modifications);

    const contract = ProductionContract.create({
      recipeId: this._id,
      tenantId: this._tenantId,
      dishId: this._dishId,
      ingredients: modifiedIngredients,
      steps: modifiedSteps,
      modifications,
      allergenWarnings,
      estimatedTime: this.calculateModifiedTime(modifications),
      qualityCheckpoints: this._qualityStandards
    });

    this.addDomainEvent(new RecipeModificationsAppliedEvent({
      recipeId: this._id,
      tenantId: this._tenantId,
      modifications,
      contractId: contract.id
    }));

    return contract;
  }

  updateIngredients(ingredients: RecipeIngredient[]): void {
    this.validateIngredients(ingredients);
    
    const oldIngredients = [...this._ingredients];
    this._ingredients = ingredients;
    this._updatedAt = new Date();
    this._version++;

    this.addDomainEvent(new RecipeIngredientsUpdatedEvent({
      recipeId: this._id,
      tenantId: this._tenantId,
      oldIngredients,
      newIngredients: ingredients
    }));
  }

  updateInstructions(instructions: RecipeStep[]): void {
    this.validateInstructions(instructions);
    
    this._instructions = instructions;
    this._updatedAt = new Date();
    this._version++;

    this.addDomainEvent(new RecipeInstructionsUpdatedEvent({
      recipeId: this._id,
      tenantId: this._tenantId,
      instructions
    }));
  }

  addQualityStandard(standard: QualityStandard): void {
    if (this._qualityStandards.some(s => s.id.equals(standard.id))) {
      throw new DomainError('Quality standard already exists');
    }

    this._qualityStandards.push(standard);
    this._updatedAt = new Date();

    this.addDomainEvent(new QualityStandardAddedEvent({
      recipeId: this._id,
      tenantId: this._tenantId,
      standardId: standard.id
    }));
  }

  calculateIngredientRequirements(quantity: number): IngredientRequirement[] {
    return this._ingredients.map(ingredient => 
      ingredient.calculateRequirement(quantity)
    );
  }

  deactivate(): void {
    if (!this._isActive) {
      throw new DomainError('Recipe is already inactive');
    }

    this._isActive = false;
    this._updatedAt = new Date();

    this.addDomainEvent(new RecipeDeactivatedEvent({
      recipeId: this._id,
      tenantId: this._tenantId
    }));
  }

  // Validation Methods
  private validate(): void {
    this.validateBasicInfo();
    this.validateIngredients(this._ingredients);
    this.validateInstructions(this._instructions);
    this.validateTiming();
  }

  private validateBasicInfo(): void {
    if (!this._name || this._name.trim().length === 0) {
      throw new DomainError('Recipe name is required');
    }
    if (this._servings <= 0) {
      throw new DomainError('Servings must be positive');
    }
  }

  private validateIngredients(ingredients: RecipeIngredient[]): void {
    if (ingredients.length === 0) {
      throw new DomainError('Recipe must have at least one ingredient');
    }

    const ingredientIds = ingredients.map(i => i.ingredientId.value);
    const duplicates = ingredientIds.filter((id, index) => ingredientIds.indexOf(id) !== index);
    
    if (duplicates.length > 0) {
      throw new DomainError('Recipe contains duplicate ingredients');
    }
  }

  private validateInstructions(instructions: RecipeStep[]): void {
    if (instructions.length === 0) {
      throw new DomainError('Recipe must have at least one instruction step');
    }

    const stepNumbers = instructions.map(s => s.stepNumber).sort((a, b) => a - b);
    for (let i = 0; i < stepNumbers.length; i++) {
      if (stepNumbers[i] !== i + 1) {
        throw new DomainError('Recipe steps must be numbered consecutively starting from 1');
      }
    }
  }

  private validateTiming(): void {
    const totalTime = this._preparationTime + this._cookingTime;
    if (totalTime <= 0) {
      throw new DomainError('Total preparation and cooking time must be positive');
    }
    if (totalTime > 480) { // 8 hours
      throw new DomainError('Total time cannot exceed 8 hours');
    }
  }

  private validateModifications(modifications: RecipeModification[]): void {
    modifications.forEach(mod => {
      if (!mod.isValid()) {
        throw new DomainError(`Invalid modification: ${mod.description}`);
      }
    });
  }

  // Domain Event Management
  private addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  getDomainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }

  // Getters
  get id(): RecipeId { return this._id; }
  get tenantId(): TenantId { return this._tenantId; }
  get dishId(): DishId { return this._dishId; }
  get name(): string { return this._name; }
  get totalTime(): number { return this._preparationTime + this._cookingTime; }
  get isActive(): boolean { return this._isActive; }
  get version(): number { return this._version; }
  // ... other getters
}
```

### Domain Events

```typescript
interface RecipeCreatedEvent extends DomainEvent {
  eventType: 'RecipeCreated';
  payload: {
    recipeId: RecipeId;
    tenantId: TenantId;
    dishId: DishId;
    name: string;
  };
}

interface RecipeModificationsAppliedEvent extends DomainEvent {
  eventType: 'RecipeModificationsApplied';
  payload: {
    recipeId: RecipeId;
    tenantId: TenantId;
    modifications: RecipeModification[];
    contractId: ContractId;
  };
}

interface RecipeIngredientsUpdatedEvent extends DomainEvent {
  eventType: 'RecipeIngredientsUpdated';
  payload: {
    recipeId: RecipeId;
    tenantId: TenantId;
    oldIngredients: RecipeIngredient[];
    newIngredients: RecipeIngredient[];
  };
}
```

### Repository Interface

```typescript
export interface RecipeRepository {
  findById(id: RecipeId, tenantId: TenantId): Promise<Recipe | null>;
  findByDishId(dishId: DishId, tenantId: TenantId): Promise<Recipe | null>;
  save(recipe: Recipe): Promise<void>;
  delete(id: RecipeId, tenantId: TenantId): Promise<void>;
}
```

### Application Service

```typescript
export class RecipeApplicationService {
  constructor(
    private recipeRepository: RecipeRepository,
    private eventBus: EventBus
  ) {}

  async createRecipe(command: CreateRecipeCommand): Promise<void> {
    const recipe = Recipe.create(command);
    
    await this.recipeRepository.save(recipe);
    await this.publishDomainEvents(recipe);
  }

  async applyModifications(command: ApplyModificationsCommand): Promise<ProductionContract> {
    const recipe = await this.recipeRepository.findById(command.recipeId, command.tenantId);
    
    if (!recipe) {
      throw new ApplicationError('Recipe not found');
    }

    const contract = recipe.applyModifications(command.modifications);
    
    await this.recipeRepository.save(recipe);
    await this.publishDomainEvents(recipe);
    
    return contract;
  }

  private async publishDomainEvents(recipe: Recipe): Promise<void> {
    const events = recipe.getDomainEvents();
    recipe.clearDomainEvents();
    
    for (const event of events) {
      await this.eventBus.publish(event);
    }
  }
}
```

## Consequences

### Positive Consequences

- **✅ Rich Domain Model**: Business logic is properly encapsulated within the Recipe aggregate
- **✅ Clear Aggregate Boundaries**: Recipe serves as the single source of truth for recipe-related operations
- **✅ Improved Testability**: Business logic can be tested in isolation without infrastructure dependencies
- **✅ Domain Events Integration**: Proper event-driven integration with other bounded contexts
- **✅ Invariant Enforcement**: Recipe aggregate ensures all business rules are consistently applied
- **✅ Modification Handling**: Complex recipe modifications are properly modeled and validated

### Negative Consequences

- **⚠️ Increased Complexity**: More sophisticated domain modeling requires deeper DDD understanding
- **⚠️ Performance Considerations**: Rich aggregates may require careful optimization for large recipes
- **⚠️ Migration Effort**: Existing anemic model needs to be migrated to rich aggregate
- **⚠️ Learning Curve**: Team needs to understand aggregate patterns and domain event handling

### Risk Mitigation

- **Complexity**: Provide comprehensive documentation and training on DDD patterns
- **Performance**: Implement lazy loading and caching strategies for complex recipes
- **Migration**: Gradual migration approach with backward compatibility
- **Learning**: Pair programming and code reviews to spread knowledge

## Integration with Production Contract (ADR-001)

This Recipe Aggregate directly supports the Production Contract pattern established in ADR-001:

```typescript
// Recipe generates Production Contracts through domain method
const contract = recipe.applyModifications(modifications);

// Contract contains only production-relevant data
interface ProductionContract {
  contractId: ContractId;
  recipeId: RecipeId;
  ingredients: ProductionIngredient[];
  steps: ProductionStep[];
  modifications: RecipeModification[];
  estimatedTime: number;
  qualityCheckpoints: QualityStandard[];
}
```

The Recipe aggregate ensures that:
1. **Production Contracts are generated consistently** through domain methods
2. **Modifications are properly validated** before contract creation
3. **Domain events are emitted** for integration with Kitchen and Supply contexts
4. **Business invariants are maintained** throughout the recipe lifecycle

## Implementation Timeline

- **Phase 1** (Sprint 1): Recipe aggregate core implementation and domain events
- **Phase 2** (Sprint 2): Recipe modification handling and Production Contract integration
- **Phase 3** (Sprint 3): Repository implementation and application services
- **Phase 4** (Sprint 4): Migration from current anemic model to rich aggregate
- **Phase 5** (Sprint 5): Performance optimization and monitoring

## Success Criteria

1. All recipe business logic is encapsulated within the Recipe aggregate
2. Recipe modifications are handled through domain methods with proper validation
3. Production Contracts are generated consistently through Recipe.applyModifications()
4. Domain events enable proper integration with Kitchen and Supply contexts
5. Recipe aggregate can be tested in isolation without infrastructure dependencies
6. Performance is maintained or improved compared to current implementation
7. Zero functional regressions during migration

This ADR establishes the Recipe as a first-class domain aggregate, providing the foundation for sophisticated recipe management, modification handling, and integration with the broader FoodTrack ecosystem through proper domain-driven design principles.