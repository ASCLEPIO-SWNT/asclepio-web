import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/api/client';
import { unwrap } from '../../../shared/lib/problem';
import { DASHBOARD_REFRESH_MS, autoRefresh } from '../../../shared/lib/refresh';

export const PRE_REGISTRATIONS_KEY = [
  'reception',
  'pre-registrations',
] as const;

/** Repetición de la bandeja: el mismo valor técnico que el resto de dashboards (D17). */
export const TRAY_REFRESH_MS = DASHBOARD_REFRESH_MS;

/**
 * Bandeja de preregistros pendientes (R6, R8, R9). `siteId` null = "Todas las sedes"
 * (sin `siteId` en la query). Se repite cada 30 s solo con la pestaña visible, sin repetir por
 * foco ni por reconexión, y deja de repetirse tras un 403 (`autoRefresh`, D14, R24, R25, R22).
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
    ...autoRefresh(),
  });
}
