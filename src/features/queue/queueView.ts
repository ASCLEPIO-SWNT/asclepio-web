import type {
  EncounterStatus,
  Queue,
  QueueItem,
  QueuePatient,
} from '../../shared/api/client';
import { t } from '../../shared/i18n';
import { SEX_LABELS } from '../../shared/lib/labels';

/**
 * Funciones puras de la cola (F-06-web D6, D7). No leen la red, el reloj ni el almacenamiento:
 * todo sale de la respuesta de la API, tal como llega.
 */

export type QueueSectionId = 'waiting' | 'triaged' | 'inCare';

export interface QueueSectionView {
  id: QueueSectionId;
  status: Extract<EncounterStatus, 'WAITING_TRIAGE' | 'TRIAGED' | 'IN_CARE'>;
  /** Etiqueta de la sección: la misma que la del indicador (PA-2). */
  titleKey: string;
  emptyKey: string;
  items: QueueItem[];
}

/** R3, D6: las tres secciones en su orden, con las filas tal cual (sin ordenar ni filtrar). */
export function sectionsOf(queue: Queue): QueueSectionView[] {
  return [
    {
      id: 'waiting',
      status: 'WAITING_TRIAGE',
      titleKey: 'dash_stat_waiting',
      emptyKey: 'queue_empty_waiting',
      items: queue.waitingTriage,
    },
    {
      id: 'triaged',
      status: 'TRIAGED',
      titleKey: 'dash_stat_triaged',
      emptyKey: 'queue_empty_triaged',
      items: queue.triaged,
    },
    {
      id: 'inCare',
      status: 'IN_CARE',
      titleKey: 'dash_stat_in_care',
      emptyKey: 'queue_empty_in_care',
      items: queue.inCare,
    },
  ];
}

const DASH = '—';

/** R4: «{iniciales} · {edad} años · {sexo}», con «Paciente NN» sin iniciales y «—» sin edad o sexo. */
export function patientLabel(patient: QueuePatient): string {
  return t('queue_patient', {
    initials: patient.initials ?? t('feature_patient_nn'),
    age:
      patient.ageYears === null
        ? DASH
        : t('queue_age', { age: patient.ageYears }),
    sex: patient.sex === null ? DASH : SEX_LABELS[patient.sex],
  });
}

/** R4, R5: «{n} min» con el entero de la API; sin espera (en atención), nada. */
export function waitLabel(item: QueueItem): string | null {
  return item.waitMinutes === null
    ? null
    : t('queue_wait_minutes', { minutes: item.waitMinutes });
}

/**
 * R10, D7 (PA-3 a): tiempo máximo solo en «Clasificadas» y con `maxWaitMinutes` no nulo:
 * «Atención inmediata» con 0 y «Máx. {n} min» con otro valor.
 */
export function maxWaitLabel(item: QueueItem): string | null {
  if (item.status !== 'TRIAGED' || item.maxWaitMinutes === null) return null;
  return item.maxWaitMinutes === 0
    ? t('queue_max_immediate')
    : t('queue_max_minutes', { minutes: item.maxWaitMinutes });
}
