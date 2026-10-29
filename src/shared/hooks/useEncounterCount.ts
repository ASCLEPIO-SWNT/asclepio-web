import { useQuery } from '@tanstack/react-query';
import { api, type EncounterStatus } from '../api/client';
import { countOf, type Count } from '../lib/counts';
import { unwrap } from '../lib/problem';
import { autoRefresh } from '../lib/refresh';
import { COUNT_LIMIT, ENCOUNTERS_KEY } from './useEncounters';

export interface EncounterCountFilters {
  status?: EncounterStatus | null;
  siteId?: string | null;
}

/**
 * Conteo de atenciones para un indicador (D5, R7): una sola petición `GET /encounters` con
 * `limit=100` y `status` y `siteId` solo si aplican. El contrato no devuelve total, así que
 * `queryFn` guarda únicamente `{ count, capped }`: ninguna atención ni dato de paciente entra
 * en la caché. Se repite cada 30 s con la pestaña visible (`autoRefresh`).
 */
export function useEncounterCount({
  status = null,
  siteId = null,
}: EncounterCountFilters = {}) {
  return useQuery<Count>({
    queryKey: [...ENCOUNTERS_KEY, 'count', { status, siteId }],
    queryFn: async () => {
      const { items } = await unwrap(() =>
        api.GET('/api/v1/encounters', {
          params: {
            query: {
              limit: COUNT_LIMIT,
              ...(status ? { status } : {}),
              ...(siteId ? { siteId } : {}),
            },
          },
        }),
      );
      return countOf(items.length, 0, COUNT_LIMIT);
    },
    ...autoRefresh(),
  });
}
