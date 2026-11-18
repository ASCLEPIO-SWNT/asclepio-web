import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { QueueItem } from '../../../shared/api/client';
import { useI18n } from '../../../shared/i18n';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { maxWaitLabel, sinceTriageLabel, waitLabel } from '../queueView';

/**
 * Celda de espera (F-06-web D7; R5, R9, R10): «{n} min» con el entero de la API, el tiempo desde
 * la clasificación y el tiempo máximo en «Clasificadas» (DT-02-web D4, D5) y, si la API dice
 * `overdue`, la insignia «Tiempo máximo superado» con icono, texto visible y un texto accesible
 * que dice «desde la clasificación» (DT-02-web D6). La web no compara tiempos con el máximo ni
 * lleva un reloj propio.
 */
export function QueueWait({ item }: { item: QueueItem }) {
  const { t } = useI18n();
  const since = sinceTriageLabel(item);
  const max = maxWaitLabel(item);
  return (
    <span className="queue-wait">
      <span className="queue-wait__minutes">{waitLabel(item)}</span>
      {since !== null && <span className="queue-wait__since">{since}</span>}
      {max !== null && <span className="queue-wait__max">{max}</span>}
      {item.overdue && (
        <StatusBadge tone="error" icon={ExclamationTriangleIcon}>
          <span aria-hidden="true">{t('queue_overdue')}</span>
          <span className="visually-hidden">{t('queue_overdue_a11y')}</span>
        </StatusBadge>
      )}
    </span>
  );
}
