import { useEffect, useRef, useState } from 'react';
import ActionButton from '../components/ActionButton';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Feedback from '../components/Feedback';
import LoadingState from '../components/LoadingState';
import UserForm from '../components/UserForm';
import { useAuth } from '../context/useAuth';
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
  const { expireSession } = useAuth();
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
        if (getHttpStatus(error) === 401) {
          expireSession();
          return;
        }
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
  }, [expireSession, loadAttempt]);

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
      if (mounted.current) {
        const status = getHttpStatus(error);
        if (status === 401) expireSession();
        if (status === 419) refreshCsrf.current = true;
      }
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
    <div lang="fr" className="max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 ref={heading} tabIndex={-1} className="text-2xl font-bold">Utilisateurs</h1>
        {list.status === 'ready' && !editor && (
          <ActionButton disabled={statusPending} onClick={() => openEditor({ mode: 'create' })}>
            Créer un utilisateur
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
            <section aria-labelledby="employee-list-heading" className="space-y-3">
              <div>
                <h2 id="employee-list-heading" className="text-lg font-semibold">Comptes employés</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Vous pouvez créer un Admin ou un employé. La modification et le changement de statut sont réservés aux comptes employés.
                </p>
              </div>
              {list.employees.length === 0 ? <EmptyState title="Aucun compte employé" /> : (
                <ul role="list" className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                  {list.employees.map((employee) => (
                    <li key={employee.id} className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
                      <div className="min-w-0 max-w-full space-y-1 wrap-anywhere">
                        <h3 className="font-semibold">{employee.name}</h3>
                        <p className="text-sm text-slate-600">{employee.email}</p>
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span>{employee.role === 'employee' ? 'Employé' : 'Admin'}</span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${employee.is_active
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'}`}
                          >
                            {employee.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </div>
                      </div>
                      {employee.role === 'employee' && (
                        <div className="flex flex-wrap gap-2">
                          <ActionButton
                            variant="secondary"
                            disabled={statusPending}
                            aria-label={`Modifier ${employee.name}`}
                            onClick={() => openEditor({ mode: 'edit', employee })}
                          >
                            Modifier
                          </ActionButton>
                          <ActionButton
                            variant="secondary"
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
                    </li>
                  ))}
                </ul>
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
