import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import type { FieldError } from '../api/client';

/**
 * Traducción de los errores de la API (application/problem+json, RFC 9457) a un
 * resultado que la UI convierte en mensajes (docs/conventions.md, design.md D10/D11).
 */
export type { FieldError };

export type ApiProblem =
  | { kind: 'unauthorized' }
  | { kind: 'rateLimited'; retryAfterSeconds: number | undefined }
  | { kind: 'network' }
  | { kind: 'other'; status: number; fieldErrors: FieldError[] };

export class ApiProblemError extends Error {
  readonly problem: ApiProblem;

  constructor(problem: ApiProblem) {
    super(`API problem: ${problem.kind}`);
    this.problem = problem;
    this.name = 'ApiProblemError';
  }
}

function fieldErrorsOf(body: unknown): FieldError[] {
  if (typeof body !== 'object' || body === null) return [];
  const errors = (body as { errors?: unknown }).errors;
  if (!Array.isArray(errors)) return [];
  return errors.filter(
    (e): e is FieldError =>
      typeof e === 'object' &&
      e !== null &&
      typeof (e as FieldError).field === 'string' &&
      typeof (e as FieldError).message === 'string',
  );
}

/** `Retry-After` solo cuenta si es un entero de segundos (R7). */
function retryAfterOf(response: Response): number | undefined {
  const value = response.headers.get('Retry-After')?.trim();
  return value && /^\d+$/.test(value) ? Number(value) : undefined;
}

/** Traduce una respuesta HTTP de error (y su cuerpo ya leído) a un ApiProblem. */
export function toApiProblem(response: Response, body: unknown): ApiProblem {
  if (response.status === 401) return { kind: 'unauthorized' };
  if (response.status === 429) {
    return { kind: 'rateLimited', retryAfterSeconds: retryAfterOf(response) };
  }
  return {
    kind: 'other',
    status: response.status,
    fieldErrors: fieldErrorsOf(body),
  };
}

/**
 * Ejecuta una llamada de openapi-fetch y devuelve `data`, o lanza ApiProblemError:
 * `network` si no hubo respuesta HTTP, y la traducción de `toApiProblem` si la hubo.
 */
export async function unwrap<T>(
  call: () => Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  let result: { data?: T; error?: unknown; response: Response };
  try {
    result = await call();
  } catch {
    throw new ApiProblemError({ kind: 'network' });
  }
  if (result.response.ok && result.data !== undefined) return result.data;
  throw new ApiProblemError(toApiProblem(result.response, result.error));
}

/** El ApiProblem de un error lanzado por `unwrap` (o `other` sin estado si es otra cosa). */
export function problemOf(error: unknown): ApiProblem {
  return error instanceof ApiProblemError
    ? error.problem
    : { kind: 'other', status: 0, fieldErrors: [] };
}

/** Estado HTTP de un problema, o null si no hubo respuesta HTTP. */
export function statusOf(problem: ApiProblem): number | null {
  switch (problem.kind) {
    case 'unauthorized':
      return 401;
    case 'rateLimited':
      return 429;
    case 'network':
      return null;
    case 'other':
      return problem.status;
  }
}

export const FORBIDDEN_ACTION_MESSAGE =
  'No tienes permiso para realizar esta acción.';
/** Claves de catálogo de los errores de red y de servidor (UI-03-web R15, R18, B1). */
export const NETWORK_ACTION_MESSAGE = 'common_error_network';
export const SERVER_ACTION_MESSAGE = 'common_error_server';
export const GENERIC_ACTION_MESSAGE =
  'No se pudo completar la acción. Inténtalo de nuevo.';

/** Un error de acción de red o de servidor admite «Reintentar» (UI-03-web R15, R18). */
export function isRetryableActionMessage(message: string | null): boolean {
  return (
    message === NETWORK_ACTION_MESSAGE || message === SERVER_ACTION_MESSAGE
  );
}

/**
 * Mensaje de un "error de acción" (glosario de F-02-web, D11): primero el mensaje en
 * contexto del estado (`byStatus`), luego 403, sin respuesta HTTP y el genérico.
 */
export function actionErrorMessage(
  problem: ApiProblem,
  byStatus: Partial<Record<number, string>> = {},
): string {
  const status = statusOf(problem);
  if (status === null) return NETWORK_ACTION_MESSAGE;
  if (status >= 500) return SERVER_ACTION_MESSAGE;
  const inContext = byStatus[status];
  if (inContext !== undefined) return inContext;
  if (status === 403) return FORBIDDEN_ACTION_MESSAGE;
  return GENERIC_ACTION_MESSAGE;
}

/**
 * Pasa a React Hook Form los `errors[]` de un 400 cuyo `field` es uno de `fields`.
 * Devuelve cuántos se aplicaron (0 → la UI muestra un error de acción).
 */
export function applyFieldErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  fieldErrors: readonly FieldError[],
  fields: readonly Path<T>[],
): number {
  let applied = 0;
  for (const { field, message } of fieldErrors) {
    const name = fields.find((f) => f === field);
    if (name === undefined) continue;
    setError(name, { type: 'server', message });
    applied += 1;
  }
  return applied;
}
