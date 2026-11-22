import { useId, useLayoutEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { getApiValidationError } from '../services/apiErrors';
import { getAuthErrorMessage } from '../services/authErrors';
import { categoryService } from '../services/categoryService';
import type { Category } from '../types/category';
import ActionButton from './ActionButton';
import Feedback from './Feedback';
import FieldError from './FieldError';

const maxNameLength = 100;
const requiredNameMessage = 'Saisissez un nom.';
const maxNameLengthMessage = `Le nom doit contenir au maximum ${maxNameLength} caractères.`;

const nameValidationMessages = new Map([
  ['The name field is required.', requiredNameMessage],
  ['The name field must be a string.', 'Le nom doit être du texte.'],
  [`The name field must not be greater than ${maxNameLength} characters.`, maxNameLengthMessage],
  ['The name has already been taken.', 'Ce nom de catégorie est déjà utilisé.'],
]);

const saveErrorMessages = {
  401: 'Votre session a expiré. Reconnectez-vous pour enregistrer la catégorie.',
  403: 'Vous n’avez pas l’autorisation d’enregistrer cette catégorie.',
  404: 'Cette catégorie est introuvable.',
  419: 'La vérification de sécurité (CSRF) a échoué. Reconnectez-vous pour enregistrer la catégorie.',
  422: 'Le serveur a rejeté le nom de la catégorie. Vérifiez votre saisie.',
};

interface CategoryFormProps {
  category?: Category;
  onCancel: () => void;
  onSaved: () => void;
}

export default function CategoryForm({ category, onCancel, onSaved }: CategoryFormProps) {
  const [name, setName] = useState(category?.name ?? '');
  const [nameErrors, setNameErrors] = useState<string[]>([]);
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const nameId = useId();
  const nameErrorId = useId();

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.showModal();
    return () => dialog.close();
  }, []);

  function cancel() {
    if (!savingRef.current) onCancel();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;

    setSaveError('');
    setNameErrors([]);
    const trimmedName = name.trim();

    if (!trimmedName || Array.from(trimmedName).length > maxNameLength) {
      setNameErrors([trimmedName ? maxNameLengthMessage : requiredNameMessage]);
      nameRef.current?.focus();
      return;
    }

    savingRef.current = true;
    setIsSaving(true);

    try {
      const payload = { name: trimmedName };
      if (category) {
        await categoryService.update(category.id, payload);
      } else {
        await categoryService.create(payload);
      }
      onSaved();
    } catch (error) {
      const messages = getApiValidationError(error)?.errors.name;
      if (messages?.length) {
        setNameErrors(messages.map((message) => nameValidationMessages.get(message) ?? message));
        nameRef.current?.focus();
      } else {
        setSaveError(getAuthErrorMessage(error, saveErrorMessages, 'Impossible d’enregistrer la catégorie. Réessayez.'));
      }
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        cancel();
      }}
      className="ui-dialog"
    >
      <h2 id={titleId} className="text-lg font-semibold">
        {category ? 'Modifier la catégorie' : 'Ajouter une catégorie'}
      </h2>
      <form noValidate onSubmit={handleSubmit} className="mt-4 space-y-4">
        {saveError && <Feedback status="error" message={saveError} />}
        <div>
          <label htmlFor={nameId} className="mb-1 block text-sm font-medium">Nom de la catégorie</label>
          <input
            ref={nameRef}
            id={nameId}
            name="name"
            type="text"
            value={name}
            required
            readOnly={isSaving}
            aria-invalid={nameErrors.length > 0 || undefined}
            aria-describedby={nameErrors.length > 0 ? nameErrorId : undefined}
            onChange={(event) => {
              setName(event.target.value);
              setNameErrors([]);
            }}
            className="field-control"
          />
          <div aria-live="polite">
            <FieldError id={nameErrorId} messages={nameErrors} />
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <ActionButton variant="secondary" onClick={cancel} disabled={isSaving}>Annuler</ActionButton>
          <ActionButton type="submit" isPending={isSaving} pendingLabel="Enregistrement…">
            Enregistrer
          </ActionButton>
        </div>
      </form>
    </dialog>
  );
}
