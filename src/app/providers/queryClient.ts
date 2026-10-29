import { QueryClient, type DefaultOptions } from '@tanstack/react-query';

/**
 * Valores por defecto de TanStack Query (UI-03-web D13, PA-3). Ninguna consulta se repite por
 * reconexión (UI-02-web R25, R16) y las peticiones no esperan a que el navegador diga estar en
 * línea (`networkMode: 'always'`): sin red fallan de inmediato con el error de R15 en lugar de
 * quedar en pausa y reenviarse solas al reconectar. Las mutaciones no se reintentan (R17,
 * F-03.AC1: reenviar una captura podría duplicar mediciones).
 */
export const QUERY_DEFAULTS = {
  queries: { refetchOnReconnect: false, networkMode: 'always' },
  mutations: { retry: 0, networkMode: 'always' },
} as const satisfies DefaultOptions;

export function createQueryClient(overrides: DefaultOptions = {}) {
  return new QueryClient({
    defaultOptions: {
      ...overrides,
      queries: { ...QUERY_DEFAULTS.queries, ...overrides.queries },
      mutations: { ...QUERY_DEFAULTS.mutations, ...overrides.mutations },
    },
  });
}
