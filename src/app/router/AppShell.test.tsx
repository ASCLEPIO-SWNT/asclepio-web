import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StaffRole } from '../../shared/api/client';
import { SESSION_KEY, session } from '../../shared/api/session';
import { fakeApi, json, staffMe } from '../../test/fakeApi';
import { renderApp } from './testApp';

const CASES: Array<{
  role: StaffRole;
  home: string;
  label: string;
  links: string[];
}> = [
  {
    role: 'RECEPTION',
    home: '/recepcion',
    label: 'Recepción',
    links: ['Recepción'],
  },
  {
    role: 'NURSE',
    home: '/triage',
    label: 'Enfermería',
    links: ['Triage', 'Cola priorizada'],
  },
  {
    role: 'PHYSICIAN',
    home: '/cola',
    label: 'Medicina',
    links: ['Cola priorizada'],
  },
  {
    role: 'ADMIN',
    home: '/reportes',
    label: 'Administración',
    links: ['Cola priorizada', 'Reportes'],
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
  session.clear();
});

describe('AppShell', () => {
  it.each(CASES)(
    'R21: $role ve su nombre, su rol en español, "Cerrar sesión" y solo sus enlaces',
    async ({ role, home, label, links }) => {
      fakeApi({ 'GET /api/v1/me': json(200, staffMe[role]) });
      renderApp({ entries: [home], stored: true });

      const header = await screen.findByRole('region', { name: 'Sesión' });
      const user = within(header)
        .getByText(staffMe[role].fullName)
        .closest('p');
      expect(user).toHaveTextContent(`${staffMe[role].fullName}${label}`);
      expect(
        within(header).getByRole('button', { name: 'Cerrar sesión' }),
      ).toBeInTheDocument();
      const nav = within(header).getByRole('navigation', { name: 'Principal' });
      expect(
        within(nav)
          .getAllByRole('link')
          .map((a) => a.textContent),
      ).toEqual(links);
    },
  );

  it('R21: el encabezado también aparece en la vista "Sin permiso"', async () => {
    fakeApi({ 'GET /api/v1/me': json(200, staffMe.PHYSICIAN) });
    renderApp({ entries: ['/reportes'], stored: true });
    await screen.findByRole('heading', {
      name: 'No tienes permiso para ver esta página.',
    });
    expect(
      screen.getByRole('button', { name: 'Cerrar sesión' }),
    ).toBeInTheDocument();
  });

  it('R22: "Cerrar sesión" borra la sesión, vacía la caché y va a /login reemplazando el historial; Atrás no vuelve a entrar', async () => {
    const net = fakeApi({ 'GET /api/v1/me': json(200, staffMe.NURSE) });
    const user = userEvent.setup();
    const { router, queryClient } = renderApp({
      entries: ['/cola', '/triage'],
      stored: true,
    });
    await screen.findByRole('heading', { level: 1, name: 'Triage' });

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(
      await screen.findByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.historyAction).toBe('REPLACE');
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    expect(queryClient.getQueryData(['auth', 'me'])).toBeUndefined();
    expect(
      screen.queryByText('Tu sesión expiró. Vuelve a iniciar sesión.'),
    ).not.toBeInTheDocument();

    // Atrás: la entrada anterior (/cola) es protegida y vuelve a /login sin mostrar nada.
    await act(() => router.navigate(-1));
    expect(
      await screen.findByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(
      screen.queryByRole('heading', { name: 'Cola priorizada' }),
    ).not.toBeInTheDocument();
    expect(net.calls('GET /api/v1/me')).toHaveLength(1);
  });
});
