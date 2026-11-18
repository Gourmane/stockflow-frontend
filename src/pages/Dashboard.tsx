
import { useState } from 'react';
import { useAuth } from '../context/useAuth';
import { getAuthErrorMessage } from '../services/authErrors';

const logoutErrorMessages = {
  403: 'Le serveur a refusé la déconnexion.',
  419: 'La vérification de sécurité (CSRF) a échoué. Réessayez de vous déconnecter.',
  422: 'Le serveur a rejeté la demande de déconnexion.',
  429: 'Trop de tentatives de déconnexion. Réessayez plus tard.',
};

export default function Dashboard() {
  const { logout } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    <div className="p-8">
      <h1 className="text-2xl font-bold">
        Dashboard StockFlow
      </h1>

      <button
        onClick={handleLogout}
        disabled={loading}
        className="mt-6 rounded bg-red-600 px-4 py-2 text-white"
      >
        {loading ? 'Déconnexion...' : 'Déconnexion'}
      </button>

      {error && <p role="alert" className="mt-3 text-red-600">{error}</p>}
    </div>
  );
}
