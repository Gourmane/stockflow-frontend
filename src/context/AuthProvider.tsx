
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { ApiConfigurationError } from '../api/axios';
import { AuthContext } from './authContext';
import type { AuthSession } from './authContext';
import { getAuthErrorMessage, getHttpStatus } from '../services/authErrors';
import { authService } from '../services/authService';
import type { LoginCredentials } from '../types/auth';

const sessionErrorMessages = {
  419: 'La vérification de sécurité a échoué. Réessayez.',
  422: 'Le serveur a rejeté la demande de vérification de la session.',
  429: 'Trop de demandes de vérification. Réessayez plus tard.',
};

function failedSessionCheck(error: unknown): AuthSession {
  const status = getHttpStatus(error);

  if (status === 401) return { status: 'anonymous' };
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

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const { user } = await authService.me();
        if (active) setSession({ status: 'authenticated', user });
      } catch (error) {
        if (active) setSession(failedSessionCheck(error));
      }
    }

    void restoreSession();

    return () => {
      active = false;
    };
  }, [checkAttempt]);

  function retrySession() {
    if (session.status !== 'unavailable' || !session.retryable) return;
    setSession({ status: 'checking' });
    setCheckAttempt((attempt) => attempt + 1);
  }

  async function login(credentials: LoginCredentials): Promise<void> {
    const { user } = await authService.login(credentials);
    setSession({ status: 'authenticated', user });
  }

  async function logout(): Promise<void> {
    await authService.logout();
    setSession({ status: 'anonymous' });
  }

  return (
    <AuthContext.Provider value={{ session, retrySession, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
