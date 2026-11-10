import type {
  Encounter,
  EncounterStatus,
  TriageDecision,
} from '../../../shared/api/client';
import {
  ENCOUNTER_ID,
  encounter,
  json,
  staffMe,
  type Handler,
} from '../../../test/fakeApi';
import { guardG1Suggestion } from './suggestionFixtures';

/**
 * Decisiones sintéticas de triage para las pruebas de F-05-web (contrato 0.6.0). Ningún dato es
 * un criterio clínico: solo cubren las acciones y campos del contrato.
 */

/** Ruta de la consulta y del envío de la decisión (misma ruta, `GET` y `POST`). */
export const DECISION_PATH = `/api/v1/encounters/${ENCOUNTER_ID}/triage-decision`;
export const GET_DECISION = `GET ${DECISION_PATH}`;
export const DECIDE = `POST ${DECISION_PATH}`;

const decidedBy = { id: staffMe.NURSE.id, fullName: staffMe.NURSE.fullName };

/** 15:20 UTC = 10:20 a. m. en Bogotá. */
export const DECIDED_AT = '2026-10-28T15:20:00.000Z';

/** `VALIDATE` sobre la sugerencia con G1: el nivel decidido es el `suggestedLevel` (II). */
export const validateDecision: TriageDecision = {
  id: 'f0500000-0000-4000-8000-000000000001',
  encounterId: ENCOUNTER_ID,
  action: 'VALIDATE',
  level: guardG1Suggestion.suggestedLevel!,
  suggestionId: guardG1Suggestion.id,
  suggestedLevel: guardG1Suggestion.suggestedLevel,
  reason: null,
  decidedAt: DECIDED_AT,
  decidedBy,
};

/** Motivo de 500 caracteres sin espacios (R27: no desborda a 375 px). */
export const LONG_REASON = 'M'.repeat(500);

/** `CORRECT` con un motivo de 500 caracteres sin espacios. */
export const correctLongDecision: TriageDecision = {
  ...validateDecision,
  id: 'f0500000-0000-4000-8000-000000000002',
  action: 'CORRECT',
  level: 1,
  reason: LONG_REASON,
};

/** `CORRECT` con un motivo corto y literal. */
export const correctDecision: TriageDecision = {
  ...validateDecision,
  id: 'f0500000-0000-4000-8000-000000000003',
  action: 'CORRECT',
  level: 4,
  reason: 'Motivo literal: dolor controlado tras la valoración.',
};

/** `MANUAL`: sin sugerencia, sin nivel sugerido y sin motivo. */
export const manualDecision: TriageDecision = {
  ...validateDecision,
  id: 'f0500000-0000-4000-8000-000000000004',
  action: 'MANUAL',
  level: 3,
  suggestionId: null,
  suggestedLevel: null,
  reason: null,
};

/** Atención ya decidida (`finalLevel`, `triagedAt` y `triagedBy` no nulos) en `status`. */
export function decidedEncounter(
  status: Extract<
    EncounterStatus,
    'TRIAGED' | 'IN_CARE' | 'CLOSED' | 'CANCELLED'
  >,
  decision: TriageDecision = validateDecision,
): Encounter {
  return {
    ...encounter,
    status,
    finalLevel: decision.level,
    triagedAt: decision.decidedAt,
    triagedBy: decision.decidedBy,
    cancellationReason:
      status === 'CANCELLED'
        ? 'El paciente se retiró después del triage.'
        : null,
  };
}

export const triagedEncounter = decidedEncounter('TRIAGED');
export const inCareEncounter = decidedEncounter('IN_CARE');
export const closedEncounter = decidedEncounter('CLOSED');
export const cancelledDecidedEncounter = decidedEncounter('CANCELLED');

/** `GET …/triage-decision` → 200 con la decisión. */
export const decisionFound = (decision: TriageDecision): Handler =>
  json(200, decision);

/** `POST …/triage-decision` → 201 con la decisión. */
export const decisionCreated = (decision: TriageDecision): Handler =>
  json(201, decision);
