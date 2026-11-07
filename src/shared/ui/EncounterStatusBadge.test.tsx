import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { EncounterStatus } from '../api/client';
import { ENCOUNTER_STATUS_VIEW } from '../lib/encounterStatus';
import { ENCOUNTER_STATUS_LABELS } from '../lib/labels';
import { EncounterStatusBadge } from './EncounterStatusBadge';

const STATUSES = Object.keys(ENCOUNTER_STATUS_VIEW) as EncounterStatus[];

describe('UI-04-web insignia de estado de la atención', () => {
  it.each(STATUSES)(
    'R6: %s se muestra con icono oculto, texto y el tono de ENCOUNTER_STATUS_VIEW',
    (status) => {
      const { container } = render(<EncounterStatusBadge status={status} />);
      const badge = container.firstElementChild!;
      expect(badge.tagName).toBe('SPAN');
      expect(badge).toHaveClass(
        'badge',
        `tone--${ENCOUNTER_STATUS_VIEW[status].tone}`,
      );
      expect(badge).toHaveTextContent(ENCOUNTER_STATUS_LABELS[status]);
      const icon = badge.querySelector('svg');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    },
  );
});
