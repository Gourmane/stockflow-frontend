import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import ActionButton from '../components/ActionButton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Feedback from '../components/Feedback';
import FieldError from '../components/FieldError';
import LoadingState from '../components/LoadingState';
import StockStatusBadge from '../components/StockStatusBadge';
import { getApiValidationError } from '../services/apiErrors';
import { getAuthErrorMessage, getHttpStatus } from '../services/authErrors';
import { productService } from '../services/productService';
import { stockMovementService } from '../services/stockMovementService';
import type { Product } from '../types/product';
import type { StockMovementType } from '../types/stockMovement';

// Matches Laravel's StockMovementService::MAX_QUANTITY and MySQL's unsigned INT.
const maxQuantity = 4_294_967_295;
const maxNoteLength = 1_000;
const numberFormat = new Intl.NumberFormat('fr-FR');
const statusMessages = {
  401: 'Votre session a expiré. Reconnectez-vous pour accéder aux mouvements de stock.',
  403: 'Vous n’avez pas accès à cette opération.',
  404: 'Ce produit est introuvable.',
  419: 'La vérification de sécurité (CSRF) a échoué. Reconnectez-vous puis réessayez.',
  422: 'Le serveur a rejeté le mouvement. Vérifiez les valeurs saisies.',
};
const linkStyle = 'inline-flex min-h-11 w-fit items-center rounded-sm text-sm font-medium text-blue-800 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';
const inputStyle = 'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-blue-600 aria-invalid:border-red-700';

type LoadState = { status: 'loading' | 'ready' } | { status: 'error'; message: string };
type Field = 'product_id' | 'type' | 'quantity' | 'note';
type FieldErrors = Partial<Record<Field, string[]>>;
type Submission = { status: 'success' | 'error'; message: string };

function StockMovementForm({ id }: { id: number }) {
  const { search } = useLocation();
  const [product, setProduct] = useState<Product | null>(null);
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [type, setType] = useState<StockMovementType>('in');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<Submission | null>(null);
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const mounted = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const isActive = product?.is_active === 1;

  useEffect(() => {
    mounted.current = true;
    heading.current?.focus();
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function fetchProduct() {
      try {
        const { data } = await productService.get(id, signal);
        if (data?.id !== id || !Number.isInteger(data.quantity) || data.quantity < 0 || data.quantity > maxQuantity
          || (data.is_active !== 0 && data.is_active !== 1)) {
          throw new Error('Réponse produit inattendue.');
        }
        if (signal.aborted) return;
        setProduct(data);
        setLoad({ status: 'ready' });
      } catch (error) {
        if (signal.aborted) return;
        setLoad({
          status: 'error',
          message: getAuthErrorMessage(error, statusMessages, 'Impossible de charger le stock disponible.'),
        });
      }
    }

    queueMicrotask(() => {
      if (!signal.aborted) void fetchProduct();
    });
    return () => controller.abort();
  }, [attempt, id]);

  function reloadProduct() {
    setLoad({ status: 'loading' });
    setAttempt((previous) => previous + 1);
  }

  function clearFieldError(field: Field) {
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || load.status !== 'ready' || !product || !isActive) return;

    const amount = Number(quantity);
    const cleanNote = note.trim();
    const fieldErrors: FieldErrors = {};

    if (!/^\d+$/.test(quantity) || !Number.isSafeInteger(amount) || amount < 1) {
      fieldErrors.quantity = ['Saisissez un entier strictement positif.'];
    } else if (amount > maxQuantity) {
      fieldErrors.quantity = [`La quantité maximale est de ${numberFormat.format(maxQuantity)}.`];
    } else if (type === 'out' && amount > product.quantity) {
      fieldErrors.quantity = ['La quantité dépasse le stock disponible.'];
    } else if (type === 'in' && amount > maxQuantity - product.quantity) {
      fieldErrors.quantity = ['Cette entrée dépasserait le stock maximal autorisé.'];
    }
    if (Array.from(cleanNote).length > maxNoteLength) {
      fieldErrors.note = ['La note doit contenir au plus 1 000 caractères.'];
    }

    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) {
      setFeedback({ status: 'error', message: 'Vérifiez les champs signalés.' });
      return;
    }

    submitting.current = true;
    setPending(true);
    setFeedback(null);
    try {
      await stockMovementService.create({ product_id: id, type, quantity: amount, note: cleanNote || null });
      if (!mounted.current) return;
      setQuantity('');
      setNote('');
      setFeedback({ status: 'success', message: 'Mouvement enregistré.' });
      reloadProduct();
    } catch (error) {
      if (!mounted.current) return;
      const httpStatus = getHttpStatus(error);
      const validation = getApiValidationError(error);
      if (validation) {
        setErrors(validation.errors);
        if (validation.errors.product_id || validation.errors.quantity) reloadProduct();
      } else if (httpStatus === 404) {
        reloadProduct();
      }
      const message = getAuthErrorMessage(error, statusMessages, 'Impossible de confirmer l’enregistrement.');
      const outcomeUnknown = httpStatus === undefined || httpStatus >= 500;
      setFeedback({
        status: 'error',
        message: outcomeUnknown ? `${message} Vérifiez les mouvements de stock avant de renvoyer cette saisie.` : message,
      });
    } finally {
      submitting.current = false;
      if (mounted.current) setPending(false);
    }
  }

  return (
    <div lang="fr" className="max-w-2xl space-y-4">
      <div className="flex flex-wrap gap-x-5">
        <Link to={`/products/${id}${search}`} className={linkStyle}>Retour à la fiche produit</Link>
        <Link to="/stock-movements" className={linkStyle}>Mouvements de stock</Link>
      </div>
      <h1 ref={heading} tabIndex={-1} className="text-2xl font-bold">Enregistrer un mouvement</h1>
      {feedback && <Feedback status={feedback.status} message={feedback.message} />}
      {load.status === 'loading' && <LoadingState message="Chargement du stock disponible…" />}
      {load.status === 'error' && <ErrorState message={load.message} onRetry={reloadProduct} />}
      {product && (
        <form noValidate onSubmit={(event) => void submit(event)} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
          <div className="rounded-lg bg-slate-100 p-3 wrap-anywhere" aria-describedby={errors.product_id?.length ? 'movement-product-error' : undefined}>
            <h2 className="font-semibold">{product.name}</h2>
            <p className="text-sm text-slate-700">SKU {product.sku}</p>
            {load.status === 'ready' && (
              <div role="status" className="mt-2 flex flex-wrap items-center gap-2">
                <p className="font-semibold tabular-nums">Stock disponible : {numberFormat.format(product.quantity)}</p>
                <StockStatusBadge product={product} />
              </div>
            )}
            {!isActive && <p className="mt-2 text-sm text-slate-700">Les entrées et sorties sont indisponibles pour ce produit inactif.</p>}
            <FieldError id="movement-product-error" messages={errors.product_id} />
          </div>
          <fieldset disabled={pending || load.status !== 'ready' || !isActive} className="min-w-0 space-y-4">
            <div>
              <label htmlFor="movement-type" className="text-sm font-medium">Type de mouvement</label>
              <select
                id="movement-type"
                value={type}
                onChange={(event) => {
                  setType(event.target.value === 'out' ? 'out' : 'in');
                  clearFieldError('type');
                  clearFieldError('quantity');
                }}
                aria-invalid={Boolean(errors.type?.length)}
                aria-describedby={errors.type?.length ? 'movement-type-error' : undefined}
                className={inputStyle}
              >
                <option value="in">Entrée (IN)</option>
                <option value="out">Sortie (OUT)</option>
              </select>
              <FieldError id="movement-type-error" messages={errors.type} />
            </div>
            <div>
              <label htmlFor="movement-quantity" className="text-sm font-medium">Quantité</label>
              <input
                id="movement-quantity"
                inputMode="numeric"
                required
                value={quantity}
                onChange={(event) => { setQuantity(event.target.value); clearFieldError('quantity'); }}
                aria-invalid={Boolean(errors.quantity?.length)}
                aria-describedby={errors.quantity?.length ? 'movement-quantity-error' : undefined}
                className={inputStyle}
              />
              <FieldError id="movement-quantity-error" messages={errors.quantity} />
            </div>
            <div>
              <label htmlFor="movement-note" className="text-sm font-medium">Note (facultative)</label>
              <textarea
                id="movement-note"
                rows={3}
                value={note}
                onChange={(event) => { setNote(event.target.value); clearFieldError('note'); }}
                aria-invalid={Boolean(errors.note?.length)}
                aria-describedby={errors.note?.length ? 'movement-note-error' : undefined}
                className={inputStyle}
              />
              <FieldError id="movement-note-error" messages={errors.note} />
            </div>
            <ActionButton type="submit" isPending={pending} pendingLabel="Enregistrement…">Enregistrer</ActionButton>
          </fieldset>
        </form>
      )}
    </div>
  );
}

export default function StockMovementPage() {
  const { productId } = useParams();
  const id = productId && /^[1-9]\d*$/.test(productId) ? Number(productId) : NaN;
  if (!Number.isSafeInteger(id)) {
    return (
      <EmptyState
        title="Produit introuvable"
        action={<Link to="/products" className={linkStyle}>Choisir un produit</Link>}
      />
    );
  }
  return <StockMovementForm key={id} id={id} />;
}
