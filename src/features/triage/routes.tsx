import type { RouteObject } from 'react-router';
import type { TitleHandle } from '../../shared/hooks/useDocumentTitle';
import { EncounterDetailRoute } from './components/EncounterDetailPage';
import { EncounterListPage } from './components/EncounterListPage';
import { TriageTrayPage } from './components/TriageTrayPage';
import { ClinicalCaptureRoute } from './components/ClinicalCapturePage';

/** Consulta de atenciones (D4): los cuatro roles, según la matriz de `app/router`. */
export const encounterRoutes: RouteObject[] = [
  {
    path: '/atenciones',
    element: <EncounterListPage />,
    handle: { titleKey: 'common_nav_atenciones' } satisfies TitleHandle,
  },
  {
    path: '/atenciones/:id',
    element: <EncounterDetailRoute />,
    handle: { titleKey: 'feature_encounter' } satisfies TitleHandle,
  },
];

export const triageRoutes: RouteObject[] = [
  {
    path: '/triage',
    element: <TriageTrayPage />,
    handle: { titleKey: 'common_nav_triage' } satisfies TitleHandle,
  },
  {
    path: '/triage/:id',
    element: <ClinicalCaptureRoute />,
    handle: { titleKey: 'clinical_capture_title' } satisfies TitleHandle,
  },
];
