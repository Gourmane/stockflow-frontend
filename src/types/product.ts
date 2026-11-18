import type { Category } from './category';

export interface Product {
  id: number;
  category_id: number;
  category: Category;
  sku: string;
  name: string;
  brand: string | null;
  unit_price: string | null;
  quantity: number;
  min_stock: number;
  is_active: 0 | 1;
  image_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateProductPayload {
  category_id: number;
  sku: string;
  name: string;
  brand?: string | null;
  unit_price?: string | number | null;
  quantity?: never;
  min_stock?: number;
  is_active?: boolean;
  image_url?: string | null;
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

// The update action only reloads the category, so the product retains submitted values.
export interface UpdatedProduct extends Omit<Product, 'unit_price' | 'is_active'> {
  unit_price: Product['unit_price'] | number;
  is_active: Product['is_active'] | boolean | '0' | '1';
}
