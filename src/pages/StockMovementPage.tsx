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
import { useAuth } from '../context/useAuth';
import { getApiValidationError } from '../services/apiErrors';
import { getAuthErrorMessage, getHttpStatus } from '../services/authErrors';
import { productService } from '../services/productService';
import { stockMovementService } from '../services/stockMovementService';
import type { Product } from '../types/product';
import type { CreateStockMovementPayload, StockMovementType } from '../types/stockMovement';

// Matches Laravel's StockMovementService::MAX_QUANTITY and MySQL's unsigned INT.
const maxQuantity = 4_294_967_295;
const maxNoteLength = 1_000;
const numberFormat = new Intl.NumberFormat('fr-FR');
const statusMessages = {
  401: 'Votre session a expiré. Reconnectez-vous pour accéder aux mouvements de stock.',
  403: 'Vous n’avez pas accès à cette opération.',
  404: 'Ce produit est introuvable.',
  409: 'Cette clé correspond déjà à un autre mouvement. Vérifiez l’historique avant de renvoyer la saisie.',
  419: 'La vérification de sécurité (CSRF) a échoué. Reconnectez-vous puis réessayez.',
  422: 'Le serveur a rejeté le mouvement. Vérifiez les valeurs saisies.',
};

type LoadState = { status: 'loading' | 'ready' } | { status: 'error'; message: string };
type Field = 'product_id' | 'type' | 'quantity' | 'note';
type FieldErrors = Partial<Record<Field, string[]>>;
type Submission = { status: 'success' | 'error'; message: string };

function createMovementKey(): string {
  if (globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();

  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}

function readPendingMovement(storageKey: string, productId: number): CreateStockMovementPayload | null {
  try {
    const movement: CreateStockMovementPayload | null = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
    if (movement?.product_id === productId
      && typeof movement.idempotency_key === 'string'
      && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(movement.idempotency_key)
      && (movement.type === 'in' || movement.type === 'out')
      && Number.isInteger(movement.quantity) && movement.quantity >= 1 && movement.quantity <= maxQuantity
      && (typeof movement.note === 'string' || movement.note === null)) {
      return movement;
    }
  } catch {
    // The form can still retry in memory when session storage is unavailable.
  }
  return null;
}

function rememberMovement(storageKey: string, movement: CreateStockMovementPayload) {
  const serialized = JSON.stringify(movement);
  try {
    sessionStorage.setItem(storageKey, serialized);
  } catch {
    // The form still holds the request for a retry.
  }
  return () => {
    try {
      if (sessionStorage.getItem(storageKey) === serialized) sessionStorage.removeItem(storageKey);
    } catch {
      // Session storage may be unavailable.
    }
  };
}

function StockMovementForm({ id, storageKey }: { id: number; storageKey: string }) {
  const { search } = useLocation();
  const [product, setProduct] = useState<Product | null>(null);
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [retry, setRetry] = useState(() => readPendingMovement(storageKey, id));
  const [type, setType] = useState<StockMovementType>(retry?.type ?? 'in');
  const [quantity, setQuantity] = useState(retry ? String(retry.quantity) : '');
  const [note, setNote] = useState(retry?.note ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<Submission | null>(retry ? {
    status: 'error', message: 'Ce mouvement reste à confirmer. Réessayez pour obtenir son résultat.',
  } : null);
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
    if (submitting.current || load.status !== 'ready' || !product || (!isActive && !retry)) return;

    let movement = retry;
    if (!movement) {
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

      movement = { idempotency_key: createMovementKey(), product_id: id, type, quantity: amount, note: cleanNote || null };
    }

    submitting.current = true;
    const forgetMovement = rememberMovement(storageKey, movement);
    setPending(true);
    setFeedback(null);
    try {
      await stockMovementService.create(movement);
      forgetMovement();
      if (!mounted.current) return;
      setRetry(null);
      setQuantity('');
      setNote('');
      setFeedback({ status: 'success', message: 'Mouvement enregistré.' });
      reloadProduct();
    } catch (error) {
      const httpStatus = getHttpStatus(error);
      const rejected = httpStatus === 404 || httpStatus === 409 || httpStatus === 422
        || (!retry && (httpStatus === 401 || httpStatus === 403 || httpStatus === 419));
      if (rejected) forgetMovement();
      if (!mounted.current) return;
      setRetry(rejected ? null : movement);
      const validation = getApiValidationError(error);
      if (validation) {
        setErrors(validation.errors);
        if (validation.errors.product_id || validation.errors.quantity) reloadProduct();
      } else if (httpStatus === 404) {
        reloadProduct();
      }
      const message = getAuthErrorMessage(error, statusMessages, 'Impossible de confirmer l’enregistrement.');
      setFeedback({
        status: 'error',
        message: rejected ? message : `${message} Les informations du mouvement ont été conservées pour le prochain essai.`,
      });
    } finally {
      submitting.current = false;
      if (mounted.current) setPending(false);
    }
  }

  return (
    <div lang="fr" className="page-content max-w-3xl">
      <div className="flex flex-wrap gap-x-5">
        <Link to={`/products/${id}${search}`} className="text-link">Retour à la fiche produit</Link>
        <Link to="/stock-movements" className="text-link">Mouvements de stock</Link>
      </div>
      <h1 ref={heading} tabIndex={-1} className="page-title">Enregistrer un mouvement</h1>
      {feedback && <Feedback status={feedback.status} message={feedback.message} />}
      {load.status === 'loading' && <LoadingState message="Chargement du stock disponible…" />}
      {load.status === 'error' && <ErrorState message={load.message} onRetry={reloadProduct} />}
      {product && (
        <form noValidate onSubmit={(event) => void submit(event)} className="panel space-y-5 p-4 sm:p-6">
          <div className="rounded-lg bg-canvas p-4 wrap-anywhere" aria-describedby={errors.product_id?.length ? 'movement-product-error' : undefined}>
            <h2 className="font-semibold">{product.name}</h2>
            <p className="text-sm text-muted">SKU {product.sku}</p>
            {load.status === 'ready' && (
              <div role="status" className="mt-2 flex flex-wrap items-center gap-2">
                <p className="font-semibold tabular-nums">Stock disponible : {numberFormat.format(product.quantity)}</p>
                <StockStatusBadge product={product} />
              </div>
            )}
            {!isActive && <p className="mt-2 text-sm text-muted">Les entrées et sorties sont indisponibles pour ce produit inactif.</p>}
            <FieldError id="movement-product-error" messages={errors.product_id} />
          </div>
          <fieldset disabled={pending || load.status !== 'ready' || !isActive || Boolean(retry)} className="min-w-0 space-y-4">
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
                className="field-control mt-1"
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
                className="field-control mt-1"
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
                className="field-control mt-1"
              />
              <FieldError id="movement-note-error" messages={errors.note} />
            </div>
          </fieldset>
          <ActionButton
            type="submit"
            disabled={load.status !== 'ready' || (!isActive && !retry)}
            isPending={pending}
            pendingLabel="Enregistrement…"
          >
            {retry ? 'Réessayer ce mouvement' : 'Enregistrer'}
          </ActionButton>
        </form>
      )}
    </div>
  );
}

export default function StockMovementPage() {
  const { productId } = useParams();
  const { session } = useAuth();
  const id = productId && /^[1-9]\d*$/.test(productId) ? Number(productId) : NaN;
  if (!Number.isSafeInteger(id)) {
    return (
      <EmptyState
        title="Produit introuvable"
        action={<Link to="/products" className="text-link">Choisir un produit</Link>}
      />
    );
  }
  if (session.status !== 'authenticated') return null;
  const storageKey = `stockflow.pending-movement.${session.user.id}.${id}`;
  return <StockMovementForm key={storageKey} id={id} storageKey={storageKey} />;
}
