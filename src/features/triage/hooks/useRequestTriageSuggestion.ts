import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type TriageSuggestionList } from '../../../shared/api/client';
import { problemOf, statusOf, unwrap } from '../../../shared/lib/problem';
import { invalidateClinicalCapture } from './invalidateClinicalCapture';
import { triageSuggestionsKey } from './useTriageSuggestions';

/**
 * F-04-web D4, D5: pide una sugerencia nueva (POST sin cuerpo). Sin reintento ni plazo propio:
 * la API acota la espera y cada solicitud consume tokens. En 201 la respuesta pasa a `items[0]`
 * sin volver a pedir la consulta; en 409 se invalida la captura como en F-03-web R17.
 */
export function useRequestTriageSuggestion(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () =>
      unwrap(() =>
        api.POST('/api/v1/encounters/{id}/triage-suggestions', {
          params: { path: { id } },
        }),
      ),
    retry: false,
    onSuccess: async (suggestion) => {
      // Una consulta en vuelo, enviada antes de la solicitud, no debe pisar la respuesta.
      await client.cancelQueries({ queryKey: triageSuggestionsKey(id) });
      client.setQueryData<TriageSuggestionList>(
        triageSuggestionsKey(id),
        (previous) => ({ items: [suggestion, ...(previous?.items ?? [])] }),
      );
    },
    onError: async (error) => {
      if (statusOf(problemOf(error)) === 409)
        await invalidateClinicalCapture(client, id);
    },
  });
}
