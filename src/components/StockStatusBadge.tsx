import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react';
import type { Product } from '../types/product';

type Stock = Pick<Product, 'quantity' | 'min_stock'>;

const stockStatuses = {
  empty: { label: 'Rupture de stock', icon: CircleAlert, style: 'bg-red-50 text-red-800' },
  low: { label: 'Stock faible', icon: TriangleAlert, style: 'bg-amber-50 text-amber-900' },
  normal: { label: 'Stock normal', icon: CircleCheck, style: 'bg-emerald-50 text-emerald-800' },
};

function getStockStatus({ quantity, min_stock }: Stock) {
  if (quantity === 0) return 'empty';
  return quantity <= min_stock ? 'low' : 'normal';
}

export default function StockStatusBadge({ product }: { product: Stock }) {
  const { label, icon: Icon, style } = stockStatuses[getStockStatus(product)];

  return (
    <span className={`badge ${style}`}>
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      <span>{label}</span>
    </span>
  );
}
