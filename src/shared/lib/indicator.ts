import { problemOf, statusOf } from './problem';

/** Estado de un indicador o de una celda (matriz de estados de `design.md`). */
export type IndicatorState = 'loading' | 'ready' | 'error' | 'forbidden';

/**
 * Estado de una consulta para pintar un indicador. El error gana a los datos antiguos (R21):
 * TanStack conserva `data` cuando falla un refresco y aquí no se presenta como actual. Un 403 es
 * «sin permiso» (R22) y los demás fallos, error.
 */
export function indicatorOf(query: {
  isError: boolean;
  isPending: boolean;
  error: unknown;
}): IndicatorState {
  if (query.isError) {
    return statusOf(problemOf(query.error)) === 403 ? 'forbidden' : 'error';
  }
  return query.isPending ? 'loading' : 'ready';
}
