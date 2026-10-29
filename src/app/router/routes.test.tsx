import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StaffRole } from '../../shared/api/client';
import { SESSION_KEY, session } from '../../shared/api/session';
import {
  PASSWORD,
  accessToken,
  deferred,
  fakeApi,
  json,
  patientMe,
  problem,
  staffMe,
} from '../../test/fakeApi';
import { renderApp } from './testApp';

const ROLES: StaffRole[] = ['RECEPTION', 'NURSE', 'PHYSICIAN', 'ADMIN'];
const HOME: Record<
  StaffRole,
  { path: string; title: string; feature: string }
> = {
  RECEPTION: {
    path: '/recepcion',
    title: 'Recepción',
    feature: 'F-02-web',
  },
  NURSE: { path: '/triage', title: 'Triage', feature: 'F-03 a F-05-web' },
  PHYSICIAN: { path: '/cola', title: 'Cola priorizada', feature: 'F-06-web' },
  ADMIN: { path: '/reportes', title: 'Reportes', feature: 'F-07-web' },
};
/** Rutas protegidas que la matriz de roles (D7) NO permite a cada rol. */
const FORBIDDEN: Record<StaffRole, string[]> = {
  RECEPTION: ['/triage', '/cola', '/reportes'],
  NURSE: ['/recepcion', '/reportes'],
  PHYSICIAN: ['/recepcion', '/triage', '/reportes'],
  ADMIN: ['/recepcion', '/triage'],
};
const ALL_PROTECTED = ['/recepcion', '/triage', '/cola', '/reportes'];

async function login(user: ReturnType<typeof userEvent.setup>, email: string) {
  await user.type(await screen.findByLabelText('Correo'), email);
  await user.type(screen.getByLabelText('Contraseña'), PASSWORD);
  await user.click(screen.getByRole('button', { name: 'Ingresar' }));
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  sessionStorage.clear();
  session.clear();
});

describe('rutas y sesión', () => {
  describe.each(ROLES)('rol %s', (role) => {
    it(`R5: tras el login va a la pantalla de inicio del rol (${HOME[role].path}) reemplazando /login`, async () => {
      fakeApi({
        'POST /api/v1/auth/login': json(200, accessToken()),
        'GET /api/v1/me': json(200, staffMe[role]),
      });
      const user = userEvent.setup();
      const { router } = renderApp({ entries: ['/estado', '/login'] });

      await login(user, staffMe[role].email);

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: HOME[role].title,
        }),
      ).toBeInTheDocument();
      expect(router.state.location.pathname).toBe(HOME[role].path);
      expect(router.state.historyAction).toBe('REPLACE');
      await act(() => router.navigate(-1));
      expect(router.state.location.pathname).toBe('/estado');
    });

    it(`R20: con sesión activa /app y /login redirigen a ${HOME[role].path}`, async () => {
      fakeApi({ 'GET /api/v1/me': json(200, staffMe[role]) });
      const { router } = renderApp({ entries: ['/app'], stored: true });
      await screen.findByRole('heading', { level: 1, name: HOME[role].title });
      expect(router.state.location.pathname).toBe(HOME[role].path);

      await act(() => router.navigate('/login'));
      await screen.findByRole('heading', { level: 1, name: HOME[role].title });
      expect(router.state.location.pathname).toBe(HOME[role].path);
    });

    it.each(FORBIDDEN[role])(
      `R19: ${role} en %s ve "Sin permiso" con enlace a su inicio y no el contenido`,
      async (path) => {
        fakeApi({ 'GET /api/v1/me': json(200, staffMe[role]) });
        const user = userEvent.setup();
        const { router } = renderApp({ entries: [path], stored: true });

        expect(
          await screen.findByRole('heading', {
            level: 1,
            name: 'No tienes permiso para ver esta página.',
          }),
        ).toBeInTheDocument();
        expect(
          screen.queryByText(/Esta funcionalidad llega en/),
        ).not.toBeInTheDocument();

        await user.click(
          screen.getByRole('link', { name: 'Ir a mi pantalla de inicio' }),
        );
        expect(router.state.location.pathname).toBe(HOME[role].path);
      },
    );
  });

  // F-03 supplies the nursing workspace; only medicine and reports remain placeholders.
  it.each(['PHYSICIAN', 'ADMIN'] as const)(
    'R23: el marcador del inicio de %s tiene h1 y la feature que lo trae, sin acciones',
    async (role) => {
      fakeApi({ 'GET /api/v1/me': json(200, staffMe[role]) });
      renderApp({ entries: [HOME[role].path], stored: true });
      const main = (
        await screen.findByRole('heading', { level: 1, name: HOME[role].title })
      ).closest('section');
      expect(main).toHaveTextContent(
        `Esta funcionalidad llega en ${HOME[role].feature}.`,
      );
      expect(main?.querySelectorAll('button, input, form, a')).toHaveLength(0);
    },
  );

  it('R5: vuelve a la ruta protegida que originó la redirección si el rol la permite', async () => {
    fakeApi({
      'POST /api/v1/auth/login': json(200, accessToken()),
      'GET /api/v1/me': json(200, staffMe.NURSE),
    });
    const user = userEvent.setup();
    const { router } = renderApp({ entries: ['/cola'] });

    await login(user, staffMe.NURSE.email);

    await screen.findByRole('heading', { level: 1, name: 'Cola priorizada' });
    expect(router.state.location.pathname).toBe('/cola');
    expect(router.state.location.search).toBe('');
  });

  it('R5: si el rol no permite la ruta de origen, va a su pantalla de inicio', async () => {
    fakeApi({
      'POST /api/v1/auth/login': json(200, accessToken()),
      'GET /api/v1/me': json(200, staffMe.RECEPTION),
    });
    const user = userEvent.setup();
    const { router } = renderApp({ entries: ['/reportes'] });

    await login(user, staffMe.RECEPTION.email);

    await screen.findByRole('heading', {
      level: 1,
      name: 'Recepción',
    });
    expect(router.state.location.pathname).toBe('/recepcion');
  });

  it.each([...ALL_PROTECTED, '/app', '/no-existe'])(
    'R18: sin sesión guardada %s redirige a /login reemplazando el historial y sin renderizar la ruta',
    async (path) => {
      const net = fakeApi({});
      const { router } = renderApp({ entries: ['/estado', path] });

      expect(
        await screen.findByRole('heading', { name: 'Iniciar sesión' }),
      ).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/login');
      expect(router.state.location.search).toBe('');
      expect(router.state.historyAction).toBe('REPLACE');
      expect(
        screen.queryByText(/Esta funcionalidad llega en/),
      ).not.toBeInTheDocument();
      expect(net.requests).toHaveLength(0);
    },
  );

  it('R11: al cargar con sesión guardada muestra carga y ninguna vista protegida hasta que GET /me responde', async () => {
    const meGate = deferred(json(200, staffMe.NURSE));
    const net = fakeApi({ 'GET /api/v1/me': meGate.handler });
    renderApp({ entries: ['/triage'], stored: true });

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Cargando tu perfil',
    );
    expect(
      screen.queryByRole('heading', { name: 'Triage' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Nora Enfermera')).not.toBeInTheDocument();
    expect(net.calls('GET /api/v1/me')).toHaveLength(1);

    act(() => {
      meGate.release();
    });
    expect(
      await screen.findByRole('heading', { name: 'Triage' }),
    ).toBeInTheDocument();
  });

  it('R12: al cargar con una sesión vencida la borra sin llamar a la API y pide iniciar sesión', async () => {
    const net = fakeApi({});
    const { router } = renderApp({
      entries: ['/triage'],
      stored: { accessToken: 'viejo', expiresAt: '2020-01-01T00:00:00.000Z' },
    });
    expect(
      await screen.findByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    expect(
      screen.queryByText('Tu sesión expiró. Vuelve a iniciar sesión.'),
    ).not.toBeInTheDocument();
    expect(net.requests).toHaveLength(0);
  });

  it('R16: si GET /me falla al cargar, muestra el error con Reintentar y Cerrar sesión y no la vista protegida', async () => {
    fakeApi({ 'GET /api/v1/me': problem(500) });
    const user = userEvent.setup();
    const { router } = renderApp({ entries: ['/triage'], stored: true });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo cargar tu perfil.',
    );
    expect(
      screen.getByRole('button', { name: 'Reintentar' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Triage' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(
      await screen.findByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('R16: si el GET /me posterior al login falla, muestra el error de perfil en lugar de entrar', async () => {
    fakeApi({
      'POST /api/v1/auth/login': json(200, accessToken()),
      'GET /api/v1/me': problem(502),
    });
    const user = userEvent.setup();
    renderApp({ entries: ['/login'] });
    await login(user, staffMe.NURSE.email);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo cargar tu perfil.',
    );
    expect(
      screen.getByRole('button', { name: 'Reintentar' }),
    ).toBeInTheDocument();
  });

  it('R17: un token de paciente cierra la sesión y muestra /login con el mensaje de solo personal', async () => {
    fakeApi({ 'GET /api/v1/me': json(200, patientMe) });
    const { router } = renderApp({ entries: ['/cola'], stored: true });

    expect(
      await screen.findByText(
        'Esta web es solo para el personal. Los pacientes usan la app móvil.',
      ),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    expect(
      screen.queryByRole('heading', { name: 'Cola priorizada' }),
    ).not.toBeInTheDocument();
  });

  it('R17: si tras el login GET /me devuelve PATIENT no entra y muestra el mensaje de solo personal', async () => {
    fakeApi({
      'POST /api/v1/auth/login': json(200, accessToken()),
      'GET /api/v1/me': json(200, patientMe),
    });
    const user = userEvent.setup();
    const { router } = renderApp({ entries: ['/login'] });
    await login(user, 'paciente@ips.example');
    expect(
      await screen.findByText(
        'Esta web es solo para el personal. Los pacientes usan la app móvil.',
      ),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('R14: al llegar expiresAt muestra /login con el mensaje de sesión expirada', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-10-26T12:00:00.000Z'));
    fakeApi({ 'GET /api/v1/me': json(200, staffMe.PHYSICIAN) });
    const { router } = renderApp({
      entries: ['/cola'],
      stored: { accessToken: 'tok', expiresAt: '2026-10-26T20:00:00.000Z' },
    });
    await screen.findByRole('heading', { name: 'Cola priorizada' });

    act(() => {
      vi.advanceTimersByTime(8 * 3600_000);
    });

    expect(
      await screen.findByText('Tu sesión expiró. Vuelve a iniciar sesión.'),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('R15: un 401 de GET /me muestra /login con el mensaje de sesión expirada', async () => {
    fakeApi({ 'GET /api/v1/me': problem(401) });
    const { router } = renderApp({ entries: ['/triage'], stored: true });
    expect(
      await screen.findByText('Tu sesión expiró. Vuelve a iniciar sesión.'),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('D13: /estado es pública y muestra la página de estado sin sesión', async () => {
    fakeApi({
      'GET /api/v1/health': json(200, {
        status: 'ok',
        time: '2026-10-27T00:42:00.000Z',
      }),
    });
    const { router } = renderApp({ entries: ['/estado'] });
    expect(
      await screen.findByRole('heading', { name: 'Estado del sistema' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/estado');
  });
});
