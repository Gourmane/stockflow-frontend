
import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../context/useAuth';
import SessionCheckError from './SessionCheckError';

export default function ProtectedRoute() {
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

  return <Outlet />;
}
