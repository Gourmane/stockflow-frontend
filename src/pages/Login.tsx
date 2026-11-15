
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
import { useAuth } from '../context/useAuth';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, password });
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;

        if (status === 401 || status === 422) {
          setError('Email ou mot de passe incorrect.');
        } else if (status === 403) {
          setError('Votre compte est désactivé.');
        } else if (status === 419) {
          setError('Session expirée. Réessayez.');
        } else if (status === 429) {
          setError('Trop de tentatives. Réessayez plus tard.');
        } else {
          setError('Erreur de connexion au serveur.');
        }
      } else {
        setError('Une erreur inattendue est survenue.');
      }
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

        {error && (
          <p role="alert" className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">
            {error}
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
          disabled={loading}
          className="w-full rounded bg-blue-600 p-3 text-white disabled:opacity-50"
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
