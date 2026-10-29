import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { PAGE_SIZE, useEncounters } from '../../../shared/hooks/useEncounters';
import { useSites } from '../../../shared/hooks/useSites';
import { useI18n } from '../../../shared/i18n';
import { countOf } from '../../../shared/lib/counts';
import {
  formatDateBogota,
  formatTimeBogota,
} from '../../../shared/lib/datetime';
import { ENCOUNTER_STATUS_VIEW } from '../../../shared/lib/encounterStatus';
import { indicatorOf } from '../../../shared/lib/indicator';
import { patientDocument, patientName } from '../../../shared/lib/labels';
import { problemOf, statusOf } from '../../../shared/lib/problem';
import { DASHBOARD_REFRESH_MS } from '../../../shared/lib/refresh';
import { DashboardPage } from '../../../shared/ui/DashboardPage';
import { DataCell, DataRow, DataTable } from '../../../shared/ui/DataTable';
import { LiveNote } from '../../../shared/ui/LiveNote';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';
import { PanelState } from '../../../shared/ui/PanelState';
import { RefreshButton } from '../../../shared/ui/RefreshButton';
import { SummaryBar } from '../../../shared/ui/SummaryBar';
import { SummaryCell } from '../../../shared/ui/SummaryCell';
import { SummaryFilter } from '../../../shared/ui/SummaryFilter';
import { trayFilters, traySearch } from '../trayFilters';

/**
 * `/triage`: dashboard de enfermería (UI-02-web R13 y R14). Barra de resumen con el indicador «En
 * espera de triage», que sale de la propia bandeja (`offset` más las atenciones recibidas, sin
 * petición adicional) y el filtro «Sede»; panel con la tabla de atenciones pendientes, páginas
 * de 50, `siteId` y `offset` en la URL y acceso a la captura clínica de cada una. La bandeja se
 * repite cada 30 s con la pestaña visible y con «Actualizar»; un refresco conserva las filas, el
 * foco y la paginación (R23, R37).
 */
export function TriageTrayPage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const { siteId, offset } = trayFilters(params);
  const sites = useSites();
  const tray = useEncounters(
    { status: 'WAITING_TRIAGE', siteId, offset },
    { refresh: true },
  );
  const items = tray.data?.items ?? [];
  const search = traySearch(siteId, offset);
  const waiting = tray.data
    ? countOf(items.length, offset, PAGE_SIZE)
    : undefined;
  const waitingView = ENCOUNTER_STATUS_VIEW.WAITING_TRIAGE;

  let content: ReactNode;
  if (tray.isPending) {
    content = (
      <PanelState kind="loading" message={t('clinical_tray_loading')} />
    );
  } else if (tray.isError) {
    content =
      statusOf(problemOf(tray.error)) === 403 ? (
        <PanelState kind="forbidden" message={t('common_forbidden')} />
      ) : (
        <PanelState
          kind="error"
          message={t('clinical_tray_error')}
          retrying={tray.isFetching}
          error={tray.error}
          onRetry={() => void tray.refetch()}
        />
      );
  } else if (items.length === 0) {
    content = (
      <PanelState
        kind="empty"
        icon={ClipboardDocumentListIcon}
        message={t('clinical_tray_empty')}
        hint={t('dash_triage_empty_hint')}
      />
    );
  } else {
    content = (
      <DataTable
        labelledBy="triage-pending"
        columns={[
          { id: 'patient', header: t('feature_patient') },
          { id: 'site', header: t('feature_site') },
          { id: 'arrival', header: t('feature_arrival') },
          { id: 'action', header: t('dash_col_action'), hiddenHeader: true },
        ]}
      >
        {items.map((encounter) => {
          const nameId = `triage-patient-${encounter.id}`;
          const documentText = patientDocument(encounter.patient);
          return (
            <DataRow key={encounter.id}>
              <DataCell kind="main" id={nameId}>
                <span className="cell-name">
                  {patientName(encounter.patient)}
                </span>
                {documentText && (
                  <span className="cell-sub">{documentText}</span>
                )}
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
              <DataCell kind="actions">
                <Link
                  className="button button--soft button--sm"
                  to={`/triage/${encounter.id}?${search}`}
                  aria-describedby={nameId}
                >
                  {t('clinical_open')}
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
          title={t('common_nav_triage')}
          description={t('clinical_tray_intro')}
          actions={
            <RefreshButton
              onRefresh={() => void tray.refetch()}
              busy={tray.isFetching}
            />
          }
        />
      }
      summary={
        <SummaryBar
          filter={
            <SummaryFilter
              id="triage-site"
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
                id="triage-site"
                value={siteId ?? ''}
                disabled={!sites.isSuccess}
                onChange={(event) =>
                  setParams(traySearch(event.target.value || null, 0))
                }
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
          <SummaryCell
            label={t('dash_stat_waiting')}
            icon={waitingView.icon}
            tone={waitingView.tone}
            state={indicatorOf(tray)}
            value={waiting?.count}
            capped={waiting?.capped}
            onRetry={() => void tray.refetch()}
          />
        </SummaryBar>
      }
      main={
        <Panel
          id="triage-pending"
          title={t('clinical_pending')}
          meta={<LiveNote seconds={DASHBOARD_REFRESH_MS / 1000} />}
          footer={
            <>
              <span>
                {t('clinical_page', {
                  page: Math.floor(offset / PAGE_SIZE) + 1,
                })}
              </span>
              <span className="pager">
                <button
                  className="button button--secondary button--sm"
                  type="button"
                  disabled={offset === 0}
                  onClick={() =>
                    setParams(
                      traySearch(siteId, Math.max(0, offset - PAGE_SIZE)),
                    )
                  }
                >
                  <ChevronLeftIcon aria-hidden="true" />
                  {t('feature_previous')}
                </button>
                <button
                  className="button button--secondary button--sm"
                  type="button"
                  disabled={!tray.isSuccess || items.length < PAGE_SIZE}
                  onClick={() =>
                    setParams(traySearch(siteId, offset + PAGE_SIZE))
                  }
                >
                  {t('feature_next')}
                  <ChevronRightIcon aria-hidden="true" />
                </button>
              </span>
            </>
          }
        >
          {content}
        </Panel>
      }
    />
  );
}
