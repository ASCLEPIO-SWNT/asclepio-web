import { useQuery } from '@tanstack/react-query';
import { api, type EncounterStatus } from '../../../shared/api/client';
import { unwrap } from '../../../shared/lib/problem';

export const ENCOUNTERS_KEY = ['triage', 'encounters'] as const;

/** Tamaño de página: el `default` del contrato (D13). */
export const PAGE_SIZE = 50;

export interface EncounterFilters {
  status: EncounterStatus | null;
  siteId: string | null;
  offset: number;
}

/** Lista de atenciones (R28): `limit=50`, `offset` y solo los filtros elegidos. */
export function useEncounters(
  { status, siteId, offset }: EncounterFilters,
  { manualRefresh = false }: { manualRefresh?: boolean } = {},
) {
  return useQuery({
    queryKey: [...ENCOUNTERS_KEY, { status, siteId, offset }],
    queryFn: () =>
      unwrap(() =>
        api.GET('/api/v1/encounters', {
          params: {
            query: {
              limit: PAGE_SIZE,
              offset,
              ...(status ? { status } : {}),
              ...(siteId ? { siteId } : {}),
            },
          },
        }),
      ),
    retry: false,
    ...(manualRefresh
      ? { refetchOnWindowFocus: false, refetchOnReconnect: false }
      : {}),
  });
}
