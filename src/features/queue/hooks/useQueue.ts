import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/api/client';
import { unwrap } from '../../../shared/lib/problem';
import { autoRefresh } from '../../../shared/lib/refresh';

/** Prefijo de las consultas de la cola (F-06-web D3): «Actualizar» y las acciones lo invalidan. */
export const QUEUE_KEY = ['queue'] as const;

/** Clave de la cola de una sede (o de todas, con `null`). */
export const queueKey = (siteId: string | null) =>
  [...QUEUE_KEY, siteId ?? 'all'] as const;

/**
 * Cola priorizada (F-06-web D3, D5; R2, R11, R15): un único `GET /api/v1/queue`, con `siteId`
 * solo si hay una sede elegida. Se repite cada 30 s con la pestaña visible (`autoRefresh`). Al
 * cambiar de sede cambia la clave y la nueva arranca sin datos: sin `placeholderData`, nunca se
 * ven filas de la sede anterior.
 */
export function useQueue(siteId: string | null) {
  return useQuery({
    queryKey: queueKey(siteId),
    queryFn: () =>
      unwrap(() =>
        api.GET('/api/v1/queue', {
          params: { query: siteId ? { siteId } : {} },
        }),
      ),
    ...autoRefresh(),
  });
}
