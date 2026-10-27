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
  return (
    <section aria-labelledby="timeline-title">
      <h2 id="timeline-title">Línea de tiempo</h2>
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
