import {
  ArchiveBoxIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  HeartIcon,
  InboxArrowDownIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';
import type { EncounterStatus } from '../api/client';

/** Tono semántico de una insignia o de un chip: fija `--tone` y `--tone-bg` en `.tone--*` (D10). */
export type Tone = 'accent' | 'ok' | 'warn' | 'error' | 'neutral';

export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * Icono y tono de cada estado de atención (R30, D10). La etiqueta sale de
 * `ENCOUNTER_STATUS_LABELS` (ya localizada): el estado nunca depende solo del color. El tono
 * identifica la categoría, no un umbral.
 */
export const ENCOUNTER_STATUS_VIEW: Record<
  EncounterStatus,
  { icon: IconComponent; tone: Tone }
> = {
  REGISTERED: { icon: InboxArrowDownIcon, tone: 'neutral' },
  WAITING_TRIAGE: { icon: ClockIcon, tone: 'warn' },
  TRIAGED: { icon: ClipboardDocumentCheckIcon, tone: 'accent' },
  IN_CARE: { icon: HeartIcon, tone: 'ok' },
  CLOSED: { icon: ArchiveBoxIcon, tone: 'neutral' },
  CANCELLED: { icon: XCircleIcon, tone: 'error' },
};

/** Estados de los indicadores de `/cola` y `/reportes` (R15), en el orden de la barra de resumen. */
export const INDICATOR_STATUSES = [
  'WAITING_TRIAGE',
  'TRIAGED',
  'IN_CARE',
] as const satisfies readonly EncounterStatus[];
