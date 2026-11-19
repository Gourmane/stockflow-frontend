import { getAuthErrorMessage } from './authErrors';

const userErrorMessages = {
  403: 'Vous n’êtes pas autorisé à effectuer cette opération.',
  404: 'Cet utilisateur est introuvable.',
  419: 'La vérification de sécurité (CSRF) a échoué. Réessayez.',
  422: 'Le serveur a rejeté la demande. Vérifiez les valeurs saisies.',
  500: 'Une erreur serveur est survenue. Réessayez.',
};

export function getUserErrorMessage(error: unknown, fallback: string): string {
  return getAuthErrorMessage(error, userErrorMessages, fallback);
}
