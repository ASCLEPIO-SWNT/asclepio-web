import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  api,
  type TriageDecision,
  type TriageDecisionRequest,
} from '../../../shared/api/client';
import { problemOf, statusOf, unwrap } from '../../../shared/lib/problem';
import { invalidateClinicalCapture } from './invalidateClinicalCapture';
import { triageDecisionKey } from './useTriageDecision';
import { triageSuggestionsKey } from './useTriageSuggestions';

/** D2: clave del envío, observable con `useIsMutating` (R12). */
export const decideTriageMutationKey = (id: string) =>
  ['triage', 'decision', id, 'submit'] as const;

/**
 * F-05-web D4: envía la decisión de triage. Sin reintento (R12). En 201 la respuesta pasa a la
 * caché de la decisión sin otra consulta (R14) y se invalidan la atención, la captura y las
 * listas; en 409 se invalidan además las sugerencias para leer la vigente nueva (R18).
 */
export function useDecideTriage(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationKey: decideTriageMutationKey(id),
    mutationFn: (body: TriageDecisionRequest) =>
      unwrap(() =>
        api.POST('/api/v1/encounters/{id}/triage-decision', {
          params: { path: { id } },
          body,
        }),
      ),
    retry: false,
    // Las relecturas no se esperan: la decisión se muestra y recibe el foco sin depender de
    // ellas (R14), y tras un 409 la página hace su propia comprobación (R18).
    onSuccess: (decision) => {
      client.setQueryData<TriageDecision>(triageDecisionKey(id), decision);
      void invalidateClinicalCapture(client, id);
    },
    onError: (error) => {
      if (statusOf(problemOf(error)) === 409) {
        void invalidateClinicalCapture(client, id);
        void client.invalidateQueries({ queryKey: triageSuggestionsKey(id) });
      }
    },
  });
}
