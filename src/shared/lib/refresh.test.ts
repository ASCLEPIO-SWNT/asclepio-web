import { describe, expect, it } from 'vitest';
import { ApiProblemError } from './problem';
import { DASHBOARD_REFRESH_MS, autoRefresh } from './refresh';

const stateWith = (error: unknown) => ({ state: { error } });
const failure = (status: number) =>
  new ApiProblemError({ kind: 'other', status, fieldErrors: [] });

describe('UI-02-web política de refresco de los dashboards', () => {
  it('R24: las peticiones se repiten cada 30 s', () => {
    expect(DASHBOARD_REFRESH_MS).toBe(30_000);
    expect(autoRefresh().refetchInterval(stateWith(null))).toBe(30_000);
  });

  it('R25: no se repite por foco, por reconexión ni con la pestaña oculta, y no se reintenta sola', () => {
    expect(autoRefresh()).toMatchObject({
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    });
  });

  it('R22: tras un 403 el intervalo se detiene', () => {
    expect(autoRefresh().refetchInterval(stateWith(failure(403)))).toBe(false);
  });

  it('R21: tras un error de red o de servidor el intervalo sigue y el siguiente ciclo vuelve a pedir', () => {
    const { refetchInterval } = autoRefresh();
    expect(
      refetchInterval(stateWith(new ApiProblemError({ kind: 'network' }))),
    ).toBe(30_000);
    expect(refetchInterval(stateWith(failure(500)))).toBe(30_000);
    expect(refetchInterval(stateWith(failure(404)))).toBe(30_000);
  });
});
