import { useMutation } from '@tanstack/react-query';
import { api } from '../../../shared/api/client';
import { unwrap } from '../../../shared/lib/problem';

/** Confirmación de llegada (R11, D5): el cuerpo es siempre `{ identityVerified: true }`. */
export function useConfirmPreRegistration() {
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(() =>
        api.POST('/api/v1/pre-registrations/{id}/confirm', {
          params: { path: { id } },
          body: { identityVerified: true },
        }),
      ),
  });
}
