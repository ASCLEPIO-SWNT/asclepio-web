import { describe, expect, it } from 'vitest';
import { ApiProblemError, toApiProblem, unwrap } from './problem';

const res = (status: number, headers: Record<string, string> = {}) =>
  new Response(null, { status, headers });

describe('problem', () => {
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
