import { useMutation } from '@tanstack/react-query';
import { api } from '../../../shared/api/client';
import { saveFile } from '../../../shared/lib/download';
import { ApiProblemError, toApiProblem } from '../../../shared/lib/problem';
import {
  csvFilename,
  filenameFromDisposition,
  type ReportPeriod,
} from '../reportsView';
import { REPORTS_KEY } from './useReportSummary';

/** Clave de la descarga: `useIsMutating` la observa para `aria-busy` (R25). */
export const CSV_KEY = [...REPORTS_KEY, 'csv'] as const;

/**
 * Descarga del CSV interno (F-07-web D7, D8; R24–R27): un `GET /api/v1/reports/encounters.csv`
 * con el periodo aplicado, por el cliente central (Bearer y cierre de sesión ante un 401), y el
 * cuerpo se guarda tal cual. La mutación devuelve `undefined`: el archivo no entra en la caché.
 * Sin reintentos.
 */
export function useCsvDownload() {
  return useMutation({
    mutationKey: CSV_KEY,
    retry: false,
    mutationFn: async (period: ReportPeriod): Promise<void> => {
      const { from, to, siteId } = period;
      const call = () =>
        api.GET('/api/v1/reports/encounters.csv', {
          params: { query: siteId ? { from, to, siteId } : { from, to } },
          parseAs: 'blob',
        });
      let result: Awaited<ReturnType<typeof call>>;
      try {
        result = await call();
      } catch {
        throw new ApiProblemError({ kind: 'network' });
      }
      const { data, error, response } = result;
      if (!response.ok || data === undefined)
        throw new ApiProblemError(toApiProblem(response, error));
      saveFile(
        data,
        filenameFromDisposition(response.headers.get('Content-Disposition')) ??
          csvFilename(period),
      );
    },
  });
}
