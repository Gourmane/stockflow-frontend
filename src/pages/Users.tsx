import { useEffect, useRef, useState } from 'react';
import { Pencil, UserRoundPlus } from 'lucide-react';
import ActionButton from '../components/ActionButton';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Feedback from '../components/Feedback';
import LoadingState from '../components/LoadingState';
import UserAvatar from '../components/UserAvatar';
import UserForm from '../components/UserForm';
import { getHttpStatus } from '../services/authErrors';
import { authService } from '../services/authService';
import { getUserErrorMessage } from '../services/userErrors';
import { userService } from '../services/userService';
import type { Employee } from '../types/employee';

type ListState =
  | { status: 'loading' }
  | { status: 'ready'; employees: Employee[] }
  | { status: 'error'; message: string };
type Editor = { mode: 'create' } | { mode: 'edit'; employee: Employee };
type Notice = { status: 'success' | 'error'; message: string };

export default function Users() {
  const heading = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);
  const refreshCsrf = useRef(false);
  const changingStatus = useRef(false);
  const [list, setList] = useState<ListState>({ status: 'loading' });
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [employeeToDeactivate, setEmployeeToDeactivate] = useState<Employee | null>(null);
  const [statusPending, setStatusPending] = useState(false);
  const [statusError, setStatusError] = useState('');

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => { heading.current?.focus(); }, [loadAttempt]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function loadEmployees() {
      try {
        const { data } = await userService.list(signal);
        if (!signal.aborted) setList({ status: 'ready', employees: data });
      } catch (error) {
        if (signal.aborted) return;
        setList({
          status: 'error',
          message: getUserErrorMessage(error, 'Impossible de charger les comptes employés.'),
        });
      }
    }

    queueMicrotask(() => {
      if (!signal.aborted) void loadEmployees();
    });
    return () => controller.abort();
  }, [loadAttempt]);

  function reloadList() {
    setList({ status: 'loading' });
    setLoadAttempt((attempt) => attempt + 1);
  }

  async function runMutation(request: () => Promise<unknown>) {
    try {
      if (refreshCsrf.current) {
        await authService.refreshCsrf();
        refreshCsrf.current = false;
      }
      await request();
    } catch (error) {
      if (mounted.current && getHttpStatus(error) === 419) refreshCsrf.current = true;
      throw error;
    }
  }

  function openEditor(next: Editor) {
    setNotice(null);
    setEditor(next);
  }

  function handleSaved(message: string) {
    setNotice({ status: 'success', message });
    setEditor(null);
    reloadList();
  }

  async function changeStatus(employee: Employee) {
    if (changingStatus.current || employee.role !== 'employee') return;
    changingStatus.current = true;
    setStatusPending(true);
    setStatusError('');
    setNotice(null);
    const isActive = !employee.is_active;

    try {
      await runMutation(() => userService.updateStatus(employee.id, { is_active: isActive }));
      if (!mounted.current) return;
      setEmployeeToDeactivate(null);
      setNotice({ status: 'success', message: isActive ? 'Compte employé activé.' : 'Compte employé désactivé.' });
      reloadList();
    } catch (error) {
      if (!mounted.current) return;
      const message = getUserErrorMessage(error, 'Impossible de confirmer le changement de statut.');
      if (isActive) setNotice({ status: 'error', message });
      else setStatusError(message);
    } finally {
      changingStatus.current = false;
      if (mounted.current) setStatusPending(false);
    }
  }

  return (
    <div lang="fr" className="page-content">
      <div className="page-heading">
        <h1 ref={heading} tabIndex={-1} className="page-title">Utilisateurs</h1>
        {list.status === 'ready' && !editor && (
          <ActionButton disabled={statusPending} onClick={() => openEditor({ mode: 'create' })}>
            <UserRoundPlus aria-hidden="true" className="size-4" /> Créer un utilisateur
          </ActionButton>
        )}
      </div>
      {notice && <Feedback status={notice.status} message={notice.message} />}
      {editor ? (
        <UserForm
          employee={editor.mode === 'edit' ? editor.employee : undefined}
          runMutation={runMutation}
          onSaved={handleSaved}
          onCancel={() => {
            setEditor(null);
            heading.current?.focus();
          }}
        />
      ) : (
        <>
          {list.status === 'loading' && <LoadingState message="Chargement des comptes employés…" />}
          {list.status === 'error' && <ErrorState message={list.message} onRetry={reloadList} />}
          {list.status === 'ready' && (
            <section aria-labelledby="employee-list-heading" className="panel">
              <div className="border-b border-line px-3 py-3 sm:px-4">
                <h2 id="employee-list-heading" className="font-bold">Comptes employés</h2>
                <p className="mt-1 text-sm text-muted">
                  Vous pouvez créer un compte administrateur ou employé. Seuls les comptes employés peuvent être modifiés, activés ou désactivés ici.
                </p>
              </div>
              {list.employees.length === 0 ? <EmptyState title="Aucun compte employé" embedded /> : (
                <table role="table" aria-labelledby="employee-list-heading" className="ledger-table ledger-table--stack">
                  <thead role="rowgroup">
                    <tr role="row">
                      <th role="columnheader" scope="col" className="w-[42%]">Nom / email</th>
                      <th role="columnheader" scope="col">Rôle</th>
                      <th role="columnheader" scope="col">Statut</th>
                      <th role="columnheader" scope="col" className="cell-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody role="rowgroup">
                    {list.employees.map((employee) => (
                      <tr key={employee.id} role="row">
                        <th role="rowheader" scope="row" className="col-span-2">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <UserAvatar name={employee.name} />
                            <div className="min-w-0">
                              <span className="block">{employee.name}</span>
                              <span className="block text-xs font-normal text-muted">{employee.email}</span>
                            </div>
                          </div>
                        </th>
                        <td role="cell">
                          <span aria-hidden="true" className="ledger-label">Rôle</span>
                          {employee.role === 'employee' ? 'Employé' : 'Administrateur'}
                        </td>
                        <td role="cell">
                          <span aria-hidden="true" className="ledger-label">Statut</span>
                          <span className={`badge ${employee.is_active
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-zinc-100 text-muted'}`}
                          >
                            {employee.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td role="cell" className="col-span-2">
                          {employee.role === 'employee' && (
                            <div className="flex flex-wrap gap-1 lg:justify-end">
                              <ActionButton
                                variant="quiet"
                                className="button-compact"
                                disabled={statusPending}
                                aria-label={`Modifier ${employee.name}`}
                                onClick={() => openEditor({ mode: 'edit', employee })}
                              >
                                <Pencil aria-hidden="true" className="size-3.5" /> Modifier
                              </ActionButton>
                              <ActionButton
                                variant="quiet"
                                className={`button-compact ${employee.is_active ? 'text-brand hover:bg-brand-tint' : 'text-emerald-800 hover:bg-emerald-50'}`}
                                disabled={statusPending}
                                aria-label={`${employee.is_active ? 'Désactiver' : 'Activer'} ${employee.name}`}
                                onClick={() => {
                                  if (employee.is_active) {
                                    setStatusError('');
                                    setEmployeeToDeactivate(employee);
                                  } else void changeStatus(employee);
                                }}
                              >
                                {employee.is_active ? 'Désactiver' : 'Activer'}
                              </ActionButton>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          )}
        </>
      )}
      <ConfirmDialog
        open={employeeToDeactivate !== null}
        title="Désactiver le compte employé"
        description={`${employeeToDeactivate?.name ?? ''} sera déconnecté et devra attendre la réactivation du compte pour se reconnecter.`}
        confirmLabel="Désactiver"
        destructive
        isPending={statusPending}
        error={statusError}
        onConfirm={() => {
          if (employeeToDeactivate) void changeStatus(employeeToDeactivate);
        }}
        onClose={() => setEmployeeToDeactivate(null)}
      />
    </div>
  );
}
