import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import ActionButton from '../components/ActionButton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import { ProductFacts, ProductStatus } from '../components/ProductFacts';
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

function ProductItem({ product, search }: { product: Product; search: string }) {
  return (
    <li className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <h2 className="min-w-0 text-base font-semibold wrap-anywhere">
          <Link
            to={{ pathname: `/products/${product.id}`, search }}
            className="rounded-sm text-blue-800 underline decoration-blue-300 underline-offset-2 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            {product.name}
          </Link>
        </h2>
        <ProductStatus isActive={product.is_active} />
      </div>

      <ProductFacts product={product} />
    </li>
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
    <>
      {products.length === 0 ? (
        <EmptyState title="Aucun produit" />
      ) : (
        <ul
          role="list"
          aria-labelledby="products-heading"
          className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-3"
        >
          {products.map((product) => <ProductItem key={product.id} product={product} search={pageSearch(page)} />)}
        </ul>
      )}
      <nav aria-label="Pagination des produits" className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-700 tabular-nums">Page {currentPage} sur {lastPage}</p>
        <div className="flex flex-wrap gap-2">
          <ActionButton variant="secondary" disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)}>
            Précédent
          </ActionButton>
          <ActionButton variant="secondary" disabled={currentPage === lastPage} onClick={() => goToPage(currentPage + 1)}>
            Suivant
          </ActionButton>
        </div>
      </nav>
    </>
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
    <div lang="fr" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 ref={headingRef} id="products-heading" tabIndex={-1} className="text-2xl font-bold">Produits</h1>
        {isAdmin && (
          <Link
            to={{ pathname: '/products/new', search: pageSearch(page) }}
            className="inline-flex min-h-11 items-center rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Ajouter un produit
          </Link>
        )}
      </div>
      <ProductList key={page} page={page} focusHeading={() => headingRef.current?.focus()} />
    </div>
  );
}
