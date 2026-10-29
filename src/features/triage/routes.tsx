import type { RouteObject } from 'react-router';
import { EncounterDetailRoute } from './components/EncounterDetailPage';
import { EncounterListPage } from './components/EncounterListPage';
import { TriageTrayPage } from './components/TriageTrayPage';
import { ClinicalCaptureRoute } from './components/ClinicalCapturePage';

/** Consulta de atenciones (D4): los cuatro roles, según la matriz de `app/router`. */
export const encounterRoutes: RouteObject[] = [
  { path: '/atenciones', element: <EncounterListPage /> },
  { path: '/atenciones/:id', element: <EncounterDetailRoute /> },
];

export const triageRoutes: RouteObject[] = [
  { path: '/triage', element: <TriageTrayPage /> },
  { path: '/triage/:id', element: <ClinicalCaptureRoute /> },
];
