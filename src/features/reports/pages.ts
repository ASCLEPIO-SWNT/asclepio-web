import type { TitleHandle } from '../../shared/hooks/useDocumentTitle';

/**
 * Caminos y títulos de las pantallas de la feature (UI-03-web R10, R12). Sin componentes: el
 * router de la app los usa sin descargar el código de la feature.
 */
export const REPORT_PAGES = {
  '/reportes': { titleKey: 'common_nav_reportes' },
} as const satisfies Record<string, TitleHandle>;
