import { useMutation } from '@tanstack/react-query';
import { api, type CreatePatient } from '../../../shared/api/client';
import { unwrap } from '../../../shared/lib/problem';

/** Alta de paciente con documento o NN (R22). */
export function useCreatePatient() {
  return useMutation({
    mutationFn: (body: CreatePatient) =>
      unwrap(() => api.POST('/api/v1/patients', { body })),
  });
}
