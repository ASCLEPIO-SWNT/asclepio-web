import { render } from '@testing-library/react';
import { createQueryClient } from '../app/providers/queryClient';
import {
  createMemoryRouter,
  RouterProvider,
  type RouteObject,
} from 'react-router';
import { SESSION_KEY, session } from '../shared/api/session';
import { TOKEN, inMs } from './fakeApi';
import { AppProviders } from '../app/providers/AppProviders';
import { routes as appRoutes } from '../app/router/routes';
import { reportCaughtError } from '../shared/lib/routeErrors';

/**
 * Monta la app real (providers + rutas) sobre un router en memoria (D14).
 * `stored: true` deja una sesión guardada vigente antes de cargar la web.
 */
export function renderApp({
  entries = ['/'],
  stored,
  routes = appRoutes,
}: {
  entries?: string[];
  /** Rutas a montar; por defecto las de la app (UI-03-web R8 inyecta una pantalla que lanza). */
  routes?: RouteObject[];
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
      <RouterProvider router={router} onError={reportCaughtError} />
    </AppProviders>,
    // Como main.tsx (UI-03-web R9).
    { onCaughtError: reportCaughtError, onRecoverableError: reportCaughtError },
  );
  return { router, queryClient, ...utils };
}
