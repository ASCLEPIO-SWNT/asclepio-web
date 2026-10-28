import { featureMessage } from '../../../shared/lib/featureMessages';
import { useI18n } from '../../../shared/i18n';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import type { Encounter } from '../../../shared/api/client';
import { SITES_ERROR_MESSAGE, useSites } from '../../../shared/hooks/useSites';
import { formatBogota } from '../../../shared/lib/datetime';
import { problemOf, statusOf } from '../../../shared/lib/problem';
import { ActionError } from '../../../shared/ui/ActionError';
import { LoadError } from '../../../shared/ui/LoadError';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { Notice } from '../../../shared/ui/Notice';
import { ViewForbidden } from '../../../shared/ui/ViewForbidden';
import {
  PRE_REGISTRATIONS_KEY,
  usePendingPreRegistrations,
} from '../hooks/usePendingPreRegistrations';
import { PreRegistrationCard } from './PreRegistrationCard';

type TrayNotice =
  | { kind: 'confirmed'; encounter: Pick<Encounter, 'id' | 'arrivalAt'> }
  | { kind: 'rejected' };

interface TrayActionError {
  preRegistrationId: string;
  message: string;
}

/** `/recepcion`: bandeja de pre-registros con confirmación y rechazo (R4–R16). */
export function ReceptionPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const sites = useSites();
  const [siteId, setSiteId] = useState('');
  const tray = usePendingPreRegistrations(siteId || null);
  const [notice, setNotice] = useState<TrayNotice | null>(null);
  const [actionError, setActionError] = useState<TrayActionError | null>(null);

  const refreshTray = () =>
    void queryClient.invalidateQueries({ queryKey: PRE_REGISTRATIONS_KEY });

  const items = tray.data ?? [];
  // Si la tarjeta que lanzó la acción ya no está (p. ej. tras un 409), el error se muestra arriba.
  const orphanError =
    actionError && !items.some((p) => p.id === actionError.preRegistrationId)
      ? actionError.message
      : null;

  return (
    <section className="card" aria-labelledby="reception-title">
      <h1 id="reception-title">{t('feature_reception_title')}</h1>
      <p>
        <Link to="/recepcion/registro">{t('feature_registration_direct')}</Link>
      </p>

      {sites.isError && (
        <LoadError
          message={featureMessage(SITES_ERROR_MESSAGE)}
          retrying={sites.isFetching}
          onRetry={() => void sites.refetch()}
        />
      )}

      <div className="toolbar">
        <div className="field">
          <label htmlFor="tray-site">{t('feature_site')}</label>
          <select
            id="tray-site"
            value={siteId}
            disabled={!sites.isSuccess}
            onChange={(event) => setSiteId(event.target.value)}
          >
            <option value="">{t('feature_sites_all')}</option>
            {sites.data?.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="button"
          disabled={tray.isFetching}
          onClick={() => void tray.refetch()}
        >
          {t('feature_refresh')}
        </button>
      </div>

      {notice?.kind === 'confirmed' && (
        <Notice>
          {t('feature_arrival_confirmed')}{' '}
          {formatBogota(notice.encounter.arrivalAt)}.{' '}
          <Link to={`/atenciones/${notice.encounter.id}`}>
            {t('feature_encounter_view')}
          </Link>
        </Notice>
      )}
      {notice?.kind === 'rejected' && (
        <Notice>{t('feature_pr_rejected')}</Notice>
      )}
      {orphanError && <ActionError>{featureMessage(orphanError)}</ActionError>}

      {tray.isPending && (
        <LoadingState>{t('feature_tray_loading')}</LoadingState>
      )}
      {tray.isError &&
        (statusOf(problemOf(tray.error)) === 403 ? (
          <ViewForbidden />
        ) : (
          <LoadError
            message={t('feature_tray_error')}
            retrying={tray.isFetching}
            onRetry={() => void tray.refetch()}
          />
        ))}
      {tray.isSuccess && items.length === 0 && (
        <p className="muted">{t('feature_tray_empty')}</p>
      )}
      {tray.isSuccess && items.length > 0 && (
        <ul className="cards" aria-label={t('feature_tray_pending')}>
          {items.map((preRegistration) => (
            <li key={preRegistration.id}>
              <PreRegistrationCard
                preRegistration={preRegistration}
                error={
                  actionError?.preRegistrationId === preRegistration.id
                    ? actionError.message
                    : null
                }
                onStart={() => {
                  setNotice(null);
                  setActionError(null);
                }}
                onConfirmed={(encounter) => {
                  setNotice({ kind: 'confirmed', encounter });
                  refreshTray();
                }}
                onRejected={() => {
                  setNotice({ kind: 'rejected' });
                  refreshTray();
                }}
                onFailed={(message, refresh) => {
                  setActionError({
                    preRegistrationId: preRegistration.id,
                    message,
                  });
                  if (refresh) refreshTray();
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
