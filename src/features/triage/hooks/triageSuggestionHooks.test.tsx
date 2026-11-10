import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TriageSuggestionList } from '../../../shared/api/client';
import { ENCOUNTERS_KEY } from '../../../shared/hooks/useEncounters';
import { ENCOUNTER_ID, fakeApi, json, problem } from '../../../test/fakeApi';
import {
  LIST_SUGGESTIONS,
  REQUEST_SUGGESTION,
  guardG1Suggestion,
  okSuggestion,
  suggestionList,
} from '../testing/suggestionFixtures';
import { clinicalCaptureKey } from './useClinicalCapture';
import { encounterKey } from './useEncounter';
import { useRequestTriageSuggestion } from './useRequestTriageSuggestion';
import {
  triageSuggestionsKey,
  useTriageSuggestions,
} from './useTriageSuggestions';

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

describe('F-04-web hooks de sugerencia', () => {
  it("R2: la consulta usa la clave ['triage','suggestions',id], no pide nada deshabilitada y no reintenta", async () => {
    const net = fakeApi({
      [LIST_SUGGESTIONS]: json(200, suggestionList(okSuggestion)),
    });
    const { client, wrapper } = setup();
    const hook = renderHook(
      ({ enabled }) => useTriageSuggestions(ENCOUNTER_ID, enabled),
      { wrapper, initialProps: { enabled: false } },
    );
    expect(triageSuggestionsKey(ENCOUNTER_ID)).toEqual([
      'triage',
      'suggestions',
      ENCOUNTER_ID,
    ]);
    expect(net.requests).toHaveLength(0);
    hook.rerender({ enabled: true });
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(net.calls(LIST_SUGGESTIONS)).toHaveLength(1);
    expect(client.getQueryData(triageSuggestionsKey(ENCOUNTER_ID))).toEqual(
      suggestionList(okSuggestion),
    );

    net.set(LIST_SUGGESTIONS, problem(500));
    const other = renderHook(() => useTriageSuggestions('otra-atencion'), {
      wrapper,
    });
    await waitFor(() => expect(other.result.current.isError).toBe(true));
    expect(
      net.requests.filter((r) => r.path.includes('otra-atencion')),
    ).toHaveLength(1);
  });

  it('R5: la solicitud es un único POST sin cuerpo y sin reintento', async () => {
    const net = fakeApi({ [REQUEST_SUGGESTION]: problem(500) });
    const { wrapper } = setup();
    const hook = renderHook(() => useRequestTriageSuggestion(ENCOUNTER_ID), {
      wrapper,
    });
    await act(async () => {
      await hook.result.current.mutateAsync().catch(() => undefined);
    });
    expect(net.calls(REQUEST_SUGGESTION)).toHaveLength(1);
    expect(net.calls(REQUEST_SUGGESTION)[0].body).toBeUndefined();
    expect(net.requests).toHaveLength(1);
  });

  it('R8: tras un 201 la respuesta queda en items[0] de la caché sin un GET nuevo', async () => {
    const net = fakeApi({
      [REQUEST_SUGGESTION]: json(201, guardG1Suggestion),
    });
    const { client, wrapper } = setup();
    client.setQueryData(
      triageSuggestionsKey(ENCOUNTER_ID),
      suggestionList(okSuggestion),
    );
    const hook = renderHook(() => useRequestTriageSuggestion(ENCOUNTER_ID), {
      wrapper,
    });
    await act(async () => {
      await hook.result.current.mutateAsync();
    });
    expect(
      client.getQueryData<TriageSuggestionList>(
        triageSuggestionsKey(ENCOUNTER_ID),
      )?.items,
    ).toEqual([guardG1Suggestion, okSuggestion]);
    expect(
      client.getQueryState(triageSuggestionsKey(ENCOUNTER_ID))?.isInvalidated,
    ).toBe(false);
    expect(net.calls(LIST_SUGGESTIONS)).toHaveLength(0);
  });

  it('R18: un 409 invalida la captura, la atención y la bandeja como useRecordVitalSigns', async () => {
    const net = fakeApi({ [REQUEST_SUGGESTION]: problem(409) });
    const { client, wrapper } = setup();
    const keys = [
      clinicalCaptureKey(ENCOUNTER_ID),
      encounterKey(ENCOUNTER_ID),
      ENCOUNTERS_KEY,
    ];
    for (const key of keys) client.setQueryData(key, { old: true });
    const hook = renderHook(() => useRequestTriageSuggestion(ENCOUNTER_ID), {
      wrapper,
    });
    await act(async () => {
      await hook.result.current.mutateAsync().catch(() => undefined);
    });
    expect(net.calls(REQUEST_SUGGESTION)).toHaveLength(1);
    for (const key of keys)
      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  });
});
