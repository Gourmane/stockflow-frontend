import { isAxiosError } from 'axios';
import type { ApiValidationError } from '../types/api';

export function getApiValidationError(error: unknown): ApiValidationError | undefined {
  if (!isAxiosError<ApiValidationError, unknown>(error) || error.response?.status !== 422) {
    return undefined;
  }

  const { data } = error.response;

  if (typeof data?.message !== 'string' || !data.errors || typeof data.errors !== 'object' || Array.isArray(data.errors)) {
    return undefined;
  }

  const hasValidFieldErrors = Object.values(data.errors).every(
    (messages) => Array.isArray(messages) && messages.every((message) => typeof message === 'string'),
  );

  return hasValidFieldErrors ? data : undefined;
}
