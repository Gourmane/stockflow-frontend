
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { ApiConfigurationError, watchSessionExpiry } from '../api/axios';
import { AuthContext } from './authContext';
import type { AuthSession } from './authContext';
import { getAuthErrorMessage, getHttpStatus } from '../services/authErrors';
import { authService } from '../services/authService';
import type { LoginCredentials, User } from '../types/auth';

const sessionErrorMessages = {
  419: 'La vérification de sécurité a échoué. Réessayez.',
  422: 'Le serveur a rejeté la demande de vérification de la session.',
  429: 'Trop de demandes de vérification. Réessayez plus tard.',
};

function failedSessionCheck(error: unknown, missingSessionNotice?: string): AuthSession {
  const status = getHttpStatus(error);

  if (status === 401) return { status: 'anonymous', notice: missingSessionNotice };
  if (status === 403) {
    return { status: 'anonymous', notice: 'Votre compte est désactivé.' };
  }

  return {
    status: 'unavailable',
    message: getAuthErrorMessage(error, sessionErrorMessages, 'Impossible de vérifier la session pour le moment.'),
    retryable: !(error instanceof ApiConfigurationError),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession>({ status: 'checking' });
  const [checkAttempt, setCheckAttempt] = useState(0);

  const stopWatching = useRef<(() => void) | undefined>(undefined);

  const establishSession = useCallback((user: User) => {
    stopWatching.current = watchSessionExpiry(() => {
      stopWatching.current = undefined;
      setSession({ status: 'anonymous', notice: 'Votre session a expiré. Veuillez vous reconnecter.' });
    });
    setSession({ status: 'authenticated', user });
  }, []);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const { user } = await authService.me();
        if (active) establishSession(user);
      } catch (error) {
        if (active) setSession(failedSessionCheck(error));
      }
    }

    void restoreSession();

    return () => {
      active = false;
      stopWatching.current?.();
      stopWatching.current = undefined;
    };
  }, [checkAttempt, establishSession]);

  function retrySession() {
    if (session.status !== 'unavailable' || !session.retryable) return;
    setSession({ status: 'checking' });
    setCheckAttempt((attempt) => attempt + 1);
  }

  async function login(credentials: LoginCredentials): Promise<void> {
    await authService.login(credentials);

    try {
      const { user } = await authService.me();
      establishSession(user);
    } catch (error) {
      setSession(failedSessionCheck(error, 'La session n’a pas pu être ouverte. Réessayez de vous connecter.'));
    }
  }

  async function logout(): Promise<void> {
    const endSession = stopWatching.current;
    await authService.logout();
    if (stopWatching.current !== endSession) return;

    endSession?.();
    stopWatching.current = undefined;
    setSession({ status: 'anonymous' });
  }

  return (
    <AuthContext.Provider value={{ session, retrySession, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
