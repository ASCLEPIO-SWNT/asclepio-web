import {
  ExclamationTriangleIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';
import type { PublicSite } from '../../../shared/api/client';
import { useEncounterCount } from '../../../shared/hooks/useEncounterCount';
import { useI18n } from '../../../shared/i18n';
import { indicatorOf } from '../../../shared/lib/indicator';
import { DataCell, DataRow, DataTable } from '../../../shared/ui/DataTable';
import { StatusBadge } from '../../../shared/ui/StatusBadge';

/**
 * Tabla simple de las atenciones en espera de triage por sede (R17): Sede y la cifra a la
 * derecha, una fila por sede de `useSites` y sin ningún dato de pacientes. No se apila como
 * tarjetas (`simple`). `labelledBy` es el `id` del `h2` de su panel.
 */
export function SiteCountTable({
  sites,
  labelledBy,
}: {
  sites: readonly PublicSite[];
  labelledBy: string;
}) {
  const { t } = useI18n();
  return (
    <DataTable
      labelledBy={labelledBy}
      simple
      columns={[
        { id: 'site', header: t('feature_site') },
        { id: 'waiting', header: t('dash_stat_waiting'), numeric: true },
      ]}
    >
      {sites.map((site) => (
        <SiteRow key={site.id} site={site} />
      ))}
    </DataTable>
  );
}

/**
 * Una sede: su propia petición (`status=WAITING_TRIAGE` y `siteId`, con `limit=100`), así que
 * resuelve sola la carga, la cifra («N+» con la página llena), el error y el 403 (R19 a R22).
 * Las filas no son regiones vivas: el estado vive en su celda, con icono y texto (R30).
 */
function SiteRow({ site }: { site: PublicSite }) {
  const { t } = useI18n();
  const count = useEncounterCount({
    status: 'WAITING_TRIAGE',
    siteId: site.id,
  });
  const state = indicatorOf(count);

  let figure: ReactNode;
  if (state === 'loading') {
    figure = (
      <span aria-busy="true">
        <span className="skeleton" />
        <span className="visually-hidden">{t('dash_stat_loading')}</span>
      </span>
    );
  } else if (state === 'error') {
    figure = (
      <>
        <StatusBadge tone="error" icon={ExclamationTriangleIcon}>
          {t('dash_stat_error')}
        </StatusBadge>{' '}
        <button
          type="button"
          className="button button--secondary button--sm"
          aria-label={t('dash_retry_named', { name: site.name })}
          onClick={() => void count.refetch()}
        >
          {t('common_retry')}
        </button>
      </>
    );
  } else if (state === 'forbidden') {
    figure = (
      <StatusBadge tone="error" icon={LockClosedIcon}>
        {t('dash_stat_forbidden')}
      </StatusBadge>
    );
  } else {
    figure = (
      <>
        {count.data?.count}
        {count.data?.capped && (
          <>
            <span className="summary__plus" aria-hidden="true">
              +
            </span>
            <span className="visually-hidden">
              {t('dash_at_least', { count: count.data.count })}
            </span>
          </>
        )}
      </>
    );
  }

  return (
    <DataRow>
      <DataCell>
        <span className="cell-name">{site.name}</span>
      </DataCell>
      <DataCell kind="num">{figure}</DataCell>
    </DataRow>
  );
}
