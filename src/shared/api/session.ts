/**
 * Almacén de la sesión (design.md D1, D2, D12). Sin React: lo usan el middleware de
 * `client.ts` y, vía `useSyncExternalStore`, la feature de auth y el router.
 *
 * Solo se guarda `{ accessToken, expiresAt }` en sessionStorage bajo una clave (R10).
 * El motivo del último cierre vive en memoria, nunca en la URL ni en el almacenamiento.
 */
export const SESSION_KEY = 'asclepio.session';

export interface StoredSession {
  accessToken: string;
  expiresAt: string;
}

export type EndReason = 'expired' | 'patient' | 'logout';

export interface SessionSnapshot {
  session: StoredSession | null;
  endReason: EndReason | null;
}

let snapshot: SessionSnapshot = { session: null, endReason: null };
const listeners = new Set<() => void>();

function emit(next: SessionSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function storage(): Storage | null {
  try {
    return globalThis.sessionStorage;
  } catch {
    return null;
  }
}

/** Interpreta lo guardado; devuelve null si falta, está corrupto o vencido (R12). */
function parse(raw: string | null): StoredSession | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const { accessToken, expiresAt } = value as Record<string, unknown>;
  if (typeof accessToken !== 'string' || accessToken === '') return null;
  if (typeof expiresAt !== 'string') return null;
  const expires = Date.parse(expiresAt);
  if (Number.isNaN(expires) || expires <= Date.now()) return null;
  return { accessToken, expiresAt };
}

export const session = {
  getSnapshot(): SessionSnapshot {
    return snapshot;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Lee sessionStorage al cargar la web; descarta sin llamar a la API lo inválido (R12). */
  restore(): void {
    const store = storage();
    const restored = parse(store?.getItem(SESSION_KEY) ?? null);
    if (!restored) store?.removeItem(SESSION_KEY);
    if (restored?.accessToken !== snapshot.session?.accessToken) {
      emit({ session: restored, endReason: snapshot.endReason });
    }
  },

  /** Guarda la sesión recibida del login: solo accessToken y expiresAt (R10). */
  set({
    accessToken,
    expiresAt,
  }: StoredSession & { tokenType?: string }): void {
    const value: StoredSession = { accessToken, expiresAt };
    storage()?.setItem(SESSION_KEY, JSON.stringify(value));
    emit({ session: value, endReason: null });
  },

  /** Borra la sesión guardada y recuerda en memoria el motivo (D12). */
  clear(reason: EndReason | null = null): void {
    storage()?.removeItem(SESSION_KEY);
    if (snapshot.session === null && snapshot.endReason === reason) return;
    emit({ session: null, endReason: reason });
  },

  /** Olvida el motivo del último cierre (al volver a intentar el login). */
  dismissEndReason(): void {
    if (snapshot.endReason !== null) emit({ ...snapshot, endReason: null });
  },
};
