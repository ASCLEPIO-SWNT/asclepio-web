import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/api/client';
import { unwrap } from '../../../shared/lib/problem';

export const triageDecisionKey = (id: string) =>
  ['triage', 'decision', id] as const;

/**
 * F-05-web D5: decisión de triage de una atención. Solo se consulta si la atención ya trae nivel
 * final (`enabled`), para no hacer un `GET` que acabaría en 404. Sin reintentos automáticos: la
 * tarjeta tiene su «Reintentar» (R17).
 */
export function useTriageDecision(id: string, enabled = true) {
  return useQuery({
    queryKey: triageDecisionKey(id),
    enabled,
    queryFn: () =>
      unwrap(() =>
        api.GET('/api/v1/encounters/{id}/triage-decision', {
          params: { path: { id } },
        }),
      ),
    retry: false,
  });
}
