import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Boxes, CircleAlert, Package, TriangleAlert } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import MovementTable from '../components/MovementTable';
import { useAuth } from '../context/useAuth';
import { getAuthErrorMessage } from '../services/authErrors';
import { dashboardService } from '../services/dashboardService';
import type { DashboardStats } from '../types/dashboard';

const errorMessages = {
  403: 'Vous n’avez pas accès au tableau de bord.',
  419: 'La vérification de sécurité (CSRF) a échoué. Réessayez, puis reconnectez-vous si le problème persiste.',
  500: 'Une erreur serveur empêche de charger le tableau de bord.',
};
const numberFormat = new Intl.NumberFormat('fr-FR');
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

export default function Dashboard() {
  const { session } = useAuth();
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
  }, [loadAttempt]);

  function retry() {
    heading.current?.focus();
    setState({ status: 'loading' });
    setLoadAttempt((attempt) => attempt + 1);
  }

  return (
    <div lang="fr" className="page-content">
      <div className="page-heading">
        <div>
          <h1 ref={heading} tabIndex={-1} className="page-title">Tableau de bord</h1>
          {session.status === 'authenticated' && (
            <p className="mt-1 text-sm wrap-anywhere text-muted">Bienvenue, {session.user.name}.</p>
          )}
        </div>
      </div>
      {state.status === 'loading' && <LoadingState message="Chargement du tableau de bord…" />}
      {state.status === 'error' && <ErrorState message={state.message} onRetry={retry} />}
      {state.status === 'ready' && (
        <>
          <dl className="stock-summary" aria-label="Indicateurs de stock">
            {indicators.map(({ key, label, icon: Icon, tone }) => (
              <div key={key} className={`stock-metric ${key === 'total_products' ? 'bg-brand-tint/65' : ''}`}>
                <dt className="flex items-center gap-2 text-xs leading-tight font-semibold text-muted sm:text-sm">
                  <span className={`grid size-7 shrink-0 place-items-center rounded-md ${tone}`} aria-hidden="true">
                    <Icon className="size-4" />
                  </span>
                  {label}
                </dt>
                <dd className="self-end text-[clamp(1.65rem,3vw,2.25rem)] leading-none font-bold tracking-tight tabular-nums">
                  {numberFormat.format(state.stats[key])}
                </dd>
              </div>
            ))}
          </dl>
          <section aria-labelledby="dashboard-movements-heading" className="panel">
            <div className="flex flex-wrap items-center justify-between gap-x-4 px-3 py-1.5 sm:px-4">
              <h2 id="dashboard-movements-heading" className="text-base font-bold">Mouvements récents</h2>
              <Link
                to="/stock-movements"
                className="text-link"
              >
                Voir l’historique <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
            {state.stats.recent_movements.length > 0 ? (
              <MovementTable headingId="dashboard-movements-heading" movements={state.stats.recent_movements} />
            ) : <EmptyState title="Aucun mouvement de stock enregistré" embedded />}
          </section>
        </>
      )}
    </div>
  );
}
