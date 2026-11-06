import { describe, expect, it } from 'vitest';
import { classifyError, errorClassKey } from './errors';
import { ApiProblemError } from './problem';

const other = (status: number) =>
  new ApiProblemError({ kind: 'other', status, fieldErrors: [] });

describe('UI-03-web classifyError (D12)', () => {
  it('R15: sin respuesta HTTP es un error de red con su propio texto', () => {
    const error = new ApiProblemError({ kind: 'network' });
    expect(classifyError(error)).toBe('network');
    expect(errorClassKey(error)).toBe('common_error_network');
  });

  it('R18: cualquier 5xx es un error del servidor con su propio texto', () => {
    for (const status of [500, 502, 503, 504]) {
      expect(classifyError(other(status))).toBe('server');
      expect(errorClassKey(other(status))).toBe('common_error_server');
    }
  });

  it('R18: 401, 403 y el resto de 4xx no usan los textos de red ni de servidor', () => {
    expect(classifyError(new ApiProblemError({ kind: 'unauthorized' }))).toBe(
      'session',
    );
    expect(classifyError(other(403))).toBe('forbidden');
    expect(classifyError(other(409))).toBe('problem');
    expect(
      classifyError(
        new ApiProblemError({ kind: 'rateLimited', retryAfterSeconds: 1 }),
      ),
    ).toBe('problem');
    for (const status of [401, 403, 404, 409, 422]) {
      expect(errorClassKey(other(status))).toBeNull();
    }
  });
});
