import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DASHBOARD_REFRESH_MS } from '../../../shared/lib/refresh';
import {
  SITE_SUR,
  deferred,
  fakeApi,
  networkError,
  problem,
} from '../../../test/fakeApi';
import type { ReportPeriod } from '../reportsView';
import {
  GET_SUMMARY,
  summaryResponse,
  summaryWithData,
} from '../testing/reportFixtures';
import { REPORTS_KEY, useReportSummary } from './useReportSummary';

/** Valores por defecto con reintentos: el hook debe desactivarlos por sí mismo. */
function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: 2, retryDelay: 0 } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

const PERIOD: ReportPeriod = {
  from: '2026-11-05',
  to: '2026-11-11',
  siteId: null,
};

const intervalOf = (client: QueryClient, key: readonly unknown[]) => {
  const query = client.getQueryCache().find({ queryKey: key })!;
  const interval = (query.options as Record<string, unknown>)
    .refetchInterval as (query: unknown) => unknown;
  return interval(query);
};

afterEach(() => vi.unstubAllGlobals());

describe('F-07-web consulta del resumen', () => {
  it("R2: sin sede hace un único GET /reports/summary solo con from y to, con la clave ['reports','summary',from,to,'all']", async () => {
    const net = fakeApi({ [GET_SUMMARY]: summaryResponse() });
    const { client, wrapper } = setup();
    const hook = renderHook(() => useReportSummary(PERIOD), { wrapper });
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(REPORTS_KEY).toEqual(['reports']);
    expect(net.requests).toHaveLength(1);
    expect(net.calls(GET_SUMMARY)).toHaveLength(1);
    expect(Object.fromEntries(net.calls(GET_SUMMARY)[0].query)).toEqual({
      from: '2026-11-05',
      to: '2026-11-11',
    });
    expect(
      client.getQueryData([
        'reports',
        'summary',
        '2026-11-05',
        '2026-11-11',
        'all',
      ]),
    ).toEqual({ ...summaryWithData, period: { ...PERIOD } });
  });

  it('R2: con sede lleva from, to y siteId, sin ningún otro parámetro', async () => {
    const net = fakeApi({ [GET_SUMMARY]: summaryResponse() });
    const { client, wrapper } = setup();
    const period = { ...PERIOD, siteId: SITE_SUR.id };
    const hook = renderHook(() => useReportSummary(period), { wrapper });
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(Object.fromEntries(net.calls(GET_SUMMARY)[0].query)).toEqual({
      from: '2026-11-05',
      to: '2026-11-11',
      siteId: SITE_SUR.id,
    });
    expect(
      client.getQueryData([
        'reports',
        'summary',
        '2026-11-05',
        '2026-11-11',
        SITE_SUR.id,
      ]),
    ).toBeDefined();
  });

  it('R6: otro periodo cambia la clave y la consulta nueva arranca sin datos (sin placeholderData)', async () => {
    const later = deferred(summaryResponse());
    const net = fakeApi({ [GET_SUMMARY]: summaryResponse() });
    const { wrapper } = setup();
    const hook = renderHook(({ period }) => useReportSummary(period), {
      wrapper,
      initialProps: { period: PERIOD },
    });
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    net.set(GET_SUMMARY, later.handler);
    hook.rerender({ period: { ...PERIOD, from: '2026-11-01' } });
    expect(hook.result.current.isPending).toBe(true);
    expect(hook.result.current.data).toBeUndefined();
    expect(hook.result.current.isPlaceholderData).toBe(false);
    act(() => later.release());
    await waitFor(() =>
      expect(hook.result.current.data?.period.from).toBe('2026-11-01'),
    );
  });

  it('R20: repite cada 30 s solo con la pestaña visible, sin foco ni reconexión y sin reintentos', async () => {
    const net = fakeApi({ [GET_SUMMARY]: networkError() });
    const { client, wrapper } = setup();
    const hook = renderHook(() => useReportSummary(PERIOD), { wrapper });
    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(net.calls(GET_SUMMARY)).toHaveLength(1);
    const key = ['reports', 'summary', PERIOD.from, PERIOD.to, 'all'];
    const options = client.getQueryCache().find({ queryKey: key })!
      .options as Record<string, unknown>;
    expect(options.refetchIntervalInBackground).toBe(false);
    expect(options.refetchOnWindowFocus).toBe(false);
    expect(options.refetchOnReconnect).toBe(false);
    expect(options.retry).toBe(false);
    // Un error de red no detiene el intervalo: el siguiente ciclo vuelve a pedir.
    expect(intervalOf(client, key)).toBe(DASHBOARD_REFRESH_MS);
    expect(DASHBOARD_REFRESH_MS).toBe(30_000);
  });

  it('R22: un 403 detiene el intervalo', async () => {
    fakeApi({ [GET_SUMMARY]: problem(403) });
    const { client, wrapper } = setup();
    const hook = renderHook(() => useReportSummary(PERIOD), { wrapper });
    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(
      intervalOf(client, ['reports', 'summary', PERIOD.from, PERIOD.to, 'all']),
    ).toBe(false);
  });

  it.each([400, 422])(
    'R8: un %i también detiene el intervalo',
    async (status) => {
      const net = fakeApi({ [GET_SUMMARY]: problem(status) });
      const { client, wrapper } = setup();
      const hook = renderHook(() => useReportSummary(PERIOD), { wrapper });
      await waitFor(() => expect(hook.result.current.isError).toBe(true));
      expect(net.calls(GET_SUMMARY)).toHaveLength(1);
      expect(
        intervalOf(client, [
          'reports',
          'summary',
          PERIOD.from,
          PERIOD.to,
          'all',
        ]),
      ).toBe(false);
    },
  );

  it('R20: con un 500 el intervalo sigue', async () => {
    fakeApi({ [GET_SUMMARY]: problem(500) });
    const { client, wrapper } = setup();
    const hook = renderHook(() => useReportSummary(PERIOD), { wrapper });
    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(
      intervalOf(client, ['reports', 'summary', PERIOD.from, PERIOD.to, 'all']),
    ).toBe(DASHBOARD_REFRESH_MS);
  });
});
