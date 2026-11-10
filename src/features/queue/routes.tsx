import type { RouteObject } from 'react-router';
import { QUEUE_PAGES } from './pages';
import { QueuePage } from './components/QueuePage';

/**
 * Cola priorizada (F-06-web): PHYSICIAN, NURSE y ADMIN, según la matriz de `app/router`. Solo
 * PHYSICIAN ve las acciones «Iniciar atención» y «Cerrar atención».
 */
export const queueRoutes: RouteObject[] = [
  {
    path: '/cola',
    element: <QueuePage />,
    handle: QUEUE_PAGES['/cola'],
  },
];
