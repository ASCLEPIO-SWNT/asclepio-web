/**
 * Avisos que viajan en el estado de navegación (D14 de F-02-web): nunca en la URL y sin
 * datos personales. Lo emite recepción y lo muestra el detalle de la atención (R26).
 */
export const ARRIVAL_REGISTERED_NOTICE = 'arrival-registered';

export function noticeOf(state: unknown): string | null {
  if (typeof state !== 'object' || state === null) return null;
  const notice = (state as { notice?: unknown }).notice;
  return typeof notice === 'string' ? notice : null;
}
