import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ENCOUNTER_ID,
  fakeApi,
  json,
  type Handler,
} from '../../../test/fakeApi';
import { captureFixture } from '../testing/clinicalFixtures';
import {
  LIST_SUGGESTIONS,
  guardG1Suggestion,
  suggestionList,
} from '../testing/suggestionFixtures';
import {
  TriageSuggestionPanel,
  type TriageSuggestionPanelProps,
} from './TriageSuggestionPanel';

afterEach(() => vi.unstubAllGlobals());

function mount(
  routes: Record<string, Handler>,
  props: Partial<TriageSuggestionPanelProps> = {},
) {
  fakeApi(routes);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  render(
    <TriageSuggestionPanel
      encounterId={ENCOUNTER_ID}
      enabled={false}
      capture={captureFixture()}
      onConflict={() => undefined}
      onUnavailable={() => undefined}
      {...props}
    />,
    { wrapper },
  );
}

const region = () =>
  screen.getByRole('region', { name: 'Sugerencia de triage (IA)' });

describe('F-05-web panel con la atención decidida', () => {
  it('R15: con decided no hay botón de solicitud ni renderActions, y la sugerencia sigue visible', async () => {
    const renderActions = vi.fn(() => <p>acciones</p>);
    mount(
      { [LIST_SUGGESTIONS]: json(200, suggestionList(guardG1Suggestion)) },
      { decided: true, renderActions },
    );
    expect(
      await within(region()).findByText(guardG1Suggestion.explanation!),
    ).toBeVisible();
    expect(within(region()).queryByRole('button')).toBeNull();
    expect(within(region()).queryByText('acciones')).toBeNull();
    expect(renderActions).not.toHaveBeenCalled();
  });

  it('R15: con decided y sin tomas no aparece «Guarda primero una toma…»', async () => {
    mount({}, { decided: true, capture: captureFixture({ vitalSigns: [] }) });
    await waitFor(() => expect(region()).toBeInTheDocument());
    expect(region().textContent).not.toMatch(/Guarda primero una toma/);
    expect(within(region()).queryByRole('button')).toBeNull();
  });

  it('R15: sin decided el botón de solicitud sigue ahí (F-04-web)', async () => {
    mount({ [LIST_SUGGESTIONS]: json(200, suggestionList(guardG1Suggestion)) });
    expect(
      await within(region()).findByRole('button', {
        name: 'Pedir otra sugerencia',
      }),
    ).toBeDisabled();
  });
});
