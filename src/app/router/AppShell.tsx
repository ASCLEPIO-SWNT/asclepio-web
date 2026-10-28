import { NavLink, Outlet, useNavigate } from 'react-router';
import { useState } from 'react';
import {
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  ChartBarSquareIcon,
  ClipboardDocumentListIcon,
  HeartIcon,
  QueueListIcon,
  RectangleStackIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { logout } from '../../features/auth/logout';
import { CurrentStaffProvider } from '../../shared/hooks/useCurrentStaff';
import { routesFor } from './roleMatrix';
import { useI18n } from '../../shared/i18n';
import { Brand } from '../../shared/ui/Brand';
import { useStaff } from './useStaff';

/** Marco de las vistas protegidas: usuario, rol, navegación por rol y "Cerrar sesión" (R21, R22); provee el perfil a las features (D2 de F-02-web). */
export function AppShell() {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const staff = useStaff();
  const navigate = useNavigate();
  if (staff.status !== 'staff') return null;
  const { fullName, role } = staff.me;

  const onLogout = () => {
    // Primero se cierra la sesión (efectos) y luego se reemplaza la entrada actual por /login.
    logout();
    void navigate('/login', { replace: true });
  };

  return (
    <div className="shell">
      <section className="shell__bar" aria-label={t('common_session')}>
        <div className="shell__heading">
          <Brand compact />
          <button
            className="icon-button shell__toggle"
            type="button"
            aria-label={t(menuOpen ? 'common_nav_close' : 'common_nav_open')}
            aria-expanded={menuOpen}
            aria-controls="workspace-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? (
              <XMarkIcon aria-hidden="true" />
            ) : (
              <Bars3Icon aria-hidden="true" />
            )}
          </button>
        </div>
        <nav
          id="workspace-navigation"
          aria-label={t('common_navigation')}
          className="shell__nav"
          data-open={menuOpen}
        >
          <ul>
            {routesFor(role).map((route) => {
              const Icon =
                route.path === '/recepcion'
                  ? ClipboardDocumentListIcon
                  : route.path === '/triage'
                    ? HeartIcon
                    : route.path === '/cola'
                      ? QueueListIcon
                      : route.path === '/reportes'
                        ? ChartBarSquareIcon
                        : RectangleStackIcon;
              return (
                <li key={route.path}>
                  <NavLink to={route.path} onClick={() => setMenuOpen(false)}>
                    <Icon aria-hidden="true" />
                    {t(`common_nav_${route.path.slice(1)}`)}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="shell__profile">
          <span className="shell__avatar" aria-hidden="true">
            {fullName.charAt(0)}
          </span>
          <p className="shell__user">
            <strong>{fullName}</strong>
            <span className="shell__role">{t(`common_role_${role}`)}</span>
          </p>
        </div>
        <button type="button" className="button" onClick={onLogout}>
          <ArrowRightStartOnRectangleIcon aria-hidden="true" />
          {t('common_logout')}
        </button>
      </section>
      <CurrentStaffProvider me={staff.me}>
        <div className="shell__content">
          <Outlet />
        </div>
      </CurrentStaffProvider>
    </div>
  );
}
