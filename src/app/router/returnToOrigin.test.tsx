import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StaffRole } from '../../shared/api/client';
import { session } from '../../shared/api/session';
import {
  ENCOUNTER_ID,
  PASSWORD,
  SITE_NORTE,
  accessToken,
  encounter,
  fakeApi,
  json,
  problem,
  publicTenants,
  staffMe,
} from '../../test/fakeApi';
import { renderApp } from '../../test/testApp';

const DETAIL = `GET /api/v1/encounters/${ENCOUNTER_ID}`;
const ORIGIN = `/triage/${ENCOUNTER_ID}`;
const SEARCH = `?siteId=${SITE_NORTE.id}&offset=50`;

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
  session.clear();
});

/** Abre la captura con sesión; la API responde 401 a la sesión vigente (cierre forzado). */
async function expireDuringCapture() {
  const net = fakeApi({
    'GET /api/v1/me': json(200, staffMe.NURSE),
    'GET /api/v1/public/tenants': json(200, publicTenants),
    [DETAIL]: problem(401),
    [`${DETAIL}/clinical-capture`]: problem(401),
  });
  const user = userEvent.setup({ delay: null });
  const view = renderApp({ entries: [`${ORIGIN}${SEARCH}`], stored: true });
  expect(
    await screen.findByText('Tu sesión expiró. Vuelve a iniciar sesión.'),
  ).toBeVisible();
  expect(view.router.state.location.pathname).toBe('/login');
  return { net, user, ...view };
}

async function loginAs(
  net: ReturnType<typeof fakeApi>,
  user: ReturnType<typeof userEvent.setup>,
  role: StaffRole,
) {
  net.set('POST /api/v1/auth/login', json(200, accessToken()));
  net.set('GET /api/v1/me', json(200, staffMe[role]));
  net.set(DETAIL, json(200, encounter));
  await user.type(screen.getByLabelText('Correo'), staffMe[role].email);
  await user.type(screen.getByLabelText('Contraseña'), PASSWORD);
  await user.click(screen.getByRole('button', { name: 'Ingresar' }));
}

describe('UI-03-web vuelta a la ruta de origen', () => {
  it('R19: tras un 401 en la captura, el login del mismo rol vuelve a la ruta de origen con su search', async () => {
    const { net, user, router } = await expireDuringCapture();
    expect(router.state.location.search).toBe('');
    await loginAs(net, user, 'NURSE');
    await waitFor(() => expect(router.state.location.pathname).toBe(ORIGIN));
    expect(router.state.location.search).toBe(SEARCH);
  });

  it('R19: si el rol que inicia sesión no permite la ruta de origen, va al inicio de su rol', async () => {
    const { net, user, router } = await expireDuringCapture();
    net.set('GET /api/v1/pre-registrations', json(200, []));
    net.set('GET /api/v1/encounters', json(200, { items: [] }));
    await loginAs(net, user, 'RECEPTION');
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/recepcion'),
    );
    expect(router.state.location.search).toBe('');
  });
});
