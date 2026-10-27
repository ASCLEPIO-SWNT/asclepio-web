import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import type { Patient, PublicSite } from '../../../shared/api/client';
import { ARRIVAL_REGISTERED_NOTICE } from '../../../shared/lib/notices';
import {
  actionErrorMessage,
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

const CONFLICT_MESSAGE =
  'El paciente ya tiene un pre-registro pendiente o una atención activa. Revisa la bandeja.';
const INVALID_MESSAGE = 'La sede o el paciente ya no son válidos.';

/** Paciente seleccionado y registro de su llegada (R24–R27). */
export function ArrivalForm({
  patient,
  sites,
}: {
  patient: Patient;
  /** Sedes del tenant; null mientras cargan o si fallaron (selector deshabilitado, R5). */
  sites: PublicSite[] | null;
}) {
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
      <h2 id="arrival-title">Paciente seleccionado</h2>
      <PatientDetails patient={patient} />
      <form
        className="form"
        aria-label="Registrar llegada"
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
          <label htmlFor="arrival-site">Sede</label>
          <select
            id="arrival-site"
            disabled={sites === null}
            aria-invalid={siteError ? true : false}
            aria-describedby={siteError ? 'arrival-site-error' : undefined}
            {...register('siteId')}
          >
            <option value="">Elige la sede…</option>
            {sites?.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
          {siteError && (
            <p id="arrival-site-error" className="field__error">
              {siteError}
            </p>
          )}
        </div>
        <TextAreaField
          id="arrival-complaint"
          label="Motivo de consulta"
          error={errors.chiefComplaintText?.message}
          registration={register('chiefComplaintText')}
          rows={4}
        />
        <button type="submit" className="button" disabled={create.isPending}>
          Registrar llegada
        </button>
        {create.isPending && (
          <LoadingState>Registrando la llegada…</LoadingState>
        )}
        {actionError && (
          <ActionError>
            {actionError.message}
            {actionError.conflict && (
              <>
                {' '}
                <Link to="/recepcion">Ir a la bandeja</Link>
              </>
            )}
          </ActionError>
        )}
      </form>
    </section>
  );
}
