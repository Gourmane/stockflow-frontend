import axios from 'axios';

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

api.interceptors.request.use((config) => {
  if (!apiUrl) throw new ApiConfigurationError();
  return config;
});

export default api;
