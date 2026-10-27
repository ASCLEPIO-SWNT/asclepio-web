import { afterEach, describe, expect, it, vi } from 'vitest';
import { SESSION_KEY, session } from './session';

const future = () => new Date(Date.now() + 3600_000).toISOString();

afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  session.clear();
});

describe('session', () => {
  it('R10: guarda solo accessToken y expiresAt en sessionStorage bajo una sola clave y nada en localStorage', () => {
    const expiresAt = future();
    session.set({ accessToken: 'tok', tokenType: 'Bearer', expiresAt });

    expect(sessionStorage.length).toBe(1);
    expect(sessionStorage.key(0)).toBe(SESSION_KEY);
    expect(JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null')).toEqual({
      accessToken: 'tok',
      expiresAt,
    });
    expect(localStorage.length).toBe(0);
    expect(session.getSnapshot().session).toEqual({
      accessToken: 'tok',
      expiresAt,
    });
  });

  it('R10: clear borra la clave y recuerda el motivo solo en memoria', () => {
    session.set({
      accessToken: 'tok',
      tokenType: 'Bearer',
      expiresAt: future(),
    });
    session.clear('expired');
    expect(sessionStorage.length).toBe(0);
    expect(localStorage.length).toBe(0);
    expect(session.getSnapshot()).toEqual({
      session: null,
      endReason: 'expired',
    });
  });

  it('R12: restaura una sesión guardada vigente', () => {
    const stored = { accessToken: 'tok', expiresAt: future() };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(stored));
    session.restore();
    expect(session.getSnapshot().session).toEqual(stored);
  });

  it.each([
    [
      'vencida',
      JSON.stringify({
        accessToken: 't',
        expiresAt: '2000-01-01T00:00:00.000Z',
      }),
    ],
    ['JSON inválido', '{no-json'],
    [
      'sin accessToken',
      JSON.stringify({ expiresAt: '2999-01-01T00:00:00.000Z' }),
    ],
    ['sin expiresAt', JSON.stringify({ accessToken: 't' })],
    [
      'fecha no válida',
      JSON.stringify({ accessToken: 't', expiresAt: 'mañana' }),
    ],
  ])('R12: descarta una sesión %s sin dejar rastro ni motivo', (_, raw) => {
    sessionStorage.setItem(SESSION_KEY, raw);
    session.restore();
    expect(session.getSnapshot()).toEqual({ session: null, endReason: null });
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('R12: una sesión cuyo expiresAt es exactamente ahora se descarta', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-26T12:00:00.000Z'));
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        accessToken: 't',
        expiresAt: '2026-10-26T12:00:00.000Z',
      }),
    );
    session.restore();
    expect(session.getSnapshot().session).toBeNull();
    vi.useRealTimers();
  });

  it('notifica a los suscriptores en cada cambio', () => {
    const listener = vi.fn();
    const unsubscribe = session.subscribe(listener);
    session.set({
      accessToken: 'tok',
      tokenType: 'Bearer',
      expiresAt: future(),
    });
    session.clear('logout');
    unsubscribe();
    session.clear();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
