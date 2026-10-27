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
      aria-label="Buscar paciente"
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
        <label htmlFor="search-document-type">Tipo de documento</label>
        <select
          id="search-document-type"
          aria-invalid={errors.documentType ? true : false}
          aria-describedby={
            errors.documentType ? 'search-document-type-error' : undefined
          }
          {...register('documentType')}
        >
          <option value="">Elige…</option>
          {DOCUMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {DOCUMENT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        {errors.documentType && (
          <p id="search-document-type-error" className="field__error">
            {errors.documentType.message}
          </p>
        )}
      </div>
      <div className="field">
        <label htmlFor="search-document-number">Número de documento</label>
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
            {errors.documentNumber.message}
          </p>
        )}
      </div>
      <button type="submit" className="button" disabled={busy}>
        Buscar
      </button>
      {busy && <LoadingState>Buscando el paciente…</LoadingState>}
    </form>
  );
}
