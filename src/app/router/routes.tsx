import type { ReactNode } from 'react';
import type { RouteObject } from 'react-router';
import { QUEUE_PAGES } from '../../features/queue/pages';
import { RECEPTION_PAGES } from '../../features/reception/pages';
import { REPORT_PAGES } from '../../features/reports/pages';
import { StatusPage } from '../../features/status/StatusPage';
import { ENCOUNTER_PAGES, TRIAGE_PAGES } from '../../features/triage/pages';
import type { TitleHandle } from '../../shared/hooks/useDocumentTitle';
import { Layout, type FrameHandle } from '../../shared/ui/Layout';
import { AppRouteError, PublicRouteError } from './AppRouteError';
import { AppShell } from './AppShell';
import { HomeRedirect } from './HomeRedirect';
import { lazyFeatureRoutes } from './lazyFeature';
import { LoginRoute } from './LoginRoute';
import { RequireRole } from './RequireRole';
import { RequireSession } from './RequireSession';
import { ROLE_ROUTES } from './roleMatrix';
import { PublicHome } from '../PublicHome';

/**
 * La pantalla de cada ruta de la matriz de roles (D4 de F-02-web, D13 de UI-02-web). Todas la
 * tienen: no queda ningún marcador, y `?? []` es solo por tipos (lo cubre una prueba que recorre
 * `ROLE_ROUTES`). El código de cada feature privada se descarga de forma diferida, un fragmento
 * por feature (UI-03-web R12, D10): triage y la consulta de atenciones comparten fragmento.
 */
const loadTriage = () => import('../../features/triage/routes');

export const FEATURE_ROUTES: Partial<Record<string, RouteObject[]>> = {
  '/recepcion': lazyFeatureRoutes(RECEPTION_PAGES, () =>
    import('../../features/reception/routes').then((m) => m.receptionRoutes),
  ),
  '/atenciones': lazyFeatureRoutes(ENCOUNTER_PAGES, () =>
    loadTriage().then((m) => m.encounterRoutes),
  ),
  '/triage': lazyFeatureRoutes(TRIAGE_PAGES, () =>
    loadTriage().then((m) => m.triageRoutes),
  ),
  '/cola': lazyFeatureRoutes(QUEUE_PAGES, () =>
    import('../../features/queue/routes').then((m) => m.queueRoutes),
  ),
  '/reportes': lazyFeatureRoutes(REPORT_PAGES, () =>
    import('../../features/reports/routes').then((m) => m.reportRoutes),
  ),
};

/** Pantallas públicas; las pruebas pueden sustituirlas (UI-03-web R8). */
export interface PublicPages {
  home: ReactNode;
  login: ReactNode;
  estado: ReactNode;
}

const PUBLIC_PAGES: PublicPages = {
  home: <PublicHome />,
  login: <LoginRoute />,
  estado: <StatusPage />,
};

/**
 * Configuración de rutas (D6, D7, D8, D13). Cada ruta privada lleva su `errorElement` dentro del
 * `AppShell` y las públicas uno dentro del `Layout`, para que un error conserve el marco
 * (UI-03-web R8, D7). Se exporta para montarla en memoria en las pruebas.
 */
export function buildRoutes(
  features: Partial<Record<string, RouteObject[]>> = FEATURE_ROUTES,
  pages: Partial<PublicPages> = {},
): RouteObject[] {
  const { home, login, estado } = { ...PUBLIC_PAGES, ...pages };
  return [
    {
      element: <Layout />,
      children: [
        {
          errorElement: <PublicRouteError />,
          children: [
            {
              path: '/login',
              element: login,
              handle: { titleKey: 'feature_login_title' } satisfies TitleHandle,
            },
            {
              path: '/estado',
              element: estado,
              handle: {
                titleKey: 'feature_system_status',
              } satisfies TitleHandle,
            },
            { index: true, element: home },
            {
              element: <RequireSession />,
              children: [
                { path: '/app', element: <HomeRedirect /> },
                {
                  element: <AppShell />,
                  // Marco privado: la marca es la de la barra lateral y la cabecera solo lleva
                  // las herramientas (D26, R39). `Layout` lo lee con `useMatches`.
                  handle: { privateFrame: true } satisfies FrameHandle,
                  children: ROLE_ROUTES.map((route) => ({
                    element: <RequireRole roles={route.roles} />,
                    errorElement: <AppRouteError />,
                    children: features[route.path] ?? [],
                  })),
                },
              ],
            },
            { path: '*', element: <HomeRedirect /> },
          ],
        },
      ],
    },
  ];
}

export const routes: RouteObject[] = buildRoutes();
