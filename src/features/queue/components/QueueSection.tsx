import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { QueueItem } from '../../../shared/api/client';
import { useI18n } from '../../../shared/i18n';
import {
  formatDateBogota,
  formatTimeBogota,
} from '../../../shared/lib/datetime';
import { ENCOUNTER_STATUS_VIEW } from '../../../shared/lib/encounterStatus';
import { romanLevel } from '../../../shared/lib/level';
import { DataCell, DataRow, DataTable } from '../../../shared/ui/DataTable';
import { Panel } from '../../../shared/ui/Panel';
import { PanelState } from '../../../shared/ui/PanelState';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { patientLabel, type QueueSectionView } from '../queueView';
import { QueueWait } from './QueueWait';

/** `id` de la celda del paciente: los controles de la fila la citan con `aria-describedby`. */
export const patientCellId = (item: QueueItem) =>
  `queue-patient-${item.encounterId}`;

/**
 * Una sección de la cola (F-06-web D6): `Panel` con su `h2` y el número de filas, y una tabla con
 * las columnas de la sección o su mensaje de vacío (R7). Las filas van en el orden recibido y con
 * `key` = id de la atención, para que un refresco conserve el foco (R3, R12).
 */
export function QueueSection({
  section,
  meta,
  actions,
}: {
  section: QueueSectionView;
  /** Lo que va junto al número de filas (la hora de la cola en la primera sección). */
  meta?: ReactNode;
  /** Acciones del médico de una fila (R17), junto a «Ver atención». */
  actions?: (item: QueueItem) => ReactNode;
}) {
  const { t } = useI18n();
  const id = `queue-${section.id}`;
  const withLevel = section.id !== 'waiting';
  const withWait = section.id !== 'inCare';
  const view = ENCOUNTER_STATUS_VIEW[section.status];
  return (
    <Panel
      id={id}
      title={t(section.titleKey)}
      meta={
        <>
          <span className="queue-count">{section.items.length}</span>
          {meta}
        </>
      }
    >
      {section.items.length === 0 ? (
        <PanelState
          kind="empty"
          icon={view.icon}
          message={t(section.emptyKey)}
        />
      ) : (
        <DataTable
          labelledBy={id}
          columns={[
            { id: 'patient', header: t('feature_patient') },
            ...(withLevel
              ? [{ id: 'level', header: t('queue_col_level') }]
              : []),
            { id: 'arrival', header: t('feature_arrival') },
            ...(withWait ? [{ id: 'wait', header: t('queue_col_wait') }] : []),
            { id: 'site', header: t('feature_site') },
            { id: 'action', header: t('dash_col_action'), hiddenHeader: true },
          ]}
        >
          {section.items.map((item) => {
            const cellId = patientCellId(item);
            return (
              <DataRow key={item.encounterId}>
                <DataCell kind="main" id={cellId}>
                  <span className="cell-name">
                    {patientLabel(item.patient)}
                  </span>
                </DataCell>
                {withLevel && (
                  <DataCell label={t('queue_col_level')}>
                    {item.finalLevel !== null && (
                      <StatusBadge
                        tone="neutral"
                        icon={ClipboardDocumentCheckIcon}
                      >
                        {t('queue_level', {
                          level: romanLevel(item.finalLevel),
                        })}
                      </StatusBadge>
                    )}
                  </DataCell>
                )}
                <DataCell kind="time" label={t('feature_arrival')}>
                  <time dateTime={item.arrivalAt}>
                    {formatTimeBogota(item.arrivalAt)}
                  </time>
                  <span className="cell-sub">
                    {formatDateBogota(item.arrivalAt)}
                  </span>
                </DataCell>
                {withWait && (
                  <DataCell label={t('queue_col_wait')}>
                    <QueueWait item={item} />
                  </DataCell>
                )}
                <DataCell label={t('feature_site')}>{item.siteName}</DataCell>
                <DataCell kind="actions">
                  <div className="queue-actions">
                    <Link
                      className="button button--secondary button--sm"
                      to={`/atenciones/${item.encounterId}`}
                      aria-describedby={cellId}
                    >
                      {t('feature_encounter_view')}
                    </Link>
                    {actions?.(item)}
                  </div>
                </DataCell>
              </DataRow>
            );
          })}
        </DataTable>
      )}
    </Panel>
  );
}
