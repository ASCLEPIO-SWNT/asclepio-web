import type { TitleHandle } from '../../shared/hooks/useDocumentTitle';

/**
 * Caminos y títulos de las pantallas de la feature (UI-03-web R10, R12). Sin componentes: el
 * router de la app los usa sin descargar el código de la feature.
 */
export const ENCOUNTER_PAGES = {
  '/atenciones': { titleKey: 'common_nav_atenciones' },
  '/atenciones/:id': { titleKey: 'feature_encounter' },
} as const satisfies Record<string, TitleHandle>;

export const TRIAGE_PAGES = {
  '/triage': { titleKey: 'common_nav_triage' },
  '/triage/:id': { titleKey: 'clinical_capture_title' },
} as const satisfies Record<string, TitleHandle>;
