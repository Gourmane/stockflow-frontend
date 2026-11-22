import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

function parseApiUrl(value: string | undefined): URL | null {
  if (!value || !/^https?:\/\/[^/]/i.test(value)) return null;

  try {
    const url = new URL(value);
    const path = url.pathname.replace(/\/+$/, '');

    if (!path.endsWith('/api') || url.username || url.password || url.search || url.hash) {
      return null;
    }

    url.pathname = path;
    return url;
  } catch {
    return null;
  }
}

const apiUrl = parseApiUrl(import.meta.env.VITE_API_URL?.trim());

export const backendOrigin = apiUrl?.origin;

export class ApiConfigurationError extends Error {
  constructor() {
    super('VITE_API_URL doit contenir une URL HTTP(S) absolue se terminant par /api, par exemple http://localhost:8000/api.');
  }
}

const api = axios.create({
  baseURL: apiUrl ? `${apiUrl.origin}${apiUrl.pathname}` : undefined,
  timeout: 10_000,

  withCredentials: true,
  withXSRFToken: true,

  headers: {
    Accept: 'application/json',
  },
});

const authEndpoints = new Set(['/login', '/logout', '/me', '/sanctum/csrf-cookie']);
const sessionByRequest = new WeakMap<InternalAxiosRequestConfig, () => void>();
let onSessionExpired: (() => void) | undefined;

export function watchSessionExpiry(handler: () => void): () => void {
  onSessionExpired = handler;

  return () => {
    if (onSessionExpired === handler) onSessionExpired = undefined;
  };
}

api.interceptors.request.use((config) => {
  if (!apiUrl) throw new ApiConfigurationError();
  if (onSessionExpired && config.url && !authEndpoints.has(config.url)) {
    // The handler identifies the session in effect when this request starts.
    sessionByRequest.set(config, onSessionExpired);
  }
  return config;
}, (error: unknown) => { throw error; }, { synchronous: true });

api.interceptors.response.use(undefined, (error: unknown) => {
  if (axios.isAxiosError(error) && error.response?.status === 401 && error.config
      && onSessionExpired && sessionByRequest.get(error.config) === onSessionExpired) {
    const expire = onSessionExpired;
    onSessionExpired = undefined;
    expire();
  }

  throw error;
});

export default api;
