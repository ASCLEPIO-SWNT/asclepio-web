import { useMutation } from '@tanstack/react-query';
import { api } from '../../../shared/api/client';
import { unwrap } from '../../../shared/lib/problem';

export interface CreateEncounterInput {
  patientId: string;
  siteId: string;
  chiefComplaintText: string;
}

/** Registro directo de la llegada (R26): `complaintSource` siempre `TYPED` (D8). */
export function useCreateEncounter() {
  return useMutation({
    mutationFn: ({
      patientId,
      siteId,
      chiefComplaintText,
    }: CreateEncounterInput) =>
      unwrap(() =>
        api.POST('/api/v1/encounters', {
          body: {
            patientId,
            siteId,
            chiefComplaintText,
            complaintSource: 'TYPED',
          },
        }),
      ),
  });
}
