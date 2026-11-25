import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Feedback from '../components/Feedback';
import LoadingState from '../components/LoadingState';
import ProductDetails from '../components/ProductDetails';
import ProductForm from '../components/ProductForm';
import { getAuthErrorMessage, getHttpStatus } from '../services/authErrors';
import { categoryService } from '../services/categoryService';
import { productService } from '../services/productService';
import type { Category } from '../types/category';
import type { Product } from '../types/product';

type Mode = 'details' | 'create' | 'edit';

type ProductPageState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error'; message: string }
  | { status: 'details'; product: Product }
  | { status: 'form'; categories: Category[]; product?: Product };

const titles = {
  details: 'Fiche produit',
  create: 'Ajouter un produit',
  edit: 'Modifier le produit',
};

const loadErrorMessages = {
  401: 'Votre session a expiré. Reconnectez-vous pour accéder au catalogue.',
  403: 'Vous n’avez pas accès à ces informations.',
  419: 'La vérification de sécurité a échoué. Réessayez.',
};

function ProductPageContent({ mode, id }: { mode: Mode; id: number | null }) {
  const [state, setState] = useState<ProductPageState>({ status: 'loading' });
  const [loadAttempt, setLoadAttempt] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const listPath = `/products${location.search}`;
  const detailsPath = `/products/${id}${location.search}`;
  const editPath = `/products/${id}/edit${location.search}`;
  const movementPath = `/stock-movements/new/${id}${location.search}`;
  const feedback = location.state === 'product-created' ? 'Produit créé.' : 'Modifications enregistrées.';

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    if (mode !== 'create' && id === null) return;
    const controller = new AbortController();
    const { signal } = controller;

    async function load() {
      let product: Product | undefined;
      try {
        if (id !== null) {
          const { data } = await productService.get(id, signal);
          if (data?.id !== id || !data.category) throw new Error('Réponse produit inattendue.');
          product = data;
        }

        if (signal.aborted) return;
        if (mode === 'details' && product) {
          setState({ status: 'details', product });
          return;
        }

        const { data: categories } = await categoryService.list(signal);
        if (!Array.isArray(categories)) throw new Error('Réponse catégories inattendue.');
        if (!signal.aborted) setState({ status: 'form', categories, product });
      } catch (error) {
        if (signal.aborted) return;
        if (id !== null && !product && getHttpStatus(error) === 404) {
          setState({ status: 'not-found' });
          return;
        }
        setState({
          status: 'error',
          message: getAuthErrorMessage(error, loadErrorMessages, 'Impossible de charger cette page produit.'),
        });
      }
    }

    queueMicrotask(() => {
      if (!signal.aborted) void load();
    });
    return () => controller.abort();
  }, [id, loadAttempt, mode]);

  function retry() {
    headingRef.current?.focus();
    setState({ status: 'loading' });
    setLoadAttempt((attempt) => attempt + 1);
  }

  function showSavedProduct(productId: number) {
    void navigate(`/products/${productId}${location.search}`, {
      replace: true,
      state: mode === 'create' ? 'product-created' : 'product-updated',
    });
  }

  const notFound = state.status === 'not-found' || (mode !== 'create' && id === null);
  const returnToDetails = mode === 'edit' && !notFound;

  return (
    <div lang="fr" className="page-content max-w-4xl">
      <Link to={returnToDetails ? detailsPath : listPath} className="text-link">
        {returnToDetails ? 'Retour à la fiche produit' : 'Retour aux produits'}
      </Link>
      <h1 ref={headingRef} tabIndex={-1} className="page-title">{titles[mode]}</h1>
      {mode === 'details' && (location.state === 'product-created' || location.state === 'product-updated') && (
        <Feedback status="success" message={feedback} />
      )}

      {notFound ? (
        <EmptyState title="Produit introuvable" description="Vérifiez l’adresse ou revenez à la liste des produits." />
      ) : (
        <>
          {state.status === 'loading' && <LoadingState message="Chargement de la page produit…" />}
          {state.status === 'error' && <ErrorState message={state.message} onRetry={retry} />}
          {state.status === 'details' && (
            <ProductDetails product={state.product} editPath={editPath} movementPath={movementPath} />
          )}
          {state.status === 'form' && (state.categories.length ? (
            <ProductForm
              categories={state.categories}
              product={state.product}
              cancelPath={returnToDetails ? detailsPath : listPath}
              onSaved={showSavedProduct}
            />
          ) : (
            <EmptyState
              title="Aucune catégorie disponible"
              description="Ajoutez une catégorie pour pouvoir enregistrer un produit."
              action={<Link to="/categories" className="text-link">Voir les catégories</Link>}
            />
          ))}
        </>
      )}
    </div>
  );
}

export default function ProductPage({ mode }: { mode: Mode }) {
  const { productId } = useParams();
  const parsedId = productId && /^[1-9]\d*$/.test(productId) ? Number(productId) : null;
  const id = mode !== 'create' && Number.isSafeInteger(parsedId) ? parsedId : null;

  return <ProductPageContent key={`${mode}:${productId ?? ''}`} mode={mode} id={id} />;
}
