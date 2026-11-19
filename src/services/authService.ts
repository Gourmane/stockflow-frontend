import api, { backendOrigin } from '../api/axios';
import { getHttpStatus, UnexpectedAuthResponseError } from './authErrors';

import type {
  LoginCredentials,
  LoginResponse,
  MeResponse,
  LogoutResponse,
} from '../types/auth';

let pendingMe: Promise<MeResponse> | undefined;

async function initializeCsrf(): Promise<void> {
  await api.get('/sanctum/csrf-cookie', { baseURL: backendOrigin });
}

function requireActiveUser<T extends MeResponse>(data: T): T {
  if (typeof data?.user?.id !== 'number' || data.user.is_active !== true) {
    throw new UnexpectedAuthResponseError();
  }
  return data;
}

async function postLogout(): Promise<void> {
  try {
    const { data } = await api.post<LogoutResponse>('/logout');
    if (typeof data?.message !== 'string') throw new UnexpectedAuthResponseError();
  } catch (error) {
    // A 401 from /logout confirms that the session has already ended.
    if (getHttpStatus(error) !== 401) throw error;
  }
}

export const authService = {
  refreshCsrf: initializeCsrf,

  // Login
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    await initializeCsrf();

    // Step 2: Send credentials
    const response = await api.post<LoginResponse>(
      '/login',
      credentials
    );

    return requireActiveUser(response.data);
  },

  // Current authenticated user
  me(): Promise<MeResponse> {
    pendingMe ??= api.get<MeResponse>('/me')
      .then(({ data }) => requireActiveUser(data))
      .finally(() => { pendingMe = undefined; });
    return pendingMe;
  },

  // Logout
  async logout(): Promise<void> {
    try {
      await postLogout();
    } catch (error) {
      if (getHttpStatus(error) !== 419) throw error;

      await initializeCsrf();
      await postLogout();
    }
  },
};
