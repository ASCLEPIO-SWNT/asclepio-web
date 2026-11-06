import { describe, expect, it } from 'vitest';
import { createQueryClient } from './queryClient';

describe('UI-03-web QueryClient sin reintento por reconexión (D13)', () => {
  it('R16: ninguna consulta de la app se repite por reconexión ni espera a estar en línea', () => {
    const { queries } = createQueryClient().getDefaultOptions();
    expect(queries?.refetchOnReconnect).toBe(false);
    expect(queries?.networkMode).toBe('always');
  });

  it('R17: las mutaciones no se reintentan ni quedan en pausa hasta reconectar', () => {
    const { mutations } = createQueryClient().getDefaultOptions();
    expect(mutations?.retry).toBe(0);
    expect(mutations?.networkMode).toBe('always');
  });

  it('R16: las pruebas pueden quitar reintentos sin perder los valores de la app', () => {
    const { queries, mutations } = createQueryClient({
      queries: { retry: false },
      mutations: { retry: false },
    }).getDefaultOptions();
    expect(queries).toMatchObject({ retry: false, refetchOnReconnect: false });
    expect(mutations).toMatchObject({ retry: false, networkMode: 'always' });
  });
});
