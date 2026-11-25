import { useState } from 'react';
import { LogOut } from 'lucide-react';
import ActionButton from './ActionButton';
import Brand from './Brand';
import Feedback from './Feedback';
import UserAvatar from './UserAvatar';
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
    <header className="min-w-0 lg:col-start-2 lg:row-start-1">
      <div className="flex min-h-14 items-center gap-2 bg-ink px-3 py-1.5 text-white sm:gap-3 sm:px-6 lg:justify-end lg:border-b lg:border-line lg:bg-white lg:text-ink xl:px-8">
        <div className="mr-auto shrink-0 lg:hidden"><Brand compact /></div>
        <div className="flex min-w-0 items-center gap-2">
          <UserAvatar name={session.user.name} inverse />
          <div className="sr-only min-w-0 min-[360px]:not-sr-only">
            <p className="truncate text-sm leading-tight font-semibold">{session.user.name}</p>
            <p className="text-xs leading-tight text-zinc-300 lg:text-muted">{session.user.role === 'admin' ? 'Administrateur' : 'Employé'}</p>
          </div>
        </div>
        <ActionButton
          variant="quiet"
          className="button-compact shrink-0 max-lg:text-white max-lg:hover:bg-white/10 max-lg:focus-visible:outline-rose-200"
          aria-label={loading ? 'Déconnexion en cours' : 'Déconnexion'}
          onClick={handleLogout}
          isPending={loading}
          pendingLabel="Déconnexion…"
        >
          <LogOut aria-hidden="true" className="size-4" /> <span className="hidden sm:inline">Déconnexion</span>
        </ActionButton>
      </div>
      {error && <div className="px-4 pt-3 sm:px-7 xl:px-9"><Feedback status="error" message={error} /></div>}
    </header>
  );
}
