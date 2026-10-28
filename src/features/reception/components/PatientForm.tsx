import {
  featureMessage,
  fieldMessage,
} from '../../../shared/lib/featureMessages';
import { useI18n } from '../../../shared/i18n';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch, type Path, type Resolver } from 'react-hook-form';
import type { DocumentType, Patient } from '../../../shared/api/client';
import {
  DOCUMENT_TYPE_LABELS,
  SEX_LABELS,
  SEXES,
} from '../../../shared/lib/labels';
import {
  actionErrorMessage,
  applyFieldErrors,
  problemOf,
  statusOf,
} from '../../../shared/lib/problem';
import { ActionError } from '../../../shared/ui/ActionError';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { useCreatePatient } from '../hooks/useCreatePatient';
import {
  nnPatientSchema,
  patientWithDocumentSchema,
  toCreatePatientBody,
  type NnPatientForm,
  type PatientFormInput,
  type PatientWithDocument,
  type PatientWithDocumentForm,
} from '../schemas';

const CONFLICT_MESSAGE = 'Ya existe un paciente con ese documento.';
const FUTURE_BIRTH_DATE_MESSAGE =
  'La fecha de nacimiento no puede ser posterior a hoy.';

type FormValues = PatientWithDocumentForm & NnPatientForm;
const SERVER_FIELDS: Path<FormValues>[] = [
  'documentType',
  'documentNumber',
  'fullName',
  'birthDate',
  'estimatedAgeYears',
  'sex',
];

export type PatientFormMode =
  | { kind: 'document'; documentType: DocumentType; documentNumber: string }
  | { kind: 'nn' };

/** Atributos de accesibilidad de un campo con error (R21). */
function invalid(id: string, message: string | undefined) {
  return {
    id,
    'aria-invalid': message ? true : false,
    'aria-describedby': message ? `${id}-error` : undefined,
  } as const;
}

function FieldMessage({
  id,
  message,
}: {
  id: string;
  message: string | undefined;
}) {
  if (!message) return null;
  return (
    <p id={`${id}-error`} className="field__error">
      {fieldMessage(message)}
    </p>
  );
}

/**
 * Alta de paciente (R20–R23): con documento (desde "Crear paciente") o NN. Valida en
 * el cliente para la UX; la fecha futura la decide la API (422, D9).
 */
export function PatientForm({
  mode,
  onCreated,
}: {
  mode: PatientFormMode;
  onCreated: (patient: Patient) => void;
}) {
  const { t } = useI18n();
  const create = useCreatePatient();
  const [actionError, setActionError] = useState<string | null>(null);
  const isDocument = mode.kind === 'document';
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    // El esquema depende del modo; los dos trabajan sobre los mismos nombres de campo.
    resolver: (isDocument
      ? zodResolver(patientWithDocumentSchema)
      : zodResolver(nnPatientSchema)) as unknown as Resolver<FormValues>,
    defaultValues: {
      documentType: isDocument ? mode.documentType : '',
      documentNumber: isDocument ? mode.documentNumber : '',
      fullName: '',
      ageMode: '',
      birthDate: '',
      estimatedAgeYears: '',
      sex: '',
    },
    shouldFocusError: true,
  });
  const ageMode = useWatch({ control, name: 'ageMode' });
  const showBirthDate = isDocument || ageMode === 'birthDate';
  const showAge = !isDocument && ageMode === 'estimatedAge';

  const onValid = (values: FormValues) => {
    if (create.isPending) return;
    setActionError(null);
    const input: PatientFormInput = isDocument
      ? { mode: 'document', values: values as unknown as PatientWithDocument }
      : { mode: 'nn', values };
    create.mutate(toCreatePatientBody(input), {
      onSuccess: onCreated,
      onError: (cause) => {
        const problem = problemOf(cause);
        const status = statusOf(problem);
        if (status === 422 && showBirthDate) {
          setError('birthDate', {
            type: 'server',
            message: FUTURE_BIRTH_DATE_MESSAGE,
          });
          return;
        }
        if (
          status === 400 &&
          problem.kind === 'other' &&
          applyFieldErrors(setError, problem.fieldErrors, SERVER_FIELDS) > 0
        ) {
          return;
        }
        setActionError(
          actionErrorMessage(problem, {
            409: CONFLICT_MESSAGE,
            422: FUTURE_BIRTH_DATE_MESSAGE,
          }),
        );
      },
    });
  };

  const title = isDocument
    ? t('feature_patient_create')
    : t('feature_patient_nn_register');

  return (
    <form
      className="form"
      aria-label={title}
      noValidate
      onSubmit={(event) => {
        if (create.isPending) {
          event.preventDefault();
          return;
        }
        void handleSubmit(onValid)(event);
      }}
    >
      <h2>{title}</h2>
      {isDocument && (
        <>
          <div className="field">
            <label htmlFor="patient-document-type">
              {t('feature_document_type')}
            </label>
            <input
              {...invalid(
                'patient-document-type',
                errors.documentType?.message,
              )}
              type="text"
              readOnly
              value={DOCUMENT_TYPE_LABELS[mode.documentType]}
            />
            <FieldMessage
              id="patient-document-type"
              message={errors.documentType?.message}
            />
          </div>
          <div className="field">
            <label htmlFor="patient-document-number">
              {t('feature_document_number')}
            </label>
            <input
              {...invalid(
                'patient-document-number',
                errors.documentNumber?.message,
              )}
              type="text"
              readOnly
              value={mode.documentNumber}
            />
            <FieldMessage
              id="patient-document-number"
              message={errors.documentNumber?.message}
            />
          </div>
        </>
      )}

      <div className="field">
        <label htmlFor="patient-full-name">{t('feature_full_name')}</label>
        {!isDocument && <p className="muted">{t('feature_nn_optional')}</p>}
        <input
          {...invalid('patient-full-name', errors.fullName?.message)}
          type="text"
          autoComplete="off"
          {...register('fullName')}
        />
        <FieldMessage
          id="patient-full-name"
          message={errors.fullName?.message}
        />
      </div>

      {!isDocument && (
        <div className="field">
          <label htmlFor="patient-age-mode">
            {t('feature_age_information')}
          </label>
          <select
            {...invalid('patient-age-mode', errors.ageMode?.message)}
            {...register('ageMode')}
          >
            <option value="">{t('feature_choose')}</option>
            <option value="birthDate">{t('feature_birth_date')}</option>
            <option value="estimatedAge">{t('feature_estimated_age')}</option>
          </select>
          <FieldMessage
            id="patient-age-mode"
            message={errors.ageMode?.message}
          />
        </div>
      )}

      {showBirthDate && (
        <div className="field">
          <label htmlFor="patient-birth-date">{t('feature_birth_date')}</label>
          <input
            {...invalid('patient-birth-date', errors.birthDate?.message)}
            type="date"
            {...register('birthDate')}
          />
          <FieldMessage
            id="patient-birth-date"
            message={errors.birthDate?.message}
          />
        </div>
      )}

      {showAge && (
        <div className="field">
          <label htmlFor="patient-estimated-age">
            {t('feature_estimated_age')}
          </label>
          <input
            {...invalid(
              'patient-estimated-age',
              errors.estimatedAgeYears?.message,
            )}
            type="number"
            inputMode="numeric"
            min={0}
            max={120}
            step={1}
            {...register('estimatedAgeYears')}
          />
          <FieldMessage
            id="patient-estimated-age"
            message={errors.estimatedAgeYears?.message}
          />
        </div>
      )}

      <div className="field">
        <label htmlFor="patient-sex">{t('feature_sex')}</label>
        <select
          {...invalid('patient-sex', errors.sex?.message)}
          {...register('sex')}
        >
          <option value="">{t('feature_choose')}</option>
          {SEXES.map((sex) => (
            <option key={sex} value={sex}>
              {SEX_LABELS[sex]}
            </option>
          ))}
        </select>
        <FieldMessage id="patient-sex" message={errors.sex?.message} />
      </div>

      <button type="submit" className="button" disabled={create.isPending}>
        {t('feature_patient_save')}
      </button>
      {create.isPending && (
        <LoadingState>{t('feature_patient_saving')}</LoadingState>
      )}
      {actionError && <ActionError>{featureMessage(actionError)}</ActionError>}
    </form>
  );
}
