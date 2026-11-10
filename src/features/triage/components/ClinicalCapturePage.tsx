import {
  ArrowLeftIcon,
  ArrowPathIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';
import { useIsMutating } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useCurrentStaff } from '../../../shared/hooks/useCurrentStaff';
import { useI18n } from '../../../shared/i18n';
import { EncounterStatusBadge } from '../../../shared/ui/EncounterStatusBadge';
import { problemOf, statusOf } from '../../../shared/lib/problem';
import { LoadError } from '../../../shared/ui/LoadError';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { PatientDetails } from '../../../shared/ui/PatientDetails';
import { UnsavedChangesGuard } from '../../../shared/ui/UnsavedChangesGuard';
import { ViewForbidden } from '../../../shared/ui/ViewForbidden';
import { useClinicalCapture } from '../hooks/useClinicalCapture';
import { decideTriageMutationKey } from '../hooks/useDecideTriage';
import { useEncounter } from '../hooks/useEncounter';
import { useTriageDecision } from '../hooks/useTriageDecision';
import { trayFilters, traySearch } from '../trayFilters';
import { ClinicalCaptureReadout } from './ClinicalCapturePanel';
import { SymptomFindingsForm } from './SymptomFindingsForm';
import { TriageDecisionCard } from './TriageDecisionCard';
import { TriageSuggestionPanel } from './TriageSuggestionPanel';
import { VitalSignsForm } from './VitalSignsForm';

export function ClinicalCaptureRoute() {
  const { id = '' } = useParams();
  return <ClinicalCapturePage key={id} encounterId={id} />;
}

function ClinicalCapturePage({ encounterId }: { encounterId: string }) {
  const { t } = useI18n();
  const me = useCurrentStaff();
  const [params] = useSearchParams();
  const { siteId, offset } = trayFilters(params);
  const detail = useEncounter(encounterId);
  const capture = useClinicalCapture(
    encounterId,
    me.role === 'NURSE' && detail.isSuccess,
  );
  const [vitalsDirty, setVitalsDirty] = useState(false);
  const [findingsDirty, setFindingsDirty] = useState(false);
  const [decisionDirty, setDecisionDirty] = useState(false);
  // F-05-web D9: el último envío de la decisión respondió 409.
  const [decisionConflict, setDecisionConflict] = useState(false);
  // F-05-web D5: la decisión solo se consulta si la atención ya trae nivel final.
  const hasFinalLevel =
    detail.data !== undefined && detail.data.finalLevel !== null;
  const decision = useTriageDecision(
    encounterId,
    me.role === 'NURSE' && hasFinalLevel,
  );
  const decided = hasFinalLevel || decision.data !== undefined;
  // F-05-web R12: mientras hay un envío, el panel no deja pedir otra sugerencia.
  const submitting =
    useIsMutating({ mutationKey: decideTriageMutationKey(encounterId) }) > 0;
  const [unavailable, setUnavailable] = useState<403 | 404 | null>(null);
  const [stateCheck, setStateCheck] = useState<'idle' | 'checking' | 'failed'>(
    'idle',
  );
  const detailStatus = detail.isError
    ? statusOf(problemOf(detail.error))
    : null;
  const captureStatus = capture.isError
    ? statusOf(problemOf(capture.error))
    : null;
  // F-05-web R21: un 403 de la consulta de la decisión muestra la vista sin permiso; su 404
  // (atención con nivel final) se queda en la tarjeta (R17).
  const decisionStatus = decision.isError
    ? statusOf(problemOf(decision.error))
    : null;
  const forbidden =
    unavailable === 403 ||
    detailStatus === 403 ||
    captureStatus === 403 ||
    decisionStatus === 403;
  const missing =
    unavailable === 404 || detailStatus === 404 || captureStatus === 404;
  const refresh = async () => {
    setStateCheck('checking');
    const context = await detail.refetch();
    if (!context.isSuccess) {
      setStateCheck('failed');
      return;
    }
    const clinical = await capture.refetch();
    setStateCheck(clinical.isSuccess ? 'idle' : 'failed');
  };
  const canCapture =
    detail.isSuccess &&
    capture.isSuccess &&
    detail.data.status === 'WAITING_TRIAGE' &&
    capture.data.status === 'WAITING_TRIAGE' &&
    !detail.isFetching &&
    !capture.isFetching &&
    stateCheck === 'idle';
  // Query data is retained in RAM after refetch errors only to keep the mounted drafts.
  // Context/history below are rendered exclusively from successful current queries.
  const mountedForms = detail.data !== undefined && capture.data !== undefined;
  return (
    <section className="clinical-workspace" aria-labelledby="capture-title">
      <UnsavedChangesGuard
        dirty={vitalsDirty || findingsDirty || decisionDirty}
      />
      <header className="clinical-workspace__header">
        <div>
          <h1 id="capture-title">{t('clinical_capture_title')}</h1>
          <p className="muted">{t('clinical_capture_intro')}</p>
        </div>
        <Link
          className="button button--secondary"
          to={`/triage?${traySearch(siteId, offset)}`}
        >
          <ArrowLeftIcon aria-hidden="true" />
          {t('clinical_back')}
        </Link>
      </header>
      {forbidden ? (
        <ViewForbidden />
      ) : missing ? (
        <p className="status status--error" role="alert">
          {t('feature_encounter_not_found')}
        </p>
      ) : (
        <>
          {detail.isPending && (
            <LoadingState>{t('feature_encounter_loading')}</LoadingState>
          )}
          {detail.isError && stateCheck !== 'failed' && (
            <LoadError
              message={t('feature_encounter_error')}
              retrying={detail.isFetching}
              error={detail.error}
              onRetry={() => void refresh()}
            />
          )}
          {detail.isSuccess && (
            <section
              className="card clinical-context"
              aria-labelledby="clinical-context"
            >
              <h2 id="clinical-context" className="clinical-card-heading">
                <BeakerIcon aria-hidden="true" />
                {t('clinical_context')}
              </h2>
              <PatientDetails patient={detail.data.patient} />
              <dl className="details">
                <dt>{t('feature_site')}</dt>
                <dd>{detail.data.siteName}</dd>
                <dt>{t('feature_status')}</dt>
                <dd>
                  <EncounterStatusBadge status={detail.data.status} />
                </dd>
              </dl>
              <div className="clinical-context__complaint">
                <h3>{t('clinical_original_complaint')}</h3>
                <p>{detail.data.chiefComplaintText}</p>
              </div>
              <div className="actions">
                <Link to={`/atenciones/${encounterId}`}>
                  {t('feature_encounter_view')}
                </Link>
              </div>
            </section>
          )}
          {(stateCheck === 'checking' ||
            (detail.isFetching && mountedForms)) && (
            <LoadingState>{t('clinical_state_checking')}</LoadingState>
          )}
          {stateCheck === 'failed' && (
            <LoadError
              message={t('clinical_state_error')}
              retrying={detail.isFetching || capture.isFetching}
              error={detail.error ?? capture.error ?? undefined}
              onRetry={() => void refresh()}
            />
          )}
          {detail.isSuccess && detail.data.status !== 'WAITING_TRIAGE' && (
            <p role="status" className="status status--warn">
              {t('clinical_read_only')}
            </p>
          )}
          {mountedForms && (
            <div className="clinical-forms">
              <div className="card">
                <VitalSignsForm
                  encounterId={encounterId}
                  disabled={!canCapture}
                  onConflict={() => void refresh()}
                  onUnavailable={setUnavailable}
                  onDirtyChange={setVitalsDirty}
                />
              </div>
              <div className="card">
                <SymptomFindingsForm
                  encounterId={encounterId}
                  disabled={!canCapture}
                  onConflict={() => void refresh()}
                  onUnavailable={setUnavailable}
                  onDirtyChange={setFindingsDirty}
                />
              </div>
            </div>
          )}
          {/* F-04-web D2: el panel va después de los formularios y antes del historial. */}
          {detail.isSuccess && capture.isSuccess && (
            <TriageSuggestionPanel
              encounterId={encounterId}
              enabled={canCapture && !submitting}
              capture={capture.data}
              decided={decided}
              onConflict={() => void refresh()}
              onUnavailable={setUnavailable}
            />
          )}
          {/* F-05-web D1: la tarjeta de triage va justo después del panel de sugerencia. */}
          {detail.isSuccess && capture.isSuccess && (
            <TriageDecisionCard
              encounterId={encounterId}
              encounter={detail.data}
              capture={capture.data}
              enabled={canCapture}
              decided={decided}
              decision={decision}
              conflict={decisionConflict}
              onConflict={() => {
                setDecisionConflict(true);
                void refresh();
              }}
              onSubmitStart={() => setDecisionConflict(false)}
              onUnavailable={setUnavailable}
              onDirtyChange={setDecisionDirty}
            />
          )}
          {detail.isSuccess || mountedForms ? (
            <section className="card" aria-label={t('clinical_capture_title')}>
              {detail.isSuccess && stateCheck !== 'failed' && (
                <ClinicalCaptureReadout query={capture} />
              )}
              <button
                type="button"
                className="button button--secondary"
                disabled={detail.isFetching || capture.isFetching}
                onClick={() => void refresh()}
              >
                <ArrowPathIcon aria-hidden="true" />
                {t('feature_refresh')}
              </button>
            </section>
          ) : null}
        </>
      )}
    </section>
  );
}
