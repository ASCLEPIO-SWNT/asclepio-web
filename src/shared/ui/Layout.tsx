import { Link, Outlet, useLocation, useMatches } from 'react-router';
import { ArrowUpRightIcon } from '@heroicons/react/24/outline';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useI18n } from '../i18n';
import { Brand } from './Brand';
import { LanguagePicker } from './LanguagePicker';
import { PreferencesPanel } from './PreferencesPanel';
import { RouteAnnouncer } from './RouteAnnouncer';
import { ThemeToggle } from './ThemeToggle';

/**
 * Lo que una ruta declara en su `handle` para el marco (UI-02-web D26). La ruta del `AppShell`
 * declara `privateFrame`: el marco privado ya muestra la marca en la barra lateral, así que la
 * cabecera se reduce a las herramientas. Las pantallas públicas y `/estado` no lo declaran.
 */
export interface FrameHandle {
  privateFrame?: boolean;
}

export function Layout() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  // UI-03-web R10, R11 (D9): título de la pestaña y su anuncio, en un solo punto para todas las rutas.
  const title = useDocumentTitle();
  // `Layout` solo se monta con un router de datos (`createBrowserRouter`, `createMemoryRouter`).
  const privateFrame = useMatches().some(
    (match) => (match.handle as FrameHandle | undefined)?.privateFrame === true,
  );
  const publicHome = pathname === '/';
  const login = pathname === '/login';
  const guideKey = publicHome
    ? 'guide_home'
    : login
      ? 'guide_login'
      : pathname === '/recepcion/registro'
        ? 'guide_registration'
        : pathname === '/recepcion'
          ? 'guide_reception'
          : pathname === '/triage'
            ? 'clinical_guide_tray'
            : pathname.startsWith('/triage/')
              ? 'clinical_guide_capture'
              : pathname === '/atenciones'
                ? 'guide_encounters'
                : pathname.startsWith('/atenciones/')
                  ? 'clinical_guide_detail'
                  : pathname === '/cola'
                    ? 'guide_queue'
                    : pathname === '/reportes'
                      ? 'guide_reports'
                      : 'guide_pending';
  return (
    <div
      className={`layout ${publicHome ? 'layout--public' : login ? 'layout--login' : 'layout--workspace'}${privateFrame ? ' layout--private' : ''}`}
    >
      <a className="skip-link" href="#main-content">
        {t('common_skip')}
      </a>
      <header className="layout__header">
        <div className="layout__header-inner">
          {!privateFrame && (
            <Link to="/" className="brand-link" aria-label="Asclepio">
              <Brand compact />
            </Link>
          )}
          {publicHome && (
            <nav className="public-nav" aria-label={t('common_navigation')}>
              <a href="#proceso">{t('landing_about')}</a>
              <a href="#equipo">{t('landing_team')}</a>
            </nav>
          )}
          <div className="layout__tools">
            <ThemeToggle />
            <LanguagePicker compact />
            <PreferencesPanel guide={t(guideKey)} route={pathname} />
            {publicHome && (
              <Link className="button header-access" to="/login">
                {t('common_staff_access')}
                <ArrowUpRightIcon aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="layout__main" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <RouteAnnouncer title={title} />
    </div>
  );
}
