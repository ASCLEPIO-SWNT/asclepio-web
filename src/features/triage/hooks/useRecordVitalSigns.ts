import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type CreateVitalSigns } from '../../../shared/api/client';
import { problemOf, statusOf, unwrap } from '../../../shared/lib/problem';
import { invalidateClinicalCapture } from './invalidateClinicalCapture';
export function useRecordVitalSigns(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateVitalSigns) =>
      unwrap(() =>
        api.POST('/api/v1/encounters/{id}/vital-signs', {
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
