import { useEffect, useSyncExternalStore } from 'react';
import { useBlocker, type Blocker } from 'react-router';
import { session } from '../api/session';

const hasSession = () => session.getSnapshot().session !== null;

/**
 * Aviso de cambios sin guardar (UI-03-web R1–R3, D1, D3). Mientras `dirty` y la sesión siga
 * abierta, detiene la navegación interna (`useBlocker`: enlaces, menú, atrás/adelante) y pide la
 * confirmación nativa al recargar o cerrar (`beforeunload`, texto del navegador). Un cierre forzado
 * de sesión no se detiene (R3). Una sola instancia por pantalla: React Router admite un único
 * bloqueador a la vez.
 */
export function useUnsavedChanges(dirty: boolean): Blocker {
  const sessionOpen = useSyncExternalStore(
    (listener) => session.subscribe(listener),
    hasSession,
  );
  const active = dirty && sessionOpen;
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      active &&
      session.getSnapshot().session !== null &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search),
  );
  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [active]);
  // Si la navegación quedó detenida y los cambios desaparecen, se deja pasar.
  useEffect(() => {
    if (blocker.state === 'blocked' && !active) blocker.proceed();
  }, [blocker, active]);
  return blocker;
}
