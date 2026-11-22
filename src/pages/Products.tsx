import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { Plus } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import LedgerPagination from '../components/LedgerPagination';
import { ProductPrice, ProductStatus } from '../components/ProductFacts';
import ProductImage from '../components/ProductImage';
import StockStatusBadge from '../components/StockStatusBadge';
import { useAuth } from '../context/useAuth';
import { getAuthErrorMessage } from '../services/authErrors';
import { productService } from '../services/productService';
import type { Pagination } from '../types/api';
import type { Product } from '../types/product';

type ProductsState =
  | { status: 'loading' }
  | { status: 'loaded'; pagination: Pagination<Product> }
  | { status: 'error'; message: string };

const productErrorMessages = {
  401: 'Votre session a expiré. Reconnectez-vous pour consulter les produits.',
  403: 'Vous n’avez pas accès aux produits.',
  419: 'La vérification de sécurité a échoué. Réessayez.',
};

const productColumns = [
  { label: 'Produit', className: 'w-[27%]' },
  { label: 'SKU' },
  { label: 'Catégorie' },
  { label: 'Quantité', className: 'cell-end' },
  { label: 'État du stock' },
  { label: 'Prix unitaire', className: 'cell-end' },
  { label: 'Statut' },
];

function ProductItem({ product, search }: { product: Product; search: string }) {
  return (
    <tr role="row">
      <th role="rowheader" scope="row" className="col-span-2 text-start">
        <div className="flex min-w-0 items-center gap-2.5">
          <ProductImage key={product.image_url} url={product.image_url} />
          <div className="min-w-0 wrap-anywhere">
            <Link
              to={{ pathname: `/products/${product.id}`, search }}
              className="inline-flex min-h-6 items-center rounded-sm font-semibold text-ink underline decoration-brand/40 underline-offset-3 hover:text-brand hover:decoration-current"
            >
              {product.name}
            </Link>
            <span className="block text-xs font-normal text-muted">{product.brand ?? 'Marque non renseignée'}</span>
          </div>
        </div>
      </th>
      <td role="cell">
        <span aria-hidden="true" className="ledger-label">SKU</span>
        <span className="font-mono text-xs text-muted">{product.sku}</span>
      </td>
      <td role="cell">
        <span aria-hidden="true" className="ledger-label">Catégorie</span>
        {product.category.name}
      </td>
      <td role="cell" className="cell-end">
        <span aria-hidden="true" className="ledger-label">Quantité</span>
        <span className="font-semibold tabular-nums">{product.quantity}</span>
      </td>
      <td role="cell">
        <span aria-hidden="true" className="ledger-label">État du stock</span>
        <StockStatusBadge product={product} />
        <span className="mt-0.5 block text-xs text-muted">Minimum {product.min_stock}</span>
      </td>
      <td role="cell" className="cell-end">
        <span aria-hidden="true" className="ledger-label">Prix unitaire</span>
        <span className="tabular-nums"><ProductPrice value={product.unit_price} /></span>
      </td>
      <td role="cell">
        <span aria-hidden="true" className="ledger-label">Statut</span>
        <ProductStatus isActive={product.is_active} />
      </td>
    </tr>
  );
}

function productsPath(page: number) {
  return `/products${pageSearch(page)}`;
}

function pageSearch(page: number) {
  return page === 1 ? '' : `?page=${page}`;
}

function ProductList({ page, focusHeading }: { page: number; focusHeading: () => void }) {
  const [state, setState] = useState<ProductsState>({ status: 'loading' });
  const [loadAttempt, setLoadAttempt] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        const pagination = await productService.list({ page, signal: controller.signal });
        if (!Array.isArray(pagination?.data) || pagination.current_page !== page ||
          !Number.isSafeInteger(pagination.last_page) || pagination.last_page < 1) {
          throw new Error('Réponse de pagination inattendue.');
        }

        if (!controller.signal.aborted) {
          setState({ status: 'loaded', pagination });
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
  }, [loadAttempt, page]);

  function reloadProducts() {
    focusHeading();
    setState({ status: 'loading' });
    setLoadAttempt((attempt) => attempt + 1);
  }

  function goToPage(target: number) {
    focusHeading();
    void navigate(productsPath(target));
  }

  if (state.status === 'loading') return <LoadingState message="Chargement des produits…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={reloadProducts} />;

  const { data: products, current_page: currentPage, last_page: lastPage } = state.pagination;
  if (currentPage > lastPage) return <Navigate to={productsPath(lastPage)} replace />;

  return (
    <div className="panel">
      {products.length === 0 ? (
        <EmptyState title="Aucun produit" embedded />
      ) : (
        <table role="table" aria-labelledby="products-heading" className="ledger-table ledger-table--stack">
          <thead role="rowgroup">
            <tr role="row">
              {productColumns.map(({ label, className }) => <th key={label} role="columnheader" scope="col" className={className}>{label}</th>)}
            </tr>
          </thead>
          <tbody role="rowgroup">
            {products.map((product) => <ProductItem key={product.id} product={product} search={pageSearch(page)} />)}
          </tbody>
        </table>
      )}
      <LedgerPagination label="Pagination des produits" pagination={state.pagination} onPageChange={goToPage} />
    </div>
  );
}

export default function Products() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { session } = useAuth();
  const isAdmin = session.status === 'authenticated' && session.user.role === 'admin';
  const [searchParams] = useSearchParams();
  const queryPage = searchParams.get('page');
  const requestedPage = queryPage && /^\d+$/.test(queryPage) ? Number(queryPage) : 1;
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  return (
    <div lang="fr" className="page-content">
      <div className="page-heading">
        <h1 ref={headingRef} id="products-heading" tabIndex={-1} className="page-title">Produits</h1>
        {isAdmin && (
          <Link
            to={{ pathname: '/products/new', search: pageSearch(page) }}
            className="button button-primary"
          >
            <Plus aria-hidden="true" className="size-4" /> Ajouter un produit
          </Link>
        )}
      </div>
      <ProductList key={page} page={page} focusHeading={() => headingRef.current?.focus()} />
    </div>
  );
}
