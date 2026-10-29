import { describe, expect, it } from 'vitest';
import { indicatorOf } from './indicator';
import { ApiProblemError } from './problem';

const failure = (status: number) =>
  new ApiProblemError({ kind: 'other', status, fieldErrors: [] });

describe('UI-02-web estado de un indicador', () => {
  it('R19: mientras la primera petición está en curso el indicador carga', () => {
    expect(indicatorOf({ isError: false, isPending: true, error: null })).toBe(
      'loading',
    );
  });

  it('R20: una respuesta correcta, también vacía, es un indicador listo', () => {
    expect(indicatorOf({ isError: false, isPending: false, error: null })).toBe(
      'ready',
    );
  });

  it('R21: un error de red o de servidor gana a los datos anteriores', () => {
    // TanStack conserva `data` cuando falla un refresco: el estado se decide por `isError`.
    const withStaleData = (error: unknown) => ({
      isError: true,
      isPending: false,
      error,
      data: { count: 12, capped: false },
    });
    expect(
      indicatorOf(withStaleData(new ApiProblemError({ kind: 'network' }))),
    ).toBe('error');
    expect(indicatorOf(withStaleData(failure(500)))).toBe('error');
    expect(indicatorOf(withStaleData(failure(404)))).toBe('error');
  });

  it('R22: un 403 es «sin permiso», no un error', () => {
    expect(
      indicatorOf({ isError: true, isPending: false, error: failure(403) }),
    ).toBe('forbidden');
  });
});
