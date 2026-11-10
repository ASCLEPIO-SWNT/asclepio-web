import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { QueueItem } from '../../../shared/api/client';
import { useI18n } from '../../../shared/i18n';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { maxWaitLabel, waitLabel } from '../queueView';

/**
 * Celda de espera (F-06-web D7; R5, R9, R10): «{n} min» con el entero de la API, el tiempo
 * máximo en «Clasificadas» y, si la API dice `overdue`, la insignia «Tiempo máximo superado» con
 * icono y texto. La web no compara la espera con el máximo ni lleva un reloj propio.
 */
export function QueueWait({ item }: { item: QueueItem }) {
  const { t } = useI18n();
  const max = maxWaitLabel(item);
  return (
    <span className="queue-wait">
      <span className="queue-wait__minutes">{waitLabel(item)}</span>
      {max !== null && <span className="queue-wait__max">{max}</span>}
      {item.overdue && (
        <StatusBadge tone="error" icon={ExclamationTriangleIcon}>
          {t('queue_overdue')}
        </StatusBadge>
      )}
    </span>
  );
}
