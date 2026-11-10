import type {
  ClinicalCapture,
  TriageSuggestion,
} from '../../shared/api/client';

/**
 * Funciones puras del panel de sugerencia (F-04-web D6, D12, D13, D15). No leen la red ni
 * almacenan nada.
 */

export type SuggestionMode = 'none' | 'proposal' | 'manual';

type Translate = (
  key: string,
  inputs?: Record<string, string | number>,
) => string;

/** D6: el modo sale solo de `status`; los campos de nivel no cuentan (R16). */
export function suggestionMode(
  current: TriageSuggestion | null,
): SuggestionMode {
  if (current === null) return 'none';
  return current.status === 'OK' ? 'proposal' : 'manual';
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V'] as const;

/** D12 (PA-1 a): nivel 1–5 de la Res. 5596 en números romanos. */
export function romanLevel(level: number): string {
  return ROMAN[level - 1] ?? String(level);
}

/** `vital_signs.<campo>` de la instantánea → clave `clinical_field_*` de la captura (D13). */
const VITAL_FIELDS: Record<string, string> = {
  respiratory_rate: 'clinical_field_respiratoryRate',
  spo2: 'clinical_field_oxygenSaturation',
  supplemental_oxygen: 'clinical_field_supplementalOxygen',
  systolic_bp: 'clinical_field_systolicBp',
  diastolic_bp: 'clinical_field_diastolicBp',
  heart_rate: 'clinical_field_heartRate',
  consciousness: 'clinical_field_consciousness',
  temperature_c: 'clinical_field_temperatureC',
  glucose_mg_dl: 'clinical_field_glucoseMgDl',
};

const SNAPSHOT_FIELDS: Record<string, string> = {
  age_years: 'suggestion_factor_age',
  sex: 'suggestion_factor_sex',
  chief_complaint_text: 'suggestion_factor_complaint',
  complaint_source: 'suggestion_factor_complaint_source',
};

/** D13 (PA-6 b): etiqueta en la UI de un campo de la instantánea; una ruta desconocida, literal. */
export function factorLabel(field: string, t: Translate): string {
  const vital = /^vital_signs\.(\w+)$/.exec(field);
  if (vital) {
    const key = VITAL_FIELDS[vital[1]];
    return key ? t(key) : field;
  }
  const finding = /^symptom_findings\[(\d+)\]$/.exec(field);
  if (finding)
    return t('suggestion_factor_finding', { n: Number(finding[1]) + 1 });
  const key = SNAPSHOT_FIELDS[field];
  return key ? t(key) : field;
}

/**
 * D15 (PA-8 b): hay una toma o hallazgo registrado después de la sugerencia. Solo compara horas
 * del servidor; no calcula ni envía horas legales.
 */
export function isOutdated(
  suggestion: TriageSuggestion | null,
  capture: ClinicalCapture,
): boolean {
  if (suggestion === null) return false;
  const created = Date.parse(suggestion.createdAt);
  return [...capture.vitalSigns, ...capture.symptomFindings].some(
    (record) => Date.parse(record.recordedAt) > created,
  );
}
