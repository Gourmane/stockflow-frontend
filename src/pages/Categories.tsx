import { useEffect, useRef, useState } from 'react';
import { Layers3, Pencil, Plus } from 'lucide-react';
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
      <div className="page-heading">
        <h1 ref={headingRef} tabIndex={-1} className="page-title">Catégories</h1>
        {isAdmin && (
          <ActionButton
            disabled={state.status !== 'loaded'}
            onClick={() => openEditor({ mode: 'create' })}
          >
            <Plus aria-hidden="true" className="size-4" /> Ajouter une catégorie
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
            className="panel grid gap-px overflow-hidden bg-line p-0 sm:grid-cols-2"
          >
            {state.categories.map((category) => (
              <li key={category.id} className="flex min-h-14 items-center justify-between gap-2 bg-white px-3 py-1.5 text-sm font-semibold sm:px-4">
                <span className="flex min-w-0 items-center gap-2.5 wrap-anywhere">
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-brand-tint text-brand">
                    <Layers3 aria-hidden="true" className="size-4" />
                  </span>
                  {category.name}
                </span>
                {isAdmin && (
                  <ActionButton
                    variant="quiet"
                    className="button-compact shrink-0"
                    aria-label={`Modifier la catégorie ${category.name}`}
                    onClick={() => openEditor({ mode: 'update', category })}
                  >
                    <Pencil aria-hidden="true" className="size-3.5" /> Modifier
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
