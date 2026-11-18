
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/useAuth';

export default function Dashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogout() {
    setLoading(true);
    setError('');

    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      setError('Erreur lors de la déconnexion.');
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
