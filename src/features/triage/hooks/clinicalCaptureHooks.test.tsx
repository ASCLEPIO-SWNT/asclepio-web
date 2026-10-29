import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ENCOUNTER_ID,
  fakeApi,
  json,
  networkError,
  problem,
} from '../../../test/fakeApi';
import { clinicalCaptureKey, useClinicalCapture } from './useClinicalCapture';
import { useRecordVitalSigns } from './useRecordVitalSigns';
import { useRecordSymptomFindings } from './useRecordSymptomFindings';
import { encounterKey } from './useEncounter';
import { ENCOUNTERS_KEY } from './useEncounters';
import {
  captureFixture,
  recordedFinding,
  recordedVitalSigns,
} from '../testing/clinicalFixtures';

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: 1 } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}
const body = {
  respiratoryRate: 18,
  oxygenSaturation: 98,
  supplementalOxygen: false,
  systolicBp: 120,
  heartRate: 80,
  consciousness: 'A' as const,
  temperatureC: 36.7,
};
const keys = [
  clinicalCaptureKey(ENCOUNTER_ID),
  encounterKey(ENCOUNTER_ID),
  ENCOUNTERS_KEY,
];
afterEach(() => vi.unstubAllGlobals());

describe('F-03 clinical requests', () => {
  it('R20: gates the clinical GET and isolates cache by encounter id', async () => {
    const net = fakeApi({
      [`GET /api/v1/encounters/${ENCOUNTER_ID}/clinical-capture`]: json(
        200,
        captureFixture(),
      ),
    });
    const { wrapper } = setup();
    const hook = renderHook(
      ({ enabled }) => useClinicalCapture(ENCOUNTER_ID, enabled),
      { wrapper, initialProps: { enabled: false } },
    );
    expect(net.requests).toHaveLength(0);
    hook.rerender({ enabled: true });
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(hook.result.current.data).toEqual(captureFixture());
    expect(clinicalCaptureKey('another')).not.toEqual(
      clinicalCaptureKey(ENCOUNTER_ID),
    );
  });

  it('R9: posts exact vital signs and invalidates all three server views without optimistic records', async () => {
    const net = fakeApi({
      [`POST /api/v1/encounters/${ENCOUNTER_ID}/vital-signs`]: json(
        201,
        recordedVitalSigns,
      ),
    });
    const { client, wrapper } = setup();
    for (const key of keys) client.setQueryData(key, { old: true });
    const hook = renderHook(() => useRecordVitalSigns(ENCOUNTER_ID), {
      wrapper,
    });
    await act(async () => {
      await hook.result.current.mutateAsync(body);
    });
    expect(net.requests).toHaveLength(1);
    expect(net.requests[0].body).toEqual(body);
    for (const key of keys) {
      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
      expect(client.getQueryData(key)).toEqual({ old: true });
    }
  });

  it('R11: posts only items for symptom findings', async () => {
    const net = fakeApi({
      [`POST /api/v1/encounters/${ENCOUNTER_ID}/symptom-findings`]: json(201, {
        items: [recordedFinding],
      }),
    });
    const { wrapper } = setup();
    const hook = renderHook(() => useRecordSymptomFindings(ENCOUNTER_ID), {
      wrapper,
    });
    const request = {
      items: [{ kind: 'COMPLAINT_NOTE' as const, description: 'Nota literal' }],
    };
    await act(async () => {
      await hook.result.current.mutateAsync(request);
    });
    expect(net.requests[0].body).toEqual(request);
    expect(net.requests).toHaveLength(1);
  });

  it('R17: conflict invalidates capture, encounter and inbox without retrying the POST', async () => {
    const net = fakeApi({
      [`POST /api/v1/encounters/${ENCOUNTER_ID}/vital-signs`]: problem(409),
    });
    const { client, wrapper } = setup();
    for (const key of keys) client.setQueryData(key, { old: true });
    const hook = renderHook(() => useRecordVitalSigns(ENCOUNTER_ID), {
      wrapper,
    });
    await act(async () => {
      await expect(hook.result.current.mutateAsync(body)).rejects.toThrow();
    });
    for (const key of keys)
      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    expect(net.requests).toHaveLength(1);
  });

  it.each([
    networkError(),
    problem(400),
    problem(401),
    problem(403),
    problem(404),
    problem(422),
  ])(
    'R18: fails once at the HTTP boundary without automatically retrying clinical insertion',
    async (response) => {
      const net = fakeApi({
        [`POST /api/v1/encounters/${ENCOUNTER_ID}/symptom-findings`]: response,
      });
      const { wrapper } = setup();
      const hook = renderHook(() => useRecordSymptomFindings(ENCOUNTER_ID), {
        wrapper,
      });
      await act(async () => {
        await expect(
          hook.result.current.mutateAsync({
            items: [{ kind: 'FINDING', description: 'Literal' }],
          }),
        ).rejects.toThrow();
      });
      expect(net.requests).toHaveLength(1);
    },
  );
});
