import type { StockMovementHistoryItem } from './stockMovement';

export type DashboardMovement = Pick<
  StockMovementHistoryItem,
  'id' | 'type' | 'quantity' | 'created_at' | 'product' | 'user'
>;

export interface DashboardStats {
  total_products: number;
  total_units: number;
  low_stock_count: number;
  out_of_stock_count: number;
  recent_movements: DashboardMovement[];
}
