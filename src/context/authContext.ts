import { createContext } from 'react';
import type { User, LoginCredentials } from '../types/auth';

export type AuthSession =
  | { status: 'checking' }
  | { status: 'authenticated'; user: User }
  | { status: 'anonymous'; notice?: string }
  | { status: 'unavailable'; message: string; retryable: boolean };

export interface AuthContextType {
  session: AuthSession;
  retrySession: () => void;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);
