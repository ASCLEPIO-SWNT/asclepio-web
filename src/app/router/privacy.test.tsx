import { act, screen } from '@testing-library/react';
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
import { session } from '../../shared/api/session';
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_KEY,
} from '../../shared/preferences/storage';
import {
  ENCOUNTER_ID,
  PASSWORD,
  TOKEN,
  accessToken,
  encounter,
  fakeApi,
  json,
  patientMe,
  problem,
  staffMe,
} from '../../test/fakeApi';
import { renderApp } from '../../test/testApp';

const nurse = staffMe.NURSE;
const SECRETS = [
  TOKEN,
  PASSWORD,
  nurse.email,
  nurse.fullName,
  nurse.id,
  patientMe.patientId,
];
const CONSOLE_METHODS = [
  'log',
  'info',
  'warn',
  'error',
  'debug',
  'trace',
] as const;

let spies: MockInstance[] = [];

beforeEach(() => {
  spies = CONSOLE_METHODS.map((method) => vi.spyOn(console, method));
});

afterEach(() => {
  spies.forEach((spy) => spy.mockRestore());
  vi.useRealTimers();
  vi.unstubAllGlobals();
  sessionStorage.clear();
  localStorage.clear();
  session.clear();
});

function consoleOutput(): string {
  return spies
    .flatMap((spy) => spy.mock.calls.flat() as unknown[])
    .map((arg) => {
      try {
        return typeof arg === 'string' ? arg : JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join('\n');
}

function expectNoLeaks(router: ReturnType<typeof renderApp>['router']) {
  const { pathname, search, hash } = router.state.location;
  const url = `${pathname}${search}${hash}`;
  const output = consoleOutput();
  const stored = Object.keys(sessionStorage)
    .map((key) => `${key}=${sessionStorage.getItem(key)}`)
    .join('\n');
  for (const secret of SECRETS) {
    expect(url).not.toContain(secret);
    expect(url).not.toContain(encodeURIComponent(secret));
    expect(output).not.toContain(secret);
  }
  expect(search).toBe('');
  expect(hash).toBe('');
  expect(Object.keys(localStorage)).toEqual([PREFERENCES_KEY]);
  expect(JSON.parse(localStorage.getItem(PREFERENCES_KEY)!)).toEqual(
    DEFAULT_PREFERENCES,
  );
  const preferences = localStorage.getItem(PREFERENCES_KEY)!;
  for (const secret of SECRETS) expect(preferences).not.toContain(secret);
  expect(stored).not.toContain(nurse.email);
  expect(stored).not.toContain(nurse.fullName);
  expect(stored).not.toContain(PASSWORD);
}

async function login(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Correo'), nurse.email);
  await user.type(screen.getByLabelText('Contraseña'), PASSWORD);
  await user.click(screen.getByRole('button', { name: 'Ingresar' }));
}

describe('privacidad', () => {
  it('R10: tras un login correcto sessionStorage solo tiene { accessToken, expiresAt } bajo una clave y localStorage solo preferencias visuales', async () => {
    const token = accessToken();
    fakeApi({
      'POST /api/v1/auth/login': json(200, token),
      'GET /api/v1/me': json(200, nurse),
    });
    const user = userEvent.setup();
    const { router } = renderApp({ entries: ['/login'] });
    await login(user);
    await screen.findByRole('heading', { level: 1, name: 'Triage' });

    expect(Object.keys(sessionStorage)).toEqual(['asclepio.session']);
    expect(
      JSON.parse(sessionStorage.getItem('asclepio.session') ?? 'null'),
    ).toEqual({
      accessToken: TOKEN,
      expiresAt: token.expiresAt,
    });
    expectNoLeaks(router);
  });

  it('R24: login correcto sin token, contraseña, correo ni datos de /me en console ni en la URL', async () => {
    fakeApi({
      'POST /api/v1/auth/login': json(200, accessToken()),
      'GET /api/v1/me': json(200, nurse),
    });
    const user = userEvent.setup();
    const { router } = renderApp({ entries: ['/cola'] });
    await login(user);
    await screen.findByRole('heading', { level: 1, name: 'Cola priorizada' });
    expectNoLeaks(router);
  });

  it('R24: un 401 del login no filtra datos a console ni a la URL', async () => {
    fakeApi({
      'POST /api/v1/auth/login': problem(401, { detail: nurse.email }),
    });
    const user = userEvent.setup();
    const { router } = renderApp({ entries: ['/login'] });
    await login(user);
    await screen.findByText('Correo o contraseña incorrectos.');
    expectNoLeaks(router);
  });

  it('R24: la expiración de la sesión no filtra datos a console ni a la URL', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fakeApi({ 'GET /api/v1/me': json(200, nurse) });
    const { router } = renderApp({
      entries: ['/triage'],
      stored: {
        accessToken: TOKEN,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    });
    await screen.findByRole('heading', { level: 1, name: 'Triage' });
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    await screen.findByText('Tu sesión expiró. Vuelve a iniciar sesión.');
    expect(Object.keys(sessionStorage)).toEqual([]);
    expectNoLeaks(router);
  });

  it('R24: con signos vitales sin guardar, la expiración deja en sessionStorage solo el borrador de signos vitales (UI-03-web R31)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const detail = `GET /api/v1/encounters/${ENCOUNTER_ID}`;
    fakeApi({
      'GET /api/v1/me': json(200, nurse),
      [detail]: json(200, encounter),
      [`${detail}/clinical-capture`]: json(200, {
        encounterId: ENCOUNTER_ID,
        status: 'WAITING_TRIAGE',
        chiefComplaintText: encounter.chiefComplaintText,
        complaintSource: encounter.complaintSource,
        vitalSigns: [],
        symptomFindings: [],
      }),
    });
    const user = userEvent.setup({
      advanceTimers: (ms) => vi.advanceTimersByTime(ms),
    });
    const { router } = renderApp({
      entries: [`/triage/${ENCOUNTER_ID}`],
      stored: {
        accessToken: TOKEN,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    });
    const field = await screen.findByLabelText(/Frecuencia respiratoria/);
    await vi.waitFor(() => expect(field).toBeEnabled());
    await user.type(field, '18');
    await user.type(
      screen.getByLabelText('Descripción'),
      encounter.chiefComplaintText,
    );
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    await screen.findByText('Tu sesión expiró. Vuelve a iniciar sesión.');
    const keys = Object.keys(sessionStorage);
    expect(keys).toEqual([`asclepio.draft.vitals.${ENCOUNTER_ID}`]);
    expect(keys[0]).toMatch(/^asclepio\.draft\.vitals\.[0-9a-f-]{36}$/);
    const raw = sessionStorage.getItem(keys[0])!;
    const draft = JSON.parse(raw) as Record<string, unknown>;
    expect(Object.keys(draft).sort()).toEqual([
      'encounterId',
      'savedAt',
      'userId',
      'values',
    ]);
    expect(draft.values).toEqual({ respiratoryRate: '18' });
    // R4 exige el id del usuario en el borrador; el resto de datos de la sesión no puede estar.
    expect(draft.userId).toBe(nurse.id);
    for (const secret of [
      ...SECRETS.filter((secret) => secret !== nurse.id),
      encounter.chiefComplaintText,
      encounter.patient.fullName!,
    ]) {
      expect(raw).not.toContain(secret);
    }
    expectNoLeaks(router);
  });

  it('R24: el rechazo de un token de paciente no filtra datos a console ni a la URL', async () => {
    fakeApi({ 'GET /api/v1/me': json(200, patientMe) });
    const { router } = renderApp({ entries: ['/triage'], stored: true });
    await screen.findByText(
      'Esta web es solo para el personal. Los pacientes usan la app móvil.',
    );
    expectNoLeaks(router);
  });

  it('R24: cerrar sesión no filtra datos a console ni a la URL', async () => {
    fakeApi({ 'GET /api/v1/me': json(200, nurse) });
    const user = userEvent.setup();
    const { router } = renderApp({ entries: ['/triage'], stored: true });
    await screen.findByRole('heading', { level: 1, name: 'Triage' });
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await screen.findByRole('heading', { name: 'Iniciar sesión' });
    expect(Object.keys(sessionStorage)).toEqual([]);
    expectNoLeaks(router);
  });
});
