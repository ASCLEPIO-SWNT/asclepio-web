import type { EncounterStatus } from '../api/client';
import { ENCOUNTER_STATUS_VIEW } from '../lib/encounterStatus';
import { ENCOUNTER_STATUS_LABELS } from '../lib/labels';
import { StatusBadge } from './StatusBadge';

/**
 * Insignia del estado de una atención (UI-04-web R6, D5): el icono y el tono de
 * `ENCOUNTER_STATUS_VIEW` con el texto localizado de `ENCOUNTER_STATUS_LABELS`, como en `/cola`.
 */
export function EncounterStatusBadge({ status }: { status: EncounterStatus }) {
  const view = ENCOUNTER_STATUS_VIEW[status];
  return (
    <StatusBadge tone={view.tone} icon={view.icon}>
      {ENCOUNTER_STATUS_LABELS[status]}
    </StatusBadge>
  );
}
