
import { Navigate, Outlet } from 'react-router';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import type { UserRole } from '../types/auth';
import LoadingState from './LoadingState';
import SessionCheckError from './SessionCheckError';

export default function ProtectedRoute({ requiredRole }: { requiredRole?: UserRole }) {
  const { session, retrySession } = useAuth();

  if (session.status === 'checking') {
    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        <LoadingState message="Vérification de la session..." />
      </main>
    );
  }

  if (session.status === 'unavailable') {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <SessionCheckError message={session.message} onRetry={session.retryable ? retrySession : undefined} />
      </div>
    );
  }

  if (session.status === 'anonymous') {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && session.user.role !== requiredRole) {
    return (
      <section className="panel max-w-xl p-5 sm:p-7">
        <span className="mb-4 grid size-10 place-items-center rounded-lg bg-red-50 text-red-800">
          <ShieldAlert aria-hidden="true" className="size-5" />
        </span>
        <h1 className="page-title">Accès interdit</h1>
        <p className="mt-2 text-sm text-muted">Votre rôle ne vous permet pas d’accéder à cette page.</p>
      </section>
    );
  }

  return <Outlet />;
}
