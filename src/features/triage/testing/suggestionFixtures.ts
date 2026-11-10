import type {
  TriageSuggestion,
  TriageSuggestionList,
} from '../../../shared/api/client';
import {
  ENCOUNTER_ID,
  json,
  staffMe,
  type Handler,
} from '../../../test/fakeApi';

/**
 * Sugerencias sintéticas de triage para las pruebas de F-04-web (contrato 0.5.0). Ningún dato es
 * un criterio clínico: solo cubren los estados y campos del contrato.
 */

/** Ruta de la consulta y de la solicitud (misma ruta, `GET` y `POST`). */
export const SUGGESTIONS_PATH = `/api/v1/encounters/${ENCOUNTER_ID}/triage-suggestions`;
export const LIST_SUGGESTIONS = `GET ${SUGGESTIONS_PATH}`;
export const REQUEST_SUGGESTION = `POST ${SUGGESTIONS_PATH}`;

const requestedBy = {
  id: staffMe.NURSE.id,
  fullName: staffMe.NURSE.fullName,
};

/** Sugerencia válida sin SafetyGuard. 15:10 UTC = 10:10 a. m. en Bogotá. */
export const okSuggestion: TriageSuggestion = {
  id: 'f0400000-0000-4000-8000-000000000001',
  encounterId: ENCOUNTER_ID,
  status: 'OK',
  suggestedLevel: 3,
  llmLevel: 3,
  explanation:
    'Texto literal del modelo: signos estables con dolor de cabeza persistente.',
  factors: [
    {
      field: 'vital_signs.heart_rate',
      note: 'Nota literal: frecuencia cardiaca dentro de lo esperado.',
    },
    {
      field: 'symptom_findings[0]',
      note: 'Nota literal: síntoma referido por la paciente.',
    },
    {
      field: 'campo_desconocido',
      note: 'Nota literal de un campo sin etiqueta.',
    },
  ],
  guardApplied: false,
  guardReasons: [],
  provider: 'GROQ',
  model: 'modelo-sintetico-1',
  promptVersion: 'triage-v1',
  latencyMs: 1234,
  createdAt: '2026-10-28T15:10:00.000Z',
  requestedBy,
};

/** Sugerencia válida en la que G1 (total NEWS2) subió el nivel de III a II. */
export const guardG1Suggestion: TriageSuggestion = {
  ...okSuggestion,
  id: 'f0400000-0000-4000-8000-000000000002',
  suggestedLevel: 2,
  llmLevel: 3,
  explanation: 'Texto literal del modelo para el caso con regla G1.',
  guardApplied: true,
  guardReasons: [{ rule: 'G1', maxLevel: 2, trigger: { news2Total: 7 } }],
  createdAt: '2026-10-28T15:12:00.000Z',
};

/** Sugerencia válida en la que G3 (un parámetro con 3 puntos) subió el nivel de IV a III. */
export const guardG3Suggestion: TriageSuggestion = {
  ...okSuggestion,
  id: 'f0400000-0000-4000-8000-000000000003',
  suggestedLevel: 3,
  llmLevel: 4,
  explanation: 'Texto literal del modelo para el caso con regla G3.',
  guardApplied: true,
  guardReasons: [
    {
      rule: 'G3',
      maxLevel: 3,
      trigger: { news2Total: 3, field: 'vital_signs.heart_rate', points: 3 },
    },
  ],
  createdAt: '2026-10-28T15:13:00.000Z',
};

function withoutLevel(
  status: Exclude<TriageSuggestion['status'], 'OK'>,
  n: number,
): TriageSuggestion {
  return {
    ...okSuggestion,
    id: `f0400000-0000-4000-8000-00000000001${n}`,
    status,
    suggestedLevel: null,
    llmLevel: null,
    explanation: null,
    factors: null,
    guardApplied: false,
    guardReasons: [],
    provider: status === 'FAILED' ? null : 'GROQ',
    model: status === 'FAILED' ? null : 'modelo-sintetico-1',
    createdAt: `2026-10-28T15:1${n}:30.000Z`,
  };
}

export const invalidOutputSuggestion = withoutLevel('INVALID_OUTPUT', 1);
export const timeoutSuggestion = withoutLevel('TIMEOUT', 2);
export const failedSuggestion = withoutLevel('FAILED', 3);

/**
 * `INVALID_OUTPUT` con campos de nivel «sucios» (R16): la vista no debe leerlos aunque vengan.
 */
export const dirtyInvalidSuggestion: TriageSuggestion = {
  ...invalidOutputSuggestion,
  id: 'f0400000-0000-4000-8000-000000000019',
  suggestedLevel: 1,
  llmLevel: 4,
  explanation: 'Explicación sucia que no debe mostrarse.',
  factors: [{ field: 'sex', note: 'Nota sucia que no debe mostrarse.' }],
  guardApplied: true,
  guardReasons: [{ rule: 'G1', maxLevel: 1, trigger: { news2Total: 9 } }],
};

export const suggestionList = (
  ...items: TriageSuggestion[]
): TriageSuggestionList => ({ items });

/** Consulta sin sugerencias: `{ items: [] }`. */
export const noSuggestions: Handler = json(200, suggestionList());
