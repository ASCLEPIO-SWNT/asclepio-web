import { t } from '../i18n';
import type {
  ComplaintSource,
  DocumentType,
  EncounterEvent,
  EncounterOrigin,
  EncounterStatus,
  Sex,
} from '../api/client';

/** Domain codes stay unchanged; labels resolve in the active locale at render time. */
function localizedLabels<T extends string>(
  keys: Record<T, string>,
): Record<T, string> {
  return Object.defineProperties(
    Object.create(null),
    Object.fromEntries(
      Object.entries(keys).map(([code, key]) => [
        code,
        { enumerable: true, get: () => t(key as string) },
      ]),
    ),
  ) as Record<T, string>;
}
export const DOCUMENT_TYPE_LABELS = localizedLabels<DocumentType>({
  CC: 'feature_doc_cc',
  TI: 'feature_doc_ti',
  CE: 'feature_doc_ce',
  PA: 'feature_doc_pa',
  RC: 'feature_doc_rc',
});
export const DOCUMENT_TYPES = Object.keys(
  DOCUMENT_TYPE_LABELS,
) as DocumentType[];

export const SEX_LABELS = localizedLabels<Sex>({
  M: 'feature_sex_m',
  F: 'feature_sex_f',
  X: 'feature_sex_x',
});
export const SEXES = Object.keys(SEX_LABELS) as Sex[];

export const ENCOUNTER_STATUS_LABELS = localizedLabels<EncounterStatus>({
  REGISTERED: 'feature_status_registered',
  WAITING_TRIAGE: 'feature_status_waiting',
  TRIAGED: 'feature_status_triaged',
  IN_CARE: 'feature_status_care',
  CLOSED: 'feature_status_closed',
  CANCELLED: 'feature_status_cancelled',
});
export const ENCOUNTER_STATUSES = Object.keys(
  ENCOUNTER_STATUS_LABELS,
) as EncounterStatus[];

export const ORIGIN_LABELS = localizedLabels<EncounterOrigin>({
  PRE_REGISTRATION: 'feature_origin_pr',
  DIRECT: 'feature_registration_direct',
});

export const COMPLAINT_SOURCE_LABELS = localizedLabels<ComplaintSource>({
  TYPED: 'feature_complaint_typed',
  VOICE_ON_DEVICE: 'feature_complaint_voice',
});

const EVENT_LABELS = localizedLabels<string>({
  ENCOUNTER_CREATED: 'feature_event_created',
  STATUS_CHANGED: 'feature_event_status',
  VITAL_SIGNS_RECORDED: 'feature_event_vitals',
  SYMPTOM_FINDINGS_RECORDED: 'feature_event_findings',
  // F-05-web D16 (PA-4 a): solo la etiqueta, sin nivel, acción ni motivo.
  TRIAGE_DECIDED: 'feature_event_triage_decided',
});

/** Etiqueta de un tipo de evento; los tipos que la web aún no conoce se toleran (D12). */
export function eventLabel(type: string): string {
  return EVENT_LABELS[type] ?? t('feature_event_unknown', { type });
}

/** Etiqueta del actor de un evento: el nombre del personal, "Paciente" o "Sistema". */
export function actorLabel(actor: EncounterEvent['actor']): string {
  switch (actor.type) {
    case 'STAFF':
      return actor.fullName ?? t('feature_staff');
    case 'PATIENT':
      return t('feature_patient');
    case 'SYSTEM':
      return t('feature_system');
  }
}

/** Etiqueta de un estado que puede faltar (`fromStatus` del primer cambio). */
export function statusLabel(status: EncounterStatus | null): string {
  return status === null ? '—' : ENCOUNTER_STATUS_LABELS[status];
}

interface PatientLike {
  fullName: string | null;
  isNN: boolean;
  documentType: DocumentType | null;
  documentNumber: string | null;
}

/** Nombre del paciente, o "Paciente NN" si es NN sin nombre (R24, R29). */
export function patientName(patient: PatientLike): string {
  if (patient.fullName) return patient.fullName;
  return patient.isNN ? t('feature_patient_nn') : '—';
}

/** "Cédula de ciudadanía 1032456789", o null si el paciente no tiene documento. */
export function patientDocument(patient: PatientLike): string | null {
  if (!patient.documentType || !patient.documentNumber) return null;
  return `${DOCUMENT_TYPE_LABELS[patient.documentType]} ${patient.documentNumber}`;
}
