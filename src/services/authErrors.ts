import { isAxiosError } from 'axios';
import { ApiConfigurationError } from '../api/axios';

export class UnexpectedAuthResponseError extends Error {
  constructor() {
    super('Réponse inattendue du serveur. Vérifiez que VITE_API_URL pointe vers l’API StockFlow.');
  }
}

export function getHttpStatus(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined;
}

export function getAuthErrorMessage(
  error: unknown,
  statusMessages: Record<number, string>,
  fallback: string,
): string {
  if (error instanceof ApiConfigurationError || error instanceof UnexpectedAuthResponseError) {
    return error.message;
  }

  if (isAxiosError(error)) {
    if (error.response) return statusMessages[error.response.status] ?? fallback;

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return 'Le serveur met trop de temps à répondre. Réessayez.';
    }

    if (error.code === 'ERR_NETWORK') {
      return 'Impossible de joindre le serveur. Vérifiez votre connexion, puis réessayez.';
    }
  }

  return fallback;
}
