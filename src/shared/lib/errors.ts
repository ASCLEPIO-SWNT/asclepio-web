import { problemOf, statusOf } from './problem';

/**
 * Clase de un error de petición (UI-03-web D12): sin respuesta HTTP → `network`; 5xx →
 * `server`; 401 → `session`; 403 → `forbidden`; el resto → `problem` (mensaje en contexto).
 */
export type ErrorClass =
  'network' | 'server' | 'session' | 'forbidden' | 'problem';

export function classifyError(error: unknown): ErrorClass {
  const status = statusOf(problemOf(error));
  if (status === null) return 'network';
  if (status >= 500) return 'server';
  if (status === 401) return 'session';
  if (status === 403) return 'forbidden';
  return 'problem';
}

/**
 * Texto adicional de un error de carga (R15, R18): de red o del servidor, o `null` si el error
 * no es de esas clases. Nunca usa `title` ni `detail` del problem+json.
 */
export function errorClassKey(error: unknown): string | null {
  switch (classifyError(error)) {
    case 'network':
      return 'common_error_network';
    case 'server':
      return 'common_error_server';
    default:
      return null;
  }
}
