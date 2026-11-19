import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import { useAuth } from '../context/useAuth';
import { getAuthErrorMessage, getHttpStatus } from '../services/authErrors';
import { dashboardService } from '../services/dashboardService';
import type { DashboardMovement, DashboardStats } from '../types/dashboard';

const errorMessages = {
  403: 'Vous n’avez pas accès au tableau de bord.',
  419: 'La vérification de sécurité (CSRF) a échoué. Réessayez, puis reconnectez-vous si le problème persiste.',
  500: 'Une erreur serveur empêche de charger le tableau de bord.',
};
const numberFormat = new Intl.NumberFormat('fr-FR');
const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
const indicators = [
  { key: 'total_products', label: 'Références produits', color: 'text-slate-900' },
  { key: 'total_units', label: 'Unités en stock', color: 'text-slate-900' },
  { key: 'low_stock_count', label: 'Références en stock faible', color: 'text-amber-800' },
  { key: 'out_of_stock_count', label: 'Références en rupture', color: 'text-red-800' },
] as const;

type DashboardState =
  | { status: 'loading' }
  | { status: 'ready'; stats: DashboardStats }
  | { status: 'error'; message: string };

function MovementItem({ movement }: { movement: DashboardMovement }) {
  const date = movement.created_at ? new Date(movement.created_at) : null;
  const isEntry = movement.type === 'in';

  return (
    <li className="grid min-w-0 gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-start sm:px-5">
      <div className="min-w-0 wrap-anywhere">
        <h3 className="font-semibold">{movement.product.name}</h3>
        <p className="text-sm text-slate-600">SKU {movement.product.sku}</p>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div>
          <dt className="sr-only">Type</dt>
          <dd>
            <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${isEntry
              ? 'bg-blue-50 text-blue-800'
              : 'bg-violet-50 text-violet-800'}`}
            >
              {isEntry ? 'Entrée (IN)' : 'Sortie (OUT)'}
            </span>
          </dd>
        </div>
        <div className="min-w-0 wrap-anywhere">
          <dt className="text-slate-600">Quantité</dt>
          <dd className="font-semibold tabular-nums">{numberFormat.format(movement.quantity)}</dd>
        </div>
        <div className="min-w-0 wrap-anywhere">
          <dt className="text-slate-600">Date</dt>
          <dd>{date && Number.isFinite(date.getTime())
            ? <time dateTime={date.toISOString()}>{dateFormat.format(date)}</time>
            : 'Non renseignée'}</dd>
        </div>
        <div className="min-w-0 wrap-anywhere">
          <dt className="text-slate-600">Enregistré par</dt>
          <dd>{movement.user.name}</dd>
        </div>
      </dl>
    </li>
  );
}

export default function Dashboard() {
  const { expireSession } = useAuth();
  const heading = useRef<HTMLHeadingElement>(null);
  const [state, setState] = useState<DashboardState>({ status: 'loading' });
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => { heading.current?.focus(); }, []);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function loadDashboard() {
      try {
        const stats = await dashboardService.get(signal);
        if (!signal.aborted) setState({ status: 'ready', stats });
      } catch (error) {
        if (signal.aborted) return;
        if (getHttpStatus(error) === 401) {
          expireSession();
          return;
        }
        setState({
          status: 'error',
          message: getAuthErrorMessage(error, errorMessages, 'Impossible de charger le tableau de bord.'),
        });
      }
    }

    queueMicrotask(() => {
      if (!signal.aborted) void loadDashboard();
    });
    return () => controller.abort();
  }, [expireSession, loadAttempt]);

  function retry() {
    heading.current?.focus();
    setState({ status: 'loading' });
    setLoadAttempt((attempt) => attempt + 1);
  }

  return (
    <div lang="fr" className="max-w-5xl space-y-6">
      <h1 ref={heading} tabIndex={-1} className="text-2xl font-bold">Dashboard StockFlow</h1>
      {state.status === 'loading' && <LoadingState message="Chargement du tableau de bord…" />}
      {state.status === 'error' && <ErrorState message={state.message} onRetry={retry} />}
      {state.status === 'ready' && (
        <>
          <dl className="grid gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
            {indicators.map(({ key, label, color }) => (
              <div key={key} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 wrap-anywhere">
                <dt className="text-sm font-medium text-slate-700">{label}</dt>
                <dd className={`mt-2 text-3xl font-semibold tracking-tight tabular-nums ${color}`}>
                  {numberFormat.format(state.stats[key])}
                </dd>
              </div>
            ))}
          </dl>
          <section aria-labelledby="dashboard-movements-heading" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-x-4">
              <h2 id="dashboard-movements-heading" className="text-lg font-semibold">Mouvements récents</h2>
              <Link
                to="/stock-movements"
                className="inline-flex min-h-11 items-center rounded-sm text-sm font-medium text-blue-800 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Voir l’historique
              </Link>
            </div>
            {state.stats.recent_movements.length > 0 ? (
              <ol role="list" className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                {state.stats.recent_movements.map((movement) => <MovementItem key={movement.id} movement={movement} />)}
              </ol>
            ) : <EmptyState title="Aucun mouvement de stock enregistré" />}
          </section>
        </>
      )}
    </div>
  );
}
