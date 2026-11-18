import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../context/useAuth';
import { getAuthErrorMessage } from '../services/authErrors';
import { productService } from '../services/productService';
import type { Product } from '../types/product';
import ActionButton from './ActionButton';
import ConfirmDialog from './ConfirmDialog';
import Feedback from './Feedback';
import { ProductFacts, ProductStatus } from './ProductFacts';

const statusErrorMessages = {
  401: 'Votre session a expiré. Reconnectez-vous pour changer le statut du produit.',
  403: 'Vous n’avez pas l’autorisation de changer le statut de ce produit.',
  404: 'Ce produit est introuvable.',
  419: 'La vérification de sécurité (CSRF) a échoué. Reconnectez-vous pour changer le statut du produit.',
  422: 'Le serveur a rejeté le changement de statut.',
};

export default function ProductDetails({ product: initialProduct, editPath }: { product: Product; editPath: string }) {
  const [product, setProduct] = useState(initialProduct);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ status: 'success' | 'error'; message: string } | null>(null);
  const savingRef = useRef(false);
  const mountedRef = useRef(false);
  const { session } = useAuth();
  const isAdmin = session.status === 'authenticated' && session.user.role === 'admin';
  const isActive = product.is_active === 1;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  async function updateStatus(nextStatus: boolean) {
    if (!isAdmin || savingRef.current) return;

    savingRef.current = true;
    setIsSaving(true);
    setFeedback(null);

    try {
      const { data } = await productService.update(product.id, { is_active: nextStatus });
      if (data?.id !== product.id || !data.category || ![0, 1, false, true, '0', '1'].includes(data.is_active)) {
        throw new Error('Réponse produit inattendue.');
      }
      const savedStatus = Number(data.is_active) === 1;
      if (!mountedRef.current) return;
      setProduct({
        ...data,
        unit_price: data.unit_price === null ? null : String(data.unit_price),
        is_active: savedStatus ? 1 : 0,
      });
      setIsConfirming(false);
      setFeedback({ status: 'success', message: savedStatus ? 'Produit réactivé.' : 'Produit désactivé.' });
    } catch (error) {
      if (!mountedRef.current) return;
      setFeedback({
        status: 'error',
        message: getAuthErrorMessage(error, statusErrorMessages, 'Impossible de changer le statut du produit. Réessayez.'),
      });
    } finally {
      savingRef.current = false;
      if (mountedRef.current) setIsSaving(false);
    }
  }

  function requestStatusChange() {
    if (savingRef.current) return;
    if (isActive) {
      setFeedback(null);
      setIsConfirming(true);
    } else {
      void updateStatus(true);
    }
  }

  function closeConfirmation() {
    if (savingRef.current) return;
    setIsConfirming(false);
    setFeedback(null);
  }

  return (
    <section aria-labelledby="product-name" className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="product-name" className="min-w-0 text-lg font-semibold wrap-anywhere">{product.name}</h2>
        <ProductStatus isActive={product.is_active} />
      </div>
      <ProductFacts product={product} details />
      {isAdmin && (
        <>
          {feedback && !isConfirming && <Feedback status={feedback.status} message={feedback.message} />}
          <div className="flex flex-wrap gap-2">
            <Link
              to={editPath}
              className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Modifier le produit
            </Link>
            <ActionButton
              variant={isActive ? 'secondary' : 'primary'}
              onClick={requestStatusChange}
              isPending={isSaving && !isConfirming}
              disabled={isSaving}
              pendingLabel="Réactivation…"
            >
              {isActive ? 'Désactiver' : 'Réactiver'}
            </ActionButton>
          </div>
          <ConfirmDialog
            open={isConfirming}
            title="Désactiver le produit"
            description="Le produit restera visible dans le catalogue avec le statut inactif."
            confirmLabel="Désactiver"
            onConfirm={() => void updateStatus(false)}
            onClose={closeConfirmation}
            destructive
            isPending={isSaving}
            error={isConfirming && feedback?.status === 'error' ? feedback.message : undefined}
          />
        </>
      )}
    </section>
  );
}
