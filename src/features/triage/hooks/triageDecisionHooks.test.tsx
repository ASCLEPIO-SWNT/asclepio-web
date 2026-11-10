import {
  QueryClient,
  QueryClientProvider,
  useIsMutating,
} from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ENCOUNTERS_KEY } from '../../../shared/hooks/useEncounters';
import {
  deferred,
  ENCOUNTER_ID,
  fakeApi,
  json,
  problem,
} from '../../../test/fakeApi';
import {
  DECIDE,
  GET_DECISION,
  decisionCreated,
  decisionFound,
  manualDecision,
  validateDecision,
} from '../testing/decisionFixtures';
import {
  REQUEST_SUGGESTION,
  okSuggestion,
} from '../testing/suggestionFixtures';
import { clinicalCaptureKey } from './useClinicalCapture';
import { decideTriageMutationKey, useDecideTriage } from './useDecideTriage';
import { encounterKey } from './useEncounter';
import {
  requestSuggestionMutationKey,
  useRequestTriageSuggestion,
} from './useRequestTriageSuggestion';
import { triageDecisionKey, useTriageDecision } from './useTriageDecision';
import { triageSuggestionsKey } from './useTriageSuggestions';

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

describe('F-05-web hooks de la decisión', () => {
  it("R17: la consulta usa ['triage','decision',id], no pide nada deshabilitada y no reintenta", async () => {
    const net = fakeApi({ [GET_DECISION]: decisionFound(manualDecision) });
    const { client, wrapper } = setup();
    const hook = renderHook(
      ({ enabled }) => useTriageDecision(ENCOUNTER_ID, enabled),
      { wrapper, initialProps: { enabled: false } },
    );
    expect(triageDecisionKey(ENCOUNTER_ID)).toEqual([
      'triage',
      'decision',
      ENCOUNTER_ID,
    ]);
    expect(net.requests).toHaveLength(0);
    hook.rerender({ enabled: true });
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(net.calls(GET_DECISION)).toHaveLength(1);
    expect(client.getQueryData(triageDecisionKey(ENCOUNTER_ID))).toEqual(
      manualDecision,
    );

    net.set(GET_DECISION, problem(500));
    await act(async () => {
      await hook.result.current.refetch();
    });
    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(net.calls(GET_DECISION)).toHaveLength(2);
  });

  it('R14: tras un 201 la decisión queda en la caché sin un GET nuevo y se invalidan atención, captura y listas', async () => {
    const net = fakeApi({ [DECIDE]: decisionCreated(validateDecision) });
    const { client, wrapper } = setup();
    const keys = [
      clinicalCaptureKey(ENCOUNTER_ID),
      encounterKey(ENCOUNTER_ID),
      ENCOUNTERS_KEY,
    ];
    for (const key of keys) client.setQueryData(key, { old: true });
    const hook = renderHook(() => useDecideTriage(ENCOUNTER_ID), { wrapper });
    await act(async () => {
      await hook.result.current.mutateAsync({
        action: 'VALIDATE',
        suggestionId: okSuggestion.id,
      });
    });
    expect(net.calls(DECIDE)).toHaveLength(1);
    expect(net.calls(DECIDE)[0].body).toEqual({
      action: 'VALIDATE',
      suggestionId: okSuggestion.id,
    });
    expect(client.getQueryData(triageDecisionKey(ENCOUNTER_ID))).toEqual(
      validateDecision,
    );
    expect(net.calls(GET_DECISION)).toHaveLength(0);
    for (const key of keys)
      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  });

  it('R18: un 409 invalida la captura, la atención, las listas y la consulta de sugerencias, sin reintento', async () => {
    const net = fakeApi({ [DECIDE]: problem(409) });
    const { client, wrapper } = setup();
    const keys = [
      clinicalCaptureKey(ENCOUNTER_ID),
      encounterKey(ENCOUNTER_ID),
      ENCOUNTERS_KEY,
      triageSuggestionsKey(ENCOUNTER_ID),
    ];
    for (const key of keys) client.setQueryData(key, { old: true });
    const hook = renderHook(() => useDecideTriage(ENCOUNTER_ID), { wrapper });
    await act(async () => {
      await hook.result.current
        .mutateAsync({ action: 'MANUAL', level: 3 })
        .catch(() => undefined);
    });
    expect(net.calls(DECIDE)).toHaveLength(1);
    for (const key of keys)
      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    expect(
      client.getQueryData(triageDecisionKey(ENCOUNTER_ID)),
    ).toBeUndefined();
  });

  it('R12: el envío y la solicitud de sugerencia tienen mutationKey observables con useIsMutating', async () => {
    const decide = deferred(decisionCreated(manualDecision));
    const request = deferred(json(201, okSuggestion));
    fakeApi({
      [DECIDE]: decide.handler,
      [REQUEST_SUGGESTION]: request.handler,
    });
    const { wrapper } = setup();
    expect(decideTriageMutationKey(ENCOUNTER_ID)).toEqual([
      'triage',
      'decision',
      ENCOUNTER_ID,
      'submit',
    ]);
    expect(requestSuggestionMutationKey(ENCOUNTER_ID)).toEqual([
      'triage',
      'suggestions',
      ENCOUNTER_ID,
      'request',
    ]);
    const hook = renderHook(
      () => ({
        decide: useDecideTriage(ENCOUNTER_ID),
        request: useRequestTriageSuggestion(ENCOUNTER_ID),
        deciding: useIsMutating({
          mutationKey: decideTriageMutationKey(ENCOUNTER_ID),
        }),
        requesting: useIsMutating({
          mutationKey: requestSuggestionMutationKey(ENCOUNTER_ID),
        }),
      }),
      { wrapper },
    );
    expect(hook.result.current.deciding).toBe(0);
    expect(hook.result.current.requesting).toBe(0);
    act(() =>
      hook.result.current.decide.mutate({ action: 'MANUAL', level: 3 }),
    );
    await waitFor(() => expect(hook.result.current.deciding).toBe(1));
    expect(hook.result.current.requesting).toBe(0);
    act(() => hook.result.current.request.mutate());
    await waitFor(() => expect(hook.result.current.requesting).toBe(1));
    decide.release();
    request.release();
    await waitFor(() => expect(hook.result.current.deciding).toBe(0));
    await waitFor(() => expect(hook.result.current.requesting).toBe(0));
  });
});
