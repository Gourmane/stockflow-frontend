import type { User } from './auth';
import type { Product } from './product';

export type StockMovementType = 'in' | 'out';

export interface StockMovement {
  id: number;
  product_id: number;
  user_id: number;
  type: StockMovementType;
  quantity: number;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface StockMovementHistoryItem extends StockMovement {
  product: Pick<Product, 'id' | 'name' | 'sku'>;
  user: Pick<User, 'id' | 'name'>;
}

export interface CreateStockMovementPayload {
  idempotency_key: string;
  product_id: number;
  type: StockMovementType;
  quantity: number;
  note?: string | null;
}
