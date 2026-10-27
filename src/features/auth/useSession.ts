import { useSyncExternalStore } from 'react';
import { session, type SessionSnapshot } from '../../shared/api/session';

/** Sesión guardada y motivo del último cierre, leídos del almacén de D2. */
export function useSession(): SessionSnapshot {
  return useSyncExternalStore(
    (listener) => session.subscribe(listener),
    () => session.getSnapshot(),
  );
}
