import {
  ArchiveBoxIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  HeartIcon,
  InboxArrowDownIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { describe, expect, it } from 'vitest';
import { ENCOUNTER_STATUS_VIEW, INDICATOR_STATUSES } from './encounterStatus';
import { ENCOUNTER_STATUSES, ENCOUNTER_STATUS_LABELS } from './labels';

describe('UI-02-web tabla de estados de atención', () => {
  it('R30: los seis estados tienen icono, tono y etiqueta, y ninguno depende solo del color', () => {
    expect(Object.keys(ENCOUNTER_STATUS_VIEW).sort()).toEqual(
      [...ENCOUNTER_STATUSES].sort(),
    );
    for (const status of ENCOUNTER_STATUSES) {
      const view = ENCOUNTER_STATUS_VIEW[status];
      expect(view.icon).toBeTruthy();
      expect(view.tone).toMatch(/^(accent|ok|warn|error|neutral)$/);
      expect(ENCOUNTER_STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it('R30: cada estado usa el icono y el tono del diseño (D10)', () => {
    expect(ENCOUNTER_STATUS_VIEW).toEqual({
      REGISTERED: { icon: InboxArrowDownIcon, tone: 'neutral' },
      WAITING_TRIAGE: { icon: ClockIcon, tone: 'warn' },
      TRIAGED: { icon: ClipboardDocumentCheckIcon, tone: 'accent' },
      IN_CARE: { icon: HeartIcon, tone: 'ok' },
      CLOSED: { icon: ArchiveBoxIcon, tone: 'neutral' },
      CANCELLED: { icon: XCircleIcon, tone: 'error' },
    });
  });

  it('R15: los indicadores de medicina y administración son los tres estados activos, en ese orden', () => {
    expect(INDICATOR_STATUSES).toEqual([
      'WAITING_TRIAGE',
      'TRIAGED',
      'IN_CARE',
    ]);
  });
});
