import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { inspect } from 'node:util';
import {
  afterEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
  type MockInstance,
} from 'vitest';
import type { StaffRole } from '../../shared/api/client';
import { session } from '../../shared/api/session';
import {
  CSV_BODY,
  GET_CSV,
  GET_SUMMARY,
  csvResponse,
  summaryResponse,
} from '../../features/reports/testing/reportFixtures';
import {
  GET_QUEUE,
  queueResponse,
} from '../../features/queue/testing/queueFixtures';
import {
  encountersFor,
  fakeApi,
  json,
  pendingPreRegistration,
  problem,
  publicTenants,
  staffMe,
  type Handler,
} from '../../test/fakeApi';
import { renderApp } from '../../test/testApp';

const ME = 'GET /api/v1/me';
const TENANTS = 'GET /api/v1/public/tenants';

function setup({
  role = 'ADMIN',
  path = '/reportes',
  handlers = {},
}: {
  role?: StaffRole;
  path?: string;
  handlers?: Record<string, Handler>;
} = {}) {
  const net = fakeApi({
    [ME]: json(200, staffMe[role]),
    [TENANTS]: json(200, publicTenants),
    [GET_SUMMARY]: summaryResponse(),
    [GET_CSV]: csvResponse(),
    'GET /api/v1/pre-registrations': json(200, [pendingPreRegistration]),
    'GET /api/v1/encounters': encountersFor(() => 2),
    [GET_QUEUE]: queueResponse(),
    ...handlers,
  });
  return {
    net,
    user: userEvent.setup({ delay: null }),
    ...renderApp({ entries: [path], stored: true }),
  };
}

const loaded = () =>
  screen.findByRole('region', { name: 'De la llegada al triage' });
const reportCalls = (net: ReturnType<typeof fakeApi>) =>
  net.requests.filter((request) => request.path.startsWith('/api/v1/reports'));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  session.clear();
});

describe('F-07-web tablero en la aplicación', () => {
  it.each(['/app', '/reportes'])(
    'R1: ADMIN entra por %s y aterriza en /reportes con el tablero, pidiendo solo el perfil, las sedes y el resumen',
    async (entry) => {
      const { net, router } = setup({ path: entry });
      await loaded();
      expect(router.state.location.pathname).toBe('/reportes');
      expect(
        screen.getByRole('heading', { level: 1, name: 'Reportes' }),
      ).toBeInTheDocument();
      expect(
        [...new Set(net.requests.map((r) => `${r.method} ${r.path}`))].sort(),
      ).toEqual([ME, TENANTS, GET_SUMMARY].sort());
    },
  );

  it.each(['RECEPTION', 'NURSE', 'PHYSICIAN'] as const)(
    'R32: %s abre /reportes, ve «Sin permiso» y no pide nada de /api/v1/reports',
    async (role) => {
      const { net } = setup({ role });
      await screen.findByRole('heading', {
        level: 1,
        name: 'No tienes permiso para ver esta página.',
      });
      expect(
        screen.queryByRole('region', { name: 'De la llegada al triage' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Descargar CSV' }),
      ).not.toBeInTheDocument();
      expect(reportCalls(net)).toEqual([]);
    },
  );

  it('R22: un 401 de GET /reports/summary cierra la sesión y vuelve al login', async () => {
    const { router } = setup({ handlers: { [GET_SUMMARY]: problem(401) } });
    await screen.findByRole('heading', { name: 'Iniciar sesión', level: 1 });
    expect(router.state.location.pathname).toBe('/login');
  });

  it('R26: un 401 de la descarga cierra la sesión y vuelve al login', async () => {
    const { user, router } = setup({ handlers: { [GET_CSV]: problem(401) } });
    await loaded();
    await user.click(screen.getByRole('button', { name: 'Descargar CSV' }));
    await screen.findByRole('heading', { name: 'Iniciar sesión', level: 1 });
    expect(router.state.location.pathname).toBe('/login');
  });

  it('R28, R3: al cambiar a inglés con el tablero en pantalla, los títulos, el aviso del CSV y «Sin datos» se traducen y los números usan el punto decimal', async () => {
    const { user } = setup();
    const triage = await loaded();
    expect(within(triage).getByText('12,5 min')).toBeInTheDocument();
    await user.selectOptions(screen.getAllByLabelText('Idioma')[0], 'en');

    const english = await screen.findByRole('region', {
      name: 'From arrival to triage',
    });
    expect(
      screen.getByRole('heading', { level: 1, name: 'Reports' }),
    ).toBeInTheDocument();
    for (const name of [
      'Triage I and II: from classification to care',
      'AI–nursing agreement',
      'Fallback and safety guard use',
      'Export',
      'Period',
    ])
      expect(screen.getByRole('region', { name })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Internal format, not the official Resolution 373 / SISPRO report.',
      ),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Download CSV' }),
    ).toHaveAccessibleDescription(
      'Internal format, not the official Resolution 373 / SISPRO report.',
    );
    // Nivel V tiene n = 0: mediana y p90 sin datos.
    expect(within(english).getAllByText('No data')).toHaveLength(2);
    expect(within(english).getByText('12.5 min')).toBeInTheDocument();
    expect(within(english).queryByText('12,5 min')).not.toBeInTheDocument();
    expect(screen.getByText('0.812')).toBeInTheDocument();
    expect(screen.getByText('Triage II compliance')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('Sin datos');
  });
});

describe('F-07-web privacidad', () => {
  let spies: MockInstance[] = [];

  afterEach(() => {
    spies.forEach((spy) => spy.mockRestore());
    spies = [];
  });

  it('R30, R27: tras cargar, refrescar y descargar, ni la URL, ni el almacenamiento, ni la consola guardan el resumen ni el CSV', async () => {
    spies = (['log', 'info', 'warn', 'error', 'debug', 'trace'] as const).map(
      (method) => vi.spyOn(console, method),
    );
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const original = Object.getOwnPropertyDescriptors(URL);
    onTestFinished(() => {
      for (const name of ['createObjectURL', 'revokeObjectURL'] as const) {
        if (name in original) Object.defineProperty(URL, name, original[name]);
        else Reflect.deleteProperty(URL, name);
      }
    });
    const blobUrls: string[] = [];
    Object.assign(URL, {
      createObjectURL: vi.fn(() => {
        blobUrls.push('blob:http://localhost/csv');
        return 'blob:http://localhost/csv';
      }),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      () => undefined,
    );
    const { net, user, router } = setup();
    const urls: string[] = [];
    const stop = router.subscribe(() =>
      urls.push(
        `${router.state.location.pathname}${router.state.location.search}${router.state.location.hash}`,
      ),
    );
    await loaded();
    await user.click(screen.getByRole('button', { name: 'Actualizar' }));
    await waitFor(() => expect(net.calls(GET_SUMMARY)).toHaveLength(2));
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    await waitFor(() => expect(net.calls(GET_SUMMARY)).toHaveLength(3));
    await user.click(screen.getByRole('button', { name: 'Descargar CSV' }));
    await screen.findByText('CSV descargado.');
    stop();

    expect(blobUrls).toHaveLength(1);
    for (const url of [
      ...urls,
      `${router.state.location.pathname}${router.state.location.search}${router.state.location.hash}`,
    ])
      expect(url).toBe('/reportes');

    const stored = JSON.stringify({ ...localStorage, ...sessionStorage });
    for (const secret of [
      'generatedAt',
      'timeToTriage',
      'concordance',
      'encounter_id',
      CSV_BODY.split('\r\n')[1],
      'blob:',
    ])
      expect(stored).not.toContain(secret);

    const output = spies
      .flatMap((spy) => spy.mock.calls.flat() as unknown[])
      .map((arg) =>
        typeof arg === 'string' ? arg : inspect(arg, { depth: 6 }),
      )
      .join('\n');
    for (const secret of [
      'generatedAt',
      'timeToTriage',
      'encounter_id',
      'text/csv',
      '0.812',
    ])
      expect(output).not.toContain(secret);
  });
});
