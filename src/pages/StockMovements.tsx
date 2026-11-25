import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { ArrowRight } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import LedgerPagination from '../components/LedgerPagination';
import MovementTable from '../components/MovementTable';
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

type HistoryState =
  | { status: 'loading' }
  | { status: 'ready'; pagination: Pagination<StockMovementHistoryItem> }
  | { status: 'error'; message: string };

function historyPath(page: number) {
  return page === 1 ? '/stock-movements' : `/stock-movements?page=${page}`;
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
    <div className="panel">
      {movements.length ? (
        <MovementTable headingId="stock-movements-heading" movements={movements} showNotes />
      ) : <EmptyState title="Aucun mouvement sur cette page" embedded />}
      <LedgerPagination
        label="Pagination des mouvements"
        pagination={state.pagination}
        onPageChange={(target) => void navigate(historyPath(target))}
      />
    </div>
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
    <div lang="fr" className="page-content">
      <div className="page-heading">
        <h1 id="stock-movements-heading" ref={heading} tabIndex={-1} className="page-title">Mouvements de stock</h1>
        <Link
          to="/products"
          className="button button-primary"
        >
          Choisir un produit <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      <HistoryList key={page} page={page} focusHeading={() => heading.current?.focus()} />
    </div>
  );
}
