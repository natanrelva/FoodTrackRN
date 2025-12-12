import { z } from 'zod';

// Product Model (extends the unified type)
export const ProductSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string(),
  price: z.number().positive(),
  image: z.string().url(),
  category: z.string(),
  stock: z.number().int().min(0),
  active: z.boolean().default(true),
  extras: z.array(z.object({
    name: z.string(),
    price: z.number().positive(),
  })).optional(),
  nutritionalInfo: z.object({
    calories: z.number().optional(),
    protein: z.number().optional(),
    carbs: z.number().optional(),
    fat: z.number().optional(),
  }).optional(),
  tags: z.array(z.string()).default([]),
  preparationTime: z.number().int().positive().optional(), // minutes
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Product = z.infer<typeof ProductSchema>;

// Category Model
export const CategorySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  icon: z.string(),
  color: z.string().optional(),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Category = z.infer<typeof CategorySchema>;