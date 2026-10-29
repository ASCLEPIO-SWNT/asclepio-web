import { featureMessage } from '../../../shared/lib/featureMessages';
import { useI18n } from '../../../shared/i18n';
import { useState } from 'react';
import { Link } from 'react-router';
import type { EncounterStatus } from '../../../shared/api/client';
import { SITES_ERROR_MESSAGE, useSites } from '../../../shared/hooks/useSites';
import { formatBogota } from '../../../shared/lib/datetime';
import {
  ENCOUNTER_STATUS_LABELS,
  ENCOUNTER_STATUSES,
  ORIGIN_LABELS,
  patientDocument,
  patientName,
} from '../../../shared/lib/labels';
import { problemOf, statusOf } from '../../../shared/lib/problem';
import { LoadError } from '../../../shared/ui/LoadError';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { ViewForbidden } from '../../../shared/ui/ViewForbidden';
import { PAGE_SIZE, useEncounters } from '../../../shared/hooks/useEncounters';

/** `/atenciones`: lista filtrable por estado y sede, paginada por `offset` (R28–R30, D7, D13). */
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

  return (
    <section className="card" aria-labelledby="encounters-title">
      <h1 id="encounters-title">{t('feature_encounters')}</h1>

      {sites.isError && (
        <LoadError
          message={featureMessage(SITES_ERROR_MESSAGE)}
          retrying={sites.isFetching}
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

      {list.isPending && (
        <LoadingState>{t('feature_encounters_loading')}</LoadingState>
      )}
      {list.isError &&
        (statusOf(problemOf(list.error)) === 403 ? (
          <ViewForbidden />
        ) : (
          <LoadError
            message={t('feature_encounters_error')}
            retrying={list.isFetching}
            onRetry={() => void list.refetch()}
          />
        ))}
      {list.isSuccess && items.length === 0 && (
        <p className="muted">{t('feature_encounters_empty')}</p>
      )}
      {list.isSuccess && items.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">{t('feature_arrival')}</th>
                <th scope="col">{t('feature_patient')}</th>
                <th scope="col">{t('feature_document')}</th>
                <th scope="col">{t('feature_site')}</th>
                <th scope="col">{t('feature_status')}</th>
                <th scope="col">{t('feature_origin')}</th>
                <th scope="col">
                  <span className="visually-hidden">{t('feature_detail')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((encounter) => (
                <tr key={encounter.id}>
                  <td>{formatBogota(encounter.arrivalAt)}</td>
                  <td>{patientName(encounter.patient)}</td>
                  <td>{patientDocument(encounter.patient) ?? '—'}</td>
                  <td>{encounter.siteName}</td>
                  <td>{ENCOUNTER_STATUS_LABELS[encounter.status]}</td>
                  <td>{ORIGIN_LABELS[encounter.origin]}</td>
                  <td>
                    <Link to={`/atenciones/${encounter.id}`}>
                      {t('feature_encounter_view')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="actions">
        <button
          type="button"
          className="button"
          disabled={offset === 0}
          onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
        >
          {t('feature_previous')}
        </button>
        <button
          type="button"
          className="button"
          disabled={!list.isSuccess || items.length < PAGE_SIZE}
          onClick={() => setOffset((o) => o + PAGE_SIZE)}
        >
          {t('feature_next')}
        </button>
      </div>
    </section>
  );
}
