import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  deferred,
  ENCOUNTER_ID,
  fakeApi,
  json,
  networkError,
  problem,
  type Handler,
} from '../../../test/fakeApi';
import { captureFixture } from '../testing/clinicalFixtures';
import {
  LIST_SUGGESTIONS,
  REQUEST_SUGGESTION,
  guardG1Suggestion,
  noSuggestions,
  okSuggestion,
  suggestionList,
  timeoutSuggestion,
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
  const net = fakeApi(routes);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  render(
    <TriageSuggestionPanel
      encounterId={ENCOUNTER_ID}
      enabled
      capture={captureFixture()}
      onConflict={() => undefined}
      onUnavailable={() => undefined}
      {...props}
    />,
    { wrapper },
  );
  return { net, user: userEvent.setup() };
}

const region = () =>
  screen.getByRole('region', { name: 'Sugerencia de triage (IA)' });

function expectNoDecisionActions() {
  const panel = region();
  for (const role of ['button', 'link'] as const)
    expect(
      within(panel)
        .queryAllByRole(role)
        .filter((el) => /validar|corregir|manual/i.test(el.textContent ?? '')),
    ).toEqual([]);
  expect(panel.querySelector('[class*="actions"]')).toBeNull();
  // Sin contenedores vacíos (huecos reservados para acciones futuras).
  expect(
    [...panel.querySelectorAll('div, section, ul, p')].filter(
      (el) => el.childNodes.length === 0,
    ),
  ).toEqual([]);
  expect(panel.textContent).not.toMatch(/próximamente|pendiente|F-05/i);
}

describe('F-04-web panel preparado para F-05-web', () => {
  it.each<
    [string, Record<string, Handler>, Partial<TriageSuggestionPanelProps>]
  >([
    ['sin tomas', {}, { capture: captureFixture({ vitalSigns: [] }) }],
    ['sin sugerencias', { [LIST_SUGGESTIONS]: noSuggestions }, {}],
    [
      'con propuesta',
      { [LIST_SUGGESTIONS]: json(200, suggestionList(okSuggestion)) },
      {},
    ],
    [
      'con regla de seguridad',
      { [LIST_SUGGESTIONS]: json(200, suggestionList(guardG1Suggestion)) },
      {},
    ],
    [
      'en modo manual',
      { [LIST_SUGGESTIONS]: json(200, suggestionList(timeoutSuggestion)) },
      {},
    ],
    ['con la consulta fallida', { [LIST_SUGGESTIONS]: problem(500) }, {}],
    [
      'con la atención deshabilitada',
      { [LIST_SUGGESTIONS]: json(200, suggestionList(okSuggestion)) },
      { enabled: false },
    ],
  ])(
    'R20: %s no hay Validar, Corregir ni Manual ni contenedores de acciones',
    async (_, routes, props) => {
      mount(routes, props);
      await waitFor(() =>
        expect(within(region()).queryByRole('status')).toBeNull(),
      );
      expectNoDecisionActions();
    },
  );

  it('R20: durante la solicitud y tras un error de red tampoco aparecen acciones de decisión', async () => {
    const post = deferred(networkError());
    const { user } = mount({
      [LIST_SUGGESTIONS]: noSuggestions,
      [REQUEST_SUGGESTION]: post.handler,
    });
    await user.click(
      await within(region()).findByRole('button', { name: 'Pedir sugerencia' }),
    );
    await within(region()).findByRole('status');
    expectNoDecisionActions();
    post.release();
    await within(region()).findByRole('alert');
    expectNoDecisionActions();
  });

  it('R20: renderActions se muestra debajo de la vista y recibe current, mode y requesting', async () => {
    const post = deferred(json(201, timeoutSuggestion));
    const renderActions = vi.fn(({ mode }: { mode: string }) => (
      <p>{`acciones:${mode}`}</p>
    ));
    const { user } = mount(
      {
        [LIST_SUGGESTIONS]: json(200, suggestionList(okSuggestion)),
        [REQUEST_SUGGESTION]: post.handler,
      },
      { renderActions },
    );
    const actions = await within(region()).findByText('acciones:proposal');
    const explanation = within(region()).getByText(okSuggestion.explanation!);
    expect(
      explanation.compareDocumentPosition(actions) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(renderActions).toHaveBeenLastCalledWith({
      current: okSuggestion,
      mode: 'proposal',
      requesting: false,
    });
    await user.click(
      within(region()).getByRole('button', { name: 'Pedir otra sugerencia' }),
    );
    await waitFor(() =>
      expect(renderActions).toHaveBeenLastCalledWith({
        current: okSuggestion,
        mode: 'proposal',
        requesting: true,
      }),
    );
    post.release();
    await within(region()).findByText('acciones:manual');
    expect(renderActions).toHaveBeenLastCalledWith({
      current: timeoutSuggestion,
      mode: 'manual',
      requesting: false,
    });
  });
});
