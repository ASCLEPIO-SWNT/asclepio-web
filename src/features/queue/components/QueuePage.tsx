import { CheckCircleIcon } from '@heroicons/react/24/outline';
import {
  useIsFetching,
  useIsMutating,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { QueueItem } from '../../../shared/api/client';
import { useCurrentStaff } from '../../../shared/hooks/useCurrentStaff';
import { useSites } from '../../../shared/hooks/useSites';
import { useI18n } from '../../../shared/i18n';
import { formatTimeBogota } from '../../../shared/lib/datetime';
import {
  ENCOUNTER_STATUS_VIEW,
  INDICATOR_STATUSES,
} from '../../../shared/lib/encounterStatus';
import { errorClassKey } from '../../../shared/lib/errors';
import type { IndicatorState } from '../../../shared/lib/indicator';
import { romanLevel } from '../../../shared/lib/level';
import { problemOf, statusOf } from '../../../shared/lib/problem';
import { DASHBOARD_REFRESH_MS } from '../../../shared/lib/refresh';
import { ActionError } from '../../../shared/ui/ActionError';
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog';
import { DashboardPage } from '../../../shared/ui/DashboardPage';
import { LiveNote } from '../../../shared/ui/LiveNote';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { Notice } from '../../../shared/ui/Notice';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { PanelState } from '../../../shared/ui/PanelState';
import { RefreshButton } from '../../../shared/ui/RefreshButton';
import { SummaryBar } from '../../../shared/ui/SummaryBar';
import { SummaryCell } from '../../../shared/ui/SummaryCell';
import { SummaryFilter } from '../../../shared/ui/SummaryFilter';
import { QUEUE_KEY, useQueue } from '../hooks/useQueue';
import {
  QUEUE_TRANSITION_KEY,
  useQueueTransition,
  type QueueTransition,
  type QueueTransitionKind,
} from '../hooks/useQueueTransition';
import { patientLabel, sectionsOf } from '../queueView';
import { QueueSection, patientCellId } from './QueueSection';

const SITE_FILTER_ID = 'queue-site';

/** Textos de cada acción del médico (PA-2). */
const ACTION_TEXT = {
  start: {
    button: 'queue_start',
    title: 'queue_confirm_start_title',
    body: 'queue_confirm_start_body',
    running: 'queue_starting',
    done: 'queue_started',
    conflict: 'queue_conflict_start',
  },
  close: {
    button: 'queue_close',
    title: 'queue_confirm_close_title',
    body: 'queue_confirm_close_body',
    running: 'queue_closing',
    done: 'queue_closed',
    conflict: 'queue_conflict_close',
  },
} as const satisfies Record<QueueTransitionKind, Record<string, string>>;

/**
 * Resultado de la última acción del médico (D11): éxito, aviso (409 y 404, la cola se vuelve a
 * leer) o error de acción (403, red, servidor u otro). `retry` es la misma acción sobre la misma
 * atención, solo en los fallos de red y de servidor (R24).
 */
type Outcome =
  | { kind: 'ok'; key: string }
  | { kind: 'warn'; key: string }
  | { kind: 'error'; key: string; retry: QueueTransition | null };

/** Aviso de 409 o 404: recibe el foco al aparecer (R22, R23). */
function WarnNotice({ children }: { children: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div
      ref={ref}
      role="status"
      tabIndex={-1}
      className="status status--warn queue-notice"
    >
      {children}
    </div>
  );
}

/**
 * `/cola`: cola priorizada (F-06-web D2–D8), la misma para PHYSICIAN, NURSE y ADMIN. Encabezado
 * con «Actualizar», barra de resumen con las tres cifras de la propia respuesta y el filtro
 * «Sede», y las tres secciones de `GET /api/v1/queue` en el orden recibido. Todo se repite cada
 * 30 s con la pestaña visible; un refresco conserva las filas, las cifras y el foco.
 */
export function QueuePage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  // R15 (PA-7 a): la sede elegida vive solo en memoria.
  const [siteId, setSiteId] = useState<string | null>(null);
  const sites = useSites();
  const query = useQueue(siteId);
  const fetching = useIsFetching({ queryKey: QUEUE_KEY }) > 0;
  // R17 (PA-8 a): solo PHYSICIAN opera; NURSE y ADMIN consultan.
  const physician = useCurrentStaff().role === 'PHYSICIAN';
  const transition = useQueueTransition();
  // D10, R20 (PA-10 a): una acción del médico cada vez en toda la cola.
  const pending = useIsMutating({ mutationKey: QUEUE_TRANSITION_KEY }) > 0;
  const inFlight = useRef(false);
  const [confirming, setConfirming] = useState<{
    kind: QueueTransitionKind;
    item: QueueItem;
  } | null>(null);
  const [running, setRunning] = useState<QueueTransitionKind | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // Cada resultado nuevo se monta de nuevo (y vuelve a tomar el foco).
  const [outcomeId, setOutcomeId] = useState(0);

  const report = (next: Outcome) => {
    setOutcome(next);
    setOutcomeId((id) => id + 1);
  };

  const send = (action: QueueTransition) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setOutcome(null);
    setRunning(action.kind);
    transition.mutate(action, {
      onSuccess: () =>
        report({ kind: 'ok', key: ACTION_TEXT[action.kind].done }),
      onError: (cause) => {
        const status = statusOf(problemOf(cause));
        if (status === 409)
          report({ kind: 'warn', key: ACTION_TEXT[action.kind].conflict });
        else if (status === 404) report({ kind: 'warn', key: 'queue_gone' });
        else if (status === 403)
          report({ kind: 'error', key: 'queue_action_forbidden', retry: null });
        else if (status === null)
          report({ kind: 'error', key: 'common_error_network', retry: action });
        else if (status >= 500)
          report({ kind: 'error', key: 'common_error_server', retry: action });
        // El 401 lo resuelve el cierre de sesión global del cliente HTTP.
        else if (status !== 401)
          report({ kind: 'error', key: 'feature_action_error', retry: null });
      },
      onSettled: () => {
        inFlight.current = false;
        setRunning(null);
      },
    });
  };

  const actionsFor = (kind: QueueTransitionKind) => (item: QueueItem) => (
    <button
      type="button"
      className="button button--secondary button--sm"
      aria-describedby={patientCellId(item)}
      disabled={pending}
      onClick={() => {
        if (pending || inFlight.current) return;
        setConfirming({ kind, item });
      }}
    >
      {t(ACTION_TEXT[kind].button)}
    </button>
  );

  // D4: un 403 deja la vista «Sin permiso» aunque hubiera datos (el permiso ya no vale).
  const forbidden = query.isError && statusOf(problemOf(query.error)) === 403;
  const data = forbidden ? undefined : query.data;
  const sections = data ? sectionsOf(data) : null;

  const cellState: IndicatorState = forbidden
    ? 'forbidden'
    : data
      ? 'ready'
      : query.isError
        ? 'error'
        : 'loading';

  let main: ReactNode;
  if (forbidden) {
    main = (
      <div className="panel">
        <div className="panel__body">
          <PanelState kind="forbidden" message={t('common_forbidden')} />
        </div>
      </div>
    );
  } else if (sections) {
    // D4, R13 (PA-6 a): un refresco fallido conserva los datos del último éxito con un aviso.
    const stale = query.isError ? (
      <div className="status status--warn queue-notice">
        <span>
          {t('queue_refresh_failed', {
            time: formatTimeBogota(data!.serverNow),
          })}
        </span>
        <button
          type="button"
          className="button button--secondary button--sm"
          aria-busy={query.isFetching || undefined}
          onClick={() => void query.refetch()}
        >
          {t('common_retry')}
        </button>
      </div>
    ) : null;
    const list = sections.map((section, index) => (
      <QueueSection
        key={section.id}
        section={section}
        actions={
          physician && section.id === 'triaged'
            ? actionsFor('start')
            : physician && section.id === 'inCare'
              ? actionsFor('close')
              : undefined
        }
        meta={
          index === 0 ? (
            <>
              {/* D8: la hora de la cola, del servidor y sin región viva. */}
              <time className="queue-server-time" dateTime={data!.serverNow}>
                {t('queue_server_time', {
                  time: formatTimeBogota(data!.serverNow),
                })}
              </time>
              <LiveNote seconds={DASHBOARD_REFRESH_MS / 1000} />
            </>
          ) : undefined
        }
      />
    ));
    main = (
      <>
        {stale}
        {running && (
          <LoadingState>{t(ACTION_TEXT[running].running)}</LoadingState>
        )}
        {outcome?.kind === 'ok' && (
          <Notice key={outcomeId} icon={CheckCircleIcon} autoFocus>
            {t(outcome.key)}
          </Notice>
        )}
        {outcome?.kind === 'warn' && (
          <WarnNotice key={outcomeId}>{t(outcome.key)}</WarnNotice>
        )}
        {outcome?.kind === 'error' && (
          <ActionError
            key={outcomeId}
            onRetry={
              outcome.retry
                ? () => {
                    const retry = outcome.retry;
                    if (retry) send(retry);
                  }
                : undefined
            }
          >
            {t(outcome.key)}
          </ActionError>
        )}
        {list}
        {confirming && (
          <ConfirmDialog
            title={t(ACTION_TEXT[confirming.kind].title)}
            body={t(ACTION_TEXT[confirming.kind].body, {
              patient: patientLabel(confirming.item.patient),
              level:
                confirming.item.finalLevel === null
                  ? '—'
                  : romanLevel(confirming.item.finalLevel),
            })}
            confirmLabel={t('queue_confirm')}
            cancelLabel={t('queue_back')}
            onCancel={() => setConfirming(null)}
            onConfirm={() => {
              const { kind, item } = confirming;
              setConfirming(null);
              send({ kind, id: item.encounterId });
            }}
          />
        )}
      </>
    );
  } else if (query.isError) {
    main = (
      <div className="panel">
        <div className="panel__body">
          <PanelState
            kind="error"
            message={t(errorClassKey(query.error) ?? 'common_error_server')}
            retrying={query.isFetching}
            onRetry={() => void query.refetch()}
          />
        </div>
      </div>
    );
  } else {
    main = (
      <div className="panel">
        <div className="panel__body">
          <PanelState kind="loading" message={t('queue_loading')} />
        </div>
      </div>
    );
  }

  return (
    <DashboardPage
      header={
        <PageHeader
          title={t('common_nav_cola')}
          description={t('queue_lead')}
          actions={
            <RefreshButton
              onRefresh={() =>
                void queryClient.invalidateQueries({ queryKey: QUEUE_KEY })
              }
              busy={fetching}
            />
          }
        />
      }
      summary={
        <SummaryBar
          filter={
            <SummaryFilter
              id={SITE_FILTER_ID}
              label={t('feature_site')}
              error={
                sites.isError
                  ? {
                      message: t('feature_sites_error'),
                      retrying: sites.isFetching,
                      cause: sites.error,
                      onRetry: () => void sites.refetch(),
                    }
                  : undefined
              }
            >
              <select
                id={SITE_FILTER_ID}
                value={siteId ?? ''}
                disabled={!sites.isSuccess}
                onChange={(event) => setSiteId(event.target.value || null)}
              >
                <option value="">{t('feature_sites_all')}</option>
                {sites.data?.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </SummaryFilter>
          }
        >
          {INDICATOR_STATUSES.map((status, index) => {
            const view = ENCOUNTER_STATUS_VIEW[status];
            return (
              <SummaryCell
                key={status}
                label={t(
                  [
                    'dash_stat_waiting',
                    'dash_stat_triaged',
                    'dash_stat_in_care',
                  ][index],
                )}
                icon={view.icon}
                tone={view.tone}
                state={cellState}
                value={sections?.[index].items.length}
                onRetry={() => void query.refetch()}
              />
            );
          })}
        </SummaryBar>
      }
      main={main}
    />
  );
}
