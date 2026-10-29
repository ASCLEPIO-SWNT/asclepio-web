import type { RouteObject } from 'react-router';
import { QueuePage } from './components/QueuePage';

/**
 * Dashboard de medicina (F-06-web aún no trae la cola): PHYSICIAN, NURSE y ADMIN, según la matriz
 * de `app/router`. Hoy solo monta las atenciones por estado y las recientes, con la franja
 * «pendiente» de F-06.
 */
export const queueRoutes: RouteObject[] = [
  { path: '/cola', element: <QueuePage /> },
];
