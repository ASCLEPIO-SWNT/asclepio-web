import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { session } from '../../shared/api/session';
import { deferred, fakeApi, json, staffMe } from '../../test/fakeApi';
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_KEY,
} from '../../shared/preferences/storage';
import { renderApp } from '../../test/testApp';
import userEvent from '@testing-library/user-event';

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
  session.clear();
});

it('R5: localizes the protected loading state while the staff profile is pending', async () => {
  localStorage.setItem(
    PREFERENCES_KEY,
    JSON.stringify({ ...DEFAULT_PREFERENCES, locale: 'en' }),
  );
  const profile = deferred(json(200, staffMe.NURSE));
  fakeApi({ 'GET /api/v1/me': profile.handler });
  const { router } = renderApp({ entries: ['/app'], stored: true });
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Loading your profile…',
  );
  expect(screen.queryByText('Cargando tu perfil…')).not.toBeInTheDocument();
  expect(
    screen.queryByRole('heading', { name: 'Triage' }),
  ).not.toBeInTheDocument();
  act(() => {
    profile.release();
  });
  expect(
    await screen.findByRole('heading', { name: 'Triage' }),
  ).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/triage');
});

it('R1: preserves the original Asclepio brand on the public page and staff login', async () => {
  fakeApi({});
  const { router } = renderApp({ entries: ['/'] });
  const brandImage = screen
    .getByRole('link', { name: 'Asclepio' })
    .querySelector('img');
  expect(brandImage).toHaveAttribute('src', '/images/asclepio-mark.png');
  await act(() => router.navigate('/login'));
  expect(
    await screen.findByRole('heading', { name: 'Iniciar sesión' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Asclepio' }).querySelector('img'),
  ).toHaveAttribute('src', brandImage?.getAttribute('src'));
});

it('R15: reaches skip and preference controls with Tab and closes the panel with Escape', async () => {
  fakeApi({});
  const user = userEvent.setup();
  renderApp({ entries: ['/'] });
  await user.tab();
  expect(
    screen.getByRole('link', { name: 'Saltar al contenido' }),
  ).toHaveFocus();
  const summary = screen
    .getByText('Preferencias', { selector: 'summary span' })
    .closest('summary')!;
  for (let step = 0; step < 12 && document.activeElement !== summary; step++)
    await user.tab();
  expect(summary).toHaveFocus();
  // jsdom does not implement native keyboard activation of summary; browser QA covers Enter.
  fireEvent.click(summary);
  expect(summary.parentElement).toHaveAttribute('open');
  await user.selectOptions(screen.getByLabelText('Tema'), 'dark');
  expect(document.documentElement.dataset.theme).toBe('dark');
  await user.keyboard('{Escape}');
  expect(summary.parentElement).not.toHaveAttribute('open');
  expect(summary).toHaveFocus();
});

it('R2: root stays public and presents the new triage flow, human decision and staff access', async () => {
  const net = fakeApi({});
  const { router } = renderApp({ entries: ['/'] });
  expect(
    await screen.findByRole('heading', {
      level: 1,
      name: /Cada atención empieza/,
    }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Acceso del personal' }),
  ).toHaveAttribute('href', '/login');
  expect(screen.getByText('El profesional decide')).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/');
  expect(net.requests).toHaveLength(0);
});

it('R3: app entry requires a session and redirects to the current role home', async () => {
  fakeApi({ 'GET /api/v1/me': json(200, staffMe.NURSE) });
  const { router } = renderApp({ entries: ['/app'], stored: true });
  expect(
    await screen.findByRole('heading', { name: 'Triage' }),
  ).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/triage');
  await act(() => router.navigate('/'));
  expect(
    await screen.findByRole('heading', { name: /Cada atención empieza/ }),
  ).toBeInTheDocument();
});

it('R4: toggles the responsive navigation and preserves only the current role links', async () => {
  fakeApi({ 'GET /api/v1/me': json(200, staffMe.RECEPTION) });
  renderApp({ entries: ['/recepcion'], stored: true });
  const region = await screen.findByRole('region', { name: 'Sesión' });
  const toggle = within(region).getByRole('button', {
    name: 'Abrir navegación',
  });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(
    within(region).getByRole('navigation', { name: 'Principal' }),
  ).toBeInTheDocument();
  expect(
    within(region).queryByRole('link', { name: 'Reportes' }),
  ).not.toBeInTheDocument();
});
