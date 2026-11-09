import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useForm, type Path } from 'react-hook-form';
import { useCurrentStaffId } from '../../../shared/hooks/useCurrentStaff';
import { useDraft } from '../../../shared/hooks/useDraft';
import { useI18n } from '../../../shared/i18n';
import { DraftNotice } from '../../../shared/ui/DraftNotice';
import { isRetryableActionMessage } from '../../../shared/lib/problem';
import { ActionError } from '../../../shared/ui/ActionError';
import { Notice } from '../../../shared/ui/Notice';
import { LoadingState } from '../../../shared/ui/LoadingState';
import {
  CONSCIOUSNESS_LEVELS,
  VITAL_SIGN_CONTRACT,
} from '../clinicalContract.generated';
import {
  clinicalFailure,
  clinicalFieldMessage,
  type ClinicalFormProps,
} from '../clinicalForm';
import {
  clinicalCaptureInput,
  VITAL_FIELDS,
  VITAL_UNITS,
  vitalSignsSchema,
  type VitalSignsInput,
  type VitalSignsOutput,
} from '../clinicalSchemas';
import { useRecordVitalSigns } from '../hooks/useRecordVitalSigns';

/**
 * Lista blanca del borrador (D4, PA-1): solo campos numéricos o enumerados de signos vitales,
 * nunca texto libre aunque el contrato lo tuviera.
 */
export const VITAL_DRAFT_FIELDS = VITAL_FIELDS.filter((field) =>
  [
    'respiratoryRate',
    'oxygenSaturation',
    'supplementalOxygen',
    'systolicBp',
    'diastolicBp',
    'heartRate',
    'consciousness',
    'temperatureC',
    'glucoseMgDl',
  ].includes(field),
);

/** Validación de forma del borrador (R6): solo campos de la lista blanca, con valores cortos. */
function isVitalDraft(values: Record<string, unknown>): boolean {
  return Object.entries(values).every(
    ([field, value]) =>
      (VITAL_DRAFT_FIELDS as readonly string[]).includes(field) &&
      typeof value === 'string' &&
      /^[0-9A-Za-z.-]{1,8}$/.test(value),
  );
}

export function VitalSignsForm({
  encounterId,
  disabled = false,
  onConflict,
  onUnavailable,
  onDirtyChange,
}: ClinicalFormProps) {
  const { t } = useI18n();
  const mutation = useRecordVitalSigns(encounterId);
  const inFlight = useRef(false);
  // UI-03-web R15/R17/R18: «Reintentar» vuelve a enviar el formulario con lo escrito.
  const formRef = useRef<HTMLFormElement>(null);
  const [focusVersion, requestFocus] = useReducer(
    (version: number) => version + 1,
    0,
  );
  const pendingFocus = useRef<Path<VitalSignsInput> | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    setValue,
    getValues,
    formState: { errors, isDirty },
  } = useForm<VitalSignsInput, unknown, VitalSignsOutput>({
    resolver: zodResolver(vitalSignsSchema),
    defaultValues: clinicalCaptureInput,
    shouldFocusError: true,
  });
  // UI-03-web R1–R3: la página decide el aviso de cambios sin guardar con este estado.
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  // UI-03-web R4–R7: borrador de signos vitales solo ante un cierre forzado de sesión.
  const userId = useCurrentStaffId();
  const readValues = useCallback(
    () => getValues() as unknown as Record<string, unknown>,
    [getValues],
  );
  const draft = useDraft({
    encounterId,
    userId,
    dirty: isDirty,
    getValues: readValues,
    fields: VITAL_DRAFT_FIELDS,
    isValid: isVitalDraft,
  });
  useEffect(() => {
    if (!disabled && !mutation.isPending && pendingFocus.current) {
      setFocus(pendingFocus.current);
      pendingFocus.current = null;
    }
  }, [disabled, mutation.isPending, setFocus, focusVersion]);
  const submit = (values: VitalSignsOutput) => {
    if (disabled || inFlight.current) return;
    inFlight.current = true;
    setErrorKey(null);
    setSaved(false);
    mutation.mutate(values, {
      onSuccess: () => {
        draft.dismiss();
        reset(clinicalCaptureInput);
        setSaved(true);
      },
      onError: (cause) =>
        setErrorKey(
          clinicalFailure(cause, setError, VITAL_FIELDS, {
            onConflict,
            onUnavailable,
            onFieldError: (field) => {
              pendingFocus.current = field;
              requestFocus();
            },
          }),
        ),
      onSettled: () => {
        inFlight.current = false;
      },
    });
  };
  return (
    <form
      ref={formRef}
      className="form clinical-form"
      aria-label={t('clinical_vitals_title')}
      noValidate
      onSubmit={(event) => {
        if (disabled || inFlight.current) {
          event.preventDefault();
          return;
        }
        void handleSubmit(submit)(event);
      }}
    >
      <h2>{t('clinical_vitals_title')}</h2>
      {/* UI-04-web R12: aviso estático de advertencia, sin role="alert". */}
      <p className="status status--warn">{t('clinical_provisional')}</p>
      {draft.draft && (
        <DraftNotice
          onRestore={() => {
            const values = draft.draft?.values ?? {};
            for (const field of VITAL_DRAFT_FIELDS) {
              const value = values[field];
              if (value !== undefined)
                setValue(field, value, { shouldDirty: true });
            }
            draft.dismiss();
          }}
          onDiscard={draft.dismiss}
        />
      )}
      {errorKey && (
        <ActionError
          onRetry={
            isRetryableActionMessage(errorKey)
              ? () => formRef.current?.requestSubmit()
              : undefined
          }
        >
          {t(errorKey)}
        </ActionError>
      )}
      {saved && <Notice autoFocus>{t('clinical_vitals_saved')}</Notice>}
      <fieldset
        className="clinical-fields"
        disabled={disabled || mutation.isPending}
      >
        <legend className="visually-hidden">
          {t('clinical_vitals_title')}
        </legend>
        {VITAL_FIELDS.map((field) => {
          const id = `vital-${field}`;
          const error = clinicalFieldMessage(errors[field]?.message);
          const unit = VITAL_UNITS[field];
          const rule = VITAL_SIGN_CONTRACT[field];
          return (
            <div className="field" key={field}>
              <label htmlFor={id}>
                {t(`clinical_field_${field}`)}
                {unit && ` (${unit})`}
                {!rule.required && ` — ${t('clinical_optional')}`}
              </label>
              {field === 'supplementalOxygen' || field === 'consciousness' ? (
                <select
                  id={id}
                  // UI-04-web R11 (D11): solo la letra ACVPU, sin texto clínico nuevo (PA-1 b).
                  className={
                    field === 'consciousness'
                      ? 'clinical-select--letters'
                      : undefined
                  }
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${id}-error` : undefined}
                  {...register(field)}
                >
                  <option value="">{t('clinical_choose')}</option>
                  {field === 'supplementalOxygen' ? (
                    <>
                      <option value="true">{t('clinical_yes')}</option>
                      <option value="false">{t('clinical_no')}</option>
                    </>
                  ) : (
                    CONSCIOUSNESS_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))
                  )}
                </select>
              ) : (
                <input
                  id={id}
                  type="number"
                  step={field === 'temperatureC' ? 0.1 : 1}
                  min={'minimum' in rule ? rule.minimum : undefined}
                  max={'maximum' in rule ? rule.maximum : undefined}
                  inputMode={field === 'temperatureC' ? 'decimal' : 'numeric'}
                  autoComplete="off"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${id}-error` : undefined}
                  {...register(field)}
                />
              )}
              {error && (
                <p id={`${id}-error`} className="field__error">
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </fieldset>
      <div className="actions">
        <button
          type="submit"
          className="button"
          disabled={disabled || mutation.isPending}
        >
          {t('clinical_save_vitals')}
        </button>
      </div>
      {mutation.isPending && (
        <LoadingState>{t('clinical_saving')}</LoadingState>
      )}
    </form>
  );
}
