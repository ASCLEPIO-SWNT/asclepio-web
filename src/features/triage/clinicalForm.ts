import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { t } from '../../shared/i18n';
import { problemOf, statusOf } from '../../shared/lib/problem';
import {
  FINDING_LIMITS,
  VITAL_SIGN_CONTRACT,
} from './clinicalContract.generated';
import { VITAL_UNITS, type VitalField } from './clinicalSchemas';

export interface ClinicalFormProps {
  encounterId: string;
  disabled?: boolean;
  onConflict: () => void;
  onUnavailable?: (status: 403 | 404) => void;
  /** Avisa a la página de si el formulario tiene cambios sin guardar (UI-03-web R1–R3). */
  onDirtyChange?: (dirty: boolean) => void;
}
export function clinicalFieldMessage(message: string | undefined) {
  if (!message) return undefined;
  if (message.startsWith('clinical_range:')) {
    const field = message.slice('clinical_range:'.length) as VitalField;
    const rule = VITAL_SIGN_CONTRACT[field];
    if (rule && 'minimum' in rule)
      return t('clinical_range', {
        min: rule.minimum,
        max: rule.maximum,
        unit: VITAL_UNITS[field],
      });
  }
  if (message === 'clinical_description_max')
    return t(message, { max: FINDING_LIMITS.maxLength });
  if (message === 'clinical_findings_max')
    return t(message, { max: FINDING_LIMITS.maxItems });
  return t(message);
}
export function clinicalFailure<T extends FieldValues>(
  cause: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
  callbacks: Pick<ClinicalFormProps, 'onConflict' | 'onUnavailable'> & {
    onFieldError?: (field: Path<T>) => void;
  },
): string {
  const problem = problemOf(cause);
  const status = statusOf(problem);
  if (status === 409) {
    callbacks.onConflict();
    return 'clinical_conflict';
  }
  if (status === 403 || status === 404) {
    callbacks.onUnavailable?.(status);
    return status === 403 ? 'common_forbidden' : 'clinical_not_found';
  }
  if ((status === 400 || status === 422) && problem.kind === 'other') {
    let first = true;
    for (const error of problem.fieldErrors) {
      const field = fields.find((name) => name === error.field);
      if (field) {
        setError(field, { type: 'server', message: 'clinical_field_review' });
        if (first) callbacks.onFieldError?.(field);
        first = false;
      }
    }
    return 'clinical_review_fields';
  }
  // UI-03-web B1: red y 5xx usan los textos de R15 y R18.
  if (status === null) return 'common_error_network';
  if (status >= 500) return 'common_error_server';
  return 'clinical_save_error';
}
