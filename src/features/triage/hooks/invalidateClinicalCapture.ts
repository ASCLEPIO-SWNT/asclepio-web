import type { QueryClient } from '@tanstack/react-query';
import { clinicalCaptureKey } from './useClinicalCapture';
import { encounterKey } from './useEncounter';
import { ENCOUNTERS_KEY } from './useEncounters';
export function invalidateClinicalCapture(client: QueryClient, id: string) {
  return Promise.all(
    [clinicalCaptureKey(id), encounterKey(id), ENCOUNTERS_KEY].map((queryKey) =>
      client.invalidateQueries({ queryKey }),
    ),
  );
}
