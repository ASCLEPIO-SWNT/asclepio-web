import { render } from '@testing-library/react';
import { createQueryClient } from '../app/providers/queryClient';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { SESSION_KEY, session } from '../shared/api/session';
import { TOKEN, inMs } from './fakeApi';
import { AppProviders } from '../app/providers/AppProviders';
import { routes } from '../app/router/routes';

/**
 * Monta la app real (providers + rutas) sobre un router en memoria (D14).
 * `stored: true` deja una sesión guardada vigente antes de cargar la web.
 */
export function renderApp({
  entries = ['/'],
  stored,
}: {
  entries?: string[];
  stored?: boolean | { accessToken: string; expiresAt: string };
} = {}) {
  if (stored) {
    const value =
      stored === true
        ? { accessToken: TOKEN, expiresAt: inMs(8 * 3600_000) }
        : stored;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
  }
  // Como main.tsx (UI-03-web R26): una restauración al arrancar, fuera del render.
  session.restore();
  // Los mismos valores por defecto que la app (UI-03-web D13), sin reintentos en las pruebas.
  const queryClient = createQueryClient({
    queries: { retry: false },
    mutations: { retry: false },
  });
  const router = createMemoryRouter(routes, {
    initialEntries: entries,
    initialIndex: entries.length - 1,
  });
  const utils = render(
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { router, queryClient, ...utils };
}
