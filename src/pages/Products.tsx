import { useEffect, useRef, useState } from 'react';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import { getAuthErrorMessage } from '../services/authErrors';
import { productService } from '../services/productService';
import type { Product } from '../types/product';

type ProductsState =
  | { status: 'loading' }
  | { status: 'loaded'; products: Product[] }
  | { status: 'error'; message: string };

const productErrorMessages = {
  401: 'Votre session a expiré. Reconnectez-vous pour consulter les produits.',
  403: 'Vous n’avez pas accès aux produits.',
  419: 'La vérification de sécurité a échoué. Réessayez.',
};

const priceFormat = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function ProductItem({ product }: { product: Product }) {
  const isActive = product.is_active === 1;
  const unitPrice = product.unit_price === null ? 'Non renseigné' : priceFormat.format(Number(product.unit_price));
  const fields = [
    { label: 'SKU', value: product.sku },
    { label: 'Catégorie', value: product.category.name },
    { label: 'Marque', value: product.brand ?? 'Non renseignée' },
    { label: 'Prix unitaire', value: unitPrice },
    { label: 'Quantité actuelle', value: product.quantity },
    { label: 'Stock minimum', value: product.min_stock },
  ];

  return (
    <li className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <h2 className="min-w-0 text-base font-semibold wrap-anywhere">{product.name}</h2>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
          isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'
        }`}>
          {isActive ? 'Actif' : 'Inactif'}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-slate-200 pt-3 text-sm">
        {fields.map(({ label, value }) => (
          <div key={label} className="min-w-0 wrap-anywhere">
            <dt className="text-slate-600">{label}</dt>
            <dd className="font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </li>
  );
}

export default function Products() {
  const [state, setState] = useState<ProductsState>({ status: 'loading' });
  const [loadAttempt, setLoadAttempt] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        const { data } = await productService.list(controller.signal);
        if (!Array.isArray(data)) throw new Error('Réponse inattendue pour les produits.');

        if (!controller.signal.aborted) {
          setState({ status: 'loaded', products: data });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setState({
            status: 'error',
            message: getAuthErrorMessage(error, productErrorMessages, 'Impossible de charger les produits.'),
          });
        }
      }
    }

    // Strict Mode can clean up the first effect before it needs to start a request.
    queueMicrotask(() => {
      if (!controller.signal.aborted) void loadProducts();
    });

    return () => controller.abort();
  }, [loadAttempt]);

  function reloadProducts() {
    headingRef.current?.focus();
    setState({ status: 'loading' });
    setLoadAttempt((attempt) => attempt + 1);
  }

  return (
    <div lang="fr" className="space-y-4">
      <h1 ref={headingRef} id="products-heading" tabIndex={-1} className="text-2xl font-bold">Produits</h1>

      {state.status === 'loading' && <LoadingState message="Chargement des produits…" />}
      {state.status === 'error' && <ErrorState message={state.message} onRetry={reloadProducts} />}
      {state.status === 'loaded' && (
        state.products.length === 0 ? (
          <EmptyState title="Aucun produit" />
        ) : (
          <ul
            role="list"
            aria-labelledby="products-heading"
            className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-3"
          >
            {state.products.map((product) => <ProductItem key={product.id} product={product} />)}
          </ul>
        )
      )}
    </div>
  );
}
