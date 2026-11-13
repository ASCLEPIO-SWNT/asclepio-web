import type { RouteObject } from 'react-router';
import { REPORT_PAGES } from './pages';
import { ReportsPage } from './components/ReportsPage';

/**
 * Tablero de reportes de F-07 (F-07-web): solo ADMIN, según la matriz de `app/router`. Muestra
 * los indicadores de `GET /reports/summary` del periodo elegido y descarga el CSV interno.
 */
export const reportRoutes: RouteObject[] = [
  {
    path: '/reportes',
    element: <ReportsPage />,
    handle: REPORT_PAGES['/reportes'],
  },
];
