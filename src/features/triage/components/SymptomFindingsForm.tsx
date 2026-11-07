import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useReducer, useRef, useState } from 'react';
import { useFieldArray, useForm, type Path } from 'react-hook-form';
import { useI18n } from '../../../shared/i18n';
import { isRetryableActionMessage } from '../../../shared/lib/problem';
import { ActionError } from '../../../shared/ui/ActionError';
import { Notice } from '../../../shared/ui/Notice';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { TextAreaField } from '../../../shared/ui/TextAreaField';
import { FINDING_KINDS, FINDING_LIMITS } from '../clinicalContract.generated';
import {
  clinicalFailure,
  clinicalFieldMessage,
  type ClinicalFormProps,
} from '../clinicalForm';
import {
  symptomFindingsSchema,
  type SymptomFindingsInput,
  type SymptomFindingsOutput,
} from '../clinicalSchemas';
import { useRecordSymptomFindings } from '../hooks/useRecordSymptomFindings';

const emptyDraft = () => ({ items: [{ kind: '', description: '' }] });
export function SymptomFindingsForm({
  encounterId,
  disabled = false,
  onConflict,
  onUnavailable,
  onDirtyChange,
}: ClinicalFormProps) {
  const { t } = useI18n();
  const mutation = useRecordSymptomFindings(encounterId);
  const inFlight = useRef(false);
  // UI-03-web R15/R17/R18: «Reintentar» vuelve a enviar el formulario con lo escrito.
  const formRef = useRef<HTMLFormElement>(null);
  const [focusVersion, requestFocus] = useReducer(
    (version: number) => version + 1,
    0,
  );
  const pendingFocus = useRef<Path<SymptomFindingsInput> | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors, isDirty },
  } = useForm<SymptomFindingsInput, unknown, SymptomFindingsOutput>({
    resolver: zodResolver(symptomFindingsSchema),
    defaultValues: emptyDraft(),
    shouldFocusError: true,
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  // UI-03-web R1–R3: la página decide el aviso de cambios sin guardar con este estado.
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  useEffect(() => {
    if (!disabled && !mutation.isPending && pendingFocus.current) {
      setFocus(pendingFocus.current);
      pendingFocus.current = null;
    }
  }, [disabled, mutation.isPending, setFocus, focusVersion]);
  const submit = (values: SymptomFindingsOutput) => {
    if (disabled || inFlight.current) return;
    inFlight.current = true;
    setErrorKey(null);
    setSaved(false);
    mutation.mutate(values, {
      onSuccess: () => {
        reset(emptyDraft());
        setSaved(true);
      },
      onError: (cause) => {
        const paths: Path<SymptomFindingsInput>[] = fields.flatMap(
          (_, index) =>
            [`items.${index}.kind`, `items.${index}.description`] as const,
        );
        setErrorKey(
          clinicalFailure(cause, setError, paths, {
            onConflict,
            onUnavailable,
            onFieldError: (field) => {
              pendingFocus.current = field;
              requestFocus();
            },
          }),
        );
      },
      onSettled: () => {
        inFlight.current = false;
      },
    });
  };
  const listError = clinicalFieldMessage(
    errors.items?.root?.message ?? errors.items?.message,
  );
  return (
    <form
      ref={formRef}
      className="form clinical-form"
      aria-label={t('clinical_findings_title')}
      noValidate
      onSubmit={(event) => {
        if (disabled || inFlight.current) {
          event.preventDefault();
          return;
        }
        void handleSubmit(submit)(event);
      }}
    >
      <h2>{t('clinical_findings_title')}</h2>
      <p className="muted">{t('clinical_original_readonly')}</p>
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
      {saved && <Notice autoFocus>{t('clinical_findings_saved')}</Notice>}
      {listError && <ActionError>{listError}</ActionError>}
      <fieldset disabled={disabled || mutation.isPending}>
        <legend className="visually-hidden">
          {t('clinical_findings_title')}
        </legend>
        {fields.map((row, index) => {
          const id = `finding-${row.id}`;
          const kindError = clinicalFieldMessage(
            errors.items?.[index]?.kind?.message,
          );
          return (
            <fieldset className="clinical-finding" key={row.id}>
              <legend>
                {t('clinical_finding_label', { index: index + 1 })}
              </legend>
              <div className="field">
                <label htmlFor={`${id}-kind`}>{t('clinical_kind')}</label>
                <select
                  id={`${id}-kind`}
                  aria-invalid={Boolean(kindError)}
                  aria-describedby={kindError ? `${id}-kind-error` : undefined}
                  {...register(`items.${index}.kind`)}
                >
                  <option value="">{t('clinical_choose')}</option>
                  {FINDING_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {t(`clinical_kind_${kind}`)}
                    </option>
                  ))}
                </select>
                {kindError && (
                  <p id={`${id}-kind-error`} className="field__error">
                    {kindError}
                  </p>
                )}
              </div>
              <TextAreaField
                id={`${id}-description`}
                label={t('clinical_description')}
                error={clinicalFieldMessage(
                  errors.items?.[index]?.description?.message,
                )}
                registration={register(`items.${index}.description`)}
              />
              <button
                type="button"
                className="button button--secondary"
                onClick={() => remove(index)}
              >
                {t('clinical_remove_finding', { index: index + 1 })}
              </button>
            </fieldset>
          );
        })}
        <button
          type="button"
          className="button button--secondary"
          disabled={fields.length >= FINDING_LIMITS.maxItems}
          onClick={() => append({ kind: '', description: '' })}
        >
          {t('clinical_add_finding')}
        </button>
      </fieldset>
      <div className="actions">
        <button
          type="submit"
          className="button"
          disabled={disabled || mutation.isPending}
        >
          {t('clinical_save_findings')}
        </button>
      </div>
      {mutation.isPending && (
        <LoadingState>{t('clinical_saving')}</LoadingState>
      )}
    </form>
  );
}
