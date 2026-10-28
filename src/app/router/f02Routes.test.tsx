import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StaffRole } from '../../shared/api/client';
import { session } from '../../shared/api/session';
import {
  ENCOUNTER_ID,
  PASSWORD,
  accessToken,
  encounter,
  encounterSummary,
  fakeApi,
  json,
  pendingPreRegistration,
  publicTenants,
  staffMe,
} from '../../test/fakeApi';
import { renderApp } from './testApp';

const F02_ROUTES = {
  'GET /api/v1/public/tenants': json(200, publicTenants),
  'GET /api/v1/pre-registrations': json(200, [pendingPreRegistration]),
  'GET /api/v1/encounters': json(200, { items: [encounterSummary()] }),
  [`GET /api/v1/encounters/${ENCOUNTER_ID}`]: json(200, encounter),
};

const PAGES: Array<{ path: string; title: string }> = [
  { path: '/recepcion', title: 'Recepción — bandeja de pre-registros' },
  { path: '/recepcion/registro', title: 'Registro directo' },
  { path: '/atenciones', title: 'Atenciones' },
  { path: `/atenciones/${ENCOUNTER_ID}`, title: 'Atención' },
];
const ALLOWED: Record<StaffRole, string[]> = {
  RECEPTION: PAGES.map((p) => p.path),
  NURSE: ['/atenciones', `/atenciones/${ENCOUNTER_ID}`],
  PHYSICIAN: ['/atenciones', `/atenciones/${ENCOUNTER_ID}`],
  ADMIN: ['/atenciones', `/atenciones/${ENCOUNTER_ID}`],
};
const ROLES = Object.keys(ALLOWED) as StaffRole[];

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
  session.clear();
});

describe('rutas de F-02', () => {
  describe.each(ROLES)('rol %s', (role) => {
    it.each(PAGES.filter((p) => ALLOWED[role].includes(p.path)))(
      'R1: puede abrir $path',
      async ({ path, title }) => {
        fakeApi({ 'GET /api/v1/me': json(200, staffMe[role]), ...F02_ROUTES });
        const { router } = renderApp({ entries: [path], stored: true });
        expect(
          await screen.findByRole('heading', { level: 1, name: title }),
        ).toBeInTheDocument();
        expect(router.state.location.pathname).toBe(path);
        expect(
          screen.queryByText('No tienes permiso para ver esta página.'),
        ).toBeNull();
      },
    );

    it(`R1: ${role} tiene "Atenciones" en la navegación, que lleva a /atenciones`, async () => {
      fakeApi({ 'GET /api/v1/me': json(200, staffMe[role]), ...F02_ROUTES });
      const user = userEvent.setup();
      const { router } = renderApp({ entries: ['/app'], stored: true });
      const nav = await screen.findByRole('navigation', { name: 'Principal' });
      await user.click(within(nav).getByRole('link', { name: 'Atenciones' }));
      await screen.findByRole('heading', { level: 1, name: 'Atenciones' });
      expect(router.state.location.pathname).toBe('/atenciones');
    });

    it.each(PAGES.filter((p) => !ALLOWED[role].includes(p.path)))(
      'R2: en $path ve "Sin permiso" sin pedir ningún endpoint de F-02',
      async ({ path }) => {
        const net = fakeApi({
          'GET /api/v1/me': json(200, staffMe[role]),
          ...F02_ROUTES,
        });
        renderApp({ entries: [path], stored: true });
        expect(
          await screen.findByRole('heading', {
            level: 1,
            name: 'No tienes permiso para ver esta página.',
          }),
        ).toBeInTheDocument();
        expect(net.requests.map((r) => `${r.method} ${r.path}`)).toEqual([
          'GET /api/v1/me',
        ]);
      },
    );
  });

  it('R1: tras el login vuelve a /atenciones/<id> si el rol lo permite', async () => {
    fakeApi({
      'POST /api/v1/auth/login': json(200, accessToken()),
      'GET /api/v1/me': json(200, staffMe.PHYSICIAN),
      ...F02_ROUTES,
    });
    const user = userEvent.setup();
    const { router } = renderApp({ entries: [`/atenciones/${ENCOUNTER_ID}`] });
    await user.type(
      await screen.findByLabelText('Correo'),
      staffMe.PHYSICIAN.email,
    );
    await user.type(screen.getByLabelText('Contraseña'), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    await screen.findByRole('heading', { level: 1, name: 'Atención' });
    expect(router.state.location.pathname).toBe(`/atenciones/${ENCOUNTER_ID}`);
  });

  it('R1: tras el login, /recepcion/registro como NURSE va a su inicio', async () => {
    fakeApi({
      'POST /api/v1/auth/login': json(200, accessToken()),
      'GET /api/v1/me': json(200, staffMe.NURSE),
      ...F02_ROUTES,
    });
    const user = userEvent.setup();
    const { router } = renderApp({ entries: ['/recepcion/registro'] });
    await user.type(
      await screen.findByLabelText('Correo'),
      staffMe.NURSE.email,
    );
    await user.type(screen.getByLabelText('Contraseña'), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    await screen.findByRole('heading', { level: 1, name: 'Triage' });
    expect(router.state.location.pathname).toBe('/triage');
  });

  it('R4: las sedes se piden una sola vez por sesión entre /recepcion, /recepcion/registro y /atenciones, y otra vez tras un nuevo login', async () => {
    const net = fakeApi({
      'GET /api/v1/me': json(200, staffMe.RECEPTION),
      'POST /api/v1/auth/login': json(200, accessToken()),
      ...F02_ROUTES,
    });
    const user = userEvent.setup();
    const { router } = renderApp({ entries: ['/recepcion'], stored: true });
    await screen.findByRole('article', { name: 'Laura Gómez Pérez' });
    await act(() => router.navigate('/recepcion/registro'));
    await screen.findByRole('heading', { level: 1, name: 'Registro directo' });
    await act(() => router.navigate('/atenciones'));
    await screen.findByRole('table');
    await waitFor(() => expect(screen.getByLabelText('Sede')).toBeEnabled());
    expect(net.calls('GET /api/v1/public/tenants')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await user.type(
      await screen.findByLabelText('Correo'),
      staffMe.RECEPTION.email,
    );
    await user.type(screen.getByLabelText('Contraseña'), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    await screen.findByRole('heading', { level: 1, name: 'Atenciones' });
    await waitFor(() =>
      expect(net.calls('GET /api/v1/public/tenants')).toHaveLength(2),
    );
  });
});
