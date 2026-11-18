import { useEffect, useState } from 'react';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import { getAuthErrorMessage } from '../services/authErrors';
import { categoryService } from '../services/categoryService';
import type { Category } from '../types/category';

type CategoriesState =
  | { status: 'loading' }
  | { status: 'loaded'; categories: Category[] }
  | { status: 'error'; message: string };

const categoryErrorMessages = {
  401: 'Votre session a expiré. Reconnectez-vous pour consulter les catégories.',
  403: 'Vous n’avez pas accès aux catégories.',
};

export default function Categories() {
  const [state, setState] = useState<CategoriesState>({ status: 'loading' });
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategories() {
      try {
        const { data } = await categoryService.list(controller.signal);
        if (!Array.isArray(data)) throw new Error('Réponse inattendue pour les catégories.');

        if (!controller.signal.aborted) {
          setState({ status: 'loaded', categories: data });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setState({
            status: 'error',
            message: getAuthErrorMessage(error, categoryErrorMessages, 'Impossible de charger les catégories.'),
          });
        }
      }
    }

    void loadCategories();

    return () => controller.abort();
  }, [loadAttempt]);

  function retry() {
    setState({ status: 'loading' });
    setLoadAttempt((attempt) => attempt + 1);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Categories</h1>

      {state.status === 'loading' && <LoadingState message="Chargement des catégories…" />}
      {state.status === 'error' && <ErrorState message={state.message} onRetry={retry} />}
      {state.status === 'loaded' && (
        state.categories.length === 0 ? (
          <EmptyState title="Aucune catégorie" />
        ) : (
          <ul
            role="list"
            aria-label="Liste des catégories"
            className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white"
          >
            {state.categories.map(({ id, name }) => (
              <li key={id} className="px-4 py-3 text-sm font-medium wrap-anywhere sm:px-6">
                {name}
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
