import type { Product } from '../types/product';
import StockStatusBadge from './StockStatusBadge';

const priceFormat = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

function formatDate(value: Product['created_at']) {
  return value ? dateFormat.format(new Date(value)) : 'Non renseignée';
}

export function ProductStatus({ isActive }: { isActive: Product['is_active'] }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
      isActive === 1 ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'
    }`}>
      {isActive === 1 ? 'Actif' : 'Inactif'}
    </span>
  );
}

export function ProductFacts({ product, details = false }: { product: Product; details?: boolean }) {
  const unitPrice = product.unit_price === null ? 'Non renseigné' : priceFormat.format(Number(product.unit_price));
  const fields = [
    { label: 'SKU', value: product.sku },
    { label: 'Catégorie', value: product.category.name },
    { label: 'Marque', value: product.brand ?? 'Non renseignée' },
    { label: 'Prix unitaire', value: unitPrice },
    { label: 'Quantité actuelle', value: product.quantity },
    { label: 'Stock minimum', value: product.min_stock },
    { label: 'État du stock', value: <StockStatusBadge product={product} /> },
  ];
  if (details) {
    fields.push(
      { label: 'Date de création', value: formatDate(product.created_at) },
      { label: 'Dernière mise à jour', value: formatDate(product.updated_at) },
      { label: 'URL de l’image', value: product.image_url ?? 'Non renseignée' },
    );
  }

  return (
    <dl className={`grid gap-3 text-sm ${
      details ? 'sm:grid-cols-2' : 'mt-3 grid-cols-2 border-t border-slate-200 pt-3'
    }`}>
      {fields.map(({ label, value }) => (
        <div key={label} className="min-w-0 wrap-anywhere">
          <dt className="text-slate-600">{label}</dt>
          <dd className="font-medium tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
