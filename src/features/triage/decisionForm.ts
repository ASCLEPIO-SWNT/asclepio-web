import { z } from 'zod';
import type {
  TriageDecisionRequest,
  TriageSuggestion,
} from '../../shared/api/client';
import { DECISION_LIMITS } from './clinicalContract.generated';

/**
 * Funciones puras del formulario de la decisión de triage (F-05-web D6). No leen la red ni
 * almacenan nada: el borrador vive solo en el estado de React Hook Form (D15).
 */

/** Acción que la enfermera está preparando. */
export type DecisionKind = 'validate' | 'correct' | 'manual';

/** Borrador de decisión: el nivel elegido (ninguno por defecto, D7) y el motivo escrito. */
export interface DecisionFormValues {
  level: number | null;
  reason: string;
}

export const emptyDecisionDraft: DecisionFormValues = {
  level: null,
  reason: '',
};

/** Recorta el motivo como lo hace la API antes de validar su longitud. */
const trimmedReason = (reason: string) => reason.trim();

/**
 * D6: Corregir exige un nivel entero en `DECISION_LIMITS.level`, distinto del sugerido, y un
 * motivo de `reasonMinLength` a `reasonMaxLength` caracteres tras recortar; Manual exige solo el
 * nivel. Ninguna regla compara con el máximo de un guard (PA-6 a). Los mensajes son claves.
 */
export function decisionFormSchema(
  kind: Exclude<DecisionKind, 'validate'>,
  suggestedLevel: number | null,
) {
  return z
    .object({ level: z.number().nullable(), reason: z.string() })
    .superRefine((values, ctx) => {
      const { minimum, maximum } = DECISION_LIMITS.level;
      const level = values.level;
      if (
        level === null ||
        !Number.isInteger(level) ||
        level < minimum ||
        level > maximum
      )
        ctx.addIssue({
          code: 'custom',
          path: ['level'],
          message: 'decision_error_level',
        });
      else if (kind === 'correct' && level === suggestedLevel)
        ctx.addIssue({
          code: 'custom',
          path: ['level'],
          message: 'decision_error_level_same',
        });
      if (kind !== 'correct') return;
      const reason = trimmedReason(values.reason);
      if (reason.length < DECISION_LIMITS.reasonMinLength)
        ctx.addIssue({
          code: 'custom',
          path: ['reason'],
          message: 'decision_error_reason',
        });
      else if (reason.length > DECISION_LIMITS.reasonMaxLength)
        ctx.addIssue({
          code: 'custom',
          path: ['reason'],
          message: 'decision_error_reason_long',
        });
    });
}

/**
 * D6, R13: el cuerpo del envío con solo los campos de su `action`. `suggestionId` es el `id` de
 * la vigente en el momento del envío. Nunca lleva horas, responsable, tenant, `finalLevel` ni `id`.
 */
export function toDecisionRequest(
  kind: DecisionKind,
  current: TriageSuggestion | null,
  values: DecisionFormValues,
): TriageDecisionRequest {
  if (kind === 'manual') return { action: 'MANUAL', level: values.level! };
  if (current === null)
    throw new Error('VALIDATE and CORRECT need the current suggestion.');
  if (kind === 'validate')
    return { action: 'VALIDATE', suggestionId: current.id };
  return {
    action: 'CORRECT',
    suggestionId: current.id,
    level: values.level!,
    reason: trimmedReason(values.reason),
  };
}
