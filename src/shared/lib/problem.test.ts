import { describe, expect, it, vi } from 'vitest';
import {
  ApiProblemError,
  actionErrorMessage,
  applyFieldErrors,
  problemOf,
  toApiProblem,
  unwrap,
  type ApiProblem,
} from './problem';

const res = (status: number, headers: Record<string, string> = {}) =>
  new Response(null, { status, headers });

describe('F-01-web problem', () => {
  it('R6: 401 se traduce a unauthorized sin conservar detail ni errores', () => {
    expect(
      toApiProblem(res(401), {
        title: 'Unauthorized',
        status: 401,
        detail: 'Cuenta bloqueada',
        errors: [{ field: 'password', message: 'mal' }],
      }),
    ).toEqual({ kind: 'unauthorized' });
  });

  it('R7: 429 con Retry-After entero da los segundos de espera', () => {
    expect(toApiProblem(res(429, { 'Retry-After': '42' }), {})).toEqual({
      kind: 'rateLimited',
      retryAfterSeconds: 42,
    });
  });

  it.each([
    [{}],
    [{ 'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT' }],
    [{ 'Retry-After': '1.5' }],
  ])('R7: 429 sin Retry-After entero no da segundos (%o)', (headers) => {
    expect(toApiProblem(res(429, headers), {})).toEqual({
      kind: 'rateLimited',
      retryAfterSeconds: undefined,
    });
  });

  it('R8: un fallo sin respuesta HTTP se traduce a network', async () => {
    const error = await unwrap(() =>
      Promise.reject(new TypeError('Failed to fetch')),
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiProblemError);
    expect((error as ApiProblemError).problem).toEqual({ kind: 'network' });
  });

  it('R9: otro estado da other con los errores de campo de errors[]', () => {
    expect(
      toApiProblem(res(400), {
        type: 'about:blank',
        title: 'Bad Request',
        status: 400,
        errors: [
          { field: 'email', message: 'email must be an email' },
          { field: 'tenantId', message: 'no aplica' },
        ],
      }),
    ).toEqual({
      kind: 'other',
      status: 400,
      fieldErrors: [
        { field: 'email', message: 'email must be an email' },
        { field: 'tenantId', message: 'no aplica' },
      ],
    });
  });

  it('R9: un cuerpo que no es problem+json da other sin errores de campo', () => {
    expect(toApiProblem(res(500), 'Internal Server Error')).toEqual({
      kind: 'other',
      status: 500,
      fieldErrors: [],
    });
  });

  it('unwrap devuelve data en 2xx', async () => {
    await expect(
      unwrap(() => Promise.resolve({ data: { ok: 1 }, response: res(200) })),
    ).resolves.toEqual({ ok: 1 });
  });
});

describe('F-02-web actionErrorMessage (D11)', () => {
  const other = (status: number): ApiProblem => ({
    kind: 'other',
    status,
    fieldErrors: [],
  });

  it('R13: usa el mensaje en contexto de 409 y 404 de la confirmación', () => {
    const byStatus = {
      409: 'Este pre-registro ya no está pendiente o el paciente ya tiene una atención activa.',
      404: 'Este pre-registro ya no existe.',
    };
    expect(actionErrorMessage(other(409), byStatus)).toBe(byStatus[409]);
    expect(actionErrorMessage(other(404), byStatus)).toBe(byStatus[404]);
  });

  it('R16: 403 sin mensaje en contexto da el de sin permiso para la acción', () => {
    expect(actionErrorMessage(other(403), { 409: 'x' })).toBe(
      'No tienes permiso para realizar esta acción.',
    );
  });

  it('R27: sin respuesta HTTP da el mensaje de conexión', () => {
    expect(actionErrorMessage({ kind: 'network' }, { 409: 'x' })).toBe(
      'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
    );
  });

  it.each([
    [other(500)],
    [other(400)],
    [{ kind: 'rateLimited', retryAfterSeconds: 5 }],
  ] as ApiProblem[][])(
    'R36: cualquier otro error da el mensaje genérico (%o)',
    (p) => {
      expect(actionErrorMessage(p, { 409: 'x', 404: 'y' })).toBe(
        'No se pudo completar la acción. Inténtalo de nuevo.',
      );
    },
  );

  it('R36: el mensaje en contexto de un estado gana al de 403 si la spec lo define', () => {
    expect(actionErrorMessage(other(403), { 403: 'propio' })).toBe('propio');
  });

  it('problemOf devuelve el problema de un ApiProblemError y other(0) de otra cosa', () => {
    expect(problemOf(new ApiProblemError({ kind: 'network' }))).toEqual({
      kind: 'network',
    });
    expect(problemOf(new Error('x'))).toEqual(other(0));
  });
});

describe('F-02-web applyFieldErrors (D11)', () => {
  it('R23: aplica solo los errors[] cuyo field es un campo del formulario', () => {
    const setError = vi.fn();
    const applied = applyFieldErrors<{ fullName: string; sex: string }>(
      setError,
      [
        { field: 'fullName', message: 'fullName must be shorter' },
        { field: 'tenantId', message: 'no aplica' },
        { field: 'sex', message: 'sex must be one of M, F, X' },
      ],
      ['fullName', 'sex'],
    );
    expect(applied).toBe(2);
    expect(setError.mock.calls).toEqual([
      ['fullName', { type: 'server', message: 'fullName must be shorter' }],
      ['sex', { type: 'server', message: 'sex must be one of M, F, X' }],
    ]);
  });
});
