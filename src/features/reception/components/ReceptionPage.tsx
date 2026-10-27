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
      <h1 id="reception-title">Recepción — bandeja de pre-registros</h1>
      <p>
        <Link to="/recepcion/registro">Registro directo</Link>
      </p>

      {sites.isError && (
        <LoadError
          message={SITES_ERROR_MESSAGE}
          retrying={sites.isFetching}
          onRetry={() => void sites.refetch()}
        />
      )}

      <div className="toolbar">
        <div className="field">
          <label htmlFor="tray-site">Sede</label>
          <select
            id="tray-site"
            value={siteId}
            disabled={!sites.isSuccess}
            onChange={(event) => setSiteId(event.target.value)}
          >
            <option value="">Todas las sedes</option>
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
          Actualizar
        </button>
      </div>

      {notice?.kind === 'confirmed' && (
        <Notice>
          Llegada confirmada. Hora de llegada:{' '}
          {formatBogota(notice.encounter.arrivalAt)}.{' '}
          <Link to={`/atenciones/${notice.encounter.id}`}>Ver atención</Link>
        </Notice>
      )}
      {notice?.kind === 'rejected' && <Notice>Pre-registro rechazado.</Notice>}
      {orphanError && <ActionError>{orphanError}</ActionError>}

      {tray.isPending && <LoadingState>Cargando la bandeja…</LoadingState>}
      {tray.isError &&
        (statusOf(problemOf(tray.error)) === 403 ? (
          <ViewForbidden />
        ) : (
          <LoadError
            message="No se pudo cargar la bandeja."
            retrying={tray.isFetching}
            onRetry={() => void tray.refetch()}
          />
        ))}
      {tray.isSuccess && items.length === 0 && (
        <p className="muted">No hay pre-registros pendientes.</p>
      )}
      {tray.isSuccess && items.length > 0 && (
        <ul className="cards" aria-label="Pre-registros pendientes">
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
