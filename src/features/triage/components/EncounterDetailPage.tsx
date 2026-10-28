import { featureMessage } from '../../../shared/lib/featureMessages';
import { useI18n } from '../../../shared/i18n';
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
  const { t } = useI18n();
  return (
    <div role="alert" className="status status--error">
      <p>{t('feature_encounter_not_found')}</p>
      <p>
        <Link to="/atenciones">{t('feature_encounters_back')}</Link>
      </p>
    </div>
  );
}

/** Detalle de la atención, línea de tiempo y cancelación (R31–R36). */
function EncounterDetailPage({ id }: { id: string }) {
  const { t } = useI18n();
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
    body = <LoadingState>{t('feature_encounter_loading')}</LoadingState>;
  } else if (detail.isError) {
    body =
      errorStatus === 403 ? (
        <ViewForbidden />
      ) : (
        <LoadError
          message={t('feature_encounter_error')}
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
        {arrivalNotice && !cancelled && (
          <Notice>{t('feature_arrival_registered')}</Notice>
        )}
        {cancelled && <Notice>{t('feature_encounter_cancelled')}</Notice>}
        <dl className="details">
          <dt>{t('feature_status')}</dt>
          <dd>{ENCOUNTER_STATUS_LABELS[encounter.status]}</dd>
          <dt>{t('feature_origin')}</dt>
          <dd>{ORIGIN_LABELS[encounter.origin]}</dd>
          <dt>{t('feature_site')}</dt>
          <dd>{encounter.siteName}</dd>
          <dt>{t('feature_arrival_legal')}</dt>
          <dd>{formatBogota(encounter.arrivalAt)}</dd>
          {encounter.preRegisteredAt !== null && (
            <>
              <dt>{t('feature_pr_reference')}</dt>
              <dd>{formatBogota(encounter.preRegisteredAt)}</dd>
            </>
          )}
          <dt>{t('feature_registered_by')}</dt>
          <dd>{encounter.registeredBy.fullName ?? '—'}</dd>
          <dt>{t('feature_complaint')}</dt>
          <dd>
            {encounter.chiefComplaintText}{' '}
            <span className="muted">
              ({COMPLAINT_SOURCE_LABELS[encounter.complaintSource]})
            </span>
          </dd>
          {encounter.status === 'CANCELLED' && (
            <>
              <dt>{t('feature_cancellation_reason')}</dt>
              <dd>{encounter.cancellationReason ?? '—'}</dd>
            </>
          )}
        </dl>

        <section aria-labelledby="patient-title">
          <h2 id="patient-title">{t('feature_patient')}</h2>
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
        {cancelError && (
          <ActionError>{featureMessage(cancelError)}</ActionError>
        )}

        <EncounterTimeline events={encounter.events} />
      </>
    );
  }

  return (
    <section className="card" aria-labelledby="encounter-title">
      <h1 id="encounter-title">{t('feature_encounter')}</h1>
      <p>
        <Link to="/atenciones">{t('feature_encounters_all')}</Link>
      </p>
      {body}
    </section>
  );
}
