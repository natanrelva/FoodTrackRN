import { z } from 'zod';

// Zod schemas for runtime validation

export const UserSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['admin', 'manager', 'operator', 'customer']),
  active: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ProductSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string(),
  price: z.number().positive(),
  category: z.string().min(1),
  imageUrl: z.string().url().optional(),
  available: z.boolean(),
  stock: z.number().min(0).optional(),
  preparationTime: z.number().positive().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const OrderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive(),
  price: z.number().positive(),
  modifications: z.array(z.string()).optional(),
});

export const AddressSchema = z.object({
  street: z.string().min(1),
  number: z.string().min(1),
  complement: z.string().optional(),
  neighborhood: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(2).max(2),
  zipCode: z.string().regex(/^\d{5}-?\d{3}$/),
});

export const OrderSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  items: z.array(OrderItemSchema),
  status: z.enum(['draft', 'created', 'confirmed', 'in_preparation', 'ready', 'dispatched', 'delivered', 'cancelled', 'failed']),
  totalAmount: z.number().positive(),
  deliveryAddress: AddressSchema.optional(),
  specialInstructions: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Request schemas for API validation
export const CreateProductRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  price: z.number().positive(),
  category: z.string().min(1),
  imageUrl: z.string().url().optional(),
  available: z.boolean().default(true),
  stock: z.number().min(0).optional(),
  preparationTime: z.number().positive().optional(),
});

export const CreateOrderRequestSchema = z.object({
  customerId: z.string().uuid().optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().positive(),
    modifications: z.array(z.string()).optional(),
  })),
  deliveryAddress: AddressSchema.optional(),
  specialInstructions: z.string().optional(),
});

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});