import { useState } from 'react';
import { useAuth } from '../context/useAuth';
import { getAuthErrorMessage } from '../services/authErrors';

const logoutErrorMessages = {
  403: 'Le serveur a refusé la déconnexion.',
  419: 'La vérification de sécurité (CSRF) a échoué. Réessayez de vous déconnecter.',
  422: 'Le serveur a rejeté la demande de déconnexion.',
  429: 'Trop de tentatives de déconnexion. Réessayez plus tard.',
};

export default function AppHeader() {
  const { session, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (session.status !== 'authenticated') return null;

  async function handleLogout() {
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      await logout();
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err, logoutErrorMessages, 'La déconnexion a échoué. Réessayez plus tard.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <span className="text-lg font-bold">StockFlow</span>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4">
          <p className="min-w-0 text-sm font-medium wrap-anywhere">{session.user.name}</p>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loading}
            className="min-h-11 shrink-0 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
          >
            {loading ? 'Déconnexion...' : 'Déconnexion'}
          </button>
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </header>
  );
}
