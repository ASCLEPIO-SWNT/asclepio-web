import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager,
} from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { existsSync } from 'node:fs';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  SITE_SUR,
  deferred,
  encounterSummaries,
  encountersFor,
  fakeApi,
  json,
  networkError,
  problem,
  sequence,
  type Handler,
} from '../../test/fakeApi';
import { formatDateTimeBogota } from '../lib/datetime';
import { indicatorOf } from '../lib/indicator';
import {
  useEncounterCount,
  type EncounterCountFilters,
} from './useEncounterCount';
import {
  COUNT_LIMIT,
  ENCOUNTERS_KEY,
  PAGE_SIZE,
  RECENT_LIMIT,
  useEncounters,
} from './useEncounters';

const LIST = 'GET /api/v1/encounters';

function setup(routes: Record<string, Handler>) {
  const net = fakeApi(routes);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { net, client, wrapper };
}

/**
 * TanStack solo avisa al componente de los cambios de las propiedades que lee durante el
 * render (`tracked`); `renderHook` no lee ninguna. Estos ayudantes las leen todas, para que
 * la prueba vea también las transiciones de `isFetching`.
 */
function useTrackedCount(filters?: EncounterCountFilters) {
  return { ...useEncounterCount(filters) };
}
function useTrackedList(...args: Parameters<typeof useEncounters>) {
  return { ...useEncounters(...args) };
}

const queryOf = (request: { query: URLSearchParams }) =>
  Object.fromEntries(request.query);

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
});

describe('UI-02-web conteos de atenciones (useEncounterCount)', () => {
  it.each([
    [
      { status: 'WAITING_TRIAGE' as const, siteId: SITE_SUR.id },
      { limit: '100', status: 'WAITING_TRIAGE', siteId: SITE_SUR.id },
    ],
    [{ status: 'TRIAGED' as const }, { limit: '100', status: 'TRIAGED' }],
    [{ siteId: SITE_SUR.id }, { limit: '100', siteId: SITE_SUR.id }],
    [{}, { limit: '100' }],
  ])(
    'R7: %j es una única petición con limit=100 y con status y siteId solo si aplican',
    async (filters, expected) => {
      const { net, wrapper } = setup({ [LIST]: encountersFor(() => 3) });
      const { result } = renderHook(() => useTrackedCount(filters), {
        wrapper,
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(COUNT_LIMIT).toBe(100);
      expect(net.requests).toHaveLength(1);
      expect(queryOf(net.requests[0])).toEqual(expected);
    },
  );

  it('R7: la caché del conteo guarda solo { count, capped }, sin datos de pacientes', async () => {
    const { client, wrapper } = setup({ [LIST]: encountersFor(() => 12) });
    const { result } = renderHook(
      () => useTrackedCount({ status: 'WAITING_TRIAGE' }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ count: 12, capped: false });
    const cached = client.getQueryCache().getAll();
    expect(cached).toHaveLength(1);
    expect(cached[0].state.data).toEqual({ count: 12, capped: false });
    const serialized = JSON.stringify(cached.map((q) => q.state.data));
    expect(serialized).not.toMatch(/Paciente ficticio|fullName|documentNumber/);
  });

  it.each([
    [0, { count: 0, capped: false }],
    [12, { count: 12, capped: false }],
    [99, { count: 99, capped: false }],
    [100, { count: 100, capped: true }],
    // El servidor tiene más, pero la página de 100 es lo más que se puede contar: «100+».
    [250, { count: 100, capped: true }],
  ])(
    'R8: con %i atenciones en el servidor el conteo es %j',
    async (existing, expected) => {
      const { wrapper } = setup({ [LIST]: encountersFor(() => existing) });
      const { result } = renderHook(
        () => useTrackedCount({ status: 'WAITING_TRIAGE' }),
        { wrapper },
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(expected);
    },
  );

  it('R24: repite la petición cada 30 s con la pestaña visible', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { net, wrapper } = setup({ [LIST]: encountersFor(() => 12) });
    const { result } = renderHook(
      () => useTrackedCount({ status: 'WAITING_TRIAGE' }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(net.calls(LIST)).toHaveLength(1);

    await act(() => vi.advanceTimersByTimeAsync(29_000));
    expect(net.calls(LIST)).toHaveLength(1);
    await act(() => vi.advanceTimersByTimeAsync(1_000));
    await waitFor(() => expect(net.calls(LIST)).toHaveLength(2));
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    await waitFor(() => expect(net.calls(LIST)).toHaveLength(3));
    expect(queryOf(net.calls(LIST)[2])).toEqual(queryOf(net.calls(LIST)[0]));
  });

  it('R25: no repite por foco de la ventana ni por reconexión', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { net, wrapper } = setup({ [LIST]: encountersFor(() => 12) });
    const { result } = renderHook(
      () => useTrackedCount({ status: 'WAITING_TRIAGE' }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await act(async () => {
      focusManager.setFocused(false);
      onlineManager.setOnline(false);
      focusManager.setFocused(true);
      onlineManager.setOnline(true);
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(net.calls(LIST)).toHaveLength(1);
  });

  it('R25: no repite mientras la pestaña está oculta y vuelve a pedir en el siguiente ciclo al mostrarse', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { net, wrapper } = setup({ [LIST]: encountersFor(() => 12) });
    const { result } = renderHook(
      () => useTrackedCount({ status: 'WAITING_TRIAGE' }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const visibility = vi
      .spyOn(document, 'visibilityState', 'get')
      .mockReturnValue('hidden');
    await act(() => vi.advanceTimersByTimeAsync(90_000));
    expect(net.calls(LIST)).toHaveLength(1);

    visibility.mockRestore();
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    await waitFor(() => expect(net.calls(LIST)).toHaveLength(2));
  });

  it('R22: un 403 deja el indicador sin permiso y detiene el intervalo; repetir a mano lo reanuda', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { net, wrapper } = setup({
      [LIST]: sequence(
        problem(403),
        encountersFor(() => 3),
      ),
    });
    const { result } = renderHook(
      () => useTrackedCount({ status: 'TRIAGED' }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(indicatorOf(result.current)).toBe('forbidden');

    await act(() => vi.advanceTimersByTimeAsync(120_000));
    expect(net.calls(LIST)).toHaveLength(1);

    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(indicatorOf(result.current)).toBe('ready');
    expect(result.current.data).toEqual({ count: 3, capped: false });

    await act(() => vi.advanceTimersByTimeAsync(30_000));
    await waitFor(() => expect(net.calls(LIST)).toHaveLength(3));
  });

  it('R21: un error de red en un refresco sustituye a los datos anteriores y el siguiente ciclo vuelve a pedir', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { net, wrapper } = setup({
      [LIST]: sequence(
        encountersFor(() => 12),
        networkError(),
        encountersFor(() => 13),
      ),
    });
    const { result } = renderHook(
      () => useTrackedCount({ status: 'WAITING_TRIAGE' }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(indicatorOf(result.current)).toBe('ready');

    await act(() => vi.advanceTimersByTimeAsync(30_000));
    await waitFor(() => expect(result.current.isError).toBe(true));
    // La caché conserva el 12, pero el indicador es un error y no lo pinta.
    expect(result.current.data).toEqual({ count: 12, capped: false });
    expect(indicatorOf(result.current)).toBe('error');

    await act(() => vi.advanceTimersByTimeAsync(30_000));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(net.calls(LIST)).toHaveLength(3);
    expect(indicatorOf(result.current)).toBe('ready');
    expect(result.current.data).toEqual({ count: 13, capped: false });
  });

  it('R23: un refresco conserva los datos anteriores y no vuelve al estado de carga', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const slow = deferred(encountersFor(() => 14));
    const { wrapper } = setup({
      [LIST]: sequence(
        encountersFor(() => 12),
        slow.handler,
      ),
    });
    const { result } = renderHook(
      () => useTrackedCount({ status: 'WAITING_TRIAGE' }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await act(() => vi.advanceTimersByTimeAsync(30_000));
    await waitFor(() => expect(result.current.isFetching).toBe(true));
    expect(result.current.isPending).toBe(false);
    expect(result.current.data).toEqual({ count: 12, capped: false });
    expect(indicatorOf(result.current)).toBe('ready');

    await act(async () => {
      slow.release();
      await vi.advanceTimersByTimeAsync(0);
    });
    await waitFor(() =>
      expect(result.current.data).toEqual({ count: 14, capped: false }),
    );
  });
});

describe('UI-02-web lista de atenciones (useEncounters)', () => {
  it('R14: sin opciones pide páginas de 50 con offset y solo los filtros elegidos', async () => {
    const { net, wrapper } = setup({ [LIST]: encountersFor(() => 3) });
    const { result } = renderHook(
      () =>
        useTrackedList({
          status: 'WAITING_TRIAGE',
          siteId: SITE_SUR.id,
          offset: 50,
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(PAGE_SIZE).toBe(50);
    expect(queryOf(net.requests[0])).toEqual({
      limit: '50',
      offset: '50',
      status: 'WAITING_TRIAGE',
      siteId: SITE_SUR.id,
    });
  });

  it('R16: con limit=8 pide las atenciones recientes sin estado ni sede y las guarda en el orden recibido', async () => {
    const received = encounterSummaries(8);
    const { net, client, wrapper } = setup({
      [LIST]: json(200, { items: received }),
    });
    const { result } = renderHook(
      () =>
        useTrackedList(
          { status: null, siteId: null, offset: 0 },
          { limit: RECENT_LIMIT },
        ),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(RECENT_LIMIT).toBe(8);
    expect(queryOf(net.requests[0])).toEqual({ limit: '8', offset: '0' });
    expect(result.current.data?.items.map((e) => e.id)).toEqual(
      received.map((e) => e.id),
    );
    expect(
      client.getQueryData([
        'encounters',
        { status: null, siteId: null, offset: 0, limit: 8 },
      ]),
    ).toBeDefined();
  });

  it('R24: con refresh repite la lista cada 30 s y sin él no la repite por intervalo', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { net, wrapper } = setup({ [LIST]: encountersFor(() => 3) });
    const filters = { status: null, siteId: null, offset: 0 };
    const withRefresh = renderHook(
      () => useTrackedList(filters, { refresh: true, limit: RECENT_LIMIT }),
      { wrapper },
    );
    await waitFor(() =>
      expect(withRefresh.result.current.isSuccess).toBe(true),
    );
    expect(net.calls(LIST)).toHaveLength(1);
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    await waitFor(() => expect(net.calls(LIST)).toHaveLength(2));
    withRefresh.unmount();

    // Sin `refresh` (como `/atenciones`): ningún sondeo, ni siquiera tras mucho tiempo.
    const before = net.calls(LIST).length;
    const plain = renderHook(
      () => useTrackedList({ status: 'CLOSED', siteId: null, offset: 0 }),
      { wrapper },
    );
    await waitFor(() => expect(plain.result.current.isSuccess).toBe(true));
    await act(() => vi.advanceTimersByTimeAsync(120_000));
    expect(net.calls(LIST)).toHaveLength(before + 1);
  });

  it('R25: con refresh no repite por foco ni por reconexión; sin él conserva el comportamiento de /atenciones', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { net, wrapper } = setup({ [LIST]: encountersFor(() => 3) });
    const filters = { status: null, siteId: null, offset: 0 };
    const withRefresh = renderHook(
      () => useTrackedList(filters, { refresh: true }),
      { wrapper },
    );
    await waitFor(() =>
      expect(withRefresh.result.current.isSuccess).toBe(true),
    );
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
      onlineManager.setOnline(false);
      onlineManager.setOnline(true);
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(net.calls(LIST)).toHaveLength(1);
    withRefresh.unmount();

    // El mismo gesto sí repite una lista sin `refresh`: la prueba anterior no es vacua.
    const plain = renderHook(
      () => useTrackedList({ status: 'CLOSED', siteId: null, offset: 0 }),
      { wrapper },
    );
    await waitFor(() => expect(plain.result.current.isSuccess).toBe(true));
    const before = net.calls(LIST).length;
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
      await vi.advanceTimersByTimeAsync(1_000);
    });
    await waitFor(() => expect(net.calls(LIST)).toHaveLength(before + 1));
  });

  it('R22: con refresh un 403 detiene el sondeo de la lista', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { net, wrapper } = setup({ [LIST]: problem(403) });
    const { result } = renderHook(
      () =>
        useTrackedList(
          { status: 'WAITING_TRIAGE', siteId: null, offset: 0 },
          { refresh: true },
        ),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(indicatorOf(result.current)).toBe('forbidden');
    await act(() => vi.advanceTimersByTimeAsync(120_000));
    expect(net.calls(LIST)).toHaveLength(1);
  });

  it('R21: con refresh un error de red sustituye a la lista anterior y el siguiente ciclo la recupera', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { wrapper } = setup({
      [LIST]: sequence(
        encountersFor(() => 2),
        networkError(),
        encountersFor(() => 4),
      ),
    });
    const { result } = renderHook(
      () =>
        useTrackedList(
          { status: 'WAITING_TRIAGE', siteId: null, offset: 0 },
          { refresh: true },
        ),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(indicatorOf(result.current)).toBe('error');
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(4);
  });
});

describe('UI-02-web claves de caché y contrato (D4, D5)', () => {
  it('R36: useEncounters, ENCOUNTERS_KEY y PAGE_SIZE viven en shared/hooks y no queda la ruta antigua', () => {
    expect(ENCOUNTERS_KEY).toEqual(['encounters']);
    expect(existsSync('src/features/triage/hooks/useEncounters.ts')).toBe(
      false,
    );
    expect(existsSync('src/shared/hooks/useEncounters.ts')).toBe(true);
    expect(existsSync('src/shared/hooks/useEncounterCount.ts')).toBe(true);
  });

  it('R36: invalidar ENCOUNTERS_KEY repite a la vez las listas y los conteos (tras confirmar una llegada)', async () => {
    const { net, client, wrapper } = setup({ [LIST]: encountersFor(() => 3) });
    const { result } = renderHook(
      () => ({
        count: useTrackedCount({ status: 'WAITING_TRIAGE' }),
        list: useTrackedList({ status: null, siteId: null, offset: 0 }),
      }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.count.isSuccess).toBe(true);
      expect(result.current.list.isSuccess).toBe(true);
    });
    expect(net.calls(LIST)).toHaveLength(2);
    await act(async () => {
      await client.invalidateQueries({ queryKey: ENCOUNTERS_KEY });
    });
    expect(net.calls(LIST)).toHaveLength(4);
  });

  it('R6: solo se piden lecturas de GET /api/v1/encounters con filtros del contrato, sin horas, y la hora recibida se muestra en Bogotá', async () => {
    const received = encounterSummaries(2, {
      arrivalAt: '2026-10-28T04:30:00.000Z',
    });
    const { net, wrapper } = setup({ [LIST]: json(200, { items: received }) });
    const { result } = renderHook(
      () => ({
        count: useTrackedCount({
          status: 'WAITING_TRIAGE',
          siteId: SITE_SUR.id,
        }),
        list: useTrackedList(
          { status: null, siteId: null, offset: 0 },
          { limit: RECENT_LIMIT, refresh: true },
        ),
      }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.count.isSuccess).toBe(true);
      expect(result.current.list.isSuccess).toBe(true);
    });
    expect(net.requests).toHaveLength(2);
    for (const request of net.requests) {
      expect(request.method).toBe('GET');
      expect(request.path).toBe('/api/v1/encounters');
      expect(request.body).toBeUndefined();
      expect([...request.query.keys()].sort()).toEqual(
        expect.arrayContaining(['limit']),
      );
      for (const [key, value] of request.query) {
        expect(['limit', 'offset', 'status', 'siteId']).toContain(key);
        // La web nunca envía horas: ningún valor parece una fecha ni una hora.
        expect(value).not.toMatch(/^\d{4}-\d{2}-\d{2}|T\d{2}:\d{2}/);
      }
    }
    // 04:30 UTC del 28/10 son las 11:30 p. m. del 27/10 en Bogotá.
    expect(
      formatDateTimeBogota(result.current.list.data!.items[0].arrivalAt),
    ).toMatch(/^27\/10\/26,\s11:30\sp\.\sm\.$/);
  });
});
