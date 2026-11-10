import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StaffRole } from '../../shared/api/client';
import { session } from '../../shared/api/session';
import { captureFixture } from '../../features/triage/testing/clinicalFixtures';
import {
  recordedFinding,
  recordedVitalSigns,
} from '../../features/triage/testing/clinicalFixtures';
import {
  LIST_SUGGESTIONS,
  REQUEST_SUGGESTION,
  dirtyInvalidSuggestion,
  failedSuggestion,
  guardG1Suggestion,
  guardG3Suggestion,
  invalidOutputSuggestion,
  timeoutSuggestion,
  noSuggestions,
  okSuggestion,
  suggestionList,
} from '../../features/triage/testing/suggestionFixtures';
import {
  ENCOUNTER_ID,
  deferred,
  encounter,
  encountersFor,
  fakeApi,
  json,
  networkError,
  nnPatient,
  problem,
  publicTenants,
  staffMe,
  type Handler,
} from '../../test/fakeApi';
import { translate } from '../../shared/i18n';
import { LOCALES } from '../../shared/i18n/locale';
import { formatDateTimeBogota } from '../../shared/lib/datetime';
import { norm } from '../../test/text';
import { renderApp } from '../../test/testApp';

const DETAIL = `GET /api/v1/encounters/${ENCOUNTER_ID}`;
const CAPTURE = `${DETAIL}/clinical-capture`;
const PANEL = 'Sugerencia de triage (IA)';

function setup({
  role = 'NURSE',
  path = `/triage/${ENCOUNTER_ID}`,
  handlers = {},
}: {
  role?: StaffRole;
  path?: string;
  handlers?: Record<string, Handler>;
} = {}) {
  const net = fakeApi({
    'GET /api/v1/me': json(200, staffMe[role]),
    'GET /api/v1/public/tenants': json(200, publicTenants),
    'GET /api/v1/encounters': encountersFor(() => 2),
    'GET /api/v1/pre-registrations': json(200, { items: [] }),
    [DETAIL]: json(200, encounter),
    [CAPTURE]: json(200, captureFixture()),
    [LIST_SUGGESTIONS]: json(200, suggestionList(okSuggestion)),
    ...handlers,
  });
  return {
    net,
    user: userEvent.setup(),
    ...renderApp({ entries: [path], stored: true }),
  };
}

const panel = () => screen.getByRole('region', { name: PANEL });
const findPanel = () => screen.findByRole('region', { name: PANEL });
const suggestionCalls = (net: ReturnType<typeof fakeApi>) =>
  net.requests.filter((r) => r.path.endsWith('/triage-suggestions'));

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
  session.clear();
});

describe('F-04-web panel de sugerencia: ubicación y consulta', () => {
  it('R1: NURSE ve el panel con su encabezado entre los formularios de captura y el historial', async () => {
    setup();
    const region = await findPanel();
    expect(
      within(region).getByRole('heading', { level: 2, name: PANEL }),
    ).toBeVisible();
    const forms = screen.getByRole('form', {
      name: 'Síntomas, hallazgos y notas',
    });
    // La tarjeta del historial es la que lleva «Actualizar».
    const history = screen
      .getByRole('button', { name: 'Actualizar' })
      .closest('section')!;
    expect(history).not.toContainElement(region);
    expect(
      forms.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      region.compareDocumentPosition(history) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  const otherRoleRoutes: [StaffRole, string][] = [
    ['RECEPTION', '/recepcion'],
    ['RECEPTION', '/atenciones'],
    ['RECEPTION', `/atenciones/${ENCOUNTER_ID}`],
    ['RECEPTION', `/triage/${ENCOUNTER_ID}`],
    ['PHYSICIAN', '/cola'],
    ['PHYSICIAN', '/atenciones'],
    ['PHYSICIAN', `/atenciones/${ENCOUNTER_ID}`],
    ['PHYSICIAN', `/triage/${ENCOUNTER_ID}`],
    ['ADMIN', '/reportes'],
    ['ADMIN', '/cola'],
    ['ADMIN', `/atenciones/${ENCOUNTER_ID}`],
    ['ADMIN', `/triage/${ENCOUNTER_ID}`],
  ];
  it.each(otherRoleRoutes)(
    'R1: %s en %s no ve el panel ni pide sugerencias',
    async (role, path) => {
      const { net } = setup({ role, path });
      await screen.findByRole('heading', { level: 1 });
      await waitFor(() => expect(net.calls('GET /api/v1/me')).toHaveLength(1));
      expect(
        screen.queryByRole('region', { name: PANEL }),
      ).not.toBeInTheDocument();
      expect(suggestionCalls(net)).toEqual([]);
    },
  );

  it.each(['/triage', `/atenciones/${ENCOUNTER_ID}`, '/atenciones', '/cola'])(
    'R1: NURSE en %s no ve el panel ni pide sugerencias',
    async (path) => {
      const { net } = setup({ path });
      await screen.findByRole('heading', { level: 1 });
      await waitFor(() => expect(net.calls('GET /api/v1/me')).toHaveLength(1));
      expect(
        screen.queryByRole('region', { name: PANEL }),
      ).not.toBeInTheDocument();
      expect(suggestionCalls(net)).toEqual([]);
    },
  );

  it('R2: con tomas consulta una vez y muestra solo items[0], sin las anteriores', async () => {
    const { net } = setup({
      handlers: {
        [LIST_SUGGESTIONS]: json(
          200,
          suggestionList(guardG1Suggestion, okSuggestion),
        ),
      },
    });
    const region = await findPanel();
    expect(
      await within(region).findByText(guardG1Suggestion.explanation!),
    ).toBeVisible();
    expect(
      within(region).queryByText(okSuggestion.explanation!),
    ).not.toBeInTheDocument();
    expect(net.calls(LIST_SUGGESTIONS)).toHaveLength(1);
    expect(net.calls(LIST_SUGGESTIONS)[0].body).toBeUndefined();
  });

  it('R2: sin tomas no consulta las sugerencias', async () => {
    const { net } = setup({
      handlers: {
        [CAPTURE]: json(200, captureFixture({ vitalSigns: [] })),
      },
    });
    const region = await findPanel();
    await screen.findByRole('button', { name: 'Guardar toma' });
    expect(within(region).queryByRole('status')).not.toBeInTheDocument();
    expect(suggestionCalls(net)).toEqual([]);
  });

  it('R2: con items vacío muestra que aún no se ha pedido ninguna sugerencia', async () => {
    setup({ handlers: { [LIST_SUGGESTIONS]: noSuggestions } });
    const region = await findPanel();
    expect(
      await within(region).findByText(
        'Todavía no se ha pedido ninguna sugerencia para esta atención.',
      ),
    ).toBeVisible();
  });

  it('R2: al cambiar de atención no se muestra la sugerencia de la anterior', async () => {
    const otherId = 'e0e0e0e0-0000-4000-8000-000000000002';
    const otherList = deferred(json(200, suggestionList()));
    const { router } = setup({
      handlers: {
        [`GET /api/v1/encounters/${otherId}`]: json(200, {
          ...encounter,
          id: otherId,
          patient: nnPatient,
        }),
        [`GET /api/v1/encounters/${otherId}/clinical-capture`]: json(
          200,
          captureFixture({ encounterId: otherId }),
        ),
        [`GET /api/v1/encounters/${otherId}/triage-suggestions`]:
          otherList.handler,
      },
    });
    await screen.findByText(okSuggestion.explanation!);
    await act(() => router.navigate(`/triage/${otherId}`));
    await screen.findByText('Paciente NN');
    expect(
      await within(await findPanel()).findByRole('status'),
    ).toHaveTextContent('Cargando la sugerencia…');
    expect(
      screen.queryByText(okSuggestion.explanation!),
    ).not.toBeInTheDocument();
    act(() => otherList.release());
    expect(
      await screen.findByText(
        'Todavía no se ha pedido ninguna sugerencia para esta atención.',
      ),
    ).toBeVisible();
    expect(
      screen.queryByText(okSuggestion.explanation!),
    ).not.toBeInTheDocument();
  });

  it('R3: mientras la consulta carga, el panel muestra su estado con role="status"', async () => {
    const list = deferred(json(200, suggestionList(okSuggestion)));
    setup({ handlers: { [LIST_SUGGESTIONS]: list.handler } });
    const region = await findPanel();
    expect(await within(region).findByRole('status')).toHaveTextContent(
      'Cargando la sugerencia…',
    );
    expect(screen.getByRole('button', { name: 'Guardar toma' })).toBeEnabled();
    act(() => list.release());
    expect(
      await within(region).findByText(okSuggestion.explanation!),
    ).toBeVisible();
  });

  it('R3: un 500 de la consulta muestra un error con «Reintentar» que la repite solo al pulsarlo, sin bloquear la captura', async () => {
    const { net, user } = setup({
      handlers: { [LIST_SUGGESTIONS]: problem(500) },
    });
    const region = await findPanel();
    const alert = await within(region).findByRole('alert');
    expect(alert).toHaveTextContent('No se pudo cargar la sugerencia.');
    expect(alert).toHaveTextContent(
      'El servidor tuvo un problema. Inténtalo de nuevo.',
    );
    expect(net.calls(LIST_SUGGESTIONS)).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Guardar toma' })).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Guardar hallazgos' }),
    ).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Actualizar' })).toBeEnabled();
    net.set(LIST_SUGGESTIONS, json(200, suggestionList(okSuggestion)));
    await user.click(
      within(region).getByRole('button', { name: 'Reintentar' }),
    );
    expect(
      await within(region).findByText(okSuggestion.explanation!),
    ).toBeVisible();
    expect(net.calls(LIST_SUGGESTIONS)).toHaveLength(2);
  });

  it.each([403, 404])(
    'R3: un %i de la consulta se muestra solo dentro del panel',
    async (status) => {
      setup({ handlers: { [LIST_SUGGESTIONS]: problem(status) } });
      const region = await findPanel();
      expect(await within(region).findByRole('alert')).toHaveTextContent(
        'No se pudo cargar la sugerencia.',
      );
      expect(
        screen.queryByText('No tienes permiso para ver esta página.'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('No se encontró la atención.'),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Guardar toma' }),
      ).toBeEnabled();
    },
  );

  it.each([403, 404])(
    'R19: un %i de la consulta no tumba la captura ni muestra una sugerencia',
    async (status) => {
      setup({ handlers: { [LIST_SUGGESTIONS]: problem(status) } });
      const region = await findPanel();
      await within(region).findByRole('alert');
      expect(within(region).queryByText(/Nivel sugerido/)).toBeNull();
      expect(screen.getByText('Laura Gómez Pérez')).toBeVisible();
    },
  );
});

const VITALS = `POST /api/v1/encounters/${ENCOUNTER_ID}/vital-signs`;
const FINDINGS = `POST /api/v1/encounters/${ENCOUNTER_ID}/symptom-findings`;
const REQUEST = 'Pedir sugerencia';
const REQUEST_AGAIN = 'Pedir otra sugerencia';
const NEEDS_VITALS =
  'Guarda primero una toma de signos vitales para pedir la sugerencia.';
const REQUESTING =
  'Pidiendo la sugerencia a la IA… Puede tardar hasta 20 segundos.';

async function fillVitals(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Frecuencia respiratoria/), '18');
  await user.type(screen.getByLabelText(/Saturación de oxígeno/), '98');
  await user.selectOptions(
    screen.getByLabelText(/Oxígeno suplementario/),
    'No',
  );
  await user.type(screen.getByLabelText(/Presión arterial sistólica/), '120');
  await user.type(screen.getByLabelText(/Frecuencia cardiaca/), '87');
  await user.selectOptions(screen.getByLabelText(/Nivel de conciencia/), 'A');
  await user.type(screen.getByLabelText(/Temperatura/), '36.5');
}

describe('F-04-web panel de sugerencia: solicitud', () => {
  it('R4: sin tomas el botón está deshabilitado y explica que falta guardar una toma', async () => {
    setup({
      handlers: { [CAPTURE]: json(200, captureFixture({ vitalSigns: [] })) },
    });
    const region = await findPanel();
    await screen.findByRole('button', { name: 'Guardar toma' });
    const button = within(region).getByRole('button', { name: REQUEST });
    expect(button).toBeDisabled();
    expect(within(region).getByText(NEEDS_VITALS)).toBeVisible();
    expect(button).toHaveAccessibleDescription(NEEDS_VITALS);
  });

  it.each(['REGISTERED', 'TRIAGED', 'IN_CARE', 'CLOSED', 'CANCELLED'] as const)(
    'R4: con la atención en %s el botón está deshabilitado',
    async (status) => {
      const { net } = setup({
        handlers: {
          [DETAIL]: json(200, { ...encounter, status }),
          [CAPTURE]: json(200, captureFixture({ status })),
        },
      });
      const region = await findPanel();
      await within(region).findByText(okSuggestion.explanation!);
      expect(
        within(region).getByRole('button', { name: REQUEST_AGAIN }),
      ).toBeDisabled();
      expect(within(region).queryByText(NEEDS_VITALS)).toBeNull();
      expect(net.calls(REQUEST_SUGGESTION)).toHaveLength(0);
    },
  );

  it('R4: mientras se comprueba el estado de la atención el botón está deshabilitado', async () => {
    const { net, user } = setup();
    const region = await findPanel();
    const button = await within(region).findByRole('button', {
      name: REQUEST_AGAIN,
    });
    await waitFor(() => expect(button).toBeEnabled());
    const gate = deferred(json(200, encounter));
    net.set(DETAIL, gate.handler);
    await user.click(screen.getByRole('button', { name: 'Actualizar' }));
    await screen.findByText('Comprobando el estado actual de la atención…');
    expect(button).toBeDisabled();
    act(() => gate.release());
    await waitFor(() => expect(button).toBeEnabled());
  });

  it('R5: un clic envía un único POST sin cuerpo con el token de la sesión', async () => {
    const { net, user } = setup({
      handlers: {
        [LIST_SUGGESTIONS]: noSuggestions,
        [REQUEST_SUGGESTION]: json(201, okSuggestion),
      },
    });
    const region = await findPanel();
    const button = await within(region).findByRole('button', { name: REQUEST });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
    await within(region).findByText(okSuggestion.explanation!);
    expect(net.calls(REQUEST_SUGGESTION)).toHaveLength(1);
    const [post] = net.calls(REQUEST_SUGGESTION);
    expect(post.body).toBeUndefined();
    expect([...post.query.keys()]).toEqual([]);
    expect(post.headers.get('Authorization')).toMatch(/^Bearer /);
  });

  it('R6: abrir la página, guardar una toma o hallazgos, «Actualizar» y «Reintentar» de la consulta no piden una sugerencia', async () => {
    const { net, user } = setup({
      handlers: {
        [LIST_SUGGESTIONS]: problem(500),
        [VITALS]: json(201, recordedVitalSigns),
        [FINDINGS]: json(201, { items: [recordedFinding] }),
      },
    });
    const region = await findPanel();
    await within(region).findByRole('alert');
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Guardar toma' }),
      ).toBeEnabled(),
    );
    await fillVitals(user);
    await user.click(screen.getByRole('button', { name: 'Guardar toma' }));
    await screen.findByText('Toma de signos vitales registrada.');
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Guardar hallazgos' }),
      ).toBeEnabled(),
    );
    await user.selectOptions(screen.getByLabelText('Tipo'), 'COMPLAINT_NOTE');
    await user.type(screen.getByLabelText(/Descripción/), 'Nota sintética');
    await user.click(screen.getByRole('button', { name: 'Guardar hallazgos' }));
    await screen.findByText('Hallazgos registrados.');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Actualizar' })).toBeEnabled(),
    );
    await user.click(screen.getByRole('button', { name: 'Actualizar' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Actualizar' })).toBeEnabled(),
    );
    await user.click(
      within(panel()).getByRole('button', { name: 'Reintentar' }),
    );
    await waitFor(() =>
      expect(net.calls(LIST_SUGGESTIONS).length).toBeGreaterThan(1),
    );
    expect(net.calls(VITALS)).toHaveLength(1);
    expect(net.calls(FINDINGS)).toHaveLength(1);
    expect(net.calls(REQUEST_SUGGESTION)).toHaveLength(0);
  });

  it('R7: durante la solicitud el botón se deshabilita, ignora clics, muestra la espera y la captura sigue operable', async () => {
    const post = deferred(json(201, guardG1Suggestion));
    const { net, user } = setup({
      handlers: {
        [LIST_SUGGESTIONS]: noSuggestions,
        [REQUEST_SUGGESTION]: post.handler,
      },
    });
    const region = await findPanel();
    const button = await within(region).findByRole('button', { name: REQUEST });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
    expect(await within(region).findByRole('status')).toHaveTextContent(
      REQUESTING,
    );
    expect(button).toBeDisabled();
    await user.click(button);
    expect(net.calls(REQUEST_SUGGESTION)).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Guardar toma' })).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Guardar hallazgos' }),
    ).toBeEnabled();
    expect(screen.getByLabelText(/Frecuencia cardiaca/)).toBeEnabled();
    act(() => post.release());
    await within(region).findByText(guardG1Suggestion.explanation!);
    expect(within(region).queryByText(REQUESTING)).toBeNull();
    expect(net.calls(REQUEST_SUGGESTION)).toHaveLength(1);
  });

  it('R8: tras un 201 se muestra la respuesta sin otra consulta y el resultado recibe el foco', async () => {
    const { net, user } = setup({
      handlers: {
        [LIST_SUGGESTIONS]: noSuggestions,
        [REQUEST_SUGGESTION]: json(201, guardG1Suggestion),
      },
    });
    const region = await findPanel();
    const button = await within(region).findByRole('button', { name: REQUEST });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
    const explanation = await within(region).findByText(
      guardG1Suggestion.explanation!,
    );
    await waitFor(() =>
      expect(document.activeElement).toContainElement(explanation),
    );
    expect(region).toContainElement(document.activeElement as HTMLElement);
    expect(net.calls(LIST_SUGGESTIONS)).toHaveLength(1);
  });

  it('R9: con una sugerencia vigente el botón dice «Pedir otra sugerencia» y la nueva reemplaza a la vigente', async () => {
    const { net, user } = setup({
      handlers: { [REQUEST_SUGGESTION]: json(201, guardG1Suggestion) },
    });
    const region = await findPanel();
    await within(region).findByText(okSuggestion.explanation!);
    expect(
      within(region).queryByRole('button', { name: REQUEST }),
    ).not.toBeInTheDocument();
    const button = within(region).getByRole('button', { name: REQUEST_AGAIN });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
    await within(region).findByText(guardG1Suggestion.explanation!);
    expect(
      within(region).queryByText(okSuggestion.explanation!),
    ).not.toBeInTheDocument();
    expect(
      within(region).getByRole('button', { name: REQUEST_AGAIN }),
    ).toBeEnabled();
    expect(net.calls(REQUEST_SUGGESTION)).toHaveLength(1);
  });
});

const PROPOSAL_NOTICE =
  'Propuesta de la IA, no es una decisión. El nivel de triage lo decide enfermería.';

async function shownSuggestion(handlers: Record<string, Handler> = {}) {
  const utils = setup({ handlers });
  const region = await findPanel();
  await within(region).findByText(/Nivel sugerido/);
  return { ...utils, region };
}

describe('F-04-web la sugerencia como propuesta', () => {
  it('R10: muestra el nivel en romano en una insignia neutra, la explicación y los factores con su etiqueta y nota literal', async () => {
    const { region } = await shownSuggestion();
    const badge = within(region).getByText('III');
    expect(badge).toHaveClass('badge', 'tone--neutral');
    expect(badge.className).not.toMatch(/tone--(ok|warn|error|accent)/);
    expect(badge.closest('p')).toHaveTextContent('Nivel sugerido');
    expect(within(region).getByText(okSuggestion.explanation!)).toBeVisible();
    const factors = within(region).getByRole('list', {
      name: 'Factores considerados',
    });
    const items = within(factors).getAllByRole('listitem');
    expect(items.map((item) => norm(item.textContent ?? ''))).toEqual([
      `Frecuencia cardiaca ${okSuggestion.factors![0].note}`,
      `Hallazgo 1 ${okSuggestion.factors![1].note}`,
      `campo_desconocido ${okSuggestion.factors![2].note}`,
    ]);
  });

  it('R10: el texto del modelo se muestra literal también en inglés', async () => {
    const { region, user } = await shownSuggestion();
    await user.selectOptions(
      screen.getAllByRole('combobox', { name: /Idioma/ })[0],
      'en',
    );
    expect(await within(region).findByText(/Suggested level/)).toBeVisible();
    expect(within(region).getByText(okSuggestion.explanation!)).toBeVisible();
    expect(
      within(region).getByText(okSuggestion.factors![0].note),
    ).toBeVisible();
    expect(within(region).getByText('Heart rate')).toBeVisible();
    expect(
      within(region).getByRole('heading', { name: 'Triage suggestion (AI)' }),
    ).toBeVisible();
  });

  it('R11: la sugerencia se presenta como propuesta, sin términos de decisión junto al nivel ni controles que envíen un nivel', async () => {
    const { region } = await shownSuggestion();
    const notice = within(region).getByText(PROPOSAL_NOTICE);
    expect(notice).toBeVisible();
    const level = within(region).getByText('III').closest('p')!;
    expect(level).toHaveTextContent(/sugerido/);
    // El aviso de propuesta niega la decisión; el resto del panel no usa esos términos.
    const rest = norm(region.textContent ?? '').replace(PROPOSAL_NOTICE, '');
    expect(rest).not.toMatch(/final|decisión|decidido|clasificad/i);
    expect(level.textContent).not.toMatch(
      /final|decisión|decidido|clasificad/i,
    );
    // La insignia de estado de la atención no cambia.
    const context = screen.getByRole('region', {
      name: 'Contexto de la atención',
    });
    expect(within(context).getByText('En espera de triage')).toBeVisible();
    // Sin controles para fijar o enviar un nivel: solo «Pedir otra sugerencia».
    expect(
      within(region)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Pedir otra sugerencia']);
    expect(
      region.querySelectorAll('input, select, textarea, form'),
    ).toHaveLength(0);
  });

  it('R13: sin regla de seguridad no hay aviso de regla ni nivel propuesto por la IA', async () => {
    const { region } = await shownSuggestion();
    expect(within(region).queryByText(/regla/i)).toBeNull();
    expect(within(region).queryByText(/La IA propuso/)).toBeNull();
    expect(within(region).queryByText(/PROVISIONAL/)).toBeNull();
    expect(region.querySelector('.status--warn')).toBeNull();
  });

  it('R14: muestra la hora de la solicitud en America/Bogota y quién la pidió, sin datos técnicos', async () => {
    const { region } = await shownSuggestion();
    // 15:10 UTC = 10:10 a. m. en Bogotá.
    expect(norm(formatDateTimeBogota(okSuggestion.createdAt))).toContain(
      '10:10',
    );
    const meta = within(region).getByText(/Pedida el/);
    expect(norm(meta.textContent ?? '')).toBe(
      norm(
        `Pedida el ${formatDateTimeBogota(okSuggestion.createdAt)} por ${staffMe.NURSE.fullName}.`,
      ),
    );
    const text = region.textContent ?? '';
    for (const technical of [
      okSuggestion.provider!,
      okSuggestion.model!,
      okSuggestion.promptVersion,
      String(okSuggestion.latencyMs),
      okSuggestion.id,
    ])
      expect(text).not.toContain(technical);
  });
});

/** D14: el aviso es un `div.status--warn` sin `role`, encabezado por su título. */
const guardNotice = (region: HTMLElement) =>
  within(region)
    .getByRole('heading', { name: 'Regla de seguridad aplicada' })
    .closest('div')!;

describe('F-04-web aviso de regla de seguridad', () => {
  it('R12: con G1 muestra el aviso de advertencia sin role="alert", la regla, el total NEWS2, el nivel máximo, el nivel de la IA y PROVISIONAL', async () => {
    const { region } = await shownSuggestion({
      [LIST_SUGGESTIONS]: json(200, suggestionList(guardG1Suggestion)),
    });
    const guard = guardNotice(region);
    expect(guard).toHaveClass('status', 'status--warn');
    expect(guard).not.toHaveAttribute('role');
    expect(within(region).queryByRole('alert')).toBeNull();
    expect(norm(guard.textContent ?? '')).toContain(
      'La IA propuso el nivel III.',
    );
    expect(norm(guard.textContent ?? '')).toContain(
      'La regla G1 (NEWS2 total 7) limita el nivel a II como máximo.',
    );
    expect(guard.textContent).not.toMatch(/Parámetro/);
    expect(guard).toHaveTextContent(
      'PROVISIONAL — no validado clínicamente, revisar con asesor clínico.',
    );
    expect(within(region).getByText('II')).toHaveClass(
      'badge',
      'tone--neutral',
    );
  });

  it('R12: con G3 muestra el parámetro con su etiqueta y sus puntos', async () => {
    const { region } = await shownSuggestion({
      [LIST_SUGGESTIONS]: json(200, suggestionList(guardG3Suggestion)),
    });
    const guard = guardNotice(region);
    const text = norm(guard.textContent ?? '');
    expect(text).toContain('La IA propuso el nivel IV.');
    expect(text).toContain(
      'La regla G3 (NEWS2 total 3) limita el nivel a III como máximo.',
    );
    expect(text).toContain('Parámetro: Frecuencia cardiaca, 3 puntos.');
    expect(text).not.toContain('vital_signs.heart_rate');
  });

  it('R12: el texto PROVISIONAL del aviso es idéntico al de la captura en los cinco idiomas', async () => {
    const { region, user } = await shownSuggestion({
      [LIST_SUGGESTIONS]: json(200, suggestionList(guardG1Suggestion)),
    });
    for (const locale of LOCALES) {
      await user.selectOptions(
        screen.getAllByRole('combobox', {
          name: /Idioma|Language|Langue|Sprache/,
        })[0],
        locale,
      );
      const provisional = translate(locale, 'clinical_provisional');
      await waitFor(() =>
        expect(within(region).getByText(provisional)).toBeVisible(),
      );
      const vitals = screen.getByRole('form', {
        name: translate(locale, 'clinical_vitals_title'),
      });
      expect(within(vitals).getByText(provisional)).toBeVisible();
    }
  });
});

const MANUAL =
  'No hay una sugerencia válida. El triage de esta atención será manual.';
const CONFLICT =
  'No se pudo pedir la sugerencia: la atención cambió. Se está comprobando su estado.';

/** Abre la captura con la consulta dada y pulsa el botón de solicitud. */
async function requestWith(
  post: Handler,
  list: Handler = noSuggestions,
  extra: Record<string, Handler> = {},
) {
  const utils = setup({
    handlers: {
      [LIST_SUGGESTIONS]: list,
      [REQUEST_SUGGESTION]: post,
      ...extra,
    },
  });
  const region = await findPanel();
  const button = await within(region).findByRole('button', {
    name: /Pedir (otra )?sugerencia/,
  });
  await waitFor(() => expect(button).toBeEnabled());
  await utils.user.click(button);
  return { ...utils, region };
}

function expectNoProposal(region: HTMLElement) {
  expect(within(region).queryByText(/Nivel sugerido/)).toBeNull();
  expect(within(region).queryByText(/La IA propuso/)).toBeNull();
  expect(
    within(region).queryByRole('heading', {
      name: 'Regla de seguridad aplicada',
    }),
  ).toBeNull();
  expect(within(region).queryByText('Factores considerados')).toBeNull();
  expect(within(region).queryByText(/Explicación de la IA/)).toBeNull();
  expect(region.querySelector('.badge')).toBeNull();
}

describe('F-04-web modo manual y errores de la solicitud', () => {
  it.each([
    ['INVALID_OUTPUT', invalidOutputSuggestion],
    ['TIMEOUT', timeoutSuggestion],
    ['FAILED', failedSuggestion],
    ['INVALID_OUTPUT con campos sucios', dirtyInvalidSuggestion],
  ] as const)(
    'R16: un 201 con %s muestra el modo manual sin nivel, explicación, factores ni aviso de regla',
    async (_, suggestion) => {
      const { region } = await requestWith(json(201, suggestion));
      expect(await within(region).findByText(MANUAL)).toBeVisible();
      expectNoProposal(region);
      expect(
        within(region).queryByText(dirtyInvalidSuggestion.explanation!),
      ).toBeNull();
      expect(
        within(region).queryByText(dirtyInvalidSuggestion.factors![0].note),
      ).toBeNull();
      // Sigue siendo una propuesta pedida: se puede pedir otra.
      expect(
        within(region).getByRole('button', { name: 'Pedir otra sugerencia' }),
      ).toBeEnabled();
    },
  );

  it('R16: una consulta cuyo items[0] no es válido también muestra el modo manual', async () => {
    setup({
      handlers: {
        [LIST_SUGGESTIONS]: json(
          200,
          suggestionList(dirtyInvalidSuggestion, okSuggestion),
        ),
      },
    });
    const region = await findPanel();
    expect(await within(region).findByText(MANUAL)).toBeVisible();
    expectNoProposal(region);
    expect(within(region).queryByText(okSuggestion.explanation!)).toBeNull();
  });

  it.each([
    ['red', networkError(), 'No hay conexión con el servidor.'],
    ['500', problem(500), 'El servidor tuvo un problema. Inténtalo de nuevo.'],
  ] as const)(
    'R17: un error de %s sin sugerencia válida previa muestra el error con «Reintentar» y el modo manual',
    async (_, handler, message) => {
      const { region, net, user } = await requestWith(handler);
      const alert = await within(region).findByRole('alert');
      expect(alert).toHaveTextContent(message);
      expect(within(region).getByText(MANUAL)).toBeVisible();
      expectNoProposal(region);
      expect(net.calls(REQUEST_SUGGESTION)).toHaveLength(1);
      // Sin reintento automático.
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(net.calls(REQUEST_SUGGESTION)).toHaveLength(1);
      net.set(REQUEST_SUGGESTION, json(201, okSuggestion));
      await user.click(
        within(alert).getByRole('button', { name: 'Reintentar' }),
      );
      await within(region).findByText(okSuggestion.explanation!);
      expect(net.calls(REQUEST_SUGGESTION)).toHaveLength(2);
      expect(within(region).queryByRole('alert')).toBeNull();
      expect(within(region).queryByText(MANUAL)).toBeNull();
    },
  );

  it('R17: con una sugerencia válida previa, un error de servidor la conserva como vigente', async () => {
    const { region } = await requestWith(
      problem(503),
      json(200, suggestionList(okSuggestion)),
    );
    expect(await within(region).findByRole('alert')).toHaveTextContent(
      'El servidor tuvo un problema. Inténtalo de nuevo.',
    );
    expect(within(region).getByText(okSuggestion.explanation!)).toBeVisible();
    expect(within(region).getByText('III')).toBeVisible();
    expect(within(region).queryByText(MANUAL)).toBeNull();
  });

  it('R18: un 409 muestra el mensaje en contexto, comprueba el estado y deshabilita el botón si la atención salió de espera, sin modo manual', async () => {
    const { region, net } = await requestWith(problem(409));
    const alert = await within(region).findByRole('alert');
    expect(alert).toHaveTextContent(CONFLICT);
    expect(
      within(alert).queryByRole('button', { name: 'Reintentar' }),
    ).toBeNull();
    expect(within(region).queryByText(MANUAL)).toBeNull();
    // La captura se invalida (como F-03-web R17) y la página comprueba el estado.
    await waitFor(() =>
      expect(net.calls(DETAIL).length).toBeGreaterThanOrEqual(2),
    );
    await waitFor(() =>
      expect(net.calls(CAPTURE).length).toBeGreaterThanOrEqual(2),
    );
    expect(net.calls(REQUEST_SUGGESTION)).toHaveLength(1);
  });

  it('R18: tras un 409, si la atención ya no está en espera el botón queda deshabilitado', async () => {
    const { net, user } = setup({
      handlers: { [LIST_SUGGESTIONS]: noSuggestions },
    });
    // La atención pasa a TRIAGED en el servidor justo cuando llega la solicitud.
    net.set(REQUEST_SUGGESTION, (request) => {
      net.set(DETAIL, json(200, { ...encounter, status: 'TRIAGED' }));
      net.set(CAPTURE, json(200, captureFixture({ status: 'TRIAGED' })));
      return problem(409)(request);
    });
    const region = await findPanel();
    const button = await within(region).findByRole('button', {
      name: 'Pedir sugerencia',
    });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
    expect(await within(region).findByRole('alert')).toHaveTextContent(
      CONFLICT,
    );
    await screen.findByText(/La atención ya no está en espera de triage/);
    expect(
      within(region).getByRole('button', { name: /Pedir (otra )?sugerencia/ }),
    ).toBeDisabled();
    expect(within(region).queryByText(MANUAL)).toBeNull();
  });

  it('R19: un 401 de la solicitud cierra la sesión y vuelve al login sin mostrar una sugerencia', async () => {
    const { router } = await requestWith(
      problem(401),
      json(200, suggestionList(okSuggestion)),
    );
    await screen.findByRole('heading', { name: 'Iniciar sesión', level: 1 });
    expect(router.state.location.pathname).toBe('/login');
    expect(screen.queryByText(okSuggestion.explanation!)).toBeNull();
  });

  it.each([
    [403, 'No tienes permiso para ver esta página.'],
    [404, 'No se encontró la atención.'],
  ] as const)(
    'R19: un %i de la solicitud muestra la vista de la página sin la sugerencia anterior',
    async (status, message) => {
      await requestWith(
        problem(status),
        json(200, suggestionList(okSuggestion)),
      );
      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(screen.queryByRole('region', { name: PANEL })).toBeNull();
      expect(screen.queryByText(okSuggestion.explanation!)).toBeNull();
      expect(
        screen.queryByRole('button', { name: 'Guardar toma' }),
      ).not.toBeInTheDocument();
    },
  );
});

const OUTDATED =
  'Se registraron datos después de esta sugerencia. Puedes pedir otra.';

describe('F-04-web aviso de datos posteriores', () => {
  it('R15: guardar una toma posterior a la sugerencia muestra el aviso sin pedir otra; pedir otra lo quita', async () => {
    const { net, user } = setup();
    const region = await findPanel();
    await within(region).findByText(okSuggestion.explanation!);
    expect(within(region).queryByText(OUTDATED)).toBeNull();
    const later = {
      ...recordedVitalSigns,
      id: 'f0300000-0000-4000-8000-000000000099',
      recordedAt: '2026-10-28T15:20:00.000Z',
    };
    net.set(VITALS, (request) => {
      net.set(
        CAPTURE,
        json(200, captureFixture({ vitalSigns: [later, recordedVitalSigns] })),
      );
      return json(201, later)(request);
    });
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Guardar toma' }),
      ).toBeEnabled(),
    );
    await fillVitals(user);
    await user.click(screen.getByRole('button', { name: 'Guardar toma' }));
    const notice = await within(region).findByText(OUTDATED);
    expect(notice).toHaveClass('status', 'status--warn');
    expect(notice).not.toHaveAttribute('role');
    expect(net.calls(REQUEST_SUGGESTION)).toHaveLength(0);

    net.set(
      REQUEST_SUGGESTION,
      json(201, {
        ...guardG1Suggestion,
        createdAt: '2026-10-28T15:30:00.000Z',
      }),
    );
    const again = within(region).getByRole('button', {
      name: 'Pedir otra sugerencia',
    });
    await waitFor(() => expect(again).toBeEnabled());
    await user.click(again);
    await within(region).findByText(guardG1Suggestion.explanation!);
    expect(within(region).queryByText(OUTDATED)).toBeNull();
  });
});

describe('F-04-web transversales en la captura', () => {
  it('R21: al cambiar de idioma la sugerencia vigente se conserva y los textos del panel cambian', async () => {
    const { user, net } = await shownSuggestion();
    for (const locale of LOCALES) {
      await user.selectOptions(
        screen.getAllByRole('combobox', {
          name: /Idioma|Language|Langue|Sprache/,
        })[0],
        locale,
      );
      const panelRegion = await screen.findByRole('region', {
        name: translate(locale, 'suggestion_title'),
      });
      expect(
        within(panelRegion).getByText(okSuggestion.explanation!),
      ).toBeVisible();
      expect(within(panelRegion).getByText('III')).toBeVisible();
      expect(
        within(panelRegion).getByText(
          translate(locale, 'suggestion_proposal_notice'),
        ),
      ).toBeVisible();
    }
    // La sugerencia vigente sigue en caché: ni otra consulta ni una solicitud.
    expect(net.calls(LIST_SUGGESTIONS)).toHaveLength(1);
    expect(net.calls(REQUEST_SUGGESTION)).toHaveLength(0);
  });

  it('R22: la sugerencia no queda en localStorage, sessionStorage, la URL, la consola, el borrador ni la guía de voz', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map(
      (method) => vi.spyOn(console, method),
    );
    const synthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      getVoices: () => [],
    };
    vi.stubGlobal('speechSynthesis', synthesis);
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        text: string;
        lang = '';
        constructor(text: string) {
          this.text = text;
        }
      },
    );
    try {
      const { router, user } = setup({
        handlers: {
          [LIST_SUGGESTIONS]: noSuggestions,
          [REQUEST_SUGGESTION]: json(201, guardG3Suggestion),
        },
      });
      const region = await findPanel();
      const button = await within(region).findByRole('button', {
        name: 'Pedir sugerencia',
      });
      await waitFor(() => expect(button).toBeEnabled());
      await user.click(button);
      await within(region).findByText(guardG3Suggestion.explanation!);
      // Un borrador de signos vitales (UI-03-web) mientras la sugerencia está visible.
      await user.type(screen.getByLabelText(/Frecuencia cardiaca/), '87');
      await user.click(
        screen.getByText('Preferencias', { selector: 'summary span' }),
      );
      await user.click(screen.getByRole('button', { name: 'Escuchar guía' }));
      const secrets = [
        guardG3Suggestion.explanation!,
        ...guardG3Suggestion.factors!.map((factor) => factor.note),
        guardG3Suggestion.id,
        'G3',
        '"suggestedLevel"',
        'llmLevel',
      ];
      const stored = [localStorage, sessionStorage].flatMap((storage) =>
        Object.keys(storage).map((key) => `${key}=${storage.getItem(key)}`),
      );
      const location = `${router.state.location.pathname}${router.state.location.search}${router.state.location.hash}`;
      const logged = spies.flatMap((spy) =>
        spy.mock.calls.map((call) => call.map(String).join(' ')),
      );
      const spoken = synthesis.speak.mock.calls.map(
        ([utterance]) => (utterance as SpeechSynthesisUtterance).text,
      );
      expect(spoken.length).toBeGreaterThan(0);
      for (const secret of secrets) {
        for (const text of [...stored, location, ...logged, ...spoken])
          expect(text).not.toContain(secret);
      }
      expect(location).toBe(`/triage/${ENCOUNTER_ID}`);
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
  });

  it('R24: el panel es operable con teclado en orden, con el foco en el botón de solicitud', async () => {
    const { user } = setup({
      handlers: {
        [LIST_SUGGESTIONS]: noSuggestions,
        [REQUEST_SUGGESTION]: json(201, okSuggestion),
      },
    });
    const region = await findPanel();
    const button = await within(region).findByRole('button', {
      name: 'Pedir sugerencia',
    });
    await waitFor(() => expect(button).toBeEnabled());
    // El botón de solicitud sigue a «Guardar hallazgos» en el orden de tabulación.
    screen.getByRole('button', { name: 'Guardar hallazgos' }).focus();
    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard('{Enter}');
    const explanation = await within(region).findByText(
      okSuggestion.explanation!,
    );
    await waitFor(() =>
      expect(document.activeElement).toContainElement(explanation),
    );
    // El resultado recibe el foco por programa, pero no entra en el orden de tabulación.
    expect(document.activeElement).toHaveAttribute('tabindex', '-1');
    await user.tab();
    expect(
      within(region).getByRole('button', { name: 'Pedir otra sugerencia' }),
    ).toHaveFocus();
  });
});
