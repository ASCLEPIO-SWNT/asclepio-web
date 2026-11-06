import {
  featureMessage,
  fieldMessage,
} from '../../../shared/lib/featureMessages';
import { useI18n } from '../../../shared/i18n';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import type { Patient, PublicSite } from '../../../shared/api/client';
import { ARRIVAL_REGISTERED_NOTICE } from '../../../shared/lib/notices';
import {
  actionErrorMessage,
  isRetryableActionMessage,
  problemOf,
  statusOf,
} from '../../../shared/lib/problem';
import { ActionError } from '../../../shared/ui/ActionError';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { PatientDetails } from '../../../shared/ui/PatientDetails';
import { TextAreaField } from '../../../shared/ui/TextAreaField';
import { useCreateEncounter } from '../hooks/useCreateEncounter';
import {
  arrivalSchema,
  type Arrival,
  type ArrivalForm as ArrivalFormValues,
} from '../schemas';

// Claves de catálogo (UI-03-web R20); `featureMessage` las traduce al mostrarlas.
const CONFLICT_MESSAGE = 'feature_arrival_conflict';
const INVALID_MESSAGE = 'feature_arrival_invalid';

/** Paciente seleccionado y registro de su llegada (R24–R27). */
export function ArrivalForm({
  patient,
  sites,
}: {
  patient: Patient;
  /** Sedes del tenant; null mientras cargan o si fallaron (selector deshabilitado, R5). */
  sites: PublicSite[] | null;
}) {
  const { t } = useI18n();
  // UI-03-web R15/R18: «Reintentar» vuelve a enviar el formulario con lo escrito.
  const formRef = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();
  const create = useCreateEncounter();
  const [actionError, setActionError] = useState<{
    message: string;
    conflict: boolean;
  } | null>(null);
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<ArrivalFormValues, unknown, Arrival>({
    resolver: zodResolver(arrivalSchema),
    defaultValues: {
      siteId: sites?.length === 1 ? sites[0].id : '',
      chiefComplaintText: '',
    },
  });

  // R24: con una sola sede en el tenant queda preseleccionada (también si llegan después).
  useEffect(() => {
    if (sites?.length === 1 && !getValues('siteId')) {
      setValue('siteId', sites[0].id);
    }
  }, [sites, getValues, setValue]);

  const onValid = ({ siteId, chiefComplaintText }: Arrival) => {
    if (create.isPending) return;
    setActionError(null);
    create.mutate(
      { patientId: patient.id, siteId, chiefComplaintText },
      {
        onSuccess: (encounter) =>
          void navigate(`/atenciones/${encounter.id}`, {
            state: { notice: ARRIVAL_REGISTERED_NOTICE },
          }),
        onError: (cause) => {
          const problem = problemOf(cause);
          setActionError({
            message: actionErrorMessage(problem, {
              409: CONFLICT_MESSAGE,
              422: INVALID_MESSAGE,
            }),
            conflict: statusOf(problem) === 409,
          });
        },
      },
    );
  };

  const siteError = errors.siteId?.message;

  return (
    <section className="arrival" aria-labelledby="arrival-title">
      <h2 id="arrival-title">{t('feature_patient_selected')}</h2>
      <PatientDetails patient={patient} />
      <form
        ref={formRef}
        className="form"
        aria-label={t('feature_arrival_register')}
        noValidate
        onSubmit={(event) => {
          if (create.isPending) {
            event.preventDefault();
            return;
          }
          void handleSubmit(onValid)(event);
        }}
      >
        <div className="field">
          <label htmlFor="arrival-site">{t('feature_site')}</label>
          <select
            id="arrival-site"
            disabled={sites === null}
            aria-invalid={siteError ? true : false}
            aria-describedby={siteError ? 'arrival-site-error' : undefined}
            {...register('siteId')}
          >
            <option value="">{t('feature_site_choose')}</option>
            {sites?.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
          {siteError && (
            <p id="arrival-site-error" className="field__error">
              {fieldMessage(siteError)}
            </p>
          )}
        </div>
        <TextAreaField
          id="arrival-complaint"
          label={t('feature_complaint')}
          error={fieldMessage(errors.chiefComplaintText?.message)}
          registration={register('chiefComplaintText')}
          rows={4}
        />
        <button type="submit" className="button" disabled={create.isPending}>
          {t('feature_arrival_register')}
        </button>
        {create.isPending && (
          <LoadingState>{t('feature_arrival_registering')}</LoadingState>
        )}
        {actionError && (
          <ActionError
            onRetry={
              isRetryableActionMessage(actionError.message)
                ? () => formRef.current?.requestSubmit()
                : undefined
            }
          >
            {featureMessage(actionError.message)}
            {actionError.conflict && (
              <>
                {' '}
                <Link to="/recepcion">{t('feature_tray_go')}</Link>
              </>
            )}
          </ActionError>
        )}
      </form>
    </section>
  );
}
