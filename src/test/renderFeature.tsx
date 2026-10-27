import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import {
  createMemoryRouter,
  Outlet,
  RouterProvider,
  useLocation,
  type RouteObject,
} from 'react-router';
import type { StaffRole } from '../shared/api/client';
import { CurrentStaffProvider } from '../shared/hooks/useCurrentStaff';
import { staffMe } from './fakeApi';

type Entries = NonNullable<
  NonNullable<Parameters<typeof createMemoryRouter>[1]>['initialEntries']
>;

function OtherRoute() {
  const { pathname } = useLocation();
  return <p data-testid="other-route">{pathname}</p>;
}

/**
 * Monta las rutas de una feature con el perfil de `role` (D2) sobre un router en memoria.
 * Las rutas que la feature no declara muestran un marcador con su ruta.
 */
export function renderFeature(
  routes: RouteObject[],
  {
    entries = ['/'],
    role = 'RECEPTION',
  }: { entries?: Entries; role?: StaffRole } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(
    [
      {
        element: (
          <CurrentStaffProvider me={staffMe[role]}>
            <Outlet />
          </CurrentStaffProvider>
        ),
        children: [...routes, { path: '*', element: <OtherRoute /> }],
      },
    ],
    { initialEntries: entries, initialIndex: entries.length - 1 },
  );
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router, queryClient, ...utils };
}
