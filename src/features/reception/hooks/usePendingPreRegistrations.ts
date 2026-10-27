import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/api/client';
import { unwrap } from '../../../shared/lib/problem';

export const PRE_REGISTRATIONS_KEY = [
  'reception',
  'pre-registrations',
] as const;

/** Repetición de la bandeja (D6): valor técnico, no clínico. */
export const TRAY_REFRESH_MS = 30_000;

/**
 * Bandeja de pre-registros pendientes (R6, R8, R9). `siteId` null = "Todas las sedes"
 * (sin `siteId` en la query). Se repite cada 30 s solo con la pestaña visible.
 */
export function usePendingPreRegistrations(siteId: string | null) {
  return useQuery({
    queryKey: [...PRE_REGISTRATIONS_KEY, siteId ?? 'all'],
    queryFn: () =>
      unwrap(() =>
        api.GET('/api/v1/pre-registrations', {
          params: { query: siteId ? { siteId } : {} },
        }),
      ),
    refetchInterval: TRAY_REFRESH_MS,
    refetchIntervalInBackground: false,
    retry: false,
  });
}
