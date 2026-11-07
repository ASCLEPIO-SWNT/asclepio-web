import { ArrowRightIcon, QueueListIcon } from '@heroicons/react/24/outline';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useEncounterCount } from '../../../shared/hooks/useEncounterCount';
import {
  ENCOUNTERS_KEY,
  RECENT_LIMIT,
  useEncounters,
} from '../../../shared/hooks/useEncounters';
import { useI18n } from '../../../shared/i18n';
import {
  formatDateBogota,
  formatTimeBogota,
} from '../../../shared/lib/datetime';
import {
  ENCOUNTER_STATUS_VIEW,
  INDICATOR_STATUSES,
} from '../../../shared/lib/encounterStatus';
import { indicatorOf } from '../../../shared/lib/indicator';
import {
  ENCOUNTER_STATUS_LABELS,
  patientName,
} from '../../../shared/lib/labels';
import { problemOf, statusOf } from '../../../shared/lib/problem';
import { DASHBOARD_REFRESH_MS } from '../../../shared/lib/refresh';
import { DashboardPage } from '../../../shared/ui/DashboardPage';
import { DataCell, DataRow, DataTable } from '../../../shared/ui/DataTable';
import { LiveNote } from '../../../shared/ui/LiveNote';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';
import { PanelState } from '../../../shared/ui/PanelState';
import { PendingStrip } from '../../../shared/ui/PendingStrip';
import { RefreshButton } from '../../../shared/ui/RefreshButton';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { SummaryBar } from '../../../shared/ui/SummaryBar';
import { SummaryCell } from '../../../shared/ui/SummaryCell';

/** Etiqueta de cada indicador: la de la barra de resumen, en plural («Clasificadas»). */
const INDICATOR_LABELS = {
  WAITING_TRIAGE: 'dash_stat_waiting',
  TRIAGED: 'dash_stat_triaged',
  IN_CARE: 'dash_stat_in_care',
} as const;

/**
 * `/cola`: dashboard de medicina (UI-02-web R15, R16 y R18), el mismo para NURSE y ADMIN. Barra de
 * resumen con las atenciones en espera de triage, clasificadas y en atención (una petición cada
 * una, sin sede ni filtro); panel con las 8 atenciones más recientes, sin documento, con su
 * estado y el acceso a su detalle; y la franja «pendiente» de F-06, sin niveles, tiempos ni
 * umbrales. Todo se repite cada 30 s con la pestaña visible y con «Actualizar», que invalida las
 * cuatro lecturas; un refresco conserva las filas, las cifras y el foco (R23, R37).
 */
export function QueuePage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const counts = {
    WAITING_TRIAGE: useEncounterCount({ status: 'WAITING_TRIAGE' }),
    TRIAGED: useEncounterCount({ status: 'TRIAGED' }),
    IN_CARE: useEncounterCount({ status: 'IN_CARE' }),
  };
  const recent = useEncounters(
    { status: null, siteId: null, offset: 0 },
    { refresh: true, limit: RECENT_LIMIT },
  );
  const fetching = useIsFetching({ queryKey: ENCOUNTERS_KEY }) > 0;
  const items = recent.data?.items ?? [];

  let content: ReactNode;
  if (recent.isPending) {
    content = (
      <PanelState kind="loading" message={t('dash_queue_recent_loading')} />
    );
  } else if (recent.isError) {
    content =
      statusOf(problemOf(recent.error)) === 403 ? (
        <PanelState kind="forbidden" message={t('common_forbidden')} />
      ) : (
        <PanelState
          kind="error"
          message={t('dash_queue_recent_error')}
          retrying={recent.isFetching}
          error={recent.error}
          onRetry={() => void recent.refetch()}
        />
      );
  } else if (items.length === 0) {
    content = (
      <PanelState
        kind="empty"
        icon={QueueListIcon}
        message={t('dash_queue_recent_empty')}
      />
    );
  } else {
    content = (
      <DataTable
        labelledBy="queue-recent"
        columns={[
          { id: 'patient', header: t('feature_patient') },
          { id: 'site', header: t('feature_site') },
          { id: 'arrival', header: t('feature_arrival') },
          { id: 'status', header: t('feature_status') },
          { id: 'action', header: t('dash_col_action'), hiddenHeader: true },
        ]}
      >
        {items.map((encounter) => {
          const nameId = `queue-patient-${encounter.id}`;
          const view = ENCOUNTER_STATUS_VIEW[encounter.status];
          return (
            <DataRow key={encounter.id}>
              <DataCell kind="main" id={nameId}>
                <span className="cell-name">
                  {patientName(encounter.patient)}
                </span>
              </DataCell>
              <DataCell label={t('feature_site')}>
                {encounter.siteName}
              </DataCell>
              <DataCell kind="time" label={t('feature_arrival')}>
                <time dateTime={encounter.arrivalAt}>
                  {formatTimeBogota(encounter.arrivalAt)}
                </time>
                <span className="cell-sub">
                  {formatDateBogota(encounter.arrivalAt)}
                </span>
              </DataCell>
              <DataCell label={t('feature_status')}>
                <StatusBadge tone={view.tone} icon={view.icon}>
                  {ENCOUNTER_STATUS_LABELS[encounter.status]}
                </StatusBadge>
              </DataCell>
              <DataCell kind="actions">
                <Link
                  className="button button--secondary button--sm"
                  to={`/atenciones/${encounter.id}`}
                  aria-describedby={nameId}
                >
                  {t('feature_encounter_view')}
                </Link>
              </DataCell>
            </DataRow>
          );
        })}
      </DataTable>
    );
  }

  return (
    <DashboardPage
      header={
        <PageHeader
          title={t('common_nav_cola')}
          description={t('dash_queue_lead')}
          actions={
            <RefreshButton
              onRefresh={() =>
                void queryClient.invalidateQueries({ queryKey: ENCOUNTERS_KEY })
              }
              busy={fetching}
            />
          }
        />
      }
      summary={
        <SummaryBar>
          {INDICATOR_STATUSES.map((status) => {
            const query = counts[status];
            const view = ENCOUNTER_STATUS_VIEW[status];
            return (
              <SummaryCell
                key={status}
                label={t(INDICATOR_LABELS[status])}
                icon={view.icon}
                tone={view.tone}
                state={indicatorOf(query)}
                value={query.data?.count}
                capped={query.data?.capped}
                onRetry={() => void query.refetch()}
              />
            );
          })}
        </SummaryBar>
      }
      main={
        <Panel
          id="queue-recent"
          title={t('dash_queue_recent')}
          meta={<LiveNote seconds={DASHBOARD_REFRESH_MS / 1000} />}
          footer={
            recent.isSuccess && items.length > 0 ? (
              <>
                <span>
                  {items.length === 1
                    ? t('dash_recent_footer_one')
                    : t('dash_recent_footer', { count: items.length })}
                </span>
                <Link className="link-more" to="/atenciones">
                  {t('dash_view_all_encounters')}
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </>
            ) : undefined
          }
        >
          {content}
        </Panel>
      }
      pending={
        <PendingStrip id="queue-pending" title={t('dash_queue_pending_title')}>
          {t('dash_queue_pending_body')}
        </PendingStrip>
      }
    />
  );
}
