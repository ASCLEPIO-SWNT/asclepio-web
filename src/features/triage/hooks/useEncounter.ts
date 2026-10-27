import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/api/client';
import { unwrap } from '../../../shared/lib/problem';

export const encounterKey = (id: string) =>
  ['triage', 'encounter', id] as const;

/** Detalle de una atención con su línea de tiempo (R31–R33). */
export function useEncounter(id: string) {
  return useQuery({
    queryKey: encounterKey(id),
    queryFn: () =>
      unwrap(() =>
        api.GET('/api/v1/encounters/{id}', { params: { path: { id } } }),
      ),
    retry: false,
  });
}
