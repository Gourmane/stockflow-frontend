
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { AuthContext } from './authContext';
import { authService } from '../services/authService';
import type { User, LoginCredentials } from '../types/auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session when the application starts
  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const response = await authService.me();

        if (active) {
          setUser(response.user);
        }
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void restoreSession();

    return () => {
      active = false;
    };
  }, []);

  // Login
  async function login(credentials: LoginCredentials): Promise<void> {
    const response = await authService.login(credentials);
    setUser(response.user);
  }

  // Logout
  async function logout(): Promise<void> {
    await authService.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
