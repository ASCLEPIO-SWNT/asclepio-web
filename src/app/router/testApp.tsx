import { QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { SESSION_KEY } from '../../shared/api/session';
import { TOKEN, inMs } from '../../test/fakeApi';
import { AppProviders } from '../providers/AppProviders';
import { routes } from './routes';

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
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
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
