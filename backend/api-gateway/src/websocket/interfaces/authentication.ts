/**
 * Authentication Interfaces for WebSocket Connections
 * Requirements: 1.1, 5.1
 */

export enum UserRole {
  CUSTOMER = 'customer',
  KITCHEN_STAFF = 'kitchen_staff',
  CHEF = 'chef',
  DELIVERY_PERSONNEL = 'delivery_personnel',
  RESTAURANT_OWNER = 'restaurant_owner',
  RESTAURANT_MANAGER = 'restaurant_manager',
  ADMIN = 'admin'
}

export enum Permission {
  READ_ORDERS = 'read:orders',
  WRITE_ORDERS = 'write:orders',
  READ_KITCHEN = 'read:kitchen',
  WRITE_KITCHEN = 'write:kitchen',
  READ_DELIVERY = 'read:delivery',
  WRITE_DELIVERY = 'write:delivery',
  READ_INVENTORY = 'read:inventory',
  WRITE_INVENTORY = 'write:inventory',
  ADMIN_ACCESS = 'admin:access'
}

export enum ApplicationType {
  CLIENT_APP = 'client_app',
  TENANT_DASHBOARD = 'tenant_dashboard',
  KITCHEN_APP = 'kitchen_app',
  DELIVERY_APP = 'delivery_app'
}

export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  role: UserRole;
  applicationTypes: ApplicationType[];
  permissions: Permission[];
}

export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
}
