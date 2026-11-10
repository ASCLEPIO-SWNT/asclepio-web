import { describe, expect, it } from 'vitest';
import { DECISION_LIMITS } from './clinicalContract.generated';
import {
  decisionFormSchema,
  toDecisionRequest,
  type DecisionFormValues,
} from './decisionForm';
import {
  failedSuggestion,
  guardG1Suggestion,
  guardG3Suggestion,
} from './testing/suggestionFixtures';

/** Primer mensaje de error de cada campo (o `undefined` si el campo es válido). */
function errorsOf(
  schema: ReturnType<typeof decisionFormSchema>,
  values: DecisionFormValues,
) {
  const result = schema.safeParse(values);
  if (result.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0]);
    errors[field] ??= issue.message;
  }
  return errors;
}

const FORBIDDEN_KEYS = [
  'id',
  'finalLevel',
  'tenantId',
  'decidedAt',
  'decidedBy',
  'triagedAt',
  'triagedBy',
  'createdAt',
];

describe('F-05-web formulario de la decisión', () => {
  it('R6: Corregir exige un nivel válido, distinto del sugerido, y un motivo de 1 a 500 caracteres tras recortar', () => {
    const schema = decisionFormSchema('correct', 2);
    const reason = 'Motivo válido';
    expect(DECISION_LIMITS).toEqual({
      level: { minimum: 1, maximum: 5 },
      reasonMinLength: 1,
      reasonMaxLength: 500,
    });
    expect(errorsOf(schema, { level: null, reason })).toEqual({
      level: 'decision_error_level',
    });
    expect(errorsOf(schema, { level: 2, reason })).toEqual({
      level: 'decision_error_level_same',
    });
    expect(
      errorsOf(schema, { level: DECISION_LIMITS.level.minimum - 1, reason }),
    ).toEqual({ level: 'decision_error_level' });
    expect(
      errorsOf(schema, { level: DECISION_LIMITS.level.maximum + 1, reason }),
    ).toEqual({ level: 'decision_error_level' });
    expect(errorsOf(schema, { level: 2.5, reason })).toEqual({
      level: 'decision_error_level',
    });
    expect(errorsOf(schema, { level: 4, reason: '' })).toEqual({
      reason: 'decision_error_reason',
    });
    expect(errorsOf(schema, { level: 4, reason: '   \n\t ' })).toEqual({
      reason: 'decision_error_reason',
    });
    const max = DECISION_LIMITS.reasonMaxLength;
    expect(
      errorsOf(schema, { level: 4, reason: `  ${'a'.repeat(max)}  ` }),
    ).toEqual({});
    expect(errorsOf(schema, { level: 4, reason: 'a'.repeat(max + 1) })).toEqual(
      { reason: 'decision_error_reason_long' },
    );
    expect(errorsOf(schema, { level: null, reason: '' })).toEqual({
      level: 'decision_error_level',
      reason: 'decision_error_reason',
    });
  });

  it('R6: no valida el nivel contra el máximo de ningún guard (PA-6 a)', () => {
    // G1 limita a II como máximo; corregir a V (menos urgente) es válido con motivo.
    const schema = decisionFormSchema(
      'correct',
      guardG1Suggestion.suggestedLevel,
    );
    expect(errorsOf(schema, { level: 5, reason: 'Motivo' })).toEqual({});
    expect(errorsOf(schema, { level: 1, reason: 'Motivo' })).toEqual({});
  });

  it('R9: el triage manual exige solo un nivel válido', () => {
    const schema = decisionFormSchema('manual', null);
    expect(errorsOf(schema, { level: null, reason: '' })).toEqual({
      level: 'decision_error_level',
    });
    expect(errorsOf(schema, { level: 6, reason: '' })).toEqual({
      level: 'decision_error_level',
    });
    for (const level of [1, 2, 3, 4, 5])
      expect(errorsOf(schema, { level, reason: '' })).toEqual({});
  });

  it('R7: CORRECT lleva el id de la vigente en el momento del envío, el nivel y el motivo recortado', () => {
    expect(
      toDecisionRequest('correct', guardG1Suggestion, {
        level: 4,
        reason: '  Motivo con espacios  ',
      }),
    ).toEqual({
      action: 'CORRECT',
      suggestionId: guardG1Suggestion.id,
      level: 4,
      reason: 'Motivo con espacios',
    });
    expect(
      toDecisionRequest('correct', guardG3Suggestion, {
        level: 4,
        reason: 'Motivo',
      }),
    ).toMatchObject({ suggestionId: guardG3Suggestion.id });
  });

  it('R13: cada cuerpo lleva exactamente los campos de su acción', () => {
    const draft = { level: 4, reason: 'Motivo literal' };
    const validate = toDecisionRequest('validate', guardG1Suggestion, draft);
    const correct = toDecisionRequest('correct', guardG1Suggestion, draft);
    const manual = toDecisionRequest('manual', failedSuggestion, draft);
    const manualWithout = toDecisionRequest('manual', null, draft);
    expect(Object.keys(validate).sort()).toEqual(['action', 'suggestionId']);
    expect(validate).toEqual({
      action: 'VALIDATE',
      suggestionId: guardG1Suggestion.id,
    });
    expect(Object.keys(correct).sort()).toEqual([
      'action',
      'level',
      'reason',
      'suggestionId',
    ]);
    expect(manual).toEqual({ action: 'MANUAL', level: 4 });
    expect(manualWithout).toEqual({ action: 'MANUAL', level: 4 });
    for (const body of [validate, correct, manual])
      for (const key of FORBIDDEN_KEYS) expect(body).not.toHaveProperty(key);
  });

  it('R22: un borrador de nivel 3 con una vigente nueva de nivel sugerido 3 da decision_error_level_same', () => {
    const draft = { level: 3, reason: 'Motivo del borrador' };
    expect(errorsOf(decisionFormSchema('correct', 2), draft)).toEqual({});
    expect(
      errorsOf(
        decisionFormSchema('correct', guardG3Suggestion.suggestedLevel),
        draft,
      ),
    ).toEqual({ level: 'decision_error_level_same' });
  });
});
