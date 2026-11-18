import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/api/client';
import { problemOf, statusOf, unwrap } from '../../../shared/lib/problem';
import { autoRefresh } from '../../../shared/lib/refresh';
import type { ReportPeriod } from '../reportsView';

/** Prefijo de todo lo de reportes en TanStack Query (F-07-web D3). */
export const REPORTS_KEY = ['reports'] as const;
/** Prefijo de los resúmenes: «Actualizar» lo invalida y `useIsFetching` lo observa. */
export const SUMMARY_KEY = [...REPORTS_KEY, 'summary'] as const;

export const summaryKey = ({ from, to, siteId }: ReportPeriod) =>
  [...SUMMARY_KEY, from, to, siteId ?? 'all'] as const;

/**
 * Resumen de indicadores del periodo aplicado (F-07-web D3; R2, R6, R8, R20, R22): un único
 * `GET /api/v1/reports/summary` con `from`, `to` y `siteId` solo si hay sede. Se repite en cada
 * ciclo de `DASHBOARD_REFRESH_MS` con la pestaña visible (`autoRefresh`), salvo tras un 403, un
 * 400 o un 422: repetir el mismo periodo inválido no cambia nada. Sin `placeholderData`: otro
 * periodo arranca sin datos y nunca se ven cifras del anterior.
 */
export function useReportSummary(period: ReportPeriod) {
  const refresh = autoRefresh();
  const { from, to, siteId } = period;
  return useQuery({
    queryKey: summaryKey(period),
    queryFn: () =>
      unwrap(() =>
        api.GET('/api/v1/reports/summary', {
          params: { query: siteId ? { from, to, siteId } : { from, to } },
        }),
      ),
    ...refresh,
    refetchInterval: (query: { state: { error: unknown } }) => {
      const status = statusOf(problemOf(query.state.error));
      return status === 400 || status === 422
        ? (false as const)
        : refresh.refetchInterval(query);
    },
  });
}
