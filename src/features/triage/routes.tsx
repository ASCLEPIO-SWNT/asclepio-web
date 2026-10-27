import type { RouteObject } from 'react-router';
import { EncounterDetailRoute } from './components/EncounterDetailPage';
import { EncounterListPage } from './components/EncounterListPage';

/** Consulta de atenciones (D4): los cuatro roles, según la matriz de `app/router`. */
export const encounterRoutes: RouteObject[] = [
  { path: '/atenciones', element: <EncounterListPage /> },
  { path: '/atenciones/:id', element: <EncounterDetailRoute /> },
];
