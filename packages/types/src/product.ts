import { z } from 'zod';

// Product Category Schema
export const ProductCategorySchema = z.enum([
  'lanches',
  'bebidas', 
  'acompanhamentos',
  'sobremesas',
  'saudavel'
]).or(z.string());

export type ProductCategory = z.infer<typeof ProductCategorySchema>;

// Product Extra Schema
export const ProductExtraSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  price: z.number().min(0),
});

export type ProductExtra = z.infer<typeof ProductExtraSchema>;

// Product Schema
export const ProductSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string(),
  price: z.number().positive(),
  image: z.string().url().optional(),
  category: ProductCategorySchema,
  available: z.boolean().default(true),
  stock: z.number().int().min(0).optional(),
  extras: z.array(ProductExtraSchema).default([]),
  tags: z.array(z.string()).default([]),
  preparationTime: z.number().int().positive().optional(), // minutes
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Product = z.infer<typeof ProductSchema>;

// Category Schema
export const CategorySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  icon: z.string().optional(),
  displayOrder: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Category = z.infer<typeof CategorySchema>;

// Create Product Request Schema
export const CreateProductRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  price: z.number().positive(),
  image: z.string().url().optional(),
  category: ProductCategorySchema,
  available: z.boolean().default(true),
  stock: z.number().int().min(0).optional(),
  extras: z.array(ProductExtraSchema).default([]),
  tags: z.array(z.string()).default([]),
  preparationTime: z.number().int().positive().optional(),
});

export type CreateProductRequest = z.infer<typeof CreateProductRequestSchema>;

// Update Product Request Schema
export const UpdateProductRequestSchema = CreateProductRequestSchema.partial();

export type UpdateProductRequest = z.infer<typeof UpdateProductRequestSchema>;

// Product Validation Utilities
export class ProductValidationUtils {
  static validateProduct(data: unknown): { isValid: boolean; errors: string[] } {
    const result = ProductSchema.safeParse(data);
    return {
      isValid: result.success,
      errors: result.success ? [] : result.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`),
    };
  }

  static validateCreateProductRequest(data: unknown): { isValid: boolean; errors: string[] } {
    const result = CreateProductRequestSchema.safeParse(data);
    return {
      isValid: result.success,
      errors: result.success ? [] : result.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`),
    };
  }
}