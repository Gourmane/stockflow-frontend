
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate } from 'react-router';
import SessionCheckError from '../components/SessionCheckError';
import { useAuth } from '../context/useAuth';
import { getAuthErrorMessage } from '../services/authErrors';

const loginErrorMessages = {
  401: 'Email ou mot de passe incorrect.',
  403: 'Votre compte est désactivé.',
  419: 'La vérification de sécurité (CSRF) a échoué. Réessayez de vous connecter.',
  422: 'Vérifiez le format de votre email et renseignez votre mot de passe.',
  429: 'Trop de tentatives de connexion. Réessayez plus tard.',
};

export default function Login() {
  const { session, retrySession, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const notice = session.status === 'anonymous' ? session.notice : undefined;
  const submitDisabled = loading || session.status === 'checking'
    || (session.status === 'unavailable' && !session.retryable);

  if (session.status === 'authenticated') {
    return <Navigate to="/dashboard" replace />;
  }

  function handleRetry() {
    setError('');
    retrySession();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitDisabled) return;
    setError('');
    setLoading(true);

    try {
      await login({ email, password });
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err, loginErrorMessages, 'La connexion a échoué. Réessayez plus tard.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg"
      >
        <h1 className="mb-2 text-center text-2xl font-bold">
          StockFlow
        </h1>

        <p className="mb-6 text-center text-gray-500">
          Connexion à votre espace
        </p>

        {session.status === 'checking' && (
          <p role="status" className="mb-4 text-sm">Vérification de la session...</p>
        )}

        {session.status === 'unavailable' && (
          <SessionCheckError
            message={session.message}
            onRetry={session.retryable ? handleRetry : undefined}
            disabled={loading}
          />
        )}

        {(error || notice) && (
          <p role="alert" className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">
            {error || notice}
          </p>
        )}

        <label htmlFor="email" className="mb-1 block text-sm">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mb-4 w-full rounded border p-2"
        />

        <label htmlFor="password" className="mb-1 block text-sm">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mb-6 w-full rounded border p-2"
        />

        <button
          type="submit"
          disabled={submitDisabled}
          className="w-full rounded bg-blue-600 p-3 text-white disabled:opacity-50"
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
