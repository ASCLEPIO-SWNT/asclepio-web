import { fieldMessage } from '../../../shared/lib/featureMessages';
import { useI18n } from '../../../shared/i18n';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPES,
} from '../../../shared/lib/labels';
import { LoadingState } from '../../../shared/ui/LoadingState';
import {
  patientSearchSchema,
  type PatientSearch as PatientSearchValues,
  type PatientSearchForm,
} from '../schemas';

/** Búsqueda por tipo y número de documento (R17–R19). */
export function PatientSearch({
  busy,
  onSearch,
}: {
  busy: boolean;
  onSearch: (values: PatientSearchValues) => void;
}) {
  const { t } = useI18n();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PatientSearchForm, unknown, PatientSearchValues>({
    resolver: zodResolver(patientSearchSchema),
    defaultValues: { documentType: '', documentNumber: '' },
  });

  return (
    <form
      className="form form--inline"
      aria-label={t('feature_patient_search')}
      noValidate
      onSubmit={(event) => {
        if (busy) {
          event.preventDefault();
          return;
        }
        void handleSubmit(onSearch)(event);
      }}
    >
      <div className="field">
        <label htmlFor="search-document-type">
          {t('feature_document_type')}
        </label>
        <select
          id="search-document-type"
          aria-invalid={errors.documentType ? true : false}
          aria-describedby={
            errors.documentType ? 'search-document-type-error' : undefined
          }
          {...register('documentType')}
        >
          <option value="">{t('feature_choose')}</option>
          {DOCUMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {DOCUMENT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        {errors.documentType && (
          <p id="search-document-type-error" className="field__error">
            {fieldMessage(errors.documentType.message)}
          </p>
        )}
      </div>
      <div className="field">
        <label htmlFor="search-document-number">
          {t('feature_document_number')}
        </label>
        <input
          id="search-document-number"
          type="text"
          autoComplete="off"
          aria-invalid={errors.documentNumber ? true : false}
          aria-describedby={
            errors.documentNumber ? 'search-document-number-error' : undefined
          }
          {...register('documentNumber')}
        />
        {errors.documentNumber && (
          <p id="search-document-number-error" className="field__error">
            {fieldMessage(errors.documentNumber.message)}
          </p>
        )}
      </div>
      <button type="submit" className="button" disabled={busy}>
        {t('feature_search')}
      </button>
      {busy && <LoadingState>{t('feature_searching')}</LoadingState>}
    </form>
  );
}
