import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SESSION_KEY, session } from '../../shared/api/session';
import { TOKEN, fakeApi, inMs, json, staffMe } from '../../test/fakeApi';
import { SessionProvider } from './SessionProvider';
import { useSession } from './useSession';

function Probe() {
  const { session: current } = useSession();
  return <p>{current ? `token ${current.accessToken}` : 'sin sesión'}</p>;
}

function mountStrict() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <SessionProvider>
          <Probe />
        </SessionProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  sessionStorage.clear();
  session.clear();
});

describe('UI-03-web restauración de la sesión', () => {
  it('R26: el render de SessionProvider con StrictMode no lee sessionStorage (restore no se llama al renderizar)', () => {
    fakeApi({ 'GET /api/v1/me': json(200, staffMe.NURSE) });
    const restore = vi.spyOn(session, 'restore');
    mountStrict();
    expect(restore).not.toHaveBeenCalled();
  });

  it('R26: una sola restauración al arrancar deja activa la sesión guardada con StrictMode', () => {
    fakeApi({ 'GET /api/v1/me': json(200, staffMe.NURSE) });
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ accessToken: TOKEN, expiresAt: inMs(3600_000) }),
    );
    const restore = vi.spyOn(session, 'restore');
    session.restore();
    mountStrict();
    expect(restore).toHaveBeenCalledTimes(1);
    expect(screen.getByText(`token ${TOKEN}`)).toBeInTheDocument();
  });

  it('R26: main.tsx restaura la sesión una vez antes de crear la raíz de React', () => {
    const main = readFileSync('src/main.tsx', 'utf8');
    const restoreAt = main.indexOf('session.restore()');
    expect(restoreAt).toBeGreaterThan(-1);
    expect(main.indexOf('session.restore()', restoreAt + 1)).toBe(-1);
    expect(restoreAt).toBeLessThan(main.indexOf('createRoot('));
  });
});
