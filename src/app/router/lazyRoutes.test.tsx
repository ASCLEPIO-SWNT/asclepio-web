import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import type { RouteObject } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StaffRole } from '../../shared/api/client';
import { session } from '../../shared/api/session';
import {
  encounterSummary,
  fakeApi,
  json,
  publicTenants,
  staffMe,
} from '../../test/fakeApi';
import { renderApp } from '../../test/testApp';
import { lazyFeatureRoutes } from './lazyFeature';
import { FEATURE_ROUTES, buildRoutes } from './routes';

const LOADING = 'Cargando la pantalla…';
const CHUNK_ERROR =
  'No se pudo cargar la pantalla. Revisa tu conexión y vuelve a intentarlo.';
const QUEUE_PAGES = { '/cola': { titleKey: 'common_nav_cola' } };
const loadedQueue: RouteObject[] = [
  { path: '/cola', element: <h1>Cola cargada</h1> },
];

function setup(
  role: StaffRole,
  path: string,
  load: () => Promise<RouteObject[]>,
) {
  fakeApi({
    'GET /api/v1/me': json(200, staffMe[role]),
    'GET /api/v1/public/tenants': json(200, publicTenants),
    'GET /api/v1/encounters': json(200, { items: [encounterSummary()] }),
    'GET /api/v1/pre-registrations': json(200, []),
  });
  const routes = buildRoutes({
    ...FEATURE_ROUTES,
    '/cola': lazyFeatureRoutes(QUEUE_PAGES, load),
  });
  return {
    user: userEvent.setup(),
    ...renderApp({ entries: [path], stored: true, routes }),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
  localStorage.clear();
  session.clear();
});

describe('UI-03-web carga diferida por rol', () => {
  it('R13: mientras se descarga el código de la pantalla hay un estado de carga role="status" dentro del marco', async () => {
    let resolve!: (routes: RouteObject[]) => void;
    const load = vi.fn(
      () => new Promise<RouteObject[]>((done) => (resolve = done)),
    );
    setup('PHYSICIAN', '/cola', load);
    const message = await screen.findByText(LOADING);
    expect(message.closest('[role="status"]')).not.toBeNull();
    expect(screen.getByText(LOADING).closest('.shell__content')).not.toBeNull();
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();

    act(() => resolve(loadedQueue));
    expect(
      await screen.findByRole('heading', { name: 'Cola cargada' }),
    ).toBeVisible();
    expect(screen.queryByText(LOADING)).not.toBeInTheDocument();
  });

  it('R14: si la descarga falla muestra «no se pudo cargar la pantalla» y «Reintentar» vuelve a pedir ese código', async () => {
    const load = vi
      .fn<() => Promise<RouteObject[]>>()
      .mockRejectedValueOnce(
        new TypeError('Failed to fetch dynamically imported module'),
      )
      .mockResolvedValue(loadedQueue);
    const { user } = setup('PHYSICIAN', '/cola', load);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(CHUNK_ERROR);
    expect(alert).not.toHaveTextContent('dynamically imported');
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeVisible();
    expect(load).toHaveBeenCalledTimes(1);

    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    expect(
      await screen.findByRole('heading', { name: 'Cola cargada' }),
    ).toBeVisible();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('R12: una ruta prohibida para el rol no descarga el código de la pantalla', async () => {
    const load = vi.fn(() => Promise.resolve(loadedQueue));
    setup('RECEPTION', '/cola', load);
    expect(
      await screen.findByRole('heading', {
        name: 'No tienes permiso para ver esta página.',
      }),
    ).toBeVisible();
    expect(load).not.toHaveBeenCalled();
  });

  it('R12: el título de la pantalla diferida se conoce antes de descargar su código', async () => {
    const load = vi.fn(() => new Promise<RouteObject[]>(() => {}));
    setup('PHYSICIAN', '/cola', load);
    await screen.findByText(LOADING);
    await waitFor(() =>
      expect(document.title).toBe('Cola priorizada | Asclepio'),
    );
  });

  it('R12: el fragmento inicial no importa de forma estática ninguna feature privada', () => {
    const source = readFileSync('src/app/router/routes.tsx', 'utf8');
    for (const feature of ['reception', 'triage', 'queue', 'reports']) {
      expect(source).not.toMatch(
        new RegExp(
          `^import [^;]*from '\\.\\./\\.\\./features/${feature}/(routes|components)`,
          'm',
        ),
      );
      expect(source).toMatch(
        new RegExp(`import\\('\\.\\./\\.\\./features/${feature}/routes'\\)`),
      );
    }
  });
});
