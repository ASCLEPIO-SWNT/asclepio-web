import { featureMessage } from '../../../shared/lib/featureMessages';
import { useI18n } from '../../../shared/i18n';
import { useState } from 'react';
import type { Patient } from '../../../shared/api/client';
import { SITES_ERROR_MESSAGE, useSites } from '../../../shared/hooks/useSites';
import { actionErrorMessage, problemOf } from '../../../shared/lib/problem';
import { ActionError } from '../../../shared/ui/ActionError';
import { LoadError } from '../../../shared/ui/LoadError';
import {
  usePatientSearch,
  type PatientSearchParams,
} from '../hooks/usePatientSearch';
import { ArrivalForm } from './ArrivalForm';
import { PatientForm, type PatientFormMode } from './PatientForm';
import { PatientSearch } from './PatientSearch';

/**
 * `/recepcion/registro` (D8): buscar por documento → alta si hace falta (con documento
 * o NN) → registrar la llegada. Los pasos viven en el estado local, nunca en la URL (R40).
 */
export function DirectRegistrationPage() {
  const { t } = useI18n();
  const sites = useSites();
  const [params, setParams] = useState<PatientSearchParams | null>(null);
  const search = usePatientSearch(params);
  const [form, setForm] = useState<PatientFormMode | null>(null);
  const [created, setCreated] = useState<Patient | null>(null);

  const found = params && search.isSuccess ? (search.data[0] ?? null) : null;
  const selected = created ?? (form ? null : found);
  const noResults =
    params !== null && search.isSuccess && search.data.length === 0;

  const onSearch = (next: PatientSearchParams) => {
    if (search.isFetching) return;
    setCreated(null);
    setForm(null);
    if (
      params?.documentType === next.documentType &&
      params.documentNumber === next.documentNumber
    ) {
      void search.refetch();
      return;
    }
    setParams(next);
  };

  return (
    <section className="card" aria-labelledby="direct-title">
      <h1 id="direct-title">{t('feature_registration_direct')}</h1>

      {sites.isError && (
        <LoadError
          message={featureMessage(SITES_ERROR_MESSAGE)}
          retrying={sites.isFetching}
          error={sites.error}
          onRetry={() => void sites.refetch()}
        />
      )}

      <PatientSearch busy={search.isFetching} onSearch={onSearch} />
      {params && search.isError && (
        <ActionError>
          {featureMessage(actionErrorMessage(problemOf(search.error)))}
        </ActionError>
      )}
      {noResults && !created && (
        <div className="search-result">
          <p>{t('feature_no_patient')}</p>
          {form?.kind !== 'document' && (
            <button
              type="button"
              className="button"
              onClick={() =>
                setForm({
                  kind: 'document',
                  documentType: params.documentType,
                  documentNumber: params.documentNumber,
                })
              }
            >
              {t('feature_patient_create')}
            </button>
          )}
        </div>
      )}

      <div className="actions">
        <button
          type="button"
          className="button"
          onClick={() => {
            setParams(null);
            setCreated(null);
            setForm({ kind: 'nn' });
          }}
        >
          {t('feature_patient_nn_register')}
        </button>
      </div>

      {form && !created && (
        <PatientForm
          key={form.kind}
          mode={form}
          onCreated={(patient) => {
            setCreated(patient);
            setForm(null);
          }}
        />
      )}

      {selected && (
        <ArrivalForm
          key={selected.id}
          patient={selected}
          sites={sites.isSuccess ? sites.data : null}
        />
      )}
    </section>
  );
}
