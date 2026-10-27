import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  TOKEN,
  accessToken,
  fakeApi,
  json,
  problem,
  staffMe,
} from '../../test/fakeApi';
import { api } from './client';
import { session } from './session';

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
  session.clear();
});

describe('cliente de la API (middleware de sesión)', () => {
  it('R13: añade Authorization Bearer a las peticiones mientras hay sesión guardada', async () => {
    const net = fakeApi({
      'GET /api/v1/me': json(200, staffMe.NURSE),
      'GET /api/v1/health': json(200, {
        status: 'ok',
        time: '2026-10-26T00:00:00.000Z',
      }),
    });
    session.set(accessToken());

    await api.GET('/api/v1/me');
    await api.GET('/api/v1/health');

    expect(net.requests.map((r) => r.headers.get('Authorization'))).toEqual([
      `Bearer ${TOKEN}`,
      `Bearer ${TOKEN}`,
    ]);
  });

  it('R13: no añade Authorization sin sesión guardada', async () => {
    const net = fakeApi({ 'GET /api/v1/health': json(200, {}) });
    await api.GET('/api/v1/health');
    expect(net.requests[0].headers.has('Authorization')).toBe(false);
  });

  it('R13: nunca añade Authorization a POST /api/v1/auth/login', async () => {
    const net = fakeApi({
      'POST /api/v1/auth/login': json(200, accessToken()),
    });
    session.set(accessToken());
    await api.POST('/api/v1/auth/login', {
      body: { email: 'a@b.co', password: 'x' },
    });
    expect(net.requests[0].headers.has('Authorization')).toBe(false);
  });

  it('R15: un 401 de una petición con Authorization cierra la sesión con motivo expired', async () => {
    fakeApi({ 'GET /api/v1/me': problem(401, { title: 'Unauthorized' }) });
    session.set(accessToken());

    await api.GET('/api/v1/me');

    expect(session.getSnapshot()).toEqual({
      session: null,
      endReason: 'expired',
    });
    expect(sessionStorage.length).toBe(0);
  });

  it('R15: el 401 del login (sin Authorization) no toca la sesión', async () => {
    fakeApi({ 'POST /api/v1/auth/login': problem(401) });
    session.set(accessToken());
    await api.POST('/api/v1/auth/login', {
      body: { email: 'a@b.co', password: 'x' },
    });
    expect(session.getSnapshot().session).not.toBeNull();
  });
});
