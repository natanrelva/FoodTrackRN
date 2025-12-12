// Product Types - Unified Interface
export type ProductCategory = 'lanches' | 'bebidas' | 'acompanhamentos' | 'sobremesas' | 'saudavel' | string;

export interface ProductExtra {
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: ProductCategory;
  // Admin-specific fields (optional)
  stock?: number;
  active?: boolean;
  // Web-specific fields (optional)
  extras?: ProductExtra[];
  tags?: string[];
  preparationTime?: number;
  tenantId?: string;
}

// Category definition for web app
export interface Category {
  id: string;
  name: string;
  icon: string;
}