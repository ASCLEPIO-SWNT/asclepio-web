import { Link, Outlet, useLocation } from 'react-router';
import { ArrowUpRightIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../i18n';
import { Brand } from './Brand';
import { LanguagePicker } from './LanguagePicker';
import { PreferencesPanel } from './PreferencesPanel';
import { ThemeToggle } from './ThemeToggle';

export function Layout() {
  const { t } = useI18n();
  const { pathname } = useLocation();
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
                  : 'guide_pending';
  return (
    <div
      className={`layout ${publicHome ? 'layout--public' : login ? 'layout--login' : 'layout--workspace'}`}
    >
      <a className="skip-link" href="#main-content">
        {t('common_skip')}
      </a>
      <header className="layout__header">
        <div className="layout__header-inner">
          <Link to="/" className="brand-link" aria-label="Asclepio">
            <Brand compact />
          </Link>
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
    </div>
  );
}
