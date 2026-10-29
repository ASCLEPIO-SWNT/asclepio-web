import type { RouteObject } from 'react-router';
import type { TitleHandle } from '../../shared/hooks/useDocumentTitle';
import { DirectRegistrationPage } from './components/DirectRegistrationPage';
import { ReceptionPage } from './components/ReceptionPage';

/** Rutas de recepción (D4): solo RECEPTION, según la matriz de `app/router`. */
export const receptionRoutes: RouteObject[] = [
  {
    path: '/recepcion',
    element: <ReceptionPage />,
    handle: { titleKey: 'common_nav_recepcion' } satisfies TitleHandle,
  },
  {
    path: '/recepcion/registro',
    element: <DirectRegistrationPage />,
    handle: { titleKey: 'feature_registration_direct' } satisfies TitleHandle,
  },
];
