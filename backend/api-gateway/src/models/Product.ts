import { z } from 'zod';

// Product model with Zod validation
export const ProductSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  image: z.string().min(1, 'Image is required'),
  category: z.string().min(1, 'Category is required'),
  stock: z.number().int().min(0, 'Stock cannot be negative').default(0),
  active: z.boolean().default(true),
  extras: z.array(z.string()).default([]),
  nutritionalInfo: z.record(z.any()).optional(),
  tags: z.array(z.string()).default([]),
  preparationTime: z.number().int().positive().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Product = z.infer<typeof ProductSchema>;

// Create Product Request Schema
export const CreateProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  image: z.string().min(1, 'Image is required'),
  category: z.string().min(1, 'Category is required'),
  stock: z.number().int().min(0, 'Stock cannot be negative').default(0),
  active: z.boolean().default(true),
  extras: z.array(z.string()).default([]),
  nutritionalInfo: z.record(z.any()).optional(),
  tags: z.array(z.string()).default([]),
  preparationTime: z.number().int().positive().optional(),
});

export type CreateProductRequest = z.infer<typeof CreateProductSchema>;

// Update Product Request Schema
export const UpdateProductSchema = CreateProductSchema.partial();
export type UpdateProductRequest = z.infer<typeof UpdateProductSchema>;

// Product Filters Schema
export const ProductFiltersSchema = z.object({
  category: z.string().optional(),
  active: z.boolean().optional(),
  search: z.string().optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  tags: z.array(z.string()).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type ProductFilters = z.infer<typeof ProductFiltersSchema>;

// Product Availability Update Schema
export const UpdateAvailabilitySchema = z.object({
  active: z.boolean(),
});

export type UpdateAvailabilityRequest = z.infer<typeof UpdateAvailabilitySchema>;

// API Response Schemas
export const ProductResponseSchema = z.object({
  success: z.boolean(),
  data: ProductSchema.optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }).optional(),
});

export const ProductListResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    products: z.array(ProductSchema),
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
    totalPages: z.number().int(),
  }).optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }).optional(),
});

export type ProductResponse = z.infer<typeof ProductResponseSchema>;
export type ProductListResponse = z.infer<typeof ProductListResponseSchema>;

// Domain Events
export const ProductCreatedEventSchema = z.object({
  eventType: z.literal('ProductCreated'),
  payload: z.object({
    productId: z.string().uuid(),
    tenantId: z.string().uuid(),
    name: z.string(),
    category: z.string(),
    price: z.number(),
    active: z.boolean(),
    createdAt: z.date(),
  }),
});

export const ProductUpdatedEventSchema = z.object({
  eventType: z.literal('ProductUpdated'),
  payload: z.object({
    productId: z.string().uuid(),
    tenantId: z.string().uuid(),
    changes: z.record(z.any()),
    updatedAt: z.date(),
  }),
});

export const ProductAvailabilityChangedEventSchema = z.object({
  eventType: z.literal('ProductAvailabilityChanged'),
  payload: z.object({
    productId: z.string().uuid(),
    tenantId: z.string().uuid(),
    active: z.boolean(),
    previousActive: z.boolean(),
    updatedAt: z.date(),
  }),
});

export const ProductDeletedEventSchema = z.object({
  eventType: z.literal('ProductDeleted'),
  payload: z.object({
    productId: z.string().uuid(),
    tenantId: z.string().uuid(),
    deletedAt: z.date(),
  }),
});

export type ProductCreatedEvent = z.infer<typeof ProductCreatedEventSchema>;
export type ProductUpdatedEvent = z.infer<typeof ProductUpdatedEventSchema>;
export type ProductAvailabilityChangedEvent = z.infer<typeof ProductAvailabilityChangedEventSchema>;
export type ProductDeletedEvent = z.infer<typeof ProductDeletedEventSchema>;