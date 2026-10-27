/**
 * Traducción de los errores de la API (application/problem+json, RFC 9457) a un
 * resultado que la UI convierte en mensajes (docs/conventions.md, design.md D10/D11).
 */
export interface FieldError {
  field: string;
  message: string;
}

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
