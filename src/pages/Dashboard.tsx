import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Boxes, CircleAlert, Package, TriangleAlert } from 'lucide-react';
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
  { key: 'total_products', label: 'Références produits', icon: Package, tone: 'bg-brand-tint text-brand' },
  { key: 'total_units', label: 'Unités en stock', icon: Boxes, tone: 'bg-zinc-100 text-ink' },
  { key: 'low_stock_count', label: 'Références en stock faible', icon: TriangleAlert, tone: 'bg-amber-50 text-amber-800' },
  { key: 'out_of_stock_count', label: 'Références en rupture', icon: CircleAlert, tone: 'bg-red-50 text-red-800' },
] as const;

type DashboardState =
  | { status: 'loading' }
  | { status: 'ready'; stats: DashboardStats }
  | { status: 'error'; message: string };

function MovementItem({ movement }: { movement: DashboardMovement }) {
  const date = movement.created_at ? new Date(movement.created_at) : null;
  const isEntry = movement.type === 'in';

  return (
    <li className="grid min-w-0 gap-3 px-4 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,5fr)] sm:items-start sm:px-5">
      <div className="min-w-0 wrap-anywhere">
        <h3 className="font-semibold">{movement.product.name}</h3>
        <p className="text-sm text-muted">SKU {movement.product.sku}</p>
      </div>
      <dl className="grid grid-cols-2 items-start gap-x-3 gap-y-2 text-sm md:grid-cols-[7rem_4.25rem_minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <dt className="sr-only">Type</dt>
          <dd>
            <span className={`badge ${isEntry
              ? 'bg-emerald-50 text-emerald-800'
              : 'bg-zinc-100 text-zinc-800'}`}
            >
              {isEntry
                ? <ArrowDownLeft aria-hidden="true" className="size-3.5 shrink-0" />
                : <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0" />}
              {isEntry ? 'Entrée (IN)' : 'Sortie (OUT)'}
            </span>
          </dd>
        </div>
        <div className="min-w-0 wrap-anywhere">
          <dt className="text-muted">Quantité</dt>
          <dd className="font-semibold tabular-nums">{numberFormat.format(movement.quantity)}</dd>
        </div>
        <div className="min-w-0 wrap-anywhere">
          <dt className="text-muted">Date</dt>
          <dd>{date && Number.isFinite(date.getTime())
            ? <time dateTime={date.toISOString()}>{dateFormat.format(date)}</time>
            : 'Non renseignée'}</dd>
        </div>
        <div className="min-w-0 wrap-anywhere">
          <dt className="text-muted">Enregistré par</dt>
          <dd>{movement.user.name}</dd>
        </div>
      </dl>
    </li>
  );
}

export default function Dashboard() {
  const { expireSession, session } = useAuth();
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
    <div lang="fr" className="page-content">
      <div>
        <h1 ref={heading} tabIndex={-1} className="page-title">Tableau de bord</h1>
        {session.status === 'authenticated' && (
          <p className="mt-1.5 text-sm wrap-anywhere text-muted">Bienvenue, {session.user.name}.</p>
        )}
      </div>
      {state.status === 'loading' && <LoadingState message="Chargement du tableau de bord…" />}
      {state.status === 'error' && <ErrorState message={state.message} onRetry={retry} />}
      {state.status === 'ready' && (
        <>
          <dl className="grid gap-3 min-[360px]:grid-cols-2 min-[75rem]:grid-cols-4">
            {indicators.map(({ key, label, icon: Icon, tone }) => (
              <div key={key} className="panel grid min-w-0 grid-rows-[1fr_auto] gap-2 p-4 wrap-anywhere sm:p-5">
                <dt className="flex flex-col gap-2 text-sm font-medium text-muted">
                  <span className={`grid size-9 place-items-center rounded-lg ${tone}`} aria-hidden="true">
                    <Icon className="size-[18px]" />
                  </span>
                  {label}
                </dt>
                <dd className="text-3xl font-bold tracking-tight tabular-nums">
                  {numberFormat.format(state.stats[key])}
                </dd>
              </div>
            ))}
          </dl>
          <section aria-labelledby="dashboard-movements-heading" className="panel">
            <div className="flex flex-wrap items-center justify-between gap-x-4 border-b border-line px-4 py-2 sm:px-5">
              <h2 id="dashboard-movements-heading" className="text-lg font-semibold">Mouvements récents</h2>
              <Link
                to="/stock-movements"
                className="text-link"
              >
                Voir l’historique <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
            {state.stats.recent_movements.length > 0 ? (
              <ol role="list" className="divide-y divide-line">
                {state.stats.recent_movements.map((movement) => <MovementItem key={movement.id} movement={movement} />)}
              </ol>
            ) : <EmptyState title="Aucun mouvement de stock enregistré" embedded />}
          </section>
        </>
      )}
    </div>
  );
}
