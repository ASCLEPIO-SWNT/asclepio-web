import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StaffRole } from '../../shared/api/client';
import { session } from '../../shared/api/session';
import {
  PASSWORD,
  SITE_NORTE,
  accessToken,
  fakeApi,
  json,
  problem,
  publicTenants,
  staffMe,
} from '../../test/fakeApi';
import { renderApp } from '../../test/testApp';
import { HOME_BY_ROLE } from './roleMatrix';

const ME = 'GET /api/v1/me';
const ENCOUNTERS = 'GET /api/v1/encounters';

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
  session.clear();
});

/** Red con lo que piden los inicios de los cuatro roles y `/atenciones`, con `role` en `/me`. */
function network(role: StaffRole) {
  return fakeApi({
    [ME]: json(200, staffMe[role]),
    'GET /api/v1/public/tenants': json(200, publicTenants),
    'GET /api/v1/pre-registrations': json(200, []),
    [ENCOUNTERS]: json(200, { items: [] }),
  });
}

async function loginAs(
  net: ReturnType<typeof fakeApi>,
  user: ReturnType<typeof userEvent.setup>,
  role: StaffRole,
) {
  net.set('POST /api/v1/auth/login', json(200, accessToken()));
  net.set(ME, json(200, staffMe[role]));
  await user.type(screen.getByLabelText('Correo'), staffMe[role].email);
  await user.type(screen.getByLabelText('Contraseña'), PASSWORD);
  await user.click(screen.getByRole('button', { name: 'Ingresar' }));
}

async function logoutFrom(
  user: ReturnType<typeof userEvent.setup>,
  heading: string,
) {
  await screen.findByRole('heading', { level: 1, name: heading });
  await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
  await screen.findByRole('heading', { name: 'Iniciar sesión' });
}

describe('UI-04-web cierre de sesión e inicio del rol', () => {
  it('R1: RECEPTION cierra sesión en /atenciones y NURSE entra en su inicio /triage', async () => {
    const net = network('RECEPTION');
    const user = userEvent.setup({ delay: null });
    const { router } = renderApp({ entries: ['/atenciones'], stored: true });
    await logoutFrom(user, 'Atenciones');
    expect(router.state.location.state).toBeNull();

    await loginAs(net, user, 'NURSE');
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(HOME_BY_ROLE.NURSE),
    );
  });

  it('R1: PHYSICIAN cierra sesión en /cola y ADMIN entra en su inicio /reportes', async () => {
    const net = network('PHYSICIAN');
    const user = userEvent.setup({ delay: null });
    const { router } = renderApp({ entries: ['/cola'], stored: true });
    await logoutFrom(user, 'Cola priorizada');

    await loginAs(net, user, 'ADMIN');
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(HOME_BY_ROLE.ADMIN),
    );
  });

  it('R1: el mismo rol que cierra sesión vuelve a entrar en su inicio, no en la ruta anterior', async () => {
    const net = network('NURSE');
    const user = userEvent.setup({ delay: null });
    const { router } = renderApp({ entries: ['/atenciones'], stored: true });
    await logoutFrom(user, 'Atenciones');

    await loginAs(net, user, 'NURSE');
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(HOME_BY_ROLE.NURSE),
    );
  });

  it('R1: tras cerrar sesión, «Atrás» hacia una ruta privada no deja ruta de origen para el siguiente rol', async () => {
    const net = network('NURSE');
    const user = userEvent.setup({ delay: null });
    const { router } = renderApp({
      entries: ['/atenciones', '/triage'],
      stored: true,
    });
    await logoutFrom(user, 'Triage');

    // La entrada anterior (/atenciones) es privada: RequireSession vuelve a /login.
    await act(() => router.navigate(-1));
    await screen.findByRole('heading', { name: 'Iniciar sesión' });
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.state).toBeNull();

    await loginAs(net, user, 'PHYSICIAN');
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(HOME_BY_ROLE.PHYSICIAN),
    );
  });

  it('R2: tras un 401 de la sesión vigente en /atenciones?…, el login del mismo rol vuelve a la ruta con su search', async () => {
    const search = `?siteId=${SITE_NORTE.id}`;
    const net = network('RECEPTION');
    net.set(ENCOUNTERS, problem(401));
    const user = userEvent.setup({ delay: null });
    const { router } = renderApp({
      entries: [`/atenciones${search}`],
      stored: true,
    });
    expect(
      await screen.findByText('Tu sesión expiró. Vuelve a iniciar sesión.'),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe('/login');

    net.set(ENCOUNTERS, json(200, { items: [] }));
    await loginAs(net, user, 'RECEPTION');
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/atenciones'),
    );
    expect(router.state.location.search).toBe(search);
  });

  it('R2: una ruta privada abierta sin sesión vuelve a esa ruta tras el login', async () => {
    const net = network('NURSE');
    const user = userEvent.setup({ delay: null });
    const { router } = renderApp({ entries: ['/atenciones'] });
    await screen.findByRole('heading', { name: 'Iniciar sesión' });
    expect(router.state.location.pathname).toBe('/login');

    await loginAs(net, user, 'NURSE');
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/atenciones'),
    );
  });
});
