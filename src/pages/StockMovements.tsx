import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import ActionButton from '../components/ActionButton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import { getAuthErrorMessage } from '../services/authErrors';
import { stockMovementService } from '../services/stockMovementService';
import type { Pagination } from '../types/api';
import type { StockMovementHistoryItem } from '../types/stockMovement';

const errorMessages = {
  401: 'Votre session a expiré. Reconnectez-vous pour consulter les mouvements de stock.',
  403: 'Vous n’avez pas accès à l’historique des mouvements de stock.',
  419: 'La vérification de sécurité (CSRF) a échoué. Reconnectez-vous puis réessayez.',
  500: 'Une erreur serveur empêche de charger les mouvements de stock.',
};
const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
const numberFormat = new Intl.NumberFormat('fr-FR');

type HistoryState =
  | { status: 'loading' }
  | { status: 'ready'; pagination: Pagination<StockMovementHistoryItem> }
  | { status: 'error'; message: string };

function historyPath(page: number) {
  return page === 1 ? '/stock-movements' : `/stock-movements?page=${page}`;
}

function HistoryItem({ movement }: { movement: StockMovementHistoryItem }) {
  const date = movement.created_at ? new Date(movement.created_at) : null;
  const isEntry = movement.type === 'in';

  return (
    <li className="min-w-0 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 wrap-anywhere">
          <h2 className="font-semibold">{movement.product.name}</h2>
          <p className="text-sm text-slate-600">SKU {movement.product.sku}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${isEntry
          ? 'bg-blue-50 text-blue-800'
          : 'bg-violet-50 text-violet-800'}`}
        >
          {isEntry ? 'Entrée (IN)' : 'Sortie (OUT)'}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 text-sm sm:grid-cols-3">
        <div className="min-w-0 wrap-anywhere">
          <dt className="text-slate-600">Date</dt>
          <dd>{date && Number.isFinite(date.getTime())
            ? <time dateTime={date.toISOString()}>{dateFormat.format(date)}</time>
            : 'Non renseignée'}</dd>
        </div>
        <div className="min-w-0 wrap-anywhere">
          <dt className="text-slate-600">Quantité</dt>
          <dd className="font-semibold tabular-nums">{numberFormat.format(movement.quantity)}</dd>
        </div>
        <div className="col-span-2 min-w-0 wrap-anywhere sm:col-span-1">
          <dt className="text-slate-600">Enregistré par</dt>
          <dd>{movement.user.name}</dd>
        </div>
        {movement.note && (
          <div className="col-span-full min-w-0">
            <dt className="text-slate-600">Note</dt>
            <dd className="whitespace-pre-wrap wrap-anywhere">{movement.note}</dd>
          </div>
        )}
      </dl>
    </li>
  );
}

function HistoryList({ page, focusHeading }: { page: number; focusHeading: () => void }) {
  const [state, setState] = useState<HistoryState>({ status: 'loading' });
  const [loadAttempt, setLoadAttempt] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function loadPage() {
      try {
        const pagination = await stockMovementService.list(page, signal);
        if (!Array.isArray(pagination?.data) || pagination.current_page !== page
          || !Number.isSafeInteger(pagination.last_page) || pagination.last_page < 1) {
          throw new Error('Réponse de pagination inattendue.');
        }
        if (!signal.aborted) setState({ status: 'ready', pagination });
      } catch (error) {
        if (!signal.aborted) {
          setState({
            status: 'error',
            message: getAuthErrorMessage(error, errorMessages, 'Impossible de charger les mouvements de stock.'),
          });
        }
      }
    }

    queueMicrotask(() => {
      if (!signal.aborted) void loadPage();
    });
    return () => controller.abort();
  }, [loadAttempt, page]);

  function retry() {
    focusHeading();
    setState({ status: 'loading' });
    setLoadAttempt((previous) => previous + 1);
  }

  if (state.status === 'loading') return <LoadingState message="Chargement des mouvements de stock…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={retry} />;

  const { data: movements, current_page: currentPage, last_page: lastPage } = state.pagination;
  if (currentPage > lastPage) return <Navigate to={historyPath(lastPage)} replace />;

  return (
    <>
      {movements.length ? (
        <ol role="list" aria-labelledby="stock-movements-heading" className="space-y-3">
          {movements.map((movement) => <HistoryItem key={movement.id} movement={movement} />)}
        </ol>
      ) : <EmptyState title="Aucun mouvement sur cette page" />}
      <nav aria-label="Pagination des mouvements" className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-700 tabular-nums">Page {currentPage} sur {lastPage}</p>
        <div className="flex flex-wrap gap-2">
          <ActionButton variant="secondary" disabled={currentPage === 1} onClick={() => void navigate(historyPath(currentPage - 1))}>
            Précédent
          </ActionButton>
          <ActionButton variant="secondary" disabled={currentPage === lastPage} onClick={() => void navigate(historyPath(currentPage + 1))}>
            Suivant
          </ActionButton>
        </div>
      </nav>
    </>
  );
}

export default function StockMovements() {
  const heading = useRef<HTMLHeadingElement>(null);
  const [searchParams] = useSearchParams();
  const queryPage = searchParams.get('page');
  const requestedPage = queryPage && /^\d+$/.test(queryPage) ? Number(queryPage) : 1;
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  useEffect(() => {
    heading.current?.focus();
  }, [page]);

  return (
    <div lang="fr" className="max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 id="stock-movements-heading" ref={heading} tabIndex={-1} className="text-2xl font-bold">Mouvements de stock</h1>
        <Link
          to="/products"
          className="inline-flex min-h-11 items-center rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Choisir un produit
        </Link>
      </div>
      <HistoryList key={page} page={page} focusHeading={() => heading.current?.focus()} />
    </div>
  );
}
