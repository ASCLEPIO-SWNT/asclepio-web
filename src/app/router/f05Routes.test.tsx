import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StaffRole } from '../../shared/api/client';
import { session } from '../../shared/api/session';
import { captureFixture } from '../../features/triage/testing/clinicalFixtures';
import {
  LIST_SUGGESTIONS,
  REQUEST_SUGGESTION,
  failedSuggestion,
  guardG1Suggestion,
  guardG3Suggestion,
  invalidOutputSuggestion,
  noSuggestions,
  okSuggestion,
  suggestionList,
  timeoutSuggestion,
} from '../../features/triage/testing/suggestionFixtures';
import {
  DECIDED_AT,
  DECIDE,
  GET_DECISION,
  cancelledDecidedEncounter,
  closedEncounter,
  correctDecision,
  decidedEncounter,
  inCareEncounter,
  manualDecision,
  triagedEncounter,
  validateDecision,
} from '../../features/triage/testing/decisionFixtures';
import {
  ENCOUNTER_ID,
  deferred,
  encounter,
  encountersFor,
  fakeApi,
  json,
  networkError,
  problem,
  publicTenants,
  sequence,
  staffMe,
  type Handler,
} from '../../test/fakeApi';
import { renderApp } from '../../test/testApp';
import { norm } from '../../test/text';

const DETAIL = `GET /api/v1/encounters/${ENCOUNTER_ID}`;
const CAPTURE = `${DETAIL}/clinical-capture`;
const PANEL = 'Sugerencia de triage (IA)';
const CARD = 'Triage de enfermería';
const PROPOSAL_NOTICE =
  'Propuesta de la IA, no es una decisión. El nivel de triage lo decide enfermería.';
const WAITING =
  'Espera a que se cargue la sugerencia para registrar el triage.';

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
    [LIST_SUGGESTIONS]: json(200, suggestionList(guardG1Suggestion)),
    ...handlers,
  });
  return {
    net,
    user: userEvent.setup(),
    ...renderApp({ entries: [path], stored: true }),
  };
}

const card = () => screen.getByRole('region', { name: CARD });
const findCard = () => screen.findByRole('region', { name: CARD });
const decisionCalls = (net: ReturnType<typeof fakeApi>) =>
  net.requests.filter((r) => r.path.endsWith('/triage-decision'));

/** Ningún control de decisión en la tarjeta (R11). */
function expectNoDecisionControls(region: HTMLElement) {
  expect(
    within(region)
      .queryAllByRole('button')
      .filter((el) =>
        /validar|corregir|registrar triage manual|enviar corrección/i.test(
          el.textContent ?? '',
        ),
      ),
  ).toEqual([]);
  expect(within(region).queryAllByRole('radio')).toEqual([]);
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
  session.clear();
});

describe('F-05-web tarjeta de triage: ubicación', () => {
  it('R1: NURSE ve la tarjeta con su encabezado justo después del panel de sugerencia y antes del historial', async () => {
    setup();
    const region = await findCard();
    expect(
      within(region).getByRole('heading', { level: 2, name: CARD }),
    ).toBeVisible();
    const panel = screen.getByRole('region', { name: PANEL });
    expect(panel).not.toContainElement(region);
    expect(
      panel.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // Hermana inmediata del panel.
    expect(panel.nextElementSibling).toBe(region);
    const history = screen
      .getByRole('button', { name: 'Actualizar' })
      .closest('section')!;
    expect(
      region.compareDocumentPosition(history) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  const otherRoleRoutes: [StaffRole, string][] = [
    ['RECEPTION', '/recepcion'],
    ['RECEPTION', `/atenciones/${ENCOUNTER_ID}`],
    ['RECEPTION', `/triage/${ENCOUNTER_ID}`],
    ['PHYSICIAN', '/cola'],
    ['PHYSICIAN', `/atenciones/${ENCOUNTER_ID}`],
    ['PHYSICIAN', `/triage/${ENCOUNTER_ID}`],
    ['ADMIN', '/reportes'],
    ['ADMIN', `/atenciones/${ENCOUNTER_ID}`],
    ['ADMIN', `/triage/${ENCOUNTER_ID}`],
  ];
  it.each(otherRoleRoutes)(
    'R1: %s en %s no ve la tarjeta ni consulta ni envía la decisión',
    async (role, path) => {
      const { net } = setup({ role, path });
      await screen.findByRole('heading', { level: 1 });
      await waitFor(() => expect(net.calls('GET /api/v1/me')).toHaveLength(1));
      expect(
        screen.queryByRole('region', { name: CARD }),
      ).not.toBeInTheDocument();
      expect(decisionCalls(net)).toEqual([]);
    },
  );

  it.each(['/triage', `/atenciones/${ENCOUNTER_ID}`, '/atenciones', '/cola'])(
    'R1: NURSE en %s no ve la tarjeta ni consulta ni envía la decisión',
    async (path) => {
      const { net } = setup({ path });
      await screen.findByRole('heading', { level: 1 });
      await waitFor(() => expect(net.calls('GET /api/v1/me')).toHaveLength(1));
      expect(
        screen.queryByRole('region', { name: CARD }),
      ).not.toBeInTheDocument();
      expect(decisionCalls(net)).toEqual([]);
    },
  );

  it('R1: en una atención sin decidir no se consulta la decisión', async () => {
    const { net } = setup();
    await within(await findCard()).findByRole('button', {
      name: 'Validar nivel II',
    });
    expect(decisionCalls(net)).toEqual([]);
  });
});

describe('F-05-web tarjeta de triage: espera de la vigente', () => {
  it('R11: con la consulta de sugerencias cargando no hay acciones y aparece el texto de espera', async () => {
    const list = deferred(json(200, suggestionList(guardG1Suggestion)));
    setup({ handlers: { [LIST_SUGGESTIONS]: list.handler } });
    const region = await findCard();
    expect(await within(region).findByText(WAITING)).toBeVisible();
    expectNoDecisionControls(region);
    list.release();
    expect(
      await within(region).findByRole('button', { name: 'Validar nivel II' }),
    ).toBeVisible();
    expect(within(region).queryByText(WAITING)).not.toBeInTheDocument();
  });

  it('R11: con la consulta de sugerencias en 500 no hay acciones y aparece el texto de espera', async () => {
    setup({ handlers: { [LIST_SUGGESTIONS]: problem(500) } });
    const region = await findCard();
    await screen.findByText('No se pudo cargar la sugerencia.');
    expect(within(region).getByText(WAITING)).toBeVisible();
    expectNoDecisionControls(region);
  });

  it('R11: con una solicitud de sugerencia en curso no hay acciones y aparece el texto de espera', async () => {
    const post = deferred(json(201, guardG1Suggestion));
    const { user } = setup({
      handlers: { [REQUEST_SUGGESTION]: post.handler },
    });
    const region = await findCard();
    await within(region).findByRole('button', { name: 'Validar nivel II' });
    await user.click(
      screen.getByRole('button', { name: 'Pedir otra sugerencia' }),
    );
    expect(await within(region).findByText(WAITING)).toBeVisible();
    expectNoDecisionControls(region);
    post.release();
    expect(
      await within(region).findByRole('button', { name: 'Validar nivel II' }),
    ).toBeVisible();
  });
});

const proposalCard = async () => {
  const region = await findCard();
  await within(region).findByRole('button', { name: 'Validar nivel II' });
  return region;
};

describe('F-05-web Validar y Corregir', () => {
  it('R2: con una vigente OK con guard, «Validar nivel II» usa suggestedLevel y no llmLevel, y no hay triage manual', async () => {
    setup();
    const region = await proposalCard();
    expect(guardG1Suggestion.llmLevel).toBe(3);
    expect(
      within(region).queryByRole('button', { name: 'Validar nivel III' }),
    ).not.toBeInTheDocument();
    expect(
      within(region).getByRole('button', { name: 'Corregir' }),
    ).toBeVisible();
    expect(
      within(region).queryByRole('button', {
        name: 'Registrar triage manual',
      }),
    ).not.toBeInTheDocument();
    expect(within(region).queryAllByRole('radio')).toEqual([]);
  });

  it('R3: Validar y Corregir tienen el mismo peso visual y se deshabilitan a la vez', async () => {
    const post = deferred(json(201, validateDecision));
    const { user } = setup({ handlers: { [DECIDE]: post.handler } });
    const region = await proposalCard();
    const validate = within(region).getByRole('button', {
      name: 'Validar nivel II',
    });
    const correct = within(region).getByRole('button', { name: 'Corregir' });
    expect(validate.className).toBe(correct.className);
    expect(validate.className).toBe('button button--secondary');
    expect(validate.parentElement).toBe(correct.parentElement);
    expect(validate.parentElement).toHaveClass('decision-actions');
    expect(validate.nextElementSibling).toBe(correct);
    for (const button of [validate, correct]) {
      expect(button).toHaveAttribute('type', 'button');
      expect(button).not.toHaveAttribute('autofocus');
      expect(button.closest('form')).toBeNull();
      expect(button.querySelectorAll('svg')).toHaveLength(1);
      expect(button).toBeEnabled();
      expect(button).not.toHaveFocus();
    }
    await user.click(validate);
    await waitFor(() => expect(validate).toBeDisabled());
    expect(correct).toBeDisabled();
    post.release();
  });

  it('R4: un clic en Validar hace en ese mismo clic un solo POST con { action, suggestionId }', async () => {
    const { net, user } = setup({
      handlers: { [DECIDE]: json(201, validateDecision) },
    });
    const region = await proposalCard();
    await user.click(
      within(region).getByRole('button', { name: 'Validar nivel II' }),
    );
    await waitFor(() => expect(net.calls(DECIDE)).toHaveLength(1));
    expect(net.calls(DECIDE)[0].body).toEqual({
      action: 'VALIDATE',
      suggestionId: guardG1Suggestion.id,
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('R5: Corregir abre el formulario sin POST, con el sugerido deshabilitado, y Cancelar lo cierra y descarta el borrador', async () => {
    const { net, user } = setup();
    const region = await proposalCard();
    await user.click(within(region).getByRole('button', { name: 'Corregir' }));
    const group = within(region).getByRole('group', {
      name: 'Nivel de triage',
    });
    expect(
      within(group).getByRole('radio', { name: 'II (sugerido)' }),
    ).toBeDisabled();
    for (const name of ['I', 'III', 'IV', 'V'])
      expect(within(group).getByRole('radio', { name })).toBeEnabled();
    expect(
      within(region).getByRole('textbox', { name: 'Motivo de la corrección' }),
    ).toBeVisible();
    expect(within(region).getByText('0/500')).toBeVisible();
    expect(
      within(region).getByRole('button', { name: 'Enviar corrección' }),
    ).toBeVisible();
    // Sin aviso por el máximo del guard (PA-6 a).
    expect(region.textContent).not.toMatch(/G1|regla de seguridad/i);
    await user.click(within(group).getByRole('radio', { name: 'IV' }));
    await user.type(
      within(region).getByRole('textbox', { name: 'Motivo de la corrección' }),
      'Motivo',
    );
    expect(within(region).getByText('6/500')).toBeVisible();
    await user.click(within(region).getByRole('button', { name: 'Cancelar' }));
    expect(
      within(region).queryByRole('group', { name: 'Nivel de triage' }),
    ).not.toBeInTheDocument();
    await user.click(within(region).getByRole('button', { name: 'Corregir' }));
    expect(within(region).getByRole('radio', { name: 'IV' })).not.toBeChecked();
    expect(
      within(region).getByRole('textbox', { name: 'Motivo de la corrección' }),
    ).toHaveValue('');
    expect(decisionCalls(net)).toEqual([]);
  });

  it('R6: cada error aparece junto a su campo, sin POST, y el foco va al primer campo con error', async () => {
    const { net, user } = setup();
    const region = await proposalCard();
    await user.click(within(region).getByRole('button', { name: 'Corregir' }));
    const submit = within(region).getByRole('button', {
      name: 'Enviar corrección',
    });
    const reason = within(region).getByRole('textbox', {
      name: 'Motivo de la corrección',
    });
    const group = within(region).getByRole('group', {
      name: 'Nivel de triage',
    });
    // Sin nivel y sin motivo.
    await user.click(submit);
    expect(await within(region).findByText('Elige un nivel.')).toBeVisible();
    expect(
      within(region).getByText('Escribe el motivo de la corrección.'),
    ).toBeVisible();
    expect(group).toHaveAttribute(
      'aria-describedby',
      within(region).getByText('Elige un nivel.').id,
    );
    expect(reason).toHaveAttribute(
      'aria-describedby',
      expect.stringContaining(
        within(region).getByText('Escribe el motivo de la corrección.').id,
      ),
    );
    expect(document.activeElement).toBe(
      within(group).getByRole('radio', { name: 'I' }),
    );
    // Nivel elegido y motivo solo de espacios: el foco va al motivo.
    await user.click(within(group).getByRole('radio', { name: 'IV' }));
    await user.type(reason, '    ');
    await user.click(submit);
    await waitFor(() => expect(reason).toHaveFocus());
    expect(
      within(region).getByText('Escribe el motivo de la corrección.'),
    ).toBeVisible();
    expect(within(region).queryByText('Elige un nivel.')).toBeNull();
    // Motivo de 501 caracteres tras recortar.
    await user.clear(reason);
    await user.click(reason);
    await user.paste(` ${'a'.repeat(501)} `);
    await user.click(submit);
    expect(
      await within(region).findByText(
        'El motivo no puede superar 500 caracteres.',
      ),
    ).toBeVisible();
    expect(decisionCalls(net)).toEqual([]);
  });

  it('R7: Enviar corrección hace un solo POST CORRECT con la vigente, el nivel y el motivo recortado', async () => {
    const { net, user } = setup({
      handlers: { [DECIDE]: json(201, correctDecision) },
    });
    const region = await proposalCard();
    await user.click(within(region).getByRole('button', { name: 'Corregir' }));
    await user.click(within(region).getByRole('radio', { name: 'IV' }));
    await user.type(
      within(region).getByRole('textbox', { name: 'Motivo de la corrección' }),
      '  Motivo literal  ',
    );
    await user.click(
      within(region).getByRole('button', { name: 'Enviar corrección' }),
    );
    await waitFor(() => expect(net.calls(DECIDE)).toHaveLength(1));
    expect(net.calls(DECIDE)[0].body).toEqual({
      action: 'CORRECT',
      suggestionId: guardG1Suggestion.id,
      level: 4,
      reason: 'Motivo literal',
    });
  });

  it('R24: antes de decidir, el panel no tiene controles ni términos de decisión y la insignia sigue en espera', async () => {
    const { user } = setup();
    const region = await proposalCard();
    const panel = screen.getByRole('region', { name: PANEL });
    const context = screen.getByRole('region', {
      name: 'Contexto de la atención',
    });
    const check = () => {
      // El aviso de propuesta de F-04-web niega la decisión; el resto no usa esos términos.
      expect(
        norm(panel.textContent ?? '').replace(PROPOSAL_NOTICE, ''),
      ).not.toMatch(/final|decisión|decidido|clasificad/i);
      expect(
        within(panel)
          .queryAllByRole('button')
          .filter((el) =>
            /validar|corregir|manual/i.test(el.textContent ?? ''),
          ),
      ).toEqual([]);
      expect(within(panel).queryAllByRole('radio')).toEqual([]);
      expect(region.textContent).not.toMatch(
        /final|decisión|decidido|clasificad/i,
      );
      expect(within(context).getByText('En espera de triage')).toBeVisible();
    };
    check();
    await user.click(within(region).getByRole('button', { name: 'Corregir' }));
    check();
  });
});

const MANUAL_NOTICE =
  'No hay una sugerencia válida. El triage de esta atención será manual.';

describe('F-05-web triage manual', () => {
  it.each([
    ['FAILED', failedSuggestion],
    ['TIMEOUT', timeoutSuggestion],
    ['INVALID_OUTPUT', invalidOutputSuggestion],
  ] as const)(
    'R8: con la vigente %s se ofrece el triage manual sin Validar ni Corregir, y el aviso sigue en el panel',
    async (_, suggestion) => {
      setup({
        handlers: { [LIST_SUGGESTIONS]: json(200, suggestionList(suggestion)) },
      });
      const region = await findCard();
      expect(
        await within(region).findByRole('button', {
          name: 'Registrar triage manual',
        }),
      ).toBeVisible();
      const group = within(region).getByRole('group', {
        name: 'Nivel de triage',
      });
      expect(within(group).getAllByRole('radio')).toHaveLength(5);
      for (const radio of within(group).getAllByRole('radio'))
        expect(radio).toBeEnabled();
      expect(
        within(region).queryByRole('button', { name: /Validar/ }),
      ).not.toBeInTheDocument();
      expect(
        within(region).queryByRole('button', { name: 'Corregir' }),
      ).not.toBeInTheDocument();
      expect(
        within(screen.getByRole('region', { name: PANEL })).getByText(
          MANUAL_NOTICE,
        ),
      ).toBeVisible();
    },
  );

  it('R8: sin ninguna sugerencia pedida se ofrece el triage manual', async () => {
    setup({ handlers: { [LIST_SUGGESTIONS]: noSuggestions } });
    const region = await findCard();
    expect(
      await within(region).findByRole('button', {
        name: 'Registrar triage manual',
      }),
    ).toBeVisible();
    expect(
      within(region).queryByRole('button', { name: /Validar/ }),
    ).not.toBeInTheDocument();
  });

  it('R8: sin ninguna toma de signos vitales también se ofrece el triage manual (PA-7 a)', async () => {
    const { net } = setup({
      handlers: { [CAPTURE]: json(200, captureFixture({ vitalSigns: [] })) },
    });
    const region = await findCard();
    expect(
      await within(region).findByRole('button', {
        name: 'Registrar triage manual',
      }),
    ).toBeVisible();
    expect(within(region).queryByText(WAITING)).not.toBeInTheDocument();
    expect(net.calls(LIST_SUGGESTIONS)).toEqual([]);
  });

  it('R9: sin un nivel elegido, error junto al selector, foco en él y sin POST', async () => {
    const { net, user } = setup({
      handlers: {
        [LIST_SUGGESTIONS]: json(200, suggestionList(failedSuggestion)),
      },
    });
    const region = await findCard();
    await user.click(
      await within(region).findByRole('button', {
        name: 'Registrar triage manual',
      }),
    );
    const error = await within(region).findByText('Elige un nivel.');
    const group = within(region).getByRole('group', {
      name: 'Nivel de triage',
    });
    expect(group).toHaveAttribute('aria-describedby', error.id);
    expect(within(group).getByRole('radio', { name: 'I' })).toHaveFocus();
    expect(decisionCalls(net)).toEqual([]);
  });

  it('R10: con un nivel elegido hace en ese mismo clic un solo POST { action: MANUAL, level }', async () => {
    const { net, user } = setup({
      handlers: {
        [LIST_SUGGESTIONS]: json(200, suggestionList(timeoutSuggestion)),
        [DECIDE]: json(201, manualDecision),
      },
    });
    const region = await findCard();
    await user.click(await within(region).findByRole('radio', { name: 'III' }));
    await user.click(
      within(region).getByRole('button', { name: 'Registrar triage manual' }),
    );
    await waitFor(() => expect(net.calls(DECIDE)).toHaveLength(1));
    expect(net.calls(DECIDE)[0].body).toEqual({ action: 'MANUAL', level: 3 });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('F-05-web envío y decisión registrada', () => {
  it('R12: con un envío en curso todo queda deshabilitado, el segundo clic se ignora y aparece «Registrando el triage…»', async () => {
    const post = deferred(json(201, validateDecision));
    const { net, user } = setup({ handlers: { [DECIDE]: post.handler } });
    const region = await proposalCard();
    const validate = within(region).getByRole('button', {
      name: 'Validar nivel II',
    });
    await user.click(validate);
    expect(await within(region).findByRole('status')).toHaveTextContent(
      'Registrando el triage…',
    );
    expect(validate).toBeDisabled();
    expect(
      within(region).getByRole('button', { name: 'Corregir' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Pedir otra sugerencia' }),
    ).toBeDisabled();
    await user.click(validate);
    validate.click();
    expect(net.calls(DECIDE)).toHaveLength(1);
    post.release();
    await within(region).findByText('Sugerencia validada');
    expect(net.calls(DECIDE)).toHaveLength(1);
  });

  it('R12: un envío fallido no se reintenta solo', async () => {
    const { net, user } = setup({ handlers: { [DECIDE]: problem(503) } });
    const region = await proposalCard();
    await user.click(
      within(region).getByRole('button', { name: 'Validar nivel II' }),
    );
    await within(region).findByRole('alert');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(net.calls(DECIDE)).toHaveLength(1);
  });

  it('R14: tras un 201 la decisión aparece sin esperar al GET de la atención, recibe el foco y desaparecen las acciones', async () => {
    const reread = deferred(json(200, triagedEncounter));
    const { net, user } = setup({
      handlers: {
        [DETAIL]: sequence(json(200, encounter), reread.handler),
        [DECIDE]: json(201, validateDecision),
      },
    });
    const region = await proposalCard();
    await user.click(
      within(region).getByRole('button', { name: 'Validar nivel II' }),
    );
    const action = await within(region).findByText('Sugerencia validada');
    // La relectura de la atención sigue pendiente (invalidada tras el 201).
    await waitFor(() => expect(net.calls(DETAIL)).toHaveLength(2));
    expect(action.closest('.decision-view')).toHaveFocus();
    expect(
      within(region).queryByRole('button', { name: /Validar|Corregir/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Pedir otra sugerencia' }),
    ).not.toBeInTheDocument();
    // La insignia cambia solo cuando la API confirma el nuevo estado (R24).
    const context = screen.getByRole('region', {
      name: 'Contexto de la atención',
    });
    expect(within(context).getByText('En espera de triage')).toBeVisible();
    reread.release();
    expect(await within(context).findByText('Clasificada')).toBeVisible();
  });

  it.each([
    ['TRIAGED', triagedEncounter],
    ['IN_CARE', inCareEncounter],
    ['CLOSED', closedEncounter],
    ['CANCELLED', cancelledDecidedEncounter],
  ] as const)(
    'R15: una atención decidida en %s consulta y muestra la decisión, sin acciones ni botón de solicitud',
    async (_, decided) => {
      const { net } = setup({
        handlers: {
          [DETAIL]: json(200, decided),
          [CAPTURE]: json(200, captureFixture({ status: decided.status })),
          [GET_DECISION]: json(200, validateDecision),
        },
      });
      const region = await findCard();
      expect(
        await within(region).findByText('Sugerencia validada'),
      ).toBeVisible();
      expect(net.calls(GET_DECISION)).toHaveLength(1);
      expect(within(region).queryAllByRole('button')).toEqual([]);
      expect(within(region).queryAllByRole('radio')).toEqual([]);
      const panel = screen.getByRole('region', { name: PANEL });
      expect(within(panel).queryAllByRole('button')).toEqual([]);
      expect(panel.textContent).not.toMatch(/Guarda primero una toma/);
      expect(decisionCalls(net).filter((r) => r.method === 'POST')).toEqual([]);
    },
  );

  it('R15: decidida y sin tomas, tampoco aparece «Guarda primero una toma…»', async () => {
    setup({
      handlers: {
        [DETAIL]: json(200, decidedEncounter('TRIAGED', manualDecision)),
        [CAPTURE]: json(
          200,
          captureFixture({ status: 'TRIAGED', vitalSigns: [] }),
        ),
        [GET_DECISION]: json(200, manualDecision),
      },
    });
    const region = await findCard();
    expect(await within(region).findByText('Triage manual')).toBeVisible();
    expect(screen.getByRole('region', { name: PANEL }).textContent).not.toMatch(
      /Guarda primero una toma/,
    );
  });

  it('R17: la consulta de la decisión cargando muestra su estado de carga, sin acciones', async () => {
    const get = deferred(json(200, validateDecision));
    setup({
      handlers: {
        [DETAIL]: json(200, triagedEncounter),
        [CAPTURE]: json(200, captureFixture({ status: 'TRIAGED' })),
        [GET_DECISION]: get.handler,
      },
    });
    const region = await findCard();
    expect(await within(region).findByRole('status')).toHaveTextContent(
      'Cargando el triage registrado…',
    );
    expectNoDecisionControls(region);
    get.release();
    expect(
      await within(region).findByText('Sugerencia validada'),
    ).toBeVisible();
  });

  it.each([
    ['500', problem(500)],
    ['404 con nivel final', problem(404, { detail: 'Sin decisión' })],
  ])(
    'R17: la consulta de la decisión en %s muestra un error con «Reintentar» que la repite solo al pulsarlo',
    async (_, failure) => {
      const { net, user } = setup({
        handlers: {
          [DETAIL]: json(200, triagedEncounter),
          [CAPTURE]: json(200, captureFixture({ status: 'TRIAGED' })),
          [GET_DECISION]: failure,
        },
      });
      const region = await findCard();
      const alert = await within(region).findByRole('alert');
      expect(alert).toHaveTextContent(
        'No se pudo cargar el triage registrado.',
      );
      expectNoDecisionControls(region);
      // La página sigue: no es la vista de «atención no encontrada».
      expect(screen.getByRole('region', { name: PANEL })).toBeVisible();
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(net.calls(GET_DECISION)).toHaveLength(1);
      net.set(GET_DECISION, json(200, validateDecision));
      await user.click(
        within(alert).getByRole('button', { name: 'Reintentar' }),
      );
      expect(
        await within(region).findByText('Sugerencia validada'),
      ).toBeVisible();
      expect(net.calls(GET_DECISION)).toHaveLength(2);
    },
  );
});

const CHANGED =
  'No se pudo registrar el triage: la sugerencia cambió. Revisa la sugerencia vigente antes de continuar.';
const ALREADY =
  'Esta atención ya tenía un triage registrado; el tuyo no se guardó.';

/** Abre Corregir y escribe un borrador con nivel IV y un motivo. */
async function writeCorrection(
  region: HTMLElement,
  user: ReturnType<typeof userEvent.setup>,
  reason = 'Motivo del borrador',
) {
  await user.click(within(region).getByRole('button', { name: 'Corregir' }));
  await user.click(within(region).getByRole('radio', { name: 'IV' }));
  await user.type(
    within(region).getByRole('textbox', { name: 'Motivo de la corrección' }),
    reason,
  );
}

describe('F-05-web errores del envío', () => {
  it('R18: un 409 tras el que la atención quedó decidida muestra la decisión con el aviso de que ya tenía triage', async () => {
    const { net, user } = setup({
      handlers: {
        [DETAIL]: sequence(json(200, encounter), json(200, triagedEncounter)),
        [CAPTURE]: sequence(
          json(200, captureFixture()),
          json(200, captureFixture({ status: 'TRIAGED' })),
        ),
        [DECIDE]: problem(409, { detail: 'Ya existe una decisión' }),
        [GET_DECISION]: json(200, correctDecision),
      },
    });
    const region = await proposalCard();
    await user.click(
      within(region).getByRole('button', { name: 'Validar nivel II' }),
    );
    expect(await within(region).findByText(ALREADY)).toBeVisible();
    expect(
      await within(region).findByText('Sugerencia corregida'),
    ).toBeVisible();
    expect(within(region).getByText(correctDecision.reason!)).toBeVisible();
    expect(within(region).queryAllByRole('button')).toEqual([]);
    expect(within(region).queryByText(CHANGED)).toBeNull();
    expect(net.calls(DECIDE)).toHaveLength(1);
    expect(net.calls(DETAIL).length).toBeGreaterThanOrEqual(2);
  });

  it('R18: un 409 con la atención aún en espera y otra vigente avisa, da el foco al aviso, conserva el borrador y ofrece las acciones de la nueva vigente', async () => {
    const { net, user } = setup({
      handlers: {
        [LIST_SUGGESTIONS]: sequence(
          json(200, suggestionList(guardG1Suggestion)),
          json(200, suggestionList(guardG3Suggestion, guardG1Suggestion)),
        ),
        [DECIDE]: problem(409, { detail: 'La sugerencia no es la vigente' }),
      },
    });
    const region = await proposalCard();
    await writeCorrection(region, user);
    await user.click(
      within(region).getByRole('button', { name: 'Enviar corrección' }),
    );
    const notice = await within(region).findByText(CHANGED);
    await waitFor(() => expect(notice).toHaveFocus());
    expect(net.calls(LIST_SUGGESTIONS)).toHaveLength(2);
    // La nueva vigente (G3) sugiere III: su opción queda deshabilitada y el borrador sigue.
    expect(
      await within(region).findByRole('radio', { name: 'III (sugerido)' }),
    ).toBeDisabled();
    expect(within(region).getByRole('radio', { name: 'IV' })).toBeChecked();
    expect(
      within(region).getByRole('textbox', { name: 'Motivo de la corrección' }),
    ).toHaveValue('Motivo del borrador');
    expect(within(region).queryByText(ALREADY)).toBeNull();
    // El siguiente envío usa la nueva vigente y quita el aviso.
    net.set(
      DECIDE,
      json(201, { ...correctDecision, suggestionId: guardG3Suggestion.id }),
    );
    await user.click(
      within(region).getByRole('button', { name: 'Enviar corrección' }),
    );
    await waitFor(() => expect(net.calls(DECIDE)).toHaveLength(2));
    expect(net.calls(DECIDE)[1].body).toEqual({
      action: 'CORRECT',
      suggestionId: guardG3Suggestion.id,
      level: 4,
      reason: 'Motivo del borrador',
    });
    expect(
      await within(region).findByText('Sugerencia corregida'),
    ).toBeVisible();
    expect(within(region).queryByText(CHANGED)).toBeNull();
    expect(within(region).queryByText(ALREADY)).toBeNull();
  });

  it('R18: un 409 tras el que la atención quedó cancelada mantiene las acciones ocultas', async () => {
    const cancelled = {
      ...encounter,
      status: 'CANCELLED' as const,
      cancellationReason: 'El paciente se retiró.',
    };
    const { user } = setup({
      handlers: {
        [DETAIL]: sequence(json(200, encounter), json(200, cancelled)),
        [CAPTURE]: sequence(
          json(200, captureFixture()),
          json(200, captureFixture({ status: 'CANCELLED' })),
        ),
        [DECIDE]: problem(409),
      },
    });
    const region = await proposalCard();
    await user.click(
      within(region).getByRole('button', { name: 'Validar nivel II' }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: CARD }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole('button', {
        name: /Validar|Corregir|Registrar triage/,
      }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(CHANGED)).toBeNull();
  });

  it('R19: un 422 con errores de level y reason muestra los textos de los catálogos, no los de la API, y conserva el borrador', async () => {
    const { user } = setup({
      handlers: {
        [DECIDE]: problem(422, {
          errors: [
            { field: 'level', message: 'Texto literal de la API para level' },
            { field: 'reason', message: 'Texto literal de la API para reason' },
          ],
        }),
      },
    });
    const region = await proposalCard();
    await writeCorrection(region, user);
    await user.click(
      within(region).getByRole('button', { name: 'Enviar corrección' }),
    );
    expect(await within(region).findByText('Elige un nivel.')).toBeVisible();
    expect(
      within(region).getByText('Escribe el motivo de la corrección.'),
    ).toBeVisible();
    expect(screen.queryByText(/Texto literal de la API/)).toBeNull();
    expect(within(region).getByRole('radio', { name: 'IV' })).toBeChecked();
    expect(
      within(region).getByRole('textbox', { name: 'Motivo de la corrección' }),
    ).toHaveValue('Motivo del borrador');
    await waitFor(() =>
      expect(within(region).getByRole('radio', { name: 'IV' })).toHaveFocus(),
    );
  });

  it('R19: un 422 sin campo reconocido muestra un error de acción genérico, sin «Reintentar»', async () => {
    const { user } = setup({
      handlers: {
        [DECIDE]: problem(422, {
          errors: [{ field: 'otro', message: 'Texto literal de la API' }],
        }),
      },
    });
    const region = await proposalCard();
    await writeCorrection(region, user);
    await user.click(
      within(region).getByRole('button', { name: 'Enviar corrección' }),
    );
    const alert = await within(region).findByRole('alert');
    expect(alert).toHaveTextContent(
      'El servidor tuvo un problema. Inténtalo de nuevo.',
    );
    expect(within(alert).queryByRole('button')).toBeNull();
    expect(screen.queryByText(/Texto literal de la API/)).toBeNull();
  });

  it.each([
    ['sin conexión', networkError(), 'No hay conexión con el servidor.'],
    ['500', problem(500), 'El servidor tuvo un problema. Inténtalo de nuevo.'],
    ['400', problem(400), 'El servidor tuvo un problema. Inténtalo de nuevo.'],
  ] as const)(
    'R20: un envío %s muestra el error traducido con «Reintentar», que repite el mismo cuerpo solo al pulsarlo',
    async (_, failure, message) => {
      const { net, user } = setup({ handlers: { [DECIDE]: failure } });
      const region = await proposalCard();
      await writeCorrection(region, user, '  Motivo  ');
      await user.click(
        within(region).getByRole('button', { name: 'Enviar corrección' }),
      );
      const alert = await within(region).findByRole('alert');
      expect(alert).toHaveTextContent(message);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(net.calls(DECIDE)).toHaveLength(1);
      expect(within(region).getByRole('radio', { name: 'IV' })).toBeChecked();
      expect(
        within(region).getByRole('textbox', {
          name: 'Motivo de la corrección',
        }),
      ).toHaveValue('  Motivo  ');
      net.set(DECIDE, json(201, correctDecision));
      await user.click(
        within(alert).getByRole('button', { name: 'Reintentar' }),
      );
      await waitFor(() => expect(net.calls(DECIDE)).toHaveLength(2));
      expect(net.calls(DECIDE)[1].body).toEqual(net.calls(DECIDE)[0].body);
      expect(net.calls(DECIDE)[1].body).toEqual({
        action: 'CORRECT',
        suggestionId: guardG1Suggestion.id,
        level: 4,
        reason: 'Motivo',
      });
      expect(
        await within(region).findByText('Sugerencia corregida'),
      ).toBeVisible();
    },
  );

  it('R21: un 401 del envío cierra la sesión y vuelve al login', async () => {
    const { user, router } = setup({ handlers: { [DECIDE]: problem(401) } });
    const region = await proposalCard();
    await user.click(
      within(region).getByRole('button', { name: 'Validar nivel II' }),
    );
    await screen.findByRole('heading', { name: 'Iniciar sesión', level: 1 });
    expect(router.state.location.pathname).toBe('/login');
  });

  it.each([
    [403, 'No tienes permiso para ver esta página.'],
    [404, 'No se encontró la atención.'],
  ] as const)(
    'R21: un %i del envío muestra la vista de la página',
    async (status, message) => {
      const { user } = setup({ handlers: { [DECIDE]: problem(status) } });
      const region = await proposalCard();
      await user.click(
        within(region).getByRole('button', { name: 'Validar nivel II' }),
      );
      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(
        screen.queryByRole('region', { name: CARD }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Guardar toma' }),
      ).not.toBeInTheDocument();
    },
  );

  it('R21: un 401 de la consulta de la decisión cierra la sesión y vuelve al login', async () => {
    const { router } = setup({
      handlers: {
        [DETAIL]: json(200, triagedEncounter),
        [CAPTURE]: json(200, captureFixture({ status: 'TRIAGED' })),
        [GET_DECISION]: problem(401),
      },
    });
    await screen.findByRole('heading', { name: 'Iniciar sesión', level: 1 });
    expect(router.state.location.pathname).toBe('/login');
  });

  it('R21: un 403 de la consulta de la decisión muestra la vista sin permiso', async () => {
    setup({
      handlers: {
        [DETAIL]: json(200, triagedEncounter),
        [CAPTURE]: json(200, captureFixture({ status: 'TRIAGED' })),
        [GET_DECISION]: problem(403),
      },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tienes permiso para ver esta página.',
    );
    expect(
      screen.queryByRole('region', { name: CARD }),
    ).not.toBeInTheDocument();
  });
});

const navLink = (name: string) =>
  within(screen.getByRole('navigation', { name: 'Principal' })).getByRole(
    'link',
    { name },
  );
const reasonBox = (region: HTMLElement) =>
  within(region).getByRole('textbox', { name: 'Motivo de la corrección' });

describe('F-05-web borrador de decisión', () => {
  it('R22: pedir otra sugerencia conserva el nivel y el motivo del borrador', async () => {
    const post = deferred(
      json(201, { ...guardG3Suggestion, suggestedLevel: 1 }),
    );
    const { user } = setup({
      handlers: { [REQUEST_SUGGESTION]: post.handler },
    });
    const region = await proposalCard();
    await writeCorrection(region, user);
    await user.click(
      screen.getByRole('button', { name: 'Pedir otra sugerencia' }),
    );
    await within(region).findByText(WAITING);
    post.release();
    expect(
      await within(region).findByRole('radio', { name: 'I (sugerido)' }),
    ).toBeDisabled();
    expect(within(region).getByRole('radio', { name: 'IV' })).toBeChecked();
    expect(reasonBox(region)).toHaveValue('Motivo del borrador');
  });

  it('R22: cambiar de idioma y de tema conserva el borrador', async () => {
    const { user } = setup();
    const region = await proposalCard();
    await writeCorrection(region, user);
    for (const [locale, legend, reason] of [
      ['en', 'Triage level', 'Reason for the correction'],
      ['pt', 'Nível de triagem', 'Motivo da correção'],
      ['fr', 'Niveau de triage', 'Motif de la correction'],
      ['de', 'Triagestufe', 'Grund der Korrektur'],
      ['es', 'Nivel de triage', 'Motivo de la corrección'],
    ]) {
      await user.selectOptions(
        screen.getAllByRole('combobox', {
          name: /Idioma|Language|Langue|Sprache/,
        })[0],
        locale,
      );
      const card = screen.getByRole('region', {
        name: /Triage de enfermería|Nursing triage|Triagem de enfermagem|Triage infirmier|Pflegetriage/,
      });
      const group = within(card).getByRole('group', { name: legend });
      expect(within(group).getByRole('radio', { name: 'IV' })).toBeChecked();
      expect(within(card).getByRole('textbox', { name: reason })).toHaveValue(
        'Motivo del borrador',
      );
    }
    await user.click(screen.getByRole('button', { name: 'Cambiar tema' }));
    expect(within(card()).getByRole('radio', { name: 'IV' })).toBeChecked();
    expect(reasonBox(card())).toHaveValue('Motivo del borrador');
  });

  it('R22: al pasar de Corregir a Manual el nivel aparece elegido y al volver a Corregir reaparece el motivo', async () => {
    const posts = sequence(
      json(201, failedSuggestion),
      json(201, {
        ...guardG3Suggestion,
        createdAt: '2026-10-28T15:30:00.000Z',
      }),
    );
    const { user } = setup({ handlers: { [REQUEST_SUGGESTION]: posts } });
    const region = await proposalCard();
    await writeCorrection(region, user);
    // La vigente pasa a FAILED: triage manual con el nivel del borrador.
    await user.click(
      screen.getByRole('button', { name: 'Pedir otra sugerencia' }),
    );
    expect(
      await within(region).findByRole('button', {
        name: 'Registrar triage manual',
      }),
    ).toBeVisible();
    expect(within(region).getByRole('radio', { name: 'IV' })).toBeChecked();
    expect(
      within(region).queryByRole('textbox', {
        name: 'Motivo de la corrección',
      }),
    ).not.toBeInTheDocument();
    // La vigente vuelve a ser válida (G3, sugiere III): Corregir con el motivo del borrador.
    await user.click(
      screen.getByRole('button', { name: 'Pedir otra sugerencia' }),
    );
    expect(
      await within(region).findByRole('radio', { name: 'III (sugerido)' }),
    ).toBeDisabled();
    expect(within(region).getByRole('radio', { name: 'IV' })).toBeChecked();
    expect(reasonBox(region)).toHaveValue('Motivo del borrador');
  });

  it('R22: si el nivel del borrador coincide con el sugerido de la nueva vigente, se marca al enviar y no se envía', async () => {
    const { net, user } = setup({
      handlers: { [REQUEST_SUGGESTION]: json(201, guardG3Suggestion) },
    });
    const region = await proposalCard();
    await user.click(within(region).getByRole('button', { name: 'Corregir' }));
    await user.click(within(region).getByRole('radio', { name: 'III' }));
    await user.type(reasonBox(region), 'Motivo');
    await user.click(
      screen.getByRole('button', { name: 'Pedir otra sugerencia' }),
    );
    const suggested = await within(region).findByRole('radio', {
      name: 'III (sugerido)',
    });
    expect(suggested).toBeChecked();
    await user.click(
      within(region).getByRole('button', { name: 'Enviar corrección' }),
    );
    expect(
      await within(region).findByText(
        'El nivel corregido debe ser distinto del sugerido.',
      ),
    ).toBeVisible();
    expect(decisionCalls(net)).toEqual([]);
  });

  it('R23: con un borrador, salir de la página muestra el aviso de cambios sin guardar', async () => {
    const { user, router } = setup();
    const region = await proposalCard();
    await user.click(within(region).getByRole('button', { name: 'Corregir' }));
    await user.click(within(region).getByRole('radio', { name: 'IV' }));
    await user.click(navLink('Atenciones'));
    const modal = await screen.findByRole('dialog', {
      name: 'Hay cambios sin guardar',
    });
    await user.click(
      within(modal).getByRole('button', { name: 'Seguir editando' }),
    );
    expect(router.state.location.pathname).toBe(`/triage/${ENCOUNTER_ID}`);
    expect(within(region).getByRole('radio', { name: 'IV' })).toBeChecked();
  });

  it('R23: tras un 201 ya no avisa al salir', async () => {
    const { user, router } = setup({
      handlers: { [DECIDE]: json(201, manualDecision) },
    });
    const region = await proposalCard();
    await writeCorrection(region, user);
    await user.click(
      within(region).getByRole('button', { name: 'Enviar corrección' }),
    );
    await within(region).findByText('Triage manual');
    await user.click(navLink('Atenciones'));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/atenciones'),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('F-05-web evento de la línea de tiempo', () => {
  const decidedEvent = {
    id: '20',
    type: 'TRIAGE_DECIDED' as const,
    fromStatus: 'WAITING_TRIAGE' as const,
    toStatus: 'TRIAGED' as const,
    payload: { decisionId: correctDecision.id, action: 'CORRECT' },
    actor: {
      type: 'STAFF' as const,
      id: staffMe.NURSE.id,
      fullName: staffMe.NURSE.fullName,
    },
    occurredAt: DECIDED_AT,
  };

  it.each(['NURSE', 'RECEPTION', 'PHYSICIAN', 'ADMIN'] as const)(
    'R29: %s en /atenciones/:id ve «Triage registrado» en los cinco idiomas, sin nivel, acción ni motivo',
    async (role) => {
      const { user, net } = setup({
        role,
        path: `/atenciones/${ENCOUNTER_ID}`,
        handlers: {
          [DETAIL]: json(200, {
            ...decidedEncounter('TRIAGED', correctDecision),
            events: [decidedEvent],
          }),
        },
      });
      const timeline = await screen.findByRole('region', {
        name: 'Línea de tiempo',
      });
      for (const [locale, label] of [
        ['es', 'Triage registrado'],
        ['en', 'Triage recorded'],
        ['pt', 'Triagem registrada'],
        ['fr', 'Triage enregistré'],
        ['de', 'Triage erfasst'],
      ]) {
        await user.selectOptions(
          screen.getAllByRole('combobox', {
            name: /Idioma|Language|Langue|Sprache/,
          })[0],
          locale,
        );
        const item = within(timeline).getByRole('listitem');
        expect(item).toHaveTextContent(label);
        expect(item.textContent).not.toMatch(
          /TRIAGE_DECIDED|CORRECT|IV\b|Motivo literal|Sugerencia corregida/,
        );
      }
      expect(screen.queryByText('Nivel final')).toBeNull();
      expect(screen.queryByText(correctDecision.reason!)).toBeNull();
      expect(decisionCalls(net)).toEqual([]);
    },
  );
});

describe('F-05-web transversales en la página', () => {
  it('R25: la decisión se muestra en inglés con el motivo literal', async () => {
    const { user } = setup({
      handlers: {
        [DETAIL]: json(200, decidedEncounter('TRIAGED', correctDecision)),
        [CAPTURE]: json(200, captureFixture({ status: 'TRIAGED' })),
        [GET_DECISION]: json(200, correctDecision),
      },
    });
    await within(await findCard()).findByText('Sugerencia corregida');
    await user.selectOptions(
      screen.getAllByRole('combobox', { name: /Idioma/ })[0],
      'en',
    );
    const region = await screen.findByRole('region', {
      name: 'Nursing triage',
    });
    expect(within(region).getByText('Suggestion corrected')).toBeVisible();
    expect(within(region).getByText('Final level')).toBeVisible();
    expect(within(region).getByText(correctDecision.reason!)).toBeVisible();
  });

  it('R26: el motivo y el nivel no quedan en almacenamiento, URL ni consola', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map(
      (method) => vi.spyOn(console, method),
    );
    const secret = 'Motivo secreto de la corrección 7781';
    const { user, router } = setup({
      handlers: {
        [DECIDE]: json(201, { ...correctDecision, reason: secret }),
      },
    });
    const region = await proposalCard();
    await writeCorrection(region, user, secret);
    const leaks = () => {
      const { pathname, search, hash } = router.state.location;
      const output = spies
        .flatMap((spy) => spy.mock.calls.flat() as unknown[])
        .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
        .join('\n');
      return [
        `${pathname}${search}${hash}`,
        JSON.stringify({ ...localStorage }),
        JSON.stringify({ ...sessionStorage }),
        output,
      ].join('\n');
    };
    expect(leaks()).not.toContain(secret);
    await user.click(
      within(region).getByRole('button', { name: 'Enviar corrección' }),
    );
    expect(await within(region).findByText(secret)).toBeVisible();
    const after = leaks();
    expect(after).not.toContain(secret);
    expect(after).not.toMatch(/"level"|finalLevel/);
    expect(
      Object.keys(localStorage).filter((key) => key.includes('draft')),
    ).toEqual([]);
    spies.forEach((spy) => spy.mockRestore());
  });

  it('R27: Validar y Corregir se alcanzan con Tab en ese orden', async () => {
    const { user } = setup();
    const region = await proposalCard();
    const validate = within(region).getByRole('button', {
      name: 'Validar nivel II',
    });
    const correct = within(region).getByRole('button', { name: 'Corregir' });
    screen.getByRole('button', { name: 'Pedir otra sugerencia' }).focus();
    await user.tab();
    expect(validate).toHaveFocus();
    await user.tab();
    expect(correct).toHaveFocus();
    await user.keyboard('{Enter}');
    const first = within(region).getByRole('radio', { name: 'I' });
    screen.getByRole('button', { name: 'Pedir otra sugerencia' }).focus();
    await user.tab();
    expect(first).toHaveFocus();
    await user.tab();
    expect(
      within(region).getByRole('textbox', { name: 'Motivo de la corrección' }),
    ).toHaveFocus();
    await user.tab();
    expect(
      within(region).getByRole('button', { name: 'Enviar corrección' }),
    ).toHaveFocus();
    await user.tab();
    expect(
      within(region).getByRole('button', { name: 'Cancelar' }),
    ).toHaveFocus();
  });
});

describe('F-05-web «Reintentar» tras un cambio de la vigente', () => {
  it('R20: tras un 500 de Validar y una sugerencia nueva válida, no se reenvía nada con la vigente nueva: aviso de cambio y sin «Reintentar»', async () => {
    const { net, user } = setup({
      handlers: {
        [DECIDE]: problem(500),
        [REQUEST_SUGGESTION]: json(201, okSuggestion),
      },
    });
    const region = await proposalCard();
    await user.click(
      within(region).getByRole('button', { name: 'Validar nivel II' }),
    );
    await within(region).findByRole('alert');
    await user.click(
      screen.getByRole('button', { name: 'Pedir otra sugerencia' }),
    );
    expect(await within(region).findByText(CHANGED)).toBeVisible();
    expect(
      await within(region).findByRole('button', { name: 'Validar nivel III' }),
    ).toBeVisible();
    expect(
      within(region).queryByRole('button', { name: 'Reintentar' }),
    ).not.toBeInTheDocument();
    expect(net.calls(DECIDE)).toHaveLength(1);
    expect(
      net
        .calls(DECIDE)
        .filter(
          (r) =>
            (r.body as { suggestionId?: string }).suggestionId ===
            okSuggestion.id,
        ),
    ).toEqual([]);
  });

  it('R20: tras un 500 de Validar y una sugerencia nueva FAILED, en modo manual no queda ningún reintento de VALIDATE', async () => {
    const { net, user } = setup({
      handlers: {
        [DECIDE]: problem(500),
        [REQUEST_SUGGESTION]: json(201, failedSuggestion),
      },
    });
    const region = await proposalCard();
    await user.click(
      within(region).getByRole('button', { name: 'Validar nivel II' }),
    );
    await within(region).findByRole('alert');
    await user.click(
      screen.getByRole('button', { name: 'Pedir otra sugerencia' }),
    );
    expect(
      await within(region).findByRole('button', {
        name: 'Registrar triage manual',
      }),
    ).toBeVisible();
    expect(await within(region).findByText(CHANGED)).toBeVisible();
    expect(
      within(region).queryByRole('button', { name: 'Reintentar' }),
    ).not.toBeInTheDocument();
    expect(net.calls(DECIDE)).toHaveLength(1);
  });

  it('R20: tras un 500 de Corregir y una sugerencia nueva, no se reenvía el CORRECT y el borrador se conserva', async () => {
    const { net, user } = setup({
      handlers: {
        [DECIDE]: problem(500),
        [REQUEST_SUGGESTION]: json(201, guardG3Suggestion),
      },
    });
    const region = await proposalCard();
    await writeCorrection(region, user);
    await user.click(
      within(region).getByRole('button', { name: 'Enviar corrección' }),
    );
    await within(region).findByRole('alert');
    await user.click(
      screen.getByRole('button', { name: 'Pedir otra sugerencia' }),
    );
    expect(await within(region).findByText(CHANGED)).toBeVisible();
    expect(
      await within(region).findByRole('radio', { name: 'III (sugerido)' }),
    ).toBeDisabled();
    expect(within(region).getByRole('radio', { name: 'IV' })).toBeChecked();
    expect(reasonBox(region)).toHaveValue('Motivo del borrador');
    expect(
      within(region).queryByRole('button', { name: 'Reintentar' }),
    ).not.toBeInTheDocument();
    expect(net.calls(DECIDE)).toHaveLength(1);
  });

  it('R20: «Reintentar» reenvía exactamente el cuerpo enviado aunque se edite el borrador después del fallo', async () => {
    const { net, user } = setup({ handlers: { [DECIDE]: problem(500) } });
    const region = await proposalCard();
    await writeCorrection(region, user, 'Motivo original');
    await user.click(
      within(region).getByRole('button', { name: 'Enviar corrección' }),
    );
    const alert = await within(region).findByRole('alert');
    await user.clear(reasonBox(region));
    await user.type(reasonBox(region), 'Motivo editado después');
    net.set(DECIDE, json(201, correctDecision));
    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(net.calls(DECIDE)).toHaveLength(2));
    expect(net.calls(DECIDE)[1].body).toEqual({
      action: 'CORRECT',
      suggestionId: guardG1Suggestion.id,
      level: 4,
      reason: 'Motivo original',
    });
  });
});
