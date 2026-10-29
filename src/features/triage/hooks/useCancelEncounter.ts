import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../shared/api/client';
import { unwrap } from '../../../shared/lib/problem';
import { encounterKey } from './useEncounter';
import { ENCOUNTERS_KEY } from '../../../shared/hooks/useEncounters';

/**
 * Cancelación de una atención (R36, D14): con 200 la respuesta reemplaza el detalle en la
 * caché y la lista se invalida.
 */
export function useCancelEncounter(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) =>
      unwrap(() =>
        api.POST('/api/v1/encounters/{id}/cancel', {
          params: { path: { id } },
          body: { reason },
        }),
      ),
    onSuccess: (encounter) => {
      queryClient.setQueryData(encounterKey(id), encounter);
      void queryClient.invalidateQueries({ queryKey: ENCOUNTERS_KEY });
    },
  });
}
