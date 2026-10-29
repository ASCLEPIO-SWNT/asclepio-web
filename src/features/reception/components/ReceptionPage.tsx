import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import { useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { Encounter } from '../../../shared/api/client';
import { useEncounterCount } from '../../../shared/hooks/useEncounterCount';
import { ENCOUNTERS_KEY } from '../../../shared/hooks/useEncounters';
import { SITES_ERROR_MESSAGE, useSites } from '../../../shared/hooks/useSites';
import { useI18n } from '../../../shared/i18n';
import { formatDateTimeBogota } from '../../../shared/lib/datetime';
import { ENCOUNTER_STATUS_VIEW } from '../../../shared/lib/encounterStatus';
import { featureMessage } from '../../../shared/lib/featureMessages';
import { indicatorOf } from '../../../shared/lib/indicator';
import { problemOf, statusOf } from '../../../shared/lib/problem';
import { DASHBOARD_REFRESH_MS } from '../../../shared/lib/refresh';
import { ActionError } from '../../../shared/ui/ActionError';
import { DashboardPage } from '../../../shared/ui/DashboardPage';
import { LiveNote } from '../../../shared/ui/LiveNote';
import { Notice } from '../../../shared/ui/Notice';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Panel } from '../../../shared/ui/Panel';
import { PanelState } from '../../../shared/ui/PanelState';
import { RefreshButton } from '../../../shared/ui/RefreshButton';
import { SummaryBar } from '../../../shared/ui/SummaryBar';
import { SummaryCell } from '../../../shared/ui/SummaryCell';
import { SummaryFilter } from '../../../shared/ui/SummaryFilter';
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

/**
 * `/recepcion`: dashboard de recepción (UI-02-web R9–R12). Barra de resumen con los preregistros
 * pendientes (la longitud de la bandeja, sin petición propia), las atenciones en espera de
 * triage y el filtro «Sede»; panel con la bandeja de preregistros, que se confirman o se
 * rechazan con el comportamiento de F-02-web (R4–R16). Todo se repite cada 30 s y con
 * «Actualizar».
 */
export function ReceptionPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const sites = useSites();
  const [siteId, setSiteId] = useState('');
  const tray = usePendingPreRegistrations(siteId || null);
  const waiting = useEncounterCount({
    status: 'WAITING_TRIAGE',
    siteId: siteId || null,
  });
  const [notice, setNotice] = useState<TrayNotice | null>(null);
  const [actionError, setActionError] = useState<TrayActionError | null>(null);

  const refreshTray = () =>
    void queryClient.invalidateQueries({ queryKey: PRE_REGISTRATIONS_KEY });
  // Confirmar una llegada crea una atención en espera: el indicador de espera se pide de nuevo.
  const refreshEncounters = () =>
    void queryClient.invalidateQueries({ queryKey: ENCOUNTERS_KEY });
  const refreshAll = () => {
    void tray.refetch();
    void waiting.refetch();
  };

  const items = tray.data ?? [];
  // Si la tarjeta que lanzó la acción ya no está (p. ej. tras un 409), el error se muestra arriba.
  const orphanError =
    actionError && !items.some((p) => p.id === actionError.preRegistrationId)
      ? actionError.message
      : null;
  const waitingView = ENCOUNTER_STATUS_VIEW.WAITING_TRIAGE;

  let content: ReactNode;
  if (tray.isPending) {
    content = <PanelState kind="loading" message={t('feature_tray_loading')} />;
  } else if (tray.isError) {
    content =
      statusOf(problemOf(tray.error)) === 403 ? (
        <PanelState kind="forbidden" message={t('common_forbidden')} />
      ) : (
        <PanelState
          kind="error"
          message={t('feature_tray_error')}
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
        message={t('feature_tray_empty')}
        hint={t('dash_reception_empty_hint')}
        action={
          <Link className="link-more" to="/recepcion/registro">
            {t('dash_reception_empty_action')}
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        }
      />
    );
  } else {
    content = (
      <ul className="prereg-grid" aria-label={t('feature_tray_pending')}>
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
                refreshEncounters();
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
    );
  }

  return (
    <DashboardPage
      header={
        <PageHeader
          title={t('common_nav_recepcion')}
          description={t('dash_reception_lead')}
          actions={
            <>
              <RefreshButton
                onRefresh={refreshAll}
                busy={tray.isFetching || waiting.isFetching}
              />
              <Link className="button" to="/recepcion/registro">
                <UserPlusIcon aria-hidden="true" />
                {t('feature_registration_direct')}
              </Link>
            </>
          }
        />
      }
      summary={
        <SummaryBar
          filter={
            <SummaryFilter
              id="tray-site"
              label={t('feature_site')}
              error={
                sites.isError
                  ? {
                      message: featureMessage(SITES_ERROR_MESSAGE),
                      retrying: sites.isFetching,
                      cause: sites.error,
                      onRetry: () => void sites.refetch(),
                    }
                  : undefined
              }
            >
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
            </SummaryFilter>
          }
        >
          <SummaryCell
            label={t('dash_stat_preregistered')}
            icon={ClipboardDocumentListIcon}
            tone="accent"
            state={indicatorOf(tray)}
            value={tray.data?.length}
            onRetry={() => void tray.refetch()}
          />
          <SummaryCell
            label={t('dash_stat_waiting')}
            icon={waitingView.icon}
            tone={waitingView.tone}
            state={indicatorOf(waiting)}
            value={waiting.data?.count}
            capped={waiting.data?.capped}
            onRetry={() => void waiting.refetch()}
          />
        </SummaryBar>
      }
      main={
        <Panel
          id="reception-tray"
          title={t('feature_tray_pending')}
          meta={<LiveNote seconds={DASHBOARD_REFRESH_MS / 1000} />}
        >
          {notice?.kind === 'confirmed' && (
            <Notice icon={CheckCircleIcon}>
              {t('feature_arrival_confirmed')}{' '}
              {formatDateTimeBogota(notice.encounter.arrivalAt)}{' '}
              <Link to={`/atenciones/${notice.encounter.id}`}>
                {t('feature_encounter_view')}
              </Link>
            </Notice>
          )}
          {notice?.kind === 'rejected' && (
            <Notice icon={CheckCircleIcon}>{t('feature_pr_rejected')}</Notice>
          )}
          {orphanError && (
            <ActionError>{featureMessage(orphanError)}</ActionError>
          )}
          {content}
        </Panel>
      }
    />
  );
}
