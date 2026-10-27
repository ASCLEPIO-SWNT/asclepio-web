import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import type { Encounter, StaffRole } from '../../../shared/api/client';
import { useCurrentStaff } from '../../../shared/hooks/useCurrentStaff';
import { formatBogota } from '../../../shared/lib/datetime';
import {
  COMPLAINT_SOURCE_LABELS,
  ENCOUNTER_STATUS_LABELS,
  ORIGIN_LABELS,
} from '../../../shared/lib/labels';
import {
  ARRIVAL_REGISTERED_NOTICE,
  noticeOf,
} from '../../../shared/lib/notices';
import { problemOf, statusOf } from '../../../shared/lib/problem';
import { ActionError } from '../../../shared/ui/ActionError';
import { LoadError } from '../../../shared/ui/LoadError';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { Notice } from '../../../shared/ui/Notice';
import { PatientDetails } from '../../../shared/ui/PatientDetails';
import { ViewForbidden } from '../../../shared/ui/ViewForbidden';
import { encounterKey, useEncounter } from '../hooks/useEncounter';
import { CancelEncounterForm } from './CancelEncounterForm';
import { EncounterTimeline } from './EncounterTimeline';

/** Roles de cancelación (PA-F02-3). */
const CANCEL_ROLES: readonly StaffRole[] = ['RECEPTION', 'NURSE'];
const TERMINAL: readonly Encounter['status'][] = ['CLOSED', 'CANCELLED'];

/** `/atenciones/:id`: una instancia por id, para no arrastrar avisos de otra atención. */
export function EncounterDetailRoute() {
  const { id = '' } = useParams();
  return <EncounterDetailPage key={id} id={id} />;
}

function NotFound() {
  return (
    <div role="alert" className="status status--error">
      <p>No se encontró la atención.</p>
      <p>
        <Link to="/atenciones">Volver a las atenciones</Link>
      </p>
    </div>
  );
}

/** Detalle de la atención, línea de tiempo y cancelación (R31–R36). */
function EncounterDetailPage({ id }: { id: string }) {
  const me = useCurrentStaff();
  const location = useLocation();
  const queryClient = useQueryClient();
  const detail = useEncounter(id);
  const [cancelled, setCancelled] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  const arrivalNotice = noticeOf(location.state) === ARRIVAL_REGISTERED_NOTICE;

  const errorStatus = detail.isError ? statusOf(problemOf(detail.error)) : null;

  let body;
  if (gone || errorStatus === 404) {
    body = <NotFound />;
  } else if (detail.isPending) {
    body = <LoadingState>Cargando la atención…</LoadingState>;
  } else if (detail.isError) {
    body =
      errorStatus === 403 ? (
        <ViewForbidden />
      ) : (
        <LoadError
          message="No se pudo cargar la atención."
          retrying={detail.isFetching}
          onRetry={() => void detail.refetch()}
        />
      );
  } else {
    const encounter = detail.data;
    const canCancel =
      CANCEL_ROLES.includes(me.role) && !TERMINAL.includes(encounter.status);
    body = (
      <>
        {arrivalNotice && !cancelled && <Notice>Llegada registrada.</Notice>}
        {cancelled && <Notice>Atención cancelada.</Notice>}
        <dl className="details">
          <dt>Estado</dt>
          <dd>{ENCOUNTER_STATUS_LABELS[encounter.status]}</dd>
          <dt>Origen</dt>
          <dd>{ORIGIN_LABELS[encounter.origin]}</dd>
          <dt>Sede</dt>
          <dd>{encounter.siteName}</dd>
          <dt>Llegada (hora legal)</dt>
          <dd>{formatBogota(encounter.arrivalAt)}</dd>
          {encounter.preRegisteredAt !== null && (
            <>
              <dt>Pre-registro (referencia)</dt>
              <dd>{formatBogota(encounter.preRegisteredAt)}</dd>
            </>
          )}
          <dt>Registrada por</dt>
          <dd>{encounter.registeredBy.fullName ?? '—'}</dd>
          <dt>Motivo de consulta</dt>
          <dd>
            {encounter.chiefComplaintText}{' '}
            <span className="muted">
              ({COMPLAINT_SOURCE_LABELS[encounter.complaintSource]})
            </span>
          </dd>
          {encounter.status === 'CANCELLED' && (
            <>
              <dt>Motivo de la cancelación</dt>
              <dd>{encounter.cancellationReason ?? '—'}</dd>
            </>
          )}
        </dl>

        <section aria-labelledby="patient-title">
          <h2 id="patient-title">Paciente</h2>
          <PatientDetails patient={encounter.patient} />
        </section>

        {canCancel && (
          <CancelEncounterForm
            encounterId={encounter.id}
            onStart={() => {
              setCancelled(false);
              setCancelError(null);
            }}
            onCancelled={() => setCancelled(true)}
            onFailed={(message, status) => {
              if (status === 404) {
                setGone(true);
                return;
              }
              setCancelError(message);
              if (status === 409) {
                void queryClient.invalidateQueries({
                  queryKey: encounterKey(id),
                });
              }
            }}
          />
        )}
        {cancelError && <ActionError>{cancelError}</ActionError>}

        <EncounterTimeline events={encounter.events} />
      </>
    );
  }

  return (
    <section className="card" aria-labelledby="encounter-title">
      <h1 id="encounter-title">Atención</h1>
      <p>
        <Link to="/atenciones">Todas las atenciones</Link>
      </p>
      {body}
    </section>
  );
}
