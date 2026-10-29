import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/api/client';
import { unwrap } from '../../../shared/lib/problem';
export const clinicalCaptureKey = (id: string) =>
  ['triage', 'clinicalCapture', id] as const;
export function useClinicalCapture(id: string, enabled = true) {
  return useQuery({
    queryKey: clinicalCaptureKey(id),
    enabled,
    queryFn: () =>
      unwrap(() =>
        api.GET('/api/v1/encounters/{id}/clinical-capture', {
          params: { path: { id } },
        }),
      ),
    retry: false,
  });
}
