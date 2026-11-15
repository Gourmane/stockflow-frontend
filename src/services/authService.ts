import api from '../api/axios';

import type {
  LoginCredentials,
  LoginResponse,
  MeResponse,
  LogoutResponse,
} from '../types/auth';

// Backend URL without /api
const backendOrigin = new URL(import.meta.env.VITE_API_URL).origin;

export const authService = {
  // Login
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    // Step 1: Initialize CSRF protection
    await api.get(`${backendOrigin}/sanctum/csrf-cookie`);

    // Step 2: Send credentials
    const response = await api.post<LoginResponse>(
      '/login',
      credentials
    );

    return response.data;
  },

  // Current authenticated user
  async me(): Promise<MeResponse> {
    const response = await api.get<MeResponse>('/me');
    return response.data;
  },

  // Logout
  async logout(): Promise<LogoutResponse> {
    const response = await api.post<LogoutResponse>('/logout');
    return response.data;
  },
};
