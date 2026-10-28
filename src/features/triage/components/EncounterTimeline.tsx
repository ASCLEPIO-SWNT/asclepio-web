import { useI18n } from '../../../shared/i18n';
import type { EncounterEvent } from '../../../shared/api/client';
import { formatBogota } from '../../../shared/lib/datetime';
import {
  actorLabel,
  eventLabel,
  statusLabel,
} from '../../../shared/lib/labels';

/**
 * Línea de tiempo (R32, D12): en el orden de la API, sin reordenar, con los tipos
 * desconocidos tolerados y sin mostrar `payload`.
 */
export function EncounterTimeline({ events }: { events: EncounterEvent[] }) {
  const { t } = useI18n();
  return (
    <section aria-labelledby="timeline-title">
      <h2 id="timeline-title">{t('feature_timeline')}</h2>
      <ol className="timeline">
        {events.map((event) => (
          <li key={event.id}>
            <time dateTime={event.occurredAt}>
              {formatBogota(event.occurredAt)}
            </time>{' '}
            · <strong>{eventLabel(event.type)}</strong>
            {event.type === 'STATUS_CHANGED' && (
              <>
                {' '}
                ({statusLabel(event.fromStatus)} → {statusLabel(event.toStatus)}
                )
              </>
            )}{' '}
            · {actorLabel(event.actor)}
          </li>
        ))}
      </ol>
    </section>
  );
}
