import {
  ArrowRightIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useEncounterCount } from '../../../shared/hooks/useEncounterCount';
import { ENCOUNTERS_KEY } from '../../../shared/hooks/useEncounters';
import { useSites } from '../../../shared/hooks/useSites';
import { useI18n } from '../../../shared/i18n';
import {
  ENCOUNTER_STATUS_VIEW,
  INDICATOR_STATUSES,
} from '../../../shared/lib/encounterStatus';
import { indicatorOf } from '../../../shared/lib/indicator';
import { problemOf, statusOf } from '../../../shared/lib/problem';
import { DASHBOARD_REFRESH_MS } from '../../../shared/lib/refresh';
import { DashboardPage } from '../../../shared/ui/DashboardPage';
import { LiveNote } from '../../../shared/ui/LiveNote';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';
import { PanelState } from '../../../shared/ui/PanelState';
import { PendingStrip } from '../../../shared/ui/PendingStrip';
import { RefreshButton } from '../../../shared/ui/RefreshButton';
import { SummaryBar } from '../../../shared/ui/SummaryBar';
import { SummaryCell } from '../../../shared/ui/SummaryCell';
import { SiteCountTable } from './SiteCountTable';

/** Etiqueta de cada indicador: la de la barra de resumen, en plural («Clasificadas»). */
const INDICATOR_LABELS = {
  WAITING_TRIAGE: 'dash_stat_waiting',
  TRIAGED: 'dash_stat_triaged',
  IN_CARE: 'dash_stat_in_care',
} as const;

/**
 * `/reportes`: dashboard de administración (UI-02-web R15, R17 y R18). Barra de resumen con las
 * atenciones en espera de triage, clasificadas y en atención (una petición cada una, sin sede ni
 * filtro); panel con la espera de triage por sede (una petición por sede, sin datos de
 * pacientes) y la franja «pendiente» de F-07, sin cifras de reportes ni gráficos. Todo se repite
 * cada 30 s con la pestaña visible y con «Actualizar», que invalida las lecturas de atenciones;
 * las sedes se piden una vez y solo repite su «Reintentar» (R24).
 */
export function ReportsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const counts = {
    WAITING_TRIAGE: useEncounterCount({ status: 'WAITING_TRIAGE' }),
    TRIAGED: useEncounterCount({ status: 'TRIAGED' }),
    IN_CARE: useEncounterCount({ status: 'IN_CARE' }),
  };
  const sites = useSites();
  const fetching = useIsFetching({ queryKey: ENCOUNTERS_KEY }) > 0;
  const siteList = sites.data ?? [];

  let content: ReactNode;
  if (sites.isPending) {
    content = (
      <PanelState kind="loading" message={t('dash_reports_sites_loading')} />
    );
  } else if (sites.isError) {
    content =
      statusOf(problemOf(sites.error)) === 403 ? (
        <PanelState kind="forbidden" message={t('common_forbidden')} />
      ) : (
        <PanelState
          kind="error"
          message={t('feature_sites_error')}
          retrying={sites.isFetching}
          error={sites.error}
          onRetry={() => void sites.refetch()}
        />
      );
  } else if (siteList.length === 0) {
    content = (
      <PanelState
        kind="empty"
        icon={ClipboardDocumentListIcon}
        message={t('dash_reports_sites_empty')}
      />
    );
  } else {
    content = <SiteCountTable sites={siteList} labelledBy="reports-by-site" />;
  }

  return (
    <DashboardPage
      header={
        <PageHeader
          title={t('common_nav_reportes')}
          description={t('dash_reports_lead')}
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
          id="reports-by-site"
          title={t('dash_reports_by_site')}
          meta={<LiveNote seconds={DASHBOARD_REFRESH_MS / 1000} />}
          footer={
            sites.isSuccess && siteList.length > 0 ? (
              <>
                <span>
                  {siteList.length === 1
                    ? t('dash_sites_count_one')
                    : t('dash_sites_count', { count: siteList.length })}
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
        <PendingStrip
          id="reports-pending"
          title={t('dash_reports_pending_title')}
        >
          {t('dash_reports_pending_body')}
        </PendingStrip>
      }
    />
  );
}
