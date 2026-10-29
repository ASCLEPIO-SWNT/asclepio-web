import { useQuery } from '@tanstack/react-query';
import { api, type EncounterStatus } from '../api/client';
import { autoRefresh } from '../lib/refresh';
import { unwrap } from '../lib/problem';

/**
 * Prefijo común de las listas y de los conteos de atenciones (D4): invalidarlo repite ambos
 * (lo hacen la cancelación, la captura clínica y, tras confirmar una llegada, la recepción).
 */
export const ENCOUNTERS_KEY = ['encounters'] as const;

/** Tamaño de página de la bandeja: el `default` del contrato (D13 de F-03-web). */
export const PAGE_SIZE = 50;

/** Página de un conteo: el máximo del contrato (D5). Si se llena, la cifra es «N+». */
export const COUNT_LIMIT = 100;

/** Atenciones recientes de `/cola` (D17). */
export const RECENT_LIMIT = 8;

export interface EncounterFilters {
  status: EncounterStatus | null;
  siteId: string | null;
  offset: number;
}

/**
 * Lista de atenciones (R28 de F-02-web): `limit` (50 por defecto), `offset` y solo los filtros
 * elegidos. Con `refresh` se repite cada 30 s con la pestaña visible, sin repetir por foco ni
 * por reconexión (`autoRefresh`, D14); sin él conserva el comportamiento de `/atenciones`.
 */
export function useEncounters(
  { status, siteId, offset }: EncounterFilters,
  {
    refresh = false,
    limit = PAGE_SIZE,
  }: { refresh?: boolean; limit?: number } = {},
) {
  return useQuery({
    queryKey: [...ENCOUNTERS_KEY, { status, siteId, offset, limit }],
    queryFn: () =>
      unwrap(() =>
        api.GET('/api/v1/encounters', {
          params: {
            query: {
              limit,
              offset,
              ...(status ? { status } : {}),
              ...(siteId ? { siteId } : {}),
            },
          },
        }),
      ),
    retry: false,
    ...(refresh ? autoRefresh() : {}),
  });
}
