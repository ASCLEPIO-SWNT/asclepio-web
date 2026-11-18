import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../shared/api/client';
import { ENCOUNTERS_KEY } from '../../../shared/hooks/useEncounters';
import { problemOf, statusOf, unwrap } from '../../../shared/lib/problem';
import { QUEUE_KEY } from './useQueue';

/** Clave de las acciones del médico, observable con `useIsMutating` (F-06-web D10, R20). */
export const QUEUE_TRANSITION_KEY = ['queue', 'transition'] as const;

export type QueueTransitionKind = 'start' | 'close';

export interface QueueTransition {
  kind: QueueTransitionKind;
  id: string;
}

/**
 * «Iniciar atención» (`start-care`) y «Cerrar atención» (`close`) (F-06-web D10, D11; R19–R23):
 * sin cuerpo y sin reintento. En 200 se invalidan la cola y las listas de atenciones, sin
 * escribir en la caché (la fila cambia con la nueva respuesta). En 409 y 404 se vuelve a pedir
 * la cola.
 */
export function useQueueTransition() {
  const client = useQueryClient();
  return useMutation({
    mutationKey: QUEUE_TRANSITION_KEY,
    mutationFn: ({ kind, id }: QueueTransition) =>
      unwrap(() =>
        kind === 'start'
          ? api.POST('/api/v1/encounters/{id}/start-care', {
              params: { path: { id } },
            })
          : api.POST('/api/v1/encounters/{id}/close', {
              params: { path: { id } },
            }),
      ),
    retry: false,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: QUEUE_KEY });
      void client.invalidateQueries({ queryKey: ENCOUNTERS_KEY });
    },
    onError: (error) => {
      const status = statusOf(problemOf(error));
      if (status === 409 || status === 404)
        void client.invalidateQueries({ queryKey: QUEUE_KEY });
    },
  });
}
