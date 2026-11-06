import type { RouteObject } from 'react-router';
import { REPORT_PAGES } from './pages';
import { ReportsPage } from './components/ReportsPage';

/**
 * Dashboard de administración (F-07-web aún no trae los reportes): solo ADMIN, según la matriz
 * de `app/router`. Hoy solo monta las atenciones por estado y la espera de triage por sede, con
 * la franja «pendiente» de F-07.
 */
export const reportRoutes: RouteObject[] = [
  {
    path: '/reportes',
    element: <ReportsPage />,
    handle: REPORT_PAGES['/reportes'],
  },
];
