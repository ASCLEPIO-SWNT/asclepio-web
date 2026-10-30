import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import type { StaffRole } from '../../shared/api/client';
import { session } from '../../shared/api/session';
import { DRAFT_TTL_MS, draftKey } from '../../shared/lib/drafts';
import { PREFERENCES_KEY } from '../../shared/preferences/storage';
import { recordedVitalSigns } from '../../features/triage/testing/clinicalFixtures';
import {
  ENCOUNTER_ID,
  PASSWORD,
  accessToken,
  encounter,
  encounterSummary,
  fakeApi,
  json,
  patient,
  publicTenants,
  staffMe,
  type Handler,
} from '../../test/fakeApi';
import { renderApp } from '../../test/testApp';

const DETAIL = `GET /api/v1/encounters/${ENCOUNTER_ID}`;
const VITALS = `POST /api/v1/encounters/${ENCOUNTER_ID}/vital-signs`;
const CAPTURE = `/triage/${ENCOUNTER_ID}`;
const KEY = draftKey(ENCOUNTER_ID);
const NOTICE =
  'Hay signos vitales sin guardar de tu sesión anterior. ¿Quieres recuperarlos?';
const FINDING = 'Dolor torácico relatado por Laura';
const WHITELIST = [
  'respiratoryRate',
  'oxygenSaturation',
  'supplementalOxygen',
  'systolicBp',
  'diastolicBp',
  'heartRate',
  'consciousness',
  'temperatureC',
  'glucoseMgDl',
];
const CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'debug'] as const;
let spies: MockInstance[] = [];

function setup(
  path: string,
  role: StaffRole = 'NURSE',
  handlers: Record<string, Handler> = {},
) {
  const net = fakeApi({
    'GET /api/v1/me': json(200, staffMe[role]),
    'GET /api/v1/public/tenants': json(200, publicTenants),
    'GET /api/v1/encounters': json(200, { items: [encounterSummary()] }),
    'GET /api/v1/pre-registrations': json(200, []),
    'POST /api/v1/auth/login': json(200, accessToken()),
    [DETAIL]: json(200, encounter),
    [`${DETAIL}/clinical-capture`]: json(200, {
      encounterId: ENCOUNTER_ID,
      status: 'WAITING_TRIAGE',
      chiefComplaintText: encounter.chiefComplaintText,
      complaintSource: encounter.complaintSource,
      vitalSigns: [],
      symptomFindings: [],
    }),
    ...handlers,
  });
  return {
    net,
    user: userEvent.setup({ delay: null }),
    ...renderApp({ entries: [path], stored: true }),
  };
}

async function openCapture(handlers: Record<string, Handler> = {}) {
  const view = setup(CAPTURE, 'NURSE', handlers);
  await waitFor(() =>
    expect(screen.getByLabelText(/Frecuencia respiratoria/)).toBeEnabled(),
  );
  return view;
}

function storeDraft(overrides: Record<string, unknown> = {}) {
  sessionStorage.setItem(
    KEY,
    JSON.stringify({
      userId: staffMe.NURSE.id,
      encounterId: ENCOUNTER_ID,
      savedAt: new Date().toISOString(),
      values: { respiratoryRate: '22', consciousness: 'V' },
      ...overrides,
    }),
  );
}

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

function consoleOutput() {
  return spies
    .flatMap((spy) => spy.mock.calls.flat() as unknown[])
    .map(String)
    .join('\n');
}

beforeEach(() => {
  spies = CONSOLE_METHODS.map((method) => vi.spyOn(console, method));
});

afterEach(() => {
  spies.forEach((spy) => spy.mockRestore());
  vi.unstubAllGlobals();
  sessionStorage.clear();
  localStorage.clear();
  session.clear();
});

describe('UI-03-web borrador de signos vitales', () => {
  it('R4: un cierre forzado con signos vitales sin guardar guarda solo la lista blanca, el usuario, la atención y la hora', async () => {
    const { user, net, router } = await openCapture();
    await user.type(screen.getByLabelText(/Frecuencia respiratoria/), '18');
    await user.selectOptions(screen.getByLabelText(/Nivel de conciencia/), 'A');
    await user.type(screen.getByLabelText('Descripción'), FINDING);
    const requests = net.requests.length;
    act(() => session.clear('expired'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));

    const raw = sessionStorage.getItem(KEY)!;
    const draft = JSON.parse(raw) as Record<string, unknown>;
    expect(Object.keys(draft).sort()).toEqual(
      ['encounterId', 'savedAt', 'userId', 'values'].sort(),
    );
    expect(draft.userId).toBe(staffMe.NURSE.id);
    expect(draft.encounterId).toBe(ENCOUNTER_ID);
    expect(Date.parse(draft.savedAt as string)).not.toBeNaN();
    expect(draft.values).toEqual({ respiratoryRate: '18', consciousness: 'A' });
    for (const key of Object.keys(draft.values as object)) {
      expect(WHITELIST).toContain(key);
    }
    expect(raw).not.toContain(FINDING);
    expect(raw).not.toContain(patient.fullName!);
    expect(raw).not.toContain(encounter.chiefComplaintText);
    // Nada se envía por red al guardar el borrador.
    expect(
      net.requests.slice(requests).every((r) => r.body === undefined),
    ).toBe(true);
  });

  it('R4: los hallazgos y el alta de paciente con cambios no crean ningún borrador', async () => {
    const { user, router } = await openCapture();
    await user.type(screen.getByLabelText('Descripción'), FINDING);
    act(() => session.clear('expired'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(Object.keys(sessionStorage)).toEqual([]);
  });

  it('R4: el alta de paciente con cambios no crea ningún borrador', async () => {
    const { user, router } = setup('/recepcion/registro', 'RECEPTION');
    await user.click(
      await screen.findByRole('button', { name: 'Registrar paciente NN' }),
    );
    await user.type(screen.getByLabelText('Nombre completo'), 'Hombre NN');
    act(() => session.clear('expired'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(Object.keys(sessionStorage)).toEqual([]);
  });

  it('R5: al volver a la misma captura el aviso ofrece recuperar sin rellenar nada, y «Recuperar borrador» rellena sin enviar', async () => {
    const { user, net, router } = await openCapture();
    await user.type(screen.getByLabelText(/Frecuencia respiratoria/), '18');
    act(() => session.clear('expired'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    await user.type(screen.getByLabelText('Correo'), staffMe.NURSE.email);
    await user.type(screen.getByLabelText('Contraseña'), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    const notice = (await screen.findByText(NOTICE)).closest(
      '[role="status"]',
    ) as HTMLElement;
    expect(router.state.location.pathname).toBe(CAPTURE);
    expect(screen.getByLabelText(/Frecuencia respiratoria/)).toHaveValue(null);
    await user.click(
      within(notice).getByRole('button', { name: 'Recuperar borrador' }),
    );
    expect(screen.getByLabelText(/Frecuencia respiratoria/)).toHaveValue(18);
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
    expect(net.calls(VITALS)).toHaveLength(0);
  });

  it('R6: un borrador de 29:59 se ofrece; uno de 30:01 se borra sin mostrarse', async () => {
    storeDraft({ savedAt: ago(DRAFT_TTL_MS - 1_000) });
    const first = await openCapture();
    expect(await screen.findByText(NOTICE)).toBeVisible();
    first.unmount();
    session.clear();

    storeDraft({ savedAt: ago(DRAFT_TTL_MS + 1_000) });
    await openCapture();
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it.each([
    ['de otro usuario', { userId: staffMe.PHYSICIAN.id }],
    [
      'de otra atención',
      { encounterId: 'e0e0e0e0-0000-4000-8000-000000000009' },
    ],
    ['con forma no válida', { values: { notes: FINDING } }],
    ['con un valor no válido', { values: { respiratoryRate: FINDING } }],
  ])('R6: un borrador %s se borra sin mostrarse', async (_, overrides) => {
    storeDraft(overrides);
    await openCapture();
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('R7: «Descartar» borra el borrador sin rellenar nada', async () => {
    storeDraft();
    const { user } = await openCapture();
    await user.click(await screen.findByRole('button', { name: 'Descartar' }));
    expect(sessionStorage.getItem(KEY)).toBeNull();
    expect(screen.getByLabelText(/Frecuencia respiratoria/)).toHaveValue(null);
  });

  it('R7: enviar con éxito borra el borrador', async () => {
    storeDraft();
    const { user } = await openCapture({
      [VITALS]: json(201, recordedVitalSigns),
    });
    await user.click(
      await screen.findByRole('button', { name: 'Recuperar borrador' }),
    );
    storeDraft();
    await user.clear(screen.getByLabelText(/Frecuencia respiratoria/));
    await user.type(screen.getByLabelText(/Frecuencia respiratoria/), '18');
    await user.type(screen.getByLabelText(/Saturación de oxígeno/), '98');
    await user.selectOptions(
      screen.getByLabelText(/Oxígeno suplementario/),
      'No',
    );
    await user.type(screen.getByLabelText(/Presión arterial sistólica/), '120');
    await user.type(screen.getByLabelText(/Frecuencia cardiaca/), '87');
    await user.type(screen.getByLabelText(/Temperatura/), '36.5');
    await user.click(screen.getByRole('button', { name: 'Guardar toma' }));
    await screen.findByText('Toma de signos vitales registrada.');
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('R7: cerrar sesión de forma voluntaria borra los borradores', async () => {
    storeDraft();
    const { user, router } = await openCapture();
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('R31: el borrador no aparece en la consola, la URL ni localStorage', async () => {
    const { user, router } = await openCapture();
    await user.type(screen.getByLabelText(/Frecuencia respiratoria/), '18');
    act(() => session.clear('expired'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(sessionStorage.getItem(KEY)).not.toBeNull();
    expect(consoleOutput()).not.toContain('respiratoryRate');
    expect(
      `${router.state.location.pathname}${router.state.location.search}`,
    ).toBe('/login');
    expect(
      Object.keys(localStorage).filter((key) => key !== PREFERENCES_KEY),
    ).toEqual([]);
    expect(
      Object.keys(sessionStorage).every((key) =>
        /^asclepio\.draft\.vitals\.[0-9a-f-]{36}$/.test(key),
      ),
    ).toBe(true);
  });
});
