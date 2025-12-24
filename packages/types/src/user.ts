import { TenantEntity } from './common';

export interface User extends TenantEntity {
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
}

export type UserRole = 'admin' | 'manager' | 'operator' | 'customer';

export interface AuthTokens {
  token: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}