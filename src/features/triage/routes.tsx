import type { RouteObject } from 'react-router';
import { EncounterDetailRoute } from './components/EncounterDetailPage';
import { EncounterListPage } from './components/EncounterListPage';
import { TriageTrayPage } from './components/TriageTrayPage';
import { ClinicalCaptureRoute } from './components/ClinicalCapturePage';
import { ENCOUNTER_PAGES, TRIAGE_PAGES } from './pages';

/** Consulta de atenciones (D4): los cuatro roles, según la matriz de `app/router`. */
export const encounterRoutes: RouteObject[] = [
  {
    path: '/atenciones',
    element: <EncounterListPage />,
    handle: ENCOUNTER_PAGES['/atenciones'],
  },
  {
    path: '/atenciones/:id',
    element: <EncounterDetailRoute />,
    handle: ENCOUNTER_PAGES['/atenciones/:id'],
  },
];

export const triageRoutes: RouteObject[] = [
  {
    path: '/triage',
    element: <TriageTrayPage />,
    handle: TRIAGE_PAGES['/triage'],
  },
  {
    path: '/triage/:id',
    element: <ClinicalCaptureRoute />,
    handle: TRIAGE_PAGES['/triage/:id'],
  },
];
