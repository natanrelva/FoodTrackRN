import { z } from 'zod';

// Production Priority enum
export const ProductionPrioritySchema = z.enum([
  'low',
  'medium', 
  'high',
  'urgent'
]);
export type ProductionPriority = z.infer<typeof ProductionPrioritySchema>;

// Production Contract Status enum
export const ProductionContractStatusSchema = z.enum([
  'pending',
  'assigned',
  'in_preparation',
  'ready',
  'completed',
  'cancelled'
]);
export type ProductionContractStatus = z.infer<typeof ProductionContractStatusSchema>;

// Allergen Alert Schema
export const AllergenAlertSchema = z.object({
  type: z.string().min(1),
  severity: z.enum(['mild', 'moderate', 'severe']),
  description: z.string().optional(),
});
export type AllergenAlert = z.infer<typeof AllergenAlertSchema>;

// Production Item Schema (Kitchen domain language)
export const ProductionItemSchema = z.object({
  productionItemId: z.string().uuid(),
  productId: z.string().uuid(),
  recipeId: z.string().uuid().optional(),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  modifications: z.array(z.string()).default([]),
  allergens: z.array(z.string()).default([]),
  preparationNotes: z.string().optional(),
  estimatedTime: z.number().int().positive(), // minutes
});
export type ProductionItem = z.infer<typeof ProductionItemSchema>;

// Production Contract Model (ADR-001 Implementation)
export const ProductionContractSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  orderId: z.string().uuid(),
  contractData: z.object({
    items: z.array(ProductionItemSchema),
    priority: ProductionPrioritySchema,
    specialInstructions: z.array(z.string()).default([]),
    allergenAlerts: z.array(AllergenAlertSchema).default([]),
    estimatedCompletionTime: z.date(),
    totalEstimatedTime: z.number().int().positive(), // minutes
  }),
  status: ProductionContractStatusSchema,
  version: z.number().int().positive().default(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type ProductionContract = z.infer<typeof ProductionContractSchema>;

// Production Contract Generation Data
export const ProductionContractGenerationDataSchema = z.object({
  orderId: z.string().uuid(),
  tenantId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    name: z.string(),
    quantity: z.number().int().positive(),
    modifications: z.array(z.string()).default([]),
    preparationTime: z.number().int().positive().optional(),
  })),
  channel: z.string(),
  specialInstructions: z.string().optional(),
});
export type ProductionContractGenerationData = z.infer<typeof ProductionContractGenerationDataSchema>;

// Production Contract Factory
export class ProductionContractFactory {
  static async generate(data: ProductionContractGenerationData): Promise<ProductionContract> {
    const contractId = crypto.randomUUID();
    
    // Convert order items to production items (Kitchen domain language)
    const productionItems: ProductionItem[] = data.items.map(item => ({
      productionItemId: crypto.randomUUID(),
      productId: item.productId,
      recipeId: undefined, // Will be resolved by Kitchen context
      name: item.name,
      quantity: item.quantity,
      modifications: item.modifications,
      allergens: [], // Will be resolved from recipe
      preparationNotes: item.modifications.length > 0 ? `Modifications: ${item.modifications.join(', ')}` : undefined,
      estimatedTime: item.preparationTime || 15, // Default 15 minutes
    }));

    // Calculate priority based on channel and order characteristics
    const priority = this.calculatePriority(data.channel, data.items.length);
    
    // Calculate total estimated time
    const totalEstimatedTime = productionItems.reduce((total, item) => 
      total + (item.estimatedTime * item.quantity), 0
    );

    // Generate estimated completion time
    const estimatedCompletionTime = new Date(Date.now() + totalEstimatedTime * 60 * 1000);

    // Extract special instructions
    const specialInstructions = data.specialInstructions ? [data.specialInstructions] : [];

    // Generate allergen alerts (simplified - would be resolved from recipes)
    const allergenAlerts: AllergenAlert[] = [];

    const contract: ProductionContract = {
      id: contractId,
      tenantId: data.tenantId,
      orderId: data.orderId,
      contractData: {
        items: productionItems,
        priority,
        specialInstructions,
        allergenAlerts,
        estimatedCompletionTime,
        totalEstimatedTime,
      },
      status: 'pending',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return ProductionContractSchema.parse(contract);
  }

  private static calculatePriority(channel: string, itemCount: number): ProductionPriority {
    // Priority logic based on channel and complexity
    if (channel === 'uber_eats' || channel === 'ifood') {
      return 'high'; // Delivery platforms have strict timing
    }
    
    if (itemCount > 5) {
      return 'high'; // Large orders get priority
    }
    
    if (channel === 'whatsapp') {
      return 'medium'; // Direct customer contact
    }
    
    return 'medium'; // Default priority
  }
}

// Domain Events for Production Contract
export const ProductionContractCreatedEventSchema = z.object({
  eventType: z.literal('ProductionContractCreated'),
  payload: z.object({
    contractId: z.string().uuid(),
    orderId: z.string().uuid(),
    tenantId: z.string().uuid(),
    priority: ProductionPrioritySchema,
    estimatedCompletionTime: z.date(),
    itemCount: z.number().int().positive(),
    createdAt: z.date(),
  }),
});

export const ProductionContractStatusUpdatedEventSchema = z.object({
  eventType: z.literal('ProductionContractStatusUpdated'),
  payload: z.object({
    contractId: z.string().uuid(),
    orderId: z.string().uuid(),
    tenantId: z.string().uuid(),
    previousStatus: ProductionContractStatusSchema,
    newStatus: ProductionContractStatusSchema,
    updatedAt: z.date(),
  }),
});

export const ProductionContractCompletedEventSchema = z.object({
  eventType: z.literal('ProductionContractCompleted'),
  payload: z.object({
    contractId: z.string().uuid(),
    orderId: z.string().uuid(),
    tenantId: z.string().uuid(),
    completedAt: z.date(),
    actualPreparationTime: z.number().int().positive(), // minutes
  }),
});

export type ProductionContractCreatedEvent = z.infer<typeof ProductionContractCreatedEventSchema>;
export type ProductionContractStatusUpdatedEvent = z.infer<typeof ProductionContractStatusUpdatedEventSchema>;
export type ProductionContractCompletedEvent = z.infer<typeof ProductionContractCompletedEventSchema>;