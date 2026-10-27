import type { RouteObject } from 'react-router';
import { StatusPage } from '../../features/status/StatusPage';
import { Layout } from '../../shared/ui/Layout';
import { PlaceholderPage } from '../../shared/ui/PlaceholderPage';
import { AppShell } from './AppShell';
import { HomeRedirect } from './HomeRedirect';
import { LoginRoute } from './LoginRoute';
import { RequireRole } from './RequireRole';
import { RequireSession } from './RequireSession';
import { ROLE_ROUTES } from './roleMatrix';

/** Configuración de rutas (D6, D7, D8, D13). Se exporta para montarla en memoria en las pruebas. */
export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { path: '/login', element: <LoginRoute /> },
      { path: '/estado', element: <StatusPage /> },
      { index: true, element: <HomeRedirect /> },
      {
        element: <RequireSession />,
        children: [
          {
            element: <AppShell />,
            children: ROLE_ROUTES.map((route) => ({
              element: <RequireRole roles={route.roles} />,
              children: [
                {
                  path: route.path,
                  element: (
                    <PlaceholderPage
                      title={route.title}
                      feature={route.feature}
                    />
                  ),
                },
              ],
            })),
          },
        ],
      },
      { path: '*', element: <HomeRedirect /> },
    ],
  },
];
