import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/api/client';
import { unwrap } from '../../../shared/lib/problem';

export const triageSuggestionsKey = (id: string) =>
  ['triage', 'suggestions', id] as const;

/**
 * F-04-web D3: sugerencias de una atención, de la más reciente a la más antigua (`items[0]` es
 * la vigente). Solo en memoria (D17) y sin reintentos automáticos: el panel tiene su «Reintentar».
 */
export function useTriageSuggestions(id: string, enabled = true) {
  return useQuery({
    queryKey: triageSuggestionsKey(id),
    enabled,
    queryFn: () =>
      unwrap(() =>
        api.GET('/api/v1/encounters/{id}/triage-suggestions', {
          params: { path: { id } },
        }),
      ),
    retry: false,
  });
}
