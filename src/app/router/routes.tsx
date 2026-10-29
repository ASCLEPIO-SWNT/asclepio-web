import type { RouteObject } from 'react-router';
import { receptionRoutes } from '../../features/reception/routes';
import { StatusPage } from '../../features/status/StatusPage';
import { encounterRoutes, triageRoutes } from '../../features/triage/routes';
import { Layout } from '../../shared/ui/Layout';
import { PlaceholderPage } from '../../shared/ui/PlaceholderPage';
import { AppShell } from './AppShell';
import { HomeRedirect } from './HomeRedirect';
import { LoginRoute } from './LoginRoute';
import { RequireRole } from './RequireRole';
import { RequireSession } from './RequireSession';
import { ROLE_ROUTES } from './roleMatrix';
import { PublicHome } from '../PublicHome';

/** Pantallas reales por ruta de la matriz (D4 de F-02-web); el resto siguen como marcadores. */
const FEATURE_ROUTES: Partial<Record<string, RouteObject[]>> = {
  '/recepcion': receptionRoutes,
  '/atenciones': encounterRoutes,
  '/triage': triageRoutes,
};

/** Configuración de rutas (D6, D7, D8, D13). Se exporta para montarla en memoria en las pruebas. */
export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { path: '/login', element: <LoginRoute /> },
      { path: '/estado', element: <StatusPage /> },
      { index: true, element: <PublicHome /> },
      {
        element: <RequireSession />,
        children: [
          { path: '/app', element: <HomeRedirect /> },
          {
            element: <AppShell />,
            children: ROLE_ROUTES.map((route) => ({
              element: <RequireRole roles={route.roles} />,
              children: FEATURE_ROUTES[route.path] ?? [
                {
                  path: route.path,
                  element: (
                    <PlaceholderPage
                      title={route.title}
                      feature={route.feature}
                      titleKey={`common_nav_${route.path.slice(1)}`}
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
