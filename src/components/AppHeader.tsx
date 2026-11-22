import { useState } from 'react';
import { LogOut, UserRound } from 'lucide-react';
import ActionButton from './ActionButton';
import Brand from './Brand';
import Feedback from './Feedback';
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

  const initials = session.user.name.trim().split(/\s+/).slice(0, 2)
    .map((part) => Array.from(part)[0]).join('').toLocaleUpperCase('fr');

  return (
    <header className="min-w-0 lg:col-start-2 lg:row-start-1">
      <div className="bg-ink px-4 py-3 lg:hidden"><Brand /></div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-4 py-2.5 sm:px-7 lg:justify-end xl:px-9">
        <div className="flex min-w-0 flex-auto items-center gap-2.5 lg:flex-initial">
          <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-tint text-xs font-bold text-brand">
            {initials || <UserRound className="size-4" />}
          </span>
          <div className="min-w-0 wrap-anywhere">
            <p className="text-sm font-semibold">{session.user.name}</p>
            <p className="text-xs text-muted">{session.user.role === 'admin' ? 'Administrateur' : 'Employé'}</p>
          </div>
        </div>
        <ActionButton variant="secondary" onClick={handleLogout} isPending={loading} pendingLabel="Déconnexion...">
          <LogOut aria-hidden="true" className="size-4" /> Déconnexion
        </ActionButton>
      </div>
      {error && <div className="px-4 pt-3 sm:px-7 xl:px-9"><Feedback status="error" message={error} /></div>}
    </header>
  );
}
