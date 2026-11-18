
import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../context/useAuth';
import type { UserRole } from '../types/auth';
import SessionCheckError from './SessionCheckError';

export default function ProtectedRoute({ requiredRole }: { requiredRole?: UserRole }) {
  const { session, retrySession } = useAuth();

  if (session.status === 'checking') {
    return <p role="status">Vérification de la session...</p>;
  }

  if (session.status === 'unavailable') {
    return (
      <div className="p-4">
        <SessionCheckError message={session.message} onRetry={session.retryable ? retrySession : undefined} />
      </div>
    );
  }

  if (session.status === 'anonymous') {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && session.user.role !== requiredRole) {
    return (
      <>
        <h1 className="text-2xl font-bold">Accès interdit</h1>
        <p className="mt-2 text-sm text-slate-600">Votre rôle ne vous permet pas d’accéder à cette page.</p>
      </>
    );
  }

  return <Outlet />;
}
