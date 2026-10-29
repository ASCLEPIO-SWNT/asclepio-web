import type { RouteObject } from 'react-router';
import { DirectRegistrationPage } from './components/DirectRegistrationPage';
import { ReceptionPage } from './components/ReceptionPage';
import { RECEPTION_PAGES } from './pages';

/** Rutas de recepción (D4): solo RECEPTION, según la matriz de `app/router`. */
export const receptionRoutes: RouteObject[] = [
  {
    path: '/recepcion',
    element: <ReceptionPage />,
    handle: RECEPTION_PAGES['/recepcion'],
  },
  {
    path: '/recepcion/registro',
    element: <DirectRegistrationPage />,
    handle: RECEPTION_PAGES['/recepcion/registro'],
  },
];
