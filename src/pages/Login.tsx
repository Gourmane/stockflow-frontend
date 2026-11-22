
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate } from 'react-router';
import { ArrowLeftRight, CircleUserRound, LockKeyhole, LogIn, Mail, Package, ShieldCheck, TriangleAlert } from 'lucide-react';
import ActionButton from '../components/ActionButton';
import Brand from '../components/Brand';
import Feedback from '../components/Feedback';
import LoadingState from '../components/LoadingState';
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

const capabilities = [
  { icon: Package, label: 'Catalogue des équipements' },
  { icon: ArrowLeftRight, label: 'Suivi des entrées et sorties' },
  { icon: ShieldCheck, label: 'Accès administrateur et employé' },
  { icon: TriangleAlert, label: 'Seuils et ruptures de stock' },
];

export default function Login() {
  const { session, retrySession, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const notice = session.status === 'anonymous' ? session.notice : undefined;
  const feedback = error || notice;
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
    <div className="login-layout">
      <div className="login-backdrop" aria-hidden="true" />
      <aside className="login-intro" aria-labelledby="login-intro-title">
        <Brand />
        <div className="login-intro-copy">
          <h2 id="login-intro-title">
            La gestion de stock, <span>simplifiée.</span>
          </h2>
          <p className="mt-4 max-w-[40ch] text-sm leading-relaxed text-zinc-200 sm:text-base">
            Centralisez votre matériel informatique, suivez les entrées et sorties et anticipez les ruptures.
          </p>
          <ul role="list" className="mt-4 grid w-fit grid-cols-2 gap-x-4 gap-y-2 lg:mt-8 lg:grid-cols-1 lg:gap-3">
            {capabilities.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 text-xs font-medium lg:gap-3 lg:text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-md border border-white/15 bg-ink/80 lg:size-9">
                  <Icon aria-hidden="true" className="size-3.5 text-rose-200 lg:size-[18px]" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="login-main">
        <div className="login-card">
          <div className="mb-7">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Bienvenue</h1>
            <p className="mt-2 text-sm text-muted sm:text-base">Connectez-vous à votre espace StockFlow.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            {session.status === 'checking' && <LoadingState message="Vérification de la session..." />}
            {session.status === 'unavailable' && (
              <SessionCheckError
                message={session.message}
                onRetry={session.retryable ? handleRetry : undefined}
                disabled={loading}
              />
            )}
            {feedback && <Feedback status="error" message={feedback} />}

            <div>
              <label htmlFor="email" className="login-label">
                <Mail aria-hidden="true" className="size-4 text-brand" /> Adresse email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="field-control"
              />
            </div>
            <div>
              <label htmlFor="password" className="login-label">
                <LockKeyhole aria-hidden="true" className="size-4 text-brand" /> Mot de passe
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="field-control"
              />
            </div>

            <ActionButton type="submit" disabled={submitDisabled} isPending={loading} pendingLabel="Connexion..." className="w-full sm:min-h-12">
              <LogIn aria-hidden="true" className="size-[18px]" /> Se connecter
            </ActionButton>
          </form>

          <section aria-labelledby="demo-heading" className="mt-8 border-t border-line pt-5">
            <h2 id="demo-heading" className="text-sm font-semibold">Comptes de démonstration</h2>
            <ul role="list" className="mt-3 grid gap-2 min-[365px]:grid-cols-2">
              <li className="demo-role"><ShieldCheck aria-hidden="true" /> Administrateur</li>
              <li className="demo-role"><CircleUserRound aria-hidden="true" /> Employé</li>
            </ul>
            <p className="mt-2 text-xs text-muted">Identifiants de démonstration non publiés.</p>
          </section>
        </div>
      </main>

      <footer className="login-credit">
        <p className="text-sm">Développé par <strong className="font-semibold">Mostafa Gourmane</strong></p>
        <p className="mt-1 text-xs">Étudiant en Licence Génie Logiciel — Développeur Full Stack.</p>
      </footer>
    </div>
  );
}
