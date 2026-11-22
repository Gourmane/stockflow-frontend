import type { Product } from '../types/product';
import StockStatusBadge from './StockStatusBadge';

const priceFormat = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD', currencyDisplay: 'code' });

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

function formatDate(value: Product['created_at']) {
  return value ? dateFormat.format(new Date(value)) : 'Non renseignée';
}

export function ProductStatus({ isActive }: { isActive: Product['is_active'] }) {
  return (
    <span className={`badge ${
      isActive === 1 ? 'bg-emerald-50 text-emerald-800' : 'bg-zinc-100 text-muted'
    }`}>
      {isActive === 1 ? 'Actif' : 'Inactif'}
    </span>
  );
}

export function ProductPrice({ value }: { value: Product['unit_price'] }) {
  return value === null ? 'Non renseigné' : priceFormat.format(Number(value));
}

export function ProductFacts({ product }: { product: Product }) {
  const fields = [
    { label: 'SKU', value: product.sku },
    { label: 'Catégorie', value: product.category.name },
    { label: 'Marque', value: product.brand ?? 'Non renseignée' },
    { label: 'Prix unitaire', value: <ProductPrice value={product.unit_price} /> },
    { label: 'Quantité actuelle', value: product.quantity },
    { label: 'Stock minimum', value: product.min_stock },
    { label: 'État du stock', value: <StockStatusBadge product={product} /> },
    { label: 'Date de création', value: formatDate(product.created_at) },
    { label: 'Dernière mise à jour', value: formatDate(product.updated_at) },
    { label: 'URL de l’image', value: product.image_url ?? 'Non renseignée' },
  ];

  return (
    <dl className="grid gap-x-5 gap-y-4 text-sm sm:grid-cols-2">
      {fields.map(({ label, value }) => (
        <div key={label} className="min-w-0 wrap-anywhere">
          <dt className="text-xs font-medium text-muted">{label}</dt>
          <dd className="mt-1 font-medium tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
