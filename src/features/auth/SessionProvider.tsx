import { useQueryClient } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { session } from '../../shared/api/session';
import { useMe } from './hooks/useMe';
import { useSession } from './useSession';

const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/**
 * Arranque y fin de la sesión (design.md "Flujo de arranque", D4, D5, D9).
 * Cualquier `session.clear()` aplica aquí los efectos de "cerrar la sesión".
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  // R12 / UI-03-web R26 (D18): sessionStorage ya se leyó una vez en main.tsx, fuera del render.
  const { session: current } = useSession();
  const me = useMe();

  // Cerrar la sesión (efectos): vaciar la caché de TanStack Query al quedar sin sesión.
  useEffect(() => {
    let previous = session.getSnapshot().session;
    return session.subscribe(() => {
      const next = session.getSnapshot().session;
      if (previous && !next) queryClient.clear();
      previous = next;
    });
  }, [queryClient]);

  // R17 / D5: un token de paciente no abre la web.
  useEffect(() => {
    if (me.data?.kind === 'PATIENT') session.clear('patient');
  }, [me.data]);

  // R14 / D9: temporizador a expiresAt, recalculado al volver la pestaña a primer plano.
  useEffect(() => {
    if (!current) return;
    const expiresAt = Date.parse(current.expiresAt);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        session.clear('expired');
        return;
      }
      // setTimeout admite como máximo 2^31-1 ms; si falta más, se reprograma al vencer.
      timer = setTimeout(schedule, Math.min(remaining, MAX_TIMEOUT_MS));
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') schedule();
    };
    schedule();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [current]);

  return children;
}
