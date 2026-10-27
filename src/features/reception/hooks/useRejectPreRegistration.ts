import { useMutation } from '@tanstack/react-query';
import { api } from '../../../shared/api/client';
import { unwrap } from '../../../shared/lib/problem';

/** Rechazo de un pre-registro (R16): `{ reason }` con el motivo ya recortado. */
export function useRejectPreRegistration() {
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      unwrap(() =>
        api.POST('/api/v1/pre-registrations/{id}/reject', {
          params: { path: { id } },
          body: { reason },
        }),
      ),
  });
}
