import { problemOf, statusOf } from './problem';

/** Repetición de las peticiones de los dashboards (D14, D17): valor técnico, no clínico. */
export const DASHBOARD_REFRESH_MS = 30_000;

/**
 * Opciones de sondeo comunes a todas las peticiones de un dashboard (R24, R25, R22): repite
 * cada 30 s solo con la pestaña visible, no repite por foco ni por reconexión y no reintenta
 * sola. Una respuesta 403 detiene el intervalo (solo «Actualizar» o «Reintentar» la repiten);
 * un error de red o de servidor no: el siguiente ciclo vuelve a pedir.
 */
export function autoRefresh() {
  return {
    refetchInterval: (query: { state: { error: unknown } }) =>
      statusOf(problemOf(query.state.error)) === 403
        ? (false as const)
        : DASHBOARD_REFRESH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  } as const;
}
