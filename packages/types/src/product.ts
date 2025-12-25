import { TenantEntity } from './common';

export interface Product extends TenantEntity {
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  available: boolean;
  stock?: number;
  preparationTime?: number;
  // Frontend compatibility fields
  image?: string;
  extras?: Array<{ name: string; price: number }>;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  available?: boolean;
  stock?: number;
  preparationTime?: number;
}