import { featureMessage } from '../../../shared/lib/featureMessages';
import { useI18n } from '../../../shared/i18n';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { Link } from 'react-router';
import type { EncounterStatus } from '../../../shared/api/client';
import { SITES_ERROR_MESSAGE, useSites } from '../../../shared/hooks/useSites';
import {
  formatDateBogota,
  formatTimeBogota,
} from '../../../shared/lib/datetime';
import {
  ENCOUNTER_STATUS_LABELS,
  ENCOUNTER_STATUSES,
  ORIGIN_LABELS,
  patientDocument,
  patientName,
} from '../../../shared/lib/labels';
import { problemOf, statusOf } from '../../../shared/lib/problem';
import { DashboardPage } from '../../../shared/ui/DashboardPage';
import { DataCell, DataRow, DataTable } from '../../../shared/ui/DataTable';
import { EncounterStatusBadge } from '../../../shared/ui/EncounterStatusBadge';
import { LoadError } from '../../../shared/ui/LoadError';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';
import { ViewForbidden } from '../../../shared/ui/ViewForbidden';
import { PAGE_SIZE, useEncounters } from '../../../shared/hooks/useEncounters';

const RESULTS_ID = 'encounters-results';

/**
 * `/atenciones`: lista filtrable por estado y sede, paginada por `offset` (R28–R30, D7, D13), con
 * la estructura de los dashboards de UI-02 (UI-04-web R3, R7: D2, D3, D4).
 */
export function EncounterListPage() {
  const { t } = useI18n();
  const sites = useSites();
  const [status, setStatus] = useState<EncounterStatus | ''>('');
  const [siteId, setSiteId] = useState('');
  const [offset, setOffset] = useState(0);
  const list = useEncounters({
    status: status || null,
    siteId: siteId || null,
    offset,
  });
  const items = list.data?.items ?? [];

  let content;
  if (list.isPending) {
    content = (
      <div className="panel-state">
        <LoadingState>{t('feature_encounters_loading')}</LoadingState>
      </div>
    );
  } else if (list.isError) {
    content =
      statusOf(problemOf(list.error)) === 403 ? (
        <ViewForbidden />
      ) : (
        <LoadError
          message={t('feature_encounters_error')}
          retrying={list.isFetching}
          error={list.error}
          onRetry={() => void list.refetch()}
        />
      );
  } else if (items.length === 0) {
    content = (
      <div className="panel-state">
        <p className="muted">{t('feature_encounters_empty')}</p>
      </div>
    );
  } else {
    content = (
      <DataTable
        labelledBy={RESULTS_ID}
        columns={[
          { id: 'patient', header: t('feature_patient') },
          { id: 'site', header: t('feature_site') },
          { id: 'arrival', header: t('feature_arrival') },
          { id: 'status', header: t('feature_status') },
          { id: 'origin', header: t('feature_origin') },
          { id: 'action', header: t('dash_col_action'), hiddenHeader: true },
        ]}
      >
        {items.map((encounter) => {
          const nameId = `encounters-patient-${encounter.id}`;
          const documentText = patientDocument(encounter.patient);
          return (
            <DataRow key={encounter.id}>
              <DataCell kind="main">
                {/* «Ver atención» se describe solo con el nombre, sin el documento. */}
                <span className="cell-name" id={nameId}>
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
              <DataCell label={t('feature_status')}>
                <EncounterStatusBadge status={encounter.status} />
              </DataCell>
              <DataCell label={t('feature_origin')}>
                {ORIGIN_LABELS[encounter.origin]}
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
          title={t('feature_encounters')}
          description={t('feature_encounters_lead')}
        />
      }
      summary={
        <div>
          {sites.isError && (
            <LoadError
              message={featureMessage(SITES_ERROR_MESSAGE)}
              retrying={sites.isFetching}
              error={sites.error}
              onRetry={() => void sites.refetch()}
            />
          )}
          <div className="toolbar">
            <div className="field">
              <label htmlFor="encounters-status">{t('feature_status')}</label>
              <select
                id="encounters-status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as EncounterStatus | '');
                  setOffset(0);
                }}
              >
                <option value="">{t('feature_statuses_all')}</option>
                {ENCOUNTER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ENCOUNTER_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="encounters-site">{t('feature_site')}</label>
              <select
                id="encounters-site"
                value={siteId}
                disabled={!sites.isSuccess}
                onChange={(event) => {
                  setSiteId(event.target.value);
                  setOffset(0);
                }}
              >
                <option value="">{t('feature_sites_all')}</option>
                {sites.data?.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      }
      main={
        <Panel
          id={RESULTS_ID}
          title={t('feature_encounters_results')}
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
                  onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                >
                  <ChevronLeftIcon aria-hidden="true" />
                  {t('feature_previous')}
                </button>
                <button
                  className="button button--secondary button--sm"
                  type="button"
                  disabled={!list.isSuccess || items.length < PAGE_SIZE}
                  onClick={() => setOffset((o) => o + PAGE_SIZE)}
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
