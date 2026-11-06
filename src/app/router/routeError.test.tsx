import { screen, waitFor, within } from '@testing-library/react';
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
import {
  encounterSummary,
  fakeApi,
  json,
  patient,
  publicTenants,
  staffMe,
} from '../../test/fakeApi';
import { renderApp } from '../../test/testApp';
import { FEATURE_ROUTES, buildRoutes } from './routes';

/** Un mensaje de error con datos personales: nunca debe llegar al DOM ni a la consola (R9). */
const SECRET = `Fallo con ${patient.fullName!} ${patient.documentNumber!}`;
const TITLE = 'Algo salió mal en esta pantalla';
const CONSOLE_METHODS = [
  'log',
  'info',
  'warn',
  'error',
  'debug',
  'trace',
] as const;

let spies: MockInstance[] = [];
let failing = true;

/** Pantalla de prueba que lanza mientras `failing`. */
function Thrower() {
  if (failing) throw new Error(SECRET);
  return <h1>Pantalla recuperada</h1>;
}

function setup(role: StaffRole, path: string) {
  failing = true;
  fakeApi({
    'GET /api/v1/me': json(200, staffMe[role]),
    'GET /api/v1/public/tenants': json(200, publicTenants),
    'GET /api/v1/encounters': json(200, { items: [encounterSummary()] }),
  });
  const routes = buildRoutes(
    {
      ...FEATURE_ROUTES,
      '/atenciones': [{ path: '/atenciones', element: <Thrower /> }],
    },
    { estado: <Thrower /> },
  );
  return {
    user: userEvent.setup(),
    ...renderApp({ entries: [path], stored: true, routes }),
  };
}

function consoleOutput() {
  return spies
    .flatMap((spy) => spy.mock.calls.flat() as unknown[])
    .map((arg) =>
      arg instanceof Error
        ? `${arg.name} ${arg.message} ${arg.stack ?? ''}`
        : typeof arg === 'string'
          ? arg
          : JSON.stringify(arg),
    )
    .join('\n');
}

beforeEach(() => {
  spies = CONSOLE_METHODS.map((method) =>
    vi.spyOn(console, method).mockImplementation(() => {}),
  );
});

afterEach(() => {
  spies.forEach((spy) => spy.mockRestore());
  vi.unstubAllGlobals();
  sessionStorage.clear();
  localStorage.clear();
  session.clear();
});

describe('UI-03-web error boundary por ruta', () => {
  it('R8: un error de render en una ruta privada se muestra dentro del marco, con barra lateral, navegación por rol y cabecera', async () => {
    setup('NURSE', '/atenciones');
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByRole('heading', { name: TITLE })).toBeVisible();
    expect(
      within(alert).getByRole('button', { name: 'Reintentar' }),
    ).toBeVisible();
    expect(
      within(alert).getByRole('link', { name: 'Volver al inicio' }),
    ).toHaveAttribute('href', '/triage');
    // El marco sigue montado: navegación por rol, sesión y herramientas de la cabecera.
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    expect(within(nav).getByRole('link', { name: 'Triage' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
    expect(screen.getAllByLabelText('Idioma').length).toBeGreaterThan(0);
    expect(alert.closest('.shell__content')).not.toBeNull();
  });

  it('R8: «Reintentar» vuelve a montar la ruta', async () => {
    const { user } = setup('NURSE', '/atenciones');
    const retry = await screen.findByRole('button', { name: 'Reintentar' });
    failing = false;
    await user.click(retry);
    expect(
      await screen.findByRole('heading', { name: 'Pantalla recuperada' }),
    ).toBeVisible();
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
  });

  it.each([
    ['RECEPTION', '/recepcion'],
    ['NURSE', '/triage'],
    ['PHYSICIAN', '/cola'],
    ['ADMIN', '/reportes'],
  ] as const)(
    'R8: «Volver al inicio» lleva al inicio del rol %s',
    async (role, home) => {
      const { user, router } = setup(role, '/atenciones');
      await user.click(
        await screen.findByRole('link', { name: 'Volver al inicio' }),
      );
      await waitFor(() => expect(router.state.location.pathname).toBe(home));
    },
  );

  it('R8: en una ruta pública el error conserva la cabecera y «Volver al inicio» lleva a /', async () => {
    setup('NURSE', '/estado');
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByRole('heading', { name: TITLE })).toBeVisible();
    expect(
      within(alert).getByRole('link', { name: 'Volver al inicio' }),
    ).toHaveAttribute('href', '/');
    expect(screen.getByRole('banner')).toBeVisible();
    expect(screen.getAllByLabelText('Idioma').length).toBeGreaterThan(0);
  });

  it('R9: el estado de error no muestra la traza, el mensaje técnico ni datos personales, y la consola no los recibe', async () => {
    setup('NURSE', '/atenciones');
    await screen.findByRole('heading', { name: TITLE });
    expect(document.body).not.toHaveTextContent(SECRET);
    expect(document.body).not.toHaveTextContent(patient.fullName!);
    expect(document.body).not.toHaveTextContent(/at Thrower|\.tsx:/);
    const output = consoleOutput();
    expect(output).not.toContain(patient.fullName!);
    expect(output).not.toContain(patient.documentNumber!);
  });
});
