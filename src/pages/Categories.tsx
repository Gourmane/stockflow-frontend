import { useEffect, useRef, useState } from 'react';
import ActionButton from '../components/ActionButton';
import CategoryForm from '../components/CategoryForm';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Feedback from '../components/Feedback';
import LoadingState from '../components/LoadingState';
import { useAuth } from '../context/useAuth';
import { getAuthErrorMessage } from '../services/authErrors';
import { categoryService } from '../services/categoryService';
import type { Category } from '../types/category';

type CategoriesState =
  | { status: 'loading' }
  | { status: 'loaded'; categories: Category[] }
  | { status: 'error'; message: string };

type CategoryEditor = { mode: 'create' } | { mode: 'update'; category: Category };

const categoryErrorMessages = {
  401: 'Votre session a expiré. Reconnectez-vous pour consulter les catégories.',
  403: 'Vous n’avez pas accès aux catégories.',
};

export default function Categories() {
  const { session } = useAuth();
  const isAdmin = session.status === 'authenticated' && session.user.role === 'admin';
  const [state, setState] = useState<CategoriesState>({ status: 'loading' });
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [editor, setEditor] = useState<CategoryEditor | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);

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

  useEffect(() => {
    if (successMessage) headingRef.current?.focus();
  }, [successMessage]);

  function reloadCategories() {
    setState({ status: 'loading' });
    setLoadAttempt((attempt) => attempt + 1);
  }

  function openEditor(nextEditor: CategoryEditor) {
    setSuccessMessage('');
    setEditor(nextEditor);
  }

  function handleSaved() {
    setSuccessMessage(editor?.mode === 'update' ? 'Catégorie modifiée.' : 'Catégorie ajoutée.');
    setEditor(null);
    reloadCategories();
  }

  return (
    <div className="page-content">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 ref={headingRef} tabIndex={-1} className="page-title">Catégories</h1>
        {isAdmin && (
          <ActionButton
            disabled={state.status !== 'loaded'}
            onClick={() => openEditor({ mode: 'create' })}
          >
            Ajouter une catégorie
          </ActionButton>
        )}
      </div>

      {isAdmin && editor && (
        <CategoryForm
          category={editor.mode === 'update' ? editor.category : undefined}
          onCancel={() => setEditor(null)}
          onSaved={handleSaved}
        />
      )}
      {successMessage && <Feedback status="success" message={successMessage} />}

      {state.status === 'loading' && <LoadingState message="Chargement des catégories…" />}
      {state.status === 'error' && <ErrorState message={state.message} onRetry={reloadCategories} />}
      {state.status === 'loaded' && (
        state.categories.length === 0 ? (
          <EmptyState title="Aucune catégorie" />
        ) : (
          <ul
            role="list"
            aria-label="Liste des catégories"
            className="panel divide-y divide-line"
          >
            {state.categories.map((category) => (
              <li key={category.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm font-medium sm:px-6">
                <span className="min-w-0 wrap-anywhere">{category.name}</span>
                {isAdmin && (
                  <ActionButton
                    variant="secondary"
                    className="shrink-0"
                    aria-label={`Modifier la catégorie ${category.name}`}
                    onClick={() => openEditor({ mode: 'update', category })}
                  >
                    Modifier
                  </ActionButton>
                )}
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
