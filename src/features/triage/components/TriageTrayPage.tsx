import {
  ArrowPathIcon,
  BeakerIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { Link, useSearchParams } from 'react-router';
import { useSites } from '../../../shared/hooks/useSites';
import { useI18n } from '../../../shared/i18n';
import { formatBogota } from '../../../shared/lib/datetime';
import { patientDocument, patientName } from '../../../shared/lib/labels';
import { problemOf, statusOf } from '../../../shared/lib/problem';
import { LoadError } from '../../../shared/ui/LoadError';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { ViewForbidden } from '../../../shared/ui/ViewForbidden';
import { PAGE_SIZE, useEncounters } from '../../../shared/hooks/useEncounters';
import { trayFilters, traySearch } from '../trayFilters';

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
  return (
    <section className="clinical-workspace" aria-labelledby="triage-title">
      <header className="clinical-workspace__header">
        <div>
          <h1 id="triage-title">{t('common_nav_triage')}</h1>
          <p className="muted">{t('clinical_tray_intro')}</p>
        </div>
        <button
          type="button"
          className="button button--secondary"
          disabled={tray.isFetching}
          onClick={() => void tray.refetch()}
        >
          <ArrowPathIcon aria-hidden="true" />
          {t('feature_refresh')}
        </button>
      </header>
      <div className="clinical-board">
        <section className="card" aria-labelledby="triage-pending">
          <h2 id="triage-pending" className="clinical-card-heading">
            <BeakerIcon aria-hidden="true" />
            {t('clinical_pending')}
          </h2>
          {sites.isError && (
            <LoadError
              message={t('feature_sites_error')}
              retrying={sites.isFetching}
              onRetry={() => void sites.refetch()}
            />
          )}
          <div className="toolbar">
            <div className="field">
              <label htmlFor="triage-site">{t('feature_site')}</label>
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
            </div>
          </div>
          {tray.isPending && (
            <LoadingState>{t('clinical_tray_loading')}</LoadingState>
          )}
          {tray.isError &&
            (statusOf(problemOf(tray.error)) === 403 ? (
              <ViewForbidden />
            ) : (
              <LoadError
                message={t('clinical_tray_error')}
                retrying={tray.isFetching}
                onRetry={() => void tray.refetch()}
              />
            ))}
          {tray.isSuccess &&
            (items.length === 0 ? (
              <div className="clinical-empty" role="status">
                <ClipboardDocumentListIcon aria-hidden="true" />
                <p className="muted">{t('clinical_tray_empty')}</p>
              </div>
            ) : (
              <ul className="clinical-tray">
                {items.map((encounter) => (
                  <li key={encounter.id} className="clinical-patient">
                    <div>
                      <h3>{patientName(encounter.patient)}</h3>
                      {patientDocument(encounter.patient) && (
                        <p className="muted">
                          {patientDocument(encounter.patient)}
                        </p>
                      )}
                      <p className="muted">{encounter.siteName}</p>
                      <p className="muted">
                        {t('feature_arrival')}:{' '}
                        <time dateTime={encounter.arrivalAt}>
                          {formatBogota(encounter.arrivalAt)}
                        </time>
                      </p>
                    </div>
                    <Link
                      className="button"
                      to={`/triage/${encounter.id}?${search}`}
                    >
                      {t('clinical_open')}
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
          <div className="actions clinical-pagination">
            <button
              className="button button--secondary"
              type="button"
              disabled={offset === 0 || tray.isFetching}
              onClick={() =>
                setParams(traySearch(siteId, Math.max(0, offset - PAGE_SIZE)))
              }
            >
              {t('feature_previous')}
            </button>
            <span className="muted">
              {t('clinical_page', { page: Math.floor(offset / PAGE_SIZE) + 1 })}
            </span>
            <button
              className="button button--secondary"
              type="button"
              disabled={
                !tray.isSuccess || tray.isFetching || items.length < PAGE_SIZE
              }
              onClick={() => setParams(traySearch(siteId, offset + PAGE_SIZE))}
            >
              {t('feature_next')}
            </button>
          </div>
        </section>
        <aside
          className="card clinical-summary"
          aria-labelledby="clinical-workflow-title"
        >
          <h2 id="clinical-workflow-title" className="clinical-card-heading">
            <ClipboardDocumentListIcon aria-hidden="true" />
            {t('clinical_workspace')}
          </h2>
          <p className="clinical-badge">{t('clinical_waiting_only')}</p>
          <h3>{t('clinical_workflow_title')}</h3>
          <p className="muted">{t('clinical_workflow_body')}</p>
        </aside>
      </div>
    </section>
  );
}
