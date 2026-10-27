import type {
  ComplaintSource,
  DocumentType,
  EncounterEvent,
  EncounterOrigin,
  EncounterStatus,
  Sex,
} from '../api/client';

/** Etiquetas en español del glosario de F-02-web (las comparten reception y triage). */
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  CC: 'Cédula de ciudadanía',
  TI: 'Tarjeta de identidad',
  CE: 'Cédula de extranjería',
  PA: 'Pasaporte',
  RC: 'Registro civil',
};
export const DOCUMENT_TYPES = Object.keys(
  DOCUMENT_TYPE_LABELS,
) as DocumentType[];

export const SEX_LABELS: Record<Sex, string> = {
  M: 'Masculino',
  F: 'Femenino',
  X: 'Indeterminado / otro',
};
export const SEXES = Object.keys(SEX_LABELS) as Sex[];

export const ENCOUNTER_STATUS_LABELS: Record<EncounterStatus, string> = {
  REGISTERED: 'Registrada',
  WAITING_TRIAGE: 'En espera de triage',
  TRIAGED: 'Clasificada',
  IN_CARE: 'En atención',
  CLOSED: 'Cerrada',
  CANCELLED: 'Cancelada',
};
export const ENCOUNTER_STATUSES = Object.keys(
  ENCOUNTER_STATUS_LABELS,
) as EncounterStatus[];

export const ORIGIN_LABELS: Record<EncounterOrigin, string> = {
  PRE_REGISTRATION: 'Pre-registro (app)',
  DIRECT: 'Registro directo',
};

export const COMPLAINT_SOURCE_LABELS: Record<ComplaintSource, string> = {
  TYPED: 'Escrito',
  VOICE_ON_DEVICE: 'Dictado en el dispositivo',
};

const EVENT_LABELS: Record<string, string> = {
  ENCOUNTER_CREATED: 'Atención creada',
  STATUS_CHANGED: 'Cambio de estado',
  VITAL_SIGNS_RECORDED: 'Signos vitales registrados',
  SYMPTOM_FINDINGS_RECORDED: 'Hallazgos registrados',
};

/** Etiqueta de un tipo de evento; los tipos que la web aún no conoce se toleran (D12). */
export function eventLabel(type: string): string {
  return EVENT_LABELS[type] ?? `Evento (${type})`;
}

/** Etiqueta del actor de un evento: el nombre del personal, "Paciente" o "Sistema". */
export function actorLabel(actor: EncounterEvent['actor']): string {
  switch (actor.type) {
    case 'STAFF':
      return actor.fullName ?? 'Personal';
    case 'PATIENT':
      return 'Paciente';
    case 'SYSTEM':
      return 'Sistema';
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
  return patient.isNN ? 'Paciente NN' : '—';
}

/** "Cédula de ciudadanía 1032456789", o null si el paciente no tiene documento. */
export function patientDocument(patient: PatientLike): string | null {
  if (!patient.documentType || !patient.documentNumber) return null;
  return `${DOCUMENT_TYPE_LABELS[patient.documentType]} ${patient.documentNumber}`;
}
