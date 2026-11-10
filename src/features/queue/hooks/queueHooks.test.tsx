import {
  QueryClient,
  QueryClientProvider,
  useIsMutating,
} from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ENCOUNTERS_KEY } from '../../../shared/hooks/useEncounters';
import { DASHBOARD_REFRESH_MS } from '../../../shared/lib/refresh';
import {
  SITE_SUR,
  deferred,
  fakeApi,
  networkError,
  problem,
} from '../../../test/fakeApi';
import {
  CLOSE,
  GET_QUEUE,
  START_CARE,
  closeOk,
  inCareNorte,
  queue,
  queueBySite,
  startCareOk,
  surQueue,
  triagedLevel1,
} from '../testing/queueFixtures';
import { QUEUE_KEY, useQueue } from './useQueue';
import { QUEUE_TRANSITION_KEY, useQueueTransition } from './useQueueTransition';

/** Valores por defecto con reintentos: los hooks deben desactivarlos por sí mismos. */
function setup() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: 2, retryDelay: 0 },
      mutations: { retry: 2, retryDelay: 0 },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

afterEach(() => vi.unstubAllGlobals());

describe('F-06-web hooks de la cola', () => {
  it("R2: useQueue(null) hace un GET /queue sin parámetros con la clave ['queue','all']", async () => {
    const net = fakeApi({ [GET_QUEUE]: queueBySite() });
    const { client, wrapper } = setup();
    const hook = renderHook(() => useQueue(null), { wrapper });
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(net.calls(GET_QUEUE)).toHaveLength(1);
    expect([...net.calls(GET_QUEUE)[0].query]).toEqual([]);
    expect(QUEUE_KEY).toEqual(['queue']);
    expect(client.getQueryData(['queue', 'all'])).toEqual(queue);
    // Ninguna otra petición: ni atenciones ni sedes.
    expect(net.requests).toHaveLength(1);
  });

  it("R2: useQueue(id) hace el GET /queue solo con siteId y la clave ['queue', id]", async () => {
    const net = fakeApi({ [GET_QUEUE]: queueBySite() });
    const { client, wrapper } = setup();
    const hook = renderHook(() => useQueue(SITE_SUR.id), { wrapper });
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(Object.fromEntries(net.calls(GET_QUEUE)[0].query)).toEqual({
      siteId: SITE_SUR.id,
    });
    expect(client.getQueryData(['queue', SITE_SUR.id])).toEqual(surQueue);
  });

  it('R11: la consulta repite cada 30 s solo con la pestaña visible, sin foco ni reconexión y sin reintentos', async () => {
    const net = fakeApi({ [GET_QUEUE]: networkError() });
    const { client, wrapper } = setup();
    const hook = renderHook(() => useQueue(null), { wrapper });
    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    // `retry: false` aunque el cliente tenga reintentos por defecto.
    expect(net.calls(GET_QUEUE)).toHaveLength(1);
    const options = client.getQueryCache().find({ queryKey: ['queue', 'all'] })!
      .options as Record<string, unknown>;
    expect(options.refetchIntervalInBackground).toBe(false);
    expect(options.refetchOnWindowFocus).toBe(false);
    expect(options.refetchOnReconnect).toBe(false);
    expect(options.retry).toBe(false);
    const interval = options.refetchInterval as (query: unknown) => unknown;
    expect(interval({ state: { error: null } })).toBe(DASHBOARD_REFRESH_MS);
    expect(DASHBOARD_REFRESH_MS).toBe(30_000);
  });

  it('R15: cambiar de sede cambia la clave y la nueva arranca sin datos (sin placeholderData)', async () => {
    const sur = deferred(queueBySite());
    const net = fakeApi({ [GET_QUEUE]: queueBySite() });
    const { wrapper } = setup();
    const hook = renderHook(({ siteId }) => useQueue(siteId), {
      wrapper,
      initialProps: { siteId: null as string | null },
    });
    await waitFor(() => expect(hook.result.current.data).toEqual(queue));
    net.set(GET_QUEUE, sur.handler);
    hook.rerender({ siteId: SITE_SUR.id });
    expect(hook.result.current.isPending).toBe(true);
    expect(hook.result.current.data).toBeUndefined();
    expect(hook.result.current.isPlaceholderData).toBe(false);
    act(() => sur.release());
    await waitFor(() => expect(hook.result.current.data).toEqual(surQueue));
  });
});

describe('F-06-web hooks de las acciones del médico', () => {
  it('R19: start-care y close se envían sin cuerpo', async () => {
    const net = fakeApi({
      [START_CARE(triagedLevel1.encounterId)]: startCareOk(triagedLevel1),
      [CLOSE(inCareNorte.encounterId)]: closeOk(inCareNorte),
    });
    const { wrapper } = setup();
    const hook = renderHook(() => useQueueTransition(), { wrapper });
    await act(async () => {
      await hook.result.current.mutateAsync({
        kind: 'start',
        id: triagedLevel1.encounterId,
      });
      await hook.result.current.mutateAsync({
        kind: 'close',
        id: inCareNorte.encounterId,
      });
    });
    const [start] = net.calls(START_CARE(triagedLevel1.encounterId));
    const [close] = net.calls(CLOSE(inCareNorte.encounterId));
    expect(start.body).toBeUndefined();
    expect(close.body).toBeUndefined();
    expect([...start.query]).toEqual([]);
    expect(start.headers.get('Content-Type')).toBeNull();
  });

  it('R21: un 200 invalida la cola y las listas de atenciones, sin escribir en la caché de la cola', async () => {
    fakeApi({
      [START_CARE(triagedLevel1.encounterId)]: startCareOk(triagedLevel1),
    });
    const { client, wrapper } = setup();
    client.setQueryData(['queue', 'all'], queue);
    client.setQueryData([...ENCOUNTERS_KEY, { old: true }], { items: [] });
    const setQueryData = vi.spyOn(client, 'setQueryData');
    const hook = renderHook(() => useQueueTransition(), { wrapper });
    await act(async () => {
      await hook.result.current.mutateAsync({
        kind: 'start',
        id: triagedLevel1.encounterId,
      });
    });
    expect(client.getQueryState(['queue', 'all'])?.isInvalidated).toBe(true);
    expect(
      client.getQueryState([...ENCOUNTERS_KEY, { old: true }])?.isInvalidated,
    ).toBe(true);
    expect(client.getQueryData(['queue', 'all'])).toEqual(queue);
    expect(setQueryData).not.toHaveBeenCalled();
  });

  it.each([409, 404])(
    'R22, R23: un %i invalida la cola y no reintenta',
    async (status) => {
      const net = fakeApi({
        [CLOSE(inCareNorte.encounterId)]: problem(status),
      });
      const { client, wrapper } = setup();
      client.setQueryData(['queue', 'all'], queue);
      const hook = renderHook(() => useQueueTransition(), { wrapper });
      await act(async () => {
        await hook.result.current
          .mutateAsync({ kind: 'close', id: inCareNorte.encounterId })
          .catch(() => undefined);
      });
      expect(net.calls(CLOSE(inCareNorte.encounterId))).toHaveLength(1);
      expect(client.getQueryState(['queue', 'all'])?.isInvalidated).toBe(true);
    },
  );

  it("R20: la mutación usa ['queue','transition'], es observable con useIsMutating y no reintenta", async () => {
    const pending = deferred(problem(500));
    const net = fakeApi({
      [START_CARE(triagedLevel1.encounterId)]: pending.handler,
    });
    const { client, wrapper } = setup();
    client.setQueryData(['queue', 'all'], queue);
    expect(QUEUE_TRANSITION_KEY).toEqual(['queue', 'transition']);
    const hook = renderHook(
      () => ({
        mutation: useQueueTransition(),
        busy: useIsMutating({ mutationKey: QUEUE_TRANSITION_KEY }),
      }),
      { wrapper },
    );
    act(() =>
      hook.result.current.mutation.mutate({
        kind: 'start',
        id: triagedLevel1.encounterId,
      }),
    );
    await waitFor(() => expect(hook.result.current.busy).toBe(1));
    act(() => pending.release());
    await waitFor(() => expect(hook.result.current.busy).toBe(0));
    expect(hook.result.current.mutation.isError).toBe(true);
    expect(net.calls(START_CARE(triagedLevel1.encounterId))).toHaveLength(1);
    // Un 500 no invalida la cola: no hay nada nuevo que leer.
    expect(client.getQueryState(['queue', 'all'])?.isInvalidated).toBe(false);
  });
});
