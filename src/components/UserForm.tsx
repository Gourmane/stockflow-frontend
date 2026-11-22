import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { getApiValidationError } from '../services/apiErrors';
import { getUserErrorMessage } from '../services/userErrors';
import { userService } from '../services/userService';
import type { Employee } from '../types/employee';
import ActionButton from './ActionButton';
import Feedback from './Feedback';
import FieldError from './FieldError';

const identityFields = [
  { name: 'name', label: 'Nom', type: 'text', autoComplete: 'off' },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'off' },
] as const;

const createFields = [
  ...identityFields,
  { name: 'password', label: 'Mot de passe', type: 'password', autoComplete: 'new-password' },
  { name: 'password_confirmation', label: 'Confirmation du mot de passe', type: 'password', autoComplete: 'new-password' },
  { name: 'role', label: 'Rôle' },
] as const;

type Field = (typeof createFields)[number]['name'];
type FieldErrors = Partial<Record<Field, string[]>>;
type FormValues = Record<Field, string>;

interface UserFormProps {
  employee?: Employee;
  runMutation: (request: () => Promise<unknown>) => Promise<void>;
  onSaved: (message: string) => void;
  onCancel: () => void;
}

function passwordErrors(messages: string[]) {
  return messages.map((message) => {
    const limit = /^The password must not exceed (\d+) bytes\.$/.exec(message)?.[1];
    return limit
      ? `Le mot de passe doit contenir au plus ${limit} octets.`
      : 'Vérifiez le mot de passe et sa confirmation.';
  });
}

export default function UserForm({ employee, runMutation, onSaved, onCancel }: UserFormProps) {
  const fields = employee ? identityFields : createFields;
  const [values, setValues] = useState<FormValues>(() => ({
    name: employee?.name ?? '',
    email: employee?.email ?? '',
    password: '',
    password_confirmation: '',
    role: 'employee',
  }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState('');
  const [pending, setPending] = useState(false);
  const [focusRequest, setFocusRequest] = useState<{ field?: Field }>();
  const heading = useRef<HTMLHeadingElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);
  const mounted = useRef(false);
  const name = values.name.trim();
  const email = values.email.trim();
  const changedName = !employee || name !== employee.name.trim();
  const changedEmail = !employee || email !== employee.email.trim();

  useEffect(() => {
    mounted.current = true;
    heading.current?.focus();
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!focusRequest || pending) return;
    const control = focusRequest.field && form.current?.elements.namedItem(focusRequest.field);
    if (control instanceof HTMLElement) control.focus();
    else feedback.current?.focus();
  }, [focusRequest, pending]);

  function showFailure(message: string, fieldErrors: FieldErrors = {}) {
    setErrors(fieldErrors);
    setFailure(message);
    setFocusRequest({ field: fields.find(({ name }) => fieldErrors[name]?.length)?.name });
  }

  function change(name: Field, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({
      ...current,
      [name]: undefined,
      ...(name === 'password' ? { password_confirmation: undefined } : {}),
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || (!changedName && !changedEmail)) return;

    const { password, password_confirmation, role } = values;
    const fieldErrors: FieldErrors = {};
    if (changedName) {
      if (!name) fieldErrors.name = ['Renseignez le nom.'];
      else if (Array.from(name).length > 255) fieldErrors.name = ['Le nom doit contenir au plus 255 caractères.'];
    }

    if (changedEmail) {
      const emailInput = event.currentTarget.elements.namedItem('email');
      if (!email) fieldErrors.email = ['Renseignez l’adresse email.'];
      else if (emailInput instanceof HTMLInputElement && emailInput.validity.typeMismatch) {
        fieldErrors.email = ['Saisissez une adresse email valide.'];
      } else if (Array.from(email).length > 255) {
        fieldErrors.email = ['L’adresse email doit contenir au plus 255 caractères.'];
      }
    }

    const validRole = role === 'admin' || role === 'employee';
    if (!employee) {
      if (!password) fieldErrors.password = ['Renseignez le mot de passe.'];
      else if (Array.from(password).length < 12) fieldErrors.password = ['Saisissez au moins 12 caractères.'];
      else if (password.includes('\0')) fieldErrors.password = ['Le mot de passe contient un caractère nul.'];
      if (!password_confirmation) fieldErrors.password_confirmation = ['Confirmez le mot de passe.'];
      else if (password !== password_confirmation) fieldErrors.password_confirmation = ['Les mots de passe doivent être identiques.'];
      if (!validRole) fieldErrors.role = ['Choisissez le rôle Admin ou Employé.'];
    }

    if (Object.keys(fieldErrors).length) {
      showFailure('Vérifiez les champs signalés.', fieldErrors);
      return;
    }

    submitting.current = true;
    setPending(true);
    setFailure('');
    setErrors({});
    setFocusRequest(undefined);
    try {
      if (employee) {
        await runMutation(() => userService.update(employee.id, {
          ...(changedName ? { name } : {}),
          ...(changedEmail ? { email } : {}),
        }));
      } else if (validRole) {
        await runMutation(() => userService.create({ name, email, password, password_confirmation, role }));
      }
      if (!mounted.current) return;
      setValues((current) => ({ ...current, password: '', password_confirmation: '' }));
      const message = employee ? 'Compte employé modifié.'
        : role === 'admin' ? 'Compte Admin créé. La liste affiche les comptes employés.'
          : 'Compte employé créé.';
      onSaved(message);
    } catch (error) {
      if (!mounted.current) return;
      const validation = getApiValidationError(error);
      const serverErrors: FieldErrors = {};
      for (const { name: field } of fields) {
        const messages = validation?.errors[field];
        if (!messages?.length) continue;
        if (field === 'password') serverErrors.password = passwordErrors(messages);
        else if (field === 'password_confirmation') serverErrors[field] = ['Vérifiez la confirmation du mot de passe.'];
        else serverErrors[field] = messages;
      }
      showFailure(Object.keys(serverErrors).length
        ? 'Vérifiez les champs signalés.'
        : getUserErrorMessage(error, 'Impossible de confirmer l’enregistrement du compte.'), serverErrors);
    } finally {
      submitting.current = false;
      if (mounted.current) setPending(false);
    }
  }

  return (
    <form
      ref={form}
      noValidate
      aria-labelledby="user-form-heading"
      onSubmit={(event) => void submit(event)}
      className="max-w-2xl panel space-y-5 p-4 sm:p-6"
    >
      <h2 id="user-form-heading" ref={heading} tabIndex={-1} className="text-lg font-semibold">
        {employee ? 'Modifier le compte employé' : 'Créer un utilisateur'}
      </h2>
      {failure && (
        <div ref={feedback} tabIndex={-1}>
          <Feedback status="error" message={failure} />
        </div>
      )}
      <fieldset disabled={pending} className="min-w-0 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => {
            const id = `user-${field.name}`;
            const messages = errors[field.name];
            const errorId = messages?.length ? `${id}-error` : undefined;
            const passwordHint = field.name === 'password' ? 'user-password-hint' : undefined;
            const controlProps = {
              id,
              name: field.name,
              value: values[field.name],
              required: true,
              className: 'field-control mt-1',
              'aria-invalid': Boolean(errorId),
              'aria-describedby': [passwordHint, errorId].filter(Boolean).join(' ') || undefined,
            };
            return (
              <div key={field.name} className="min-w-0">
                <label htmlFor={id} className="block text-sm font-medium">{field.label}</label>
                {field.name === 'role' ? (
                  <select {...controlProps} onChange={(event) => change(field.name, event.target.value)}>
                    <option value="employee">Employé</option>
                    <option value="admin">Admin</option>
                  </select>
                ) : (
                  <input
                    {...controlProps}
                    type={field.type}
                    autoComplete={field.autoComplete}
                    onChange={(event) => change(field.name, event.target.value)}
                  />
                )}
                {passwordHint && <p id={passwordHint} className="mt-1 text-sm text-muted">12 caractères minimum.</p>}
                <FieldError id={`${id}-error`} messages={messages} />
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton type="submit" disabled={!changedName && !changedEmail} isPending={pending} pendingLabel="Enregistrement…">
            {employee ? 'Enregistrer les modifications' : 'Créer le compte'}
          </ActionButton>
          <ActionButton variant="secondary" onClick={onCancel}>Annuler</ActionButton>
        </div>
      </fieldset>
    </form>
  );
}
