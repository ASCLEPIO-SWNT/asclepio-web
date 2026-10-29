import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type CreateSymptomFindings } from '../../../shared/api/client';
import { problemOf, statusOf, unwrap } from '../../../shared/lib/problem';
import { invalidateClinicalCapture } from './invalidateClinicalCapture';
export function useRecordSymptomFindings(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSymptomFindings) =>
      unwrap(() =>
        api.POST('/api/v1/encounters/{id}/symptom-findings', {
          params: { path: { id } },
          body,
        }),
      ),
    retry: false,
    onSuccess: async () => {
      await invalidateClinicalCapture(client, id);
    },
    onError: async (error) => {
      if (statusOf(problemOf(error)) === 409)
        await invalidateClinicalCapture(client, id);
    },
  });
}
