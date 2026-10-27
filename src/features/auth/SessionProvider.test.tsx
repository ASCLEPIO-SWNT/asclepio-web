import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SESSION_KEY, session } from '../../shared/api/session';
import {
  TOKEN,
  fakeApi,
  inMs,
  json,
  networkError,
  patientMe,
  problem,
  sequence,
  staffMe,
} from '../../test/fakeApi';
import { ProfileError } from './components/ProfileError';
import { useMe } from './hooks/useMe';
import { SessionProvider } from './SessionProvider';
import { useSession } from './useSession';

function Probe() {
  const { session: current, endReason } = useSession();
  const me = useMe();
  if (!current) return <p>sin sesión ({endReason ?? 'ninguno'})</p>;
  if (me.isPending) return <p role="status">Cargando tu perfil…</p>;
  if (me.isError) return <ProfileError />;
  return <p>perfil {me.data.kind}</p>;
}

function renderWithSession(stored?: unknown) {
  if (stored !== undefined) {
    sessionStorage.setItem(
      SESSION_KEY,
      typeof stored === 'string' ? stored : JSON.stringify(stored),
    );
  }
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const utils = render(
    <QueryClientProvider client={client}>
      <SessionProvider>
        <Probe />
      </SessionProvider>
    </QueryClientProvider>,
  );
  return { client, ...utils };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  sessionStorage.clear();
  session.clear();
});

describe('SessionProvider', () => {
  it('R11: con una sesión guardada vigente pide GET /me con el token y muestra carga mientras tanto', async () => {
    const net = fakeApi({ 'GET /api/v1/me': json(200, staffMe.NURSE) });
    renderWithSession({ accessToken: TOKEN, expiresAt: inMs(3600_000) });

    expect(screen.getByRole('status')).toHaveTextContent('Cargando tu perfil');
    expect(await screen.findByText('perfil STAFF')).toBeInTheDocument();
    const [me] = net.calls('GET /api/v1/me');
    expect(me.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
  });

  it.each([
    ['vencida', { accessToken: TOKEN, expiresAt: inMs(-1000) }],
    ['corrupta', '{"accessToken":'],
  ])('R12: una sesión %s se borra sin llamar a la API', (_, stored) => {
    const net = fakeApi({});
    renderWithSession(stored);
    expect(screen.getByText('sin sesión (ninguno)')).toBeInTheDocument();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    expect(net.requests).toHaveLength(0);
  });

  it.each([
    ['500', problem(500)],
    ['403', problem(403)],
    ['sin respuesta HTTP', networkError()],
  ])(
    'R16: si GET /me falla (%s) muestra el error con Reintentar, que repite GET /me',
    async (_, failure) => {
      const net = fakeApi({
        'GET /api/v1/me': sequence(failure, json(200, staffMe.ADMIN)),
      });
      const user = userEvent.setup();
      renderWithSession({ accessToken: TOKEN, expiresAt: inMs(3600_000) });

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'No se pudo cargar tu perfil.',
      );
      await user.click(screen.getByRole('button', { name: 'Reintentar' }));

      expect(await screen.findByText('perfil STAFF')).toBeInTheDocument();
      expect(net.calls('GET /api/v1/me')).toHaveLength(2);
    },
  );

  it('R16: "Cerrar sesión" en el error de perfil cierra la sesión', async () => {
    fakeApi({ 'GET /api/v1/me': problem(503) });
    const user = userEvent.setup();
    renderWithSession({ accessToken: TOKEN, expiresAt: inMs(3600_000) });

    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(screen.getByText('sin sesión (logout)')).toBeInTheDocument();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('R17: un GET /me con kind PATIENT cierra la sesión con motivo patient y vacía la caché', async () => {
    fakeApi({ 'GET /api/v1/me': json(200, patientMe) });
    const { client } = renderWithSession({
      accessToken: TOKEN,
      expiresAt: inMs(3600_000),
    });

    expect(await screen.findByText('sin sesión (patient)')).toBeInTheDocument();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    expect(client.getQueryData(['auth', 'me'])).toBeUndefined();
  });

  it('R15: un 401 de GET /me cierra la sesión con motivo expired y vacía la caché', async () => {
    fakeApi({ 'GET /api/v1/me': problem(401) });
    const { client } = renderWithSession({
      accessToken: TOKEN,
      expiresAt: inMs(3600_000),
    });

    expect(await screen.findByText('sin sesión (expired)')).toBeInTheDocument();
    expect(client.getQueryData(['auth', 'me'])).toBeUndefined();
    expect(client.getQueryState(['auth', 'me'])?.error ?? null).toBeNull();
  });

  it('R14: al llegar expiresAt cierra la sesión con motivo expired y vacía la caché', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-10-26T12:00:00.000Z'));
    fakeApi({ 'GET /api/v1/me': json(200, staffMe.PHYSICIAN) });
    const { client } = renderWithSession({
      accessToken: TOKEN,
      expiresAt: '2026-10-26T20:00:00.000Z',
    });
    expect(await screen.findByText('perfil STAFF')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(8 * 3600_000 - 1_000);
    });
    expect(screen.getByText('perfil STAFF')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByText('sin sesión (expired)')).toBeInTheDocument();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    expect(client.getQueryData(['auth', 'me'])).toBeUndefined();
  });

  it('R14: al volver la pestaña a primer plano tras pasar expiresAt (equipo suspendido) cierra la sesión', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-26T12:00:00.000Z'));
    fakeApi({ 'GET /api/v1/me': json(200, staffMe.NURSE) });
    renderWithSession({
      accessToken: TOKEN,
      expiresAt: '2026-10-26T13:00:00.000Z',
    });
    expect(await screen.findByText('perfil STAFF')).toBeInTheDocument();

    // Solo se mueve el reloj (Date): el setTimeout real no ha llegado a dispararse.
    vi.setSystemTime(new Date('2026-10-26T13:00:01.000Z'));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(screen.getByText('sin sesión (expired)')).toBeInTheDocument();
  });

  it('R14: cerrar la sesión cancela el temporizador de expiración', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fakeApi({ 'GET /api/v1/me': json(200, staffMe.NURSE) });
    renderWithSession({ accessToken: TOKEN, expiresAt: inMs(60_000) });
    expect(await screen.findByText('perfil STAFF')).toBeInTheDocument();

    act(() => {
      session.clear('logout');
    });
    act(() => {
      vi.advanceTimersByTime(120_000);
    });

    expect(screen.getByText('sin sesión (logout)')).toBeInTheDocument();
  });
});
