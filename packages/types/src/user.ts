import { z } from 'zod';

// User Role Schema
export const UserRoleSchema = z.enum([
  'admin',
  'manager', 
  'operator',
  'kitchen_staff',
  'delivery_agent'
]);

export type UserRole = z.infer<typeof UserRoleSchema>;

// User Schema
export const UserSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  role: UserRoleSchema,
  avatar: z.string().url().optional(),
  permissions: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  lastLoginAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

// Customer Address Schema
export const CustomerAddressSchema = z.object({
  street: z.string().min(1),
  number: z.string().min(1),
  complement: z.string().optional(),
  neighborhood: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zipCode: z.string().min(1),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
});

export type CustomerAddress = z.infer<typeof CustomerAddressSchema>;

// Customer Preferences Schema
export const CustomerPreferencesSchema = z.object({
  notifications: z.boolean().default(true),
  marketing: z.boolean().default(false),
  language: z.string().default('pt-BR'),
});

export type CustomerPreferences = z.infer<typeof CustomerPreferencesSchema>;

// Customer Schema
export const CustomerSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().min(1),
  address: CustomerAddressSchema.optional(),
  preferences: CustomerPreferencesSchema.default({}),
  totalOrders: z.number().int().min(0).default(0),
  totalSpent: z.number().min(0).default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Customer = z.infer<typeof CustomerSchema>;

// Create User Request Schema
export const CreateUserRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: UserRoleSchema,
  avatar: z.string().url().optional(),
  permissions: z.array(z.string()).default([]),
});

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

// Update User Request Schema
export const UpdateUserRequestSchema = z.object({
  name: z.string().min(1).optional(),
  role: UserRoleSchema.optional(),
  avatar: z.string().url().optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;

// Create Customer Request Schema
export const CreateCustomerRequestSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().min(1),
  address: CustomerAddressSchema.optional(),
  preferences: CustomerPreferencesSchema.default({}),
});

export type CreateCustomerRequest = z.infer<typeof CreateCustomerRequestSchema>;

// Authentication Schemas
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  user: UserSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string(),
});

export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;

// User Validation Utilities
export class UserValidationUtils {
  static validateUser(data: unknown): { isValid: boolean; errors: string[] } {
    const result = UserSchema.safeParse(data);
    return {
      isValid: result.success,
      errors: result.success ? [] : result.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`),
    };
  }

  static validateCustomer(data: unknown): { isValid: boolean; errors: string[] } {
    const result = CustomerSchema.safeParse(data);
    return {
      isValid: result.success,
      errors: result.success ? [] : result.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`),
    };
  }

  static validateCreateUserRequest(data: unknown): { isValid: boolean; errors: string[] } {
    const result = CreateUserRequestSchema.safeParse(data);
    return {
      isValid: result.success,
      errors: result.success ? [] : result.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`),
    };
  }

  static validateLoginRequest(data: unknown): { isValid: boolean; errors: string[] } {
    const result = LoginRequestSchema.safeParse(data);
    return {
      isValid: result.success,
      errors: result.success ? [] : result.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`),
    };
  }

  static isValidUserRole(role: string): role is UserRole {
    return UserRoleSchema.safeParse(role).success;
  }
}

// Constants
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  operator: 'Operator',
  kitchen_staff: 'Kitchen Staff',
  delivery_agent: 'Delivery Agent',
};

export const DEFAULT_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ['*'],
  manager: ['orders:read', 'orders:write', 'products:read', 'products:write', 'users:read', 'reports:read'],
  operator: ['orders:read', 'orders:write', 'products:read'],
  kitchen_staff: ['orders:read', 'orders:update_status'],
  delivery_agent: ['orders:read', 'orders:update_status', 'deliveries:read', 'deliveries:write'],
};